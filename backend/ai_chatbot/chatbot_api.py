from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import requests
import json
import os
import uuid
from datetime import datetime
from chroma_store import ChromaStore

app = FastAPI(title="National Railway System AI Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chroma_store = ChromaStore()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# In-memory conversation store (keyed by conversation_id)
conversation_store: Dict[str, List[Dict]] = {}

SYSTEM_PROMPT = """You are an AI Assistant for the National Railway System, a comprehensive railway management platform.

YOUR PERSONALITY:
- Friendly, knowledgeable, and helpful
- Use occasional relevant emojis to make responses engaging
- Speak naturally and conversationally

ABOUT THE NATIONAL RAILWAY SYSTEM:
- This is a railway booking and management system for train travel
- Users can book seats and berths, manage schedules, handle payments, and more
- The system includes features like loyalty points, refunds, and customer support

TOPICS YOU CAN HELP WITH:
1. BOOKING: How to book tickets, seat selection, payment process
2. TRAVEL INFO: Train schedules, routes, stations, seat vs berth differences
3. ACCOUNT: Registration, login, profile management
4. SUPPORT: Refunds, cancellations, loyalty points, contacting support
5. GENERAL: Any questions about railway travel or the system

RULES:
- Be helpful and informative about railway-related topics
- For non-railway questions, you can still engage in general conversation
- Keep answers concise but complete
- Use the provided context when available to give accurate information
- If you don't know something specific, say so and suggest alternatives

FORMAT:
- Use bullet points for lists
- Bold key terms using *term*
- Keep a conversational, friendly tone"""


def get_conversation_history(conversation_id: str) -> List[Dict]:
    return conversation_store.get(conversation_id, [])


def save_conversation_turn(conversation_id: str, user_msg: str, bot_msg: str):
    if conversation_id not in conversation_store:
        conversation_store[conversation_id] = []
    history = conversation_store[conversation_id]
    history.append({"role": "user", "content": user_msg})
    history.append({"role": "assistant", "content": bot_msg})
    # Keep last 10 turns (20 messages) to avoid context overflow
    if len(history) > 20:
        conversation_store[conversation_id] = history[-20:]


def build_prompt_with_history(user_message: str, context: str, history: List[Dict]) -> str:
    prompt_parts = [SYSTEM_PROMPT, "\n\nCONTEXT INFORMATION:\n", context]

    if history:
        prompt_parts.append("\n\nCONVERSATION HISTORY:")
        for turn in history[-6:]:  # Last 3 exchanges
            role = "User" if turn["role"] == "user" else "AI Assistant"
            prompt_parts.append(f"\n{role}: {turn['content']}")

    prompt_parts.append(f"\n\nUser: {user_message}\nAI Assistant:")
    return "".join(prompt_parts)


def query_ollama(prompt: str, stream: bool = False):
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": stream,
        "options": {
            "temperature": 0.65,
            "top_p": 0.85,
            "num_predict": 400,
            "repeat_penalty": 1.15,
            "stop": ["\nUser:", "\n\nUser:", "User:"]
        }
    }
    try:
        if stream:
            return requests.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload,
                stream=True,
                timeout=90
            )
        else:
            response = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload,
                stream=False,
                timeout=90
            )
            if response.status_code == 200:
                return response.json().get("response", "").strip()
            return None
    except requests.exceptions.ConnectionError:
        return None
    except Exception as e:
        print(f"Ollama error: {e}")
        return None


def format_response(text: str) -> str:
    """Clean up and format the LLM response."""
    if not text:
        return text
    # Remove any accidental role prefixes the model might output
    for prefix in ["AI Assistant:", "Assistant:", "ANSWER:", "Answer:"]:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    return text.strip()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    stream: Optional[bool] = False


class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    conversation_id: str
    model: str
    timestamp: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"\n📝 [{datetime.now().strftime('%H:%M:%S')}] User: {request.message}")

    conv_id = request.conversation_id or str(uuid.uuid4())
    history = get_conversation_history(conv_id)

    # Retrieve relevant docs
    relevant_docs = chroma_store.search(request.message, n_results=3)
    context = "\n\n---\n\n".join(relevant_docs) if relevant_docs else "No specific context found in knowledge base."

    print(f"📚 Context docs found: {len(relevant_docs)}")

    # Build the prompt
    full_prompt = build_prompt_with_history(request.message, context, history)

    # Query Ollama
    raw_response = query_ollama(full_prompt, stream=False)

    if raw_response is None:
        error_msg = (
            "⚠️ I'm having trouble connecting to the AI engine right now.\n\n"
            "Please make sure:\n"
            "• Ollama is running (`ollama serve`)\n"
            f"• Model '{OLLAMA_MODEL}' is pulled (`ollama pull {OLLAMA_MODEL}`)\n\n"
            "Or contact support for help! 🎫"
        )
        return ChatResponse(
            response=error_msg,
            sources=[],
            conversation_id=conv_id,
            model=OLLAMA_MODEL,
            timestamp=datetime.now().isoformat()
        )

    response_text = format_response(raw_response)
    print(f"🤖 Bot: {response_text[:100]}...")

    # Save to conversation memory
    save_conversation_turn(conv_id, request.message, response_text)

    return ChatResponse(
        response=response_text,
        sources=relevant_docs,
        conversation_id=conv_id,
        model=OLLAMA_MODEL,
        timestamp=datetime.now().isoformat()
    )


@app.get("/api/health")
async def health():
    try:
        ollama_resp = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        ollama_ok = ollama_resp.status_code == 200
        models = []
        if ollama_ok:
            data = ollama_resp.json()
            models = [m["name"] for m in data.get("models", [])]
    except Exception:
        ollama_ok = False
        models = []

    return {
        "status": "ok" if ollama_ok else "degraded",
        "service": "National Railway System AI Chatbot",
        "ollama": {
            "running": ollama_ok,
            "url": OLLAMA_URL,
            "model": OLLAMA_MODEL,
            "model_available": OLLAMA_MODEL in models or any(OLLAMA_MODEL in m for m in models),
            "available_models": models
        },
        "knowledge_base": {
            "loaded": chroma_store.get_count()
        }
    }


@app.get("/api/models")
async def get_models():
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            return response.json()
        return {"models": []}
    except Exception:
        return {"models": [], "error": "Ollama not running"}


@app.delete("/api/conversation/{conversation_id}")
async def clear_conversation(conversation_id: str):
    if conversation_id in conversation_store:
        del conversation_store[conversation_id]
    return {"success": True, "message": "Conversation cleared"}


@app.post("/api/knowledge/add")
async def add_knowledge(question: str, answer: str, category: str):
    doc_id = chroma_store.add_knowledge(question, answer, category)
    return {"success": True, "doc_id": doc_id}


if __name__ == "__main__":
    import uvicorn
    print(f"\n🚂 National Railway System AI Chatbot API starting...")
    print(f"📡 Ollama URL: {OLLAMA_URL}")
    print(f"🤖 Model: {OLLAMA_MODEL}")
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)