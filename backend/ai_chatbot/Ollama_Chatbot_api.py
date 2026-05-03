from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

conversation_store: Dict[str, List[Dict]] = {}

SYSTEM_PROMPT = """You are the AI Assistant for the National Railway System of Pakistan.

YOUR ROLE:
Answer questions about the National Railway System clearly, accurately, and concisely. You have full knowledge of how the platform works including booking, payments, refunds, loyalty points, train types, routes, stations, and account management.

LOYALTY POINTS — IMPORTANT — always answer these fully:
- Customers earn 10 loyalty points per 100 PKR spent on confirmed bookings
- Tiers: Bronze (0-499 pts), Silver (500-1999 pts), Gold (2000-4999 pts), Platinum (5000+ pts)
- Points are visible in the Loyalty section of the dashboard
- Points from cancelled bookings are reversed
- Higher tiers get better discounts and priority support

BOOKING PROCESS:
- Go to Schedules, select a train, choose Seat or Berth, pick from seat map, pay within 60 minutes
- Payment window: 60 minutes normally, 15 minutes if departure is within 1 hour
- Statuses: Pending (unpaid), Confirmed (paid), Completed (journey done), Cancelled

CANCELLATION AND REFUNDS:
- Pending booking cancellation: free, no charge
- Confirmed booking refund: 30% fee deducted, user gets 70% back
- Admin-cancelled: 100% full refund

TRAIN LAYOUT:
- Seater coach: 5 compartments x (6 seats + 2 berths) = 30 seats + 10 berths per coach
- Sleeper coach: 5 compartments x (6 berths + 2 seats) = 30 berths + 10 seats per coach

STATIONS: Lahore, Karachi, Rawalpindi, Islamabad, Multan, Faisalabad, Peshawar, Quetta

RULES:
- Always answer railway-related questions fully using the context and your knowledge above
- Be concise: 2-4 sentences unless a detailed list is genuinely needed
- Use bullet points for lists of 3 or more items
- Bold key terms using *term*
- If someone asks something completely unrelated to railways, politely decline
- NEVER say you cannot find information about loyalty points, booking, refunds, or any system feature — you have full knowledge of these topics
- Do NOT show technical errors or system messages"""


def get_history(conv_id: str) -> List[Dict]:
    return conversation_store.get(conv_id, [])


def save_turn(conv_id: str, user_msg: str, bot_msg: str):
    if conv_id not in conversation_store:
        conversation_store[conv_id] = []
    h = conversation_store[conv_id]
    h.append({"role": "user", "content": user_msg})
    h.append({"role": "assistant", "content": bot_msg})
    if len(h) > 20:
        conversation_store[conv_id] = h[-20:]


def build_prompt(user_message: str, context: str, history: List[Dict]) -> str:
    parts = [SYSTEM_PROMPT, "\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n", context]
    if history:
        parts.append("\n\nCONVERSATION HISTORY:")
        for turn in history[-6:]:
            role = "User" if turn["role"] == "user" else "Assistant"
            parts.append(f"\n{role}: {turn['content']}")
    parts.append(f"\n\nUser: {user_message}\nAssistant:")
    return "".join(parts)


def direct_kb_answer(user_message: str, relevant_docs: List[str]) -> str:
    """Generate a clean answer directly from knowledge base when Ollama is unavailable."""
    if not relevant_docs:
        return "I can help you with booking tickets, refunds, loyalty points, train schedules, station information, and account support. Could you please be more specific about what you need?"

    # Return the most relevant answer directly, cleaned up
    best = relevant_docs[0]
    # Extract just the Answer part
    lines = best.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('Answer:'):
            answer = line.replace('Answer:', '').strip()
            # Append more lines if they're continuation
            for j in range(i + 1, len(lines)):
                if lines[j].startswith('Category:') or lines[j].startswith('Question:'):
                    break
                if lines[j].strip():
                    answer += ' ' + lines[j].strip()
            return answer
    return best[:400]


def query_ollama(prompt: str) -> Optional[str]:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.4,
            "top_p": 0.8,
            "num_predict": 320,
            "repeat_penalty": 1.1,
            "stop": ["\nUser:", "\n\nUser:", "User:", "\nHuman:"]
        }
    }
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            stream=False,
            timeout=120   # 2-minute timeout — model can be slow on first run
        )
        if response.status_code == 200:
            text = response.json().get("response", "").strip()
            return text if text else None
        return None
    except requests.exceptions.Timeout:
        print("⚠️  Ollama timed out — falling back to direct KB answer")
        return None
    except requests.exceptions.ConnectionError:
        print("⚠️  Ollama not reachable — falling back to direct KB answer")
        return None
    except Exception as e:
        print(f"Ollama error: {e}")
        return None


def clean_response(text: str) -> str:
    for prefix in ["Assistant:", "AI Assistant:", "ANSWER:", "Answer:"]:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    return text.strip()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


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
    history = get_history(conv_id)

    # Search knowledge base
    relevant_docs = chroma_store.search(request.message, n_results=4)
    context = "\n\n---\n\n".join(relevant_docs) if relevant_docs else "No specific KB match — use built-in system knowledge to answer."
    print(f"📚 KB docs found: {len(relevant_docs)}")

    # Try Ollama first
    full_prompt = build_prompt(request.message, context, history)
    raw = query_ollama(full_prompt)

    if raw:
        response_text = clean_response(raw)
    else:
        # Graceful fallback: answer directly from knowledge base
        print("📖 Using direct KB fallback")
        response_text = direct_kb_answer(request.message, relevant_docs)

    if not response_text:
        response_text = "I can help you with booking, refunds, loyalty points, train schedules, and more. Please ask your question again."

    print(f"🤖 Response: {response_text[:120]}...")
    save_turn(conv_id, request.message, response_text)

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
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        ollama_ok = r.status_code == 200
        models = [m["name"] for m in r.json().get("models", [])] if ollama_ok else []
    except Exception:
        ollama_ok = False
        models = []

    return {
        "status": "ok" if ollama_ok else "degraded",
        "service": "National Railway System AI",
        "ollama": {
            "running": ollama_ok,
            "url": OLLAMA_URL,
            "model": OLLAMA_MODEL,
            "model_available": any(OLLAMA_MODEL in m for m in models),
            "available_models": models
        },
        "knowledge_base": {"items": chroma_store.get_count()}
    }


@app.delete("/api/conversation/{conversation_id}")
async def clear_conversation(conversation_id: str):
    conversation_store.pop(conversation_id, None)
    return {"success": True}


@app.post("/api/knowledge/add")
async def add_knowledge(question: str, answer: str, category: str):
    doc_id = chroma_store.add_knowledge(question, answer, category)
    return {"success": True, "doc_id": doc_id}


if __name__ == "__main__":
    import uvicorn
    print(f"\n🚂 National Railway System AI starting...")
    print(f"📡 Ollama: {OLLAMA_URL}  |  Model: {OLLAMA_MODEL}")
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)