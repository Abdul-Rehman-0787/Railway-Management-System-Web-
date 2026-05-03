from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
import re
import uuid
from datetime import datetime
from dotenv import load_dotenv
from groq import Groq
from chroma_store import ChromaStore

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="National Railway System AI Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Groq client ───────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

chroma_store = ChromaStore()
conversation_store: Dict[str, List[Dict]] = {}

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are the official AI Assistant for the National Railway System of Pakistan (NRS).

═══════════════════════════════════════════════════════
PLATFORM OVERVIEW
═══════════════════════════════════════════════════════
The National Railway System (NRS) is a full-stack web platform for managing rail travel in Pakistan.
It covers: customer accounts, train schedules, interactive seat/berth booking, payment processing,
refund workflows, loyalty rewards, passenger support messaging, admin management, and train catalogues.

═══════════════════════════════════════════════════════
BOOKING PROCESS
═══════════════════════════════════════════════════════
1. Visit the Schedules page — all upcoming scheduled trains are listed with prices and availability.
2. Click "Book Now" on any train card.
3. Choose booking type: Seat (daytime, cheaper) or Berth (overnight, more expensive).
4. Select your exact spot from the interactive seat map (green = available, grey = booked).
5. You are redirected to the Payment page — pay within the time window.
6. On payment, booking status changes to Confirmed and seat is reserved.

Payment windows:
- Standard: 60 minutes from booking creation
- Imminent departure (train departs within 1 hour): only 15 minutes to pay
- Expired unpaid bookings are auto-cancelled every 5 minutes by a background job

Booking statuses: Pending → Confirmed → Completed | Cancelled

═══════════════════════════════════════════════════════
SEAT MAP & COACH LAYOUT
═══════════════════════════════════════════════════════
Each train has two coach types:

SLEEPER (Berth) Coach — for overnight travel:
  • 5 compartments per coach
  • Each compartment: 6 berths (LB, MB, UB, SLB, SMB, SUB) + 2 side seats (S1, S2)
  • Total per sleeper coach: 30 berths + 10 seats = 40 spots

SEATER Coach — for daytime travel:
  • 5 compartments per coach
  • Each compartment: 6 seats (AL, BL, CL, AR, BR, CR) + 2 side berths (UB, LB)
  • Total per seater coach: 30 seats + 10 berths = 40 spots

Seat IDs use the format: CoachLetter + CompartmentNumber + "-" + SpotLabel
Examples: A1-LB (Coach A, Compartment 1, Lower Berth), G3-AL (Coach G, Comp 3, seat AL)

Admins set SleeperCoaches + SeaterCoaches per schedule. Total capacity is calculated automatically.
Each schedule can have different coach configurations and prices.

═══════════════════════════════════════════════════════
PRICING
═══════════════════════════════════════════════════════
- Prices are set per schedule by the admin (not global)
- Seat price and Berth price are separate fields on each schedule
- Sample typical fares: Seat PKR 350–600, Berth PKR 700–1200 depending on route and train
- Currency: Pakistani Rupees (PKR)

═══════════════════════════════════════════════════════
TRAINS & ROUTES
═══════════════════════════════════════════════════════
Current trains in the system:
1. Green Line Express (GL-001) — Express — Lahore ↔ Karachi
2. Karakoram Express (KK-102) — Express — Karachi ↔ Rawalpindi
3. Awam Express (AW-205) — Local — Lahore ↔ Multan
4. Tezgam Express (TZ-310) — Express — Rawalpindi ↔ Peshawar
5. Bahauddin Zakariya (BZ-415) — Local — Multan ↔ Faisalabad

Train types: Express (faster, fewer stops, premium) | Local (more stops, budget-friendly)

Stations served: Lahore Junction, Karachi Cantt, Rawalpindi, Islamabad, Multan Cantt,
Faisalabad, Peshawar Cantt, Quetta

═══════════════════════════════════════════════════════
CANCELLATION & REFUND POLICY
═══════════════════════════════════════════════════════
Pending (unpaid) booking cancellation:
  → Free. No charge. Seat released immediately.
  → Do it from My Bookings → Cancel Booking

Confirmed (paid) booking refund request:
  → 30% cancellation fee deducted
  → User receives 70% of total paid amount
  → Must be approved by admin before money is returned
  → Status changes to RefundRequested → after approval → Refunded_User
  → Loyalty points earned from that booking are reversed

Admin-cancelled bookings:
  → 100% full refund, no deductions
  → Seat released if train has not yet departed

Refund processing time: a few business days after admin approval (depends on bank).

═══════════════════════════════════════════════════════
LOYALTY PROGRAM
═══════════════════════════════════════════════════════
Earning points:
  • 10 loyalty points earned per 100 PKR spent on every confirmed and paid booking
  • Points credited automatically after payment confirmation
  • Example: PKR 500 ticket → 50 points earned

Tiers (cumulative points):
  🥉 Bronze  →   0 – 499 points   (default for all new users)
  🥈 Silver  → 500 – 1,999 points
  🥇 Gold    → 2,000 – 4,999 points
  💎 Platinum → 5,000+ points

Tier upgrades happen automatically when your points cross a threshold.
Benefits increase with tier: discounts, priority customer support, special offers.

Points reversal:
  • Cancelled bookings → points earned from that booking are deducted
  • Admin cancellation → points also reversed
  • Points cannot go below zero

Checking points: Dashboard → Loyalty section → shows total points, tier, and history

═══════════════════════════════════════════════════════
USER ACCOUNT & DASHBOARD
═══════════════════════════════════════════════════════
Registration: Name, email, phone, password. Loyalty account auto-created at Bronze.
Dashboard shows: Total bookings, total spent, loyalty points, tier level, recent bookings.

Pages:
  • /schedules    — Browse and book trains
  • /dashboard    — Personal overview
  • /bookings     — Full booking history with actions
  • /my-payments  — Pending unpaid bookings — pay or cancel here
  • /my-messages  — Messaging with support
  • /ratings      — Submit star ratings and reviews
  • /catalogue    — Train descriptions and images
  • /contact      — General support enquiry form
  • /payment      — Complete payment for a pending booking

═══════════════════════════════════════════════════════
ADMIN FEATURES
═══════════════════════════════════════════════════════
Admins access /admin/* routes. Admin capabilities:
  • Dashboard overview with search
  • Add, edit, delete train schedules (coach config + prices per journey)
  • View and manage all bookings system-wide
  • Admin-cancel any booking (full refund)
  • Approve or reject refund requests
  • Reply to passenger support conversations
  • Manage user accounts

Default admin: l230787@lhr.nu.edu.pk

═══════════════════════════════════════════════════════
MESSAGING / SUPPORT
═══════════════════════════════════════════════════════
Each user has one support conversation thread.
Flow: User sends message (Pending) → Admin replies (Replied) → User can follow up (back to Pending)
Users cannot send two messages while one is pending — must wait for admin reply first.
For urgent issues contact support via the Contact page.

═══════════════════════════════════════════════════════
BACKGROUND AUTOMATION
═══════════════════════════════════════════════════════
Every 5 minutes the system automatically:
  1. Cancels all bookings whose PaymentExpiry has passed and releases their seats
  2. Marks confirmed bookings as Completed after the train's DepartureTime has passed

═══════════════════════════════════════════════════════
RATINGS & CATALOGUE
═══════════════════════════════════════════════════════
Passengers can rate and review their completed journeys (1–5 stars) on /ratings.
Train catalogue (/catalogue) shows descriptions and promotional images for each train.

═══════════════════════════════════════════════════════
RESPONSE RULES — CRITICAL, FOLLOW EXACTLY
═══════════════════════════════════════════════════════
- Read the user's question carefully before answering. Identify EXACTLY what they are asking.
- Answer the SPECIFIC question asked — do not give generic or vague responses.
- Use the KNOWLEDGE BASE CONTEXT provided (when present) as your primary source of detail.
- Be concise: 2–4 sentences unless a list is genuinely needed.
- Use bullet points only for 3+ distinct items.
- Bold key terms using **term**.
- Prices are always in PKR.
- NEVER say you cannot find information about loyalty, booking, refunds, or system features — you have full knowledge above.
- NEVER show technical errors, stack traces, or API messages to the user.
- If asked something completely unrelated to railways (e.g. cooking, coding), politely redirect.
- Always be helpful, warm, and professional.
- If the question is a greeting (hi, hello, salam), respond warmly and invite them to ask about the railway."""


# ── Intent classification ─────────────────────────────────────────────────────

# Patterns that should NEVER hit ChromaDB — handle instantly
GREETING_PATTERNS = re.compile(
    r"^\s*(hi+|hello+|hey+|salam|assalam|howdy|yo+|sup|hiya|greetings|good\s*(morning|afternoon|evening|night)|namaste)\s*[!.?]*\s*$",
    re.IGNORECASE
)

SMALLTALK_PATTERNS = {
    # Questions about the bot itself
    re.compile(r"how old are you|what('s| is) your age|when were you (born|made|created|built)", re.IGNORECASE):
        "I'm a Railway AI Assistant — I don't have an age! 😄 I'm here to help you with train bookings, schedules, loyalty points, refunds, and anything else about the National Railway System. What can I help you with?",

    re.compile(r"what('s| is) your name|who are you|introduce yourself", re.IGNORECASE):
        "I'm the **National Railway System AI Assistant** 🚂 — your guide for bookings, schedules, refunds, loyalty points, and all things NRS. How can I help you today?",

    re.compile(r"how are you|how('s| is) it going|you good|you okay|you alright", re.IGNORECASE):
        "I'm doing great, thanks for asking! 😊 Ready to help you with train bookings, schedules, or anything else about the National Railway System. What do you need?",

    re.compile(r"what can you do|what do you know|help me|what('s| is) your purpose|what are you (for|able)", re.IGNORECASE):
        "I can help you with:\n\n• **Bookings** — how to book seats or berths, check status, cancel\n• **Schedules** — train routes, departure times, availability\n• **Payments** — payment windows, pending bookings\n• **Refunds** — cancellation policy, how to request a refund\n• **Loyalty Points** — earning points, tiers (Bronze/Silver/Gold/Platinum)\n• **Support** — how to contact admin, messaging system\n• **Trains** — routes, coach types, seat maps\n\nWhat would you like to know?",

    re.compile(r"thank(s| you)|thanks a lot|thx|jazakallah|shukriya", re.IGNORECASE):
        "You're welcome! 😊 Feel free to ask if you have any more questions about the National Railway System.",

    re.compile(r"(who (made|created|built|developed) you|who('s| is) your (creator|developer|maker))", re.IGNORECASE):
        "I was built for the **National Railway System of Pakistan** to help passengers like you. I'm powered by Groq AI. Is there something railway-related I can help you with?",

    re.compile(r"^(ok|okay|alright|got it|understood|sure|fine|cool|nice|great|wow|ohh?|ah+|hm+|k)\s*[.!?]*$", re.IGNORECASE):
        "Got it! Let me know if you have any questions about bookings, schedules, or anything else with the National Railway System. 🚂",

    re.compile(r"(bye|goodbye|see you|cya|take care|later|farewell)", re.IGNORECASE):
        "Goodbye! 👋 Have a great journey. Come back anytime you need help with the National Railway System!",
}

OFF_TOPIC_PATTERNS = re.compile(
    r"\b(cook(ing|ed|s)?|recipe|food|weather|sport|football|cricket|movie|film|music|song|"
    r"cod(e|ing)|programm(ing|er)|python|javascript|homework|exam|study|math|physics|"
    r"politics|president|government|news|whatsapp|instagram|facebook|tiktok|youtube|"
    r"joke|funny|laugh|love|relationship|marry|wedding|baby|children|doctor|medicine|"
    r"hospital|disease|covid|vaccine)\b",
    re.IGNORECASE
)


def classify_intent(message: str):
    """
    Returns (intent_type, instant_response_or_None).
    intent_type: 'greeting' | 'smalltalk' | 'off_topic' | 'railway'
    """
    stripped = message.strip()

    # Greeting
    if GREETING_PATTERNS.match(stripped):
        return "greeting", (
            "Hello! 👋 Welcome to the **National Railway System** AI Assistant. "
            "I can help you with train bookings, schedules, refunds, loyalty points, and more. "
            "What would you like to know?"
        )

    # Small talk / bot questions
    for pattern, response in SMALLTALK_PATTERNS.items():
        if pattern.search(stripped):
            return "smalltalk", response

    # Off-topic
    if OFF_TOPIC_PATTERNS.search(stripped):
        return "off_topic", (
            "I'm specialised in the **National Railway System of Pakistan** and can only help with "
            "railway-related topics like bookings, schedules, refunds, and loyalty points. "
            "Is there anything railway-related I can assist you with? 🚂"
        )

    return "railway", None


# ── Query preprocessing ───────────────────────────────────────────────────────

# Keyword expansions to improve ChromaDB retrieval for short/colloquial queries
QUERY_EXPANSIONS = {
    r"\bpoints?\b": "loyalty points tier rewards",
    r"\brefund\b": "refund cancellation policy fee",
    r"\bcancel\b": "cancel booking refund policy",
    r"\bbook(ing)?\b": "book ticket seat berth schedule",
    r"\bpay(ment)?\b": "payment window timer pending",
    r"\btrain\b": "train express local route schedule",
    r"\bseat\b": "seat coach seater booking",
    r"\bberth\b": "berth sleeper coach overnight",
    r"\btier\b": "loyalty tier bronze silver gold platinum",
    r"\bprice|cost|fare|cheap\b": "price fare PKR seat berth schedule",
    r"\bschedule\b": "schedule departure arrival train",
    r"\bsupport|help|contact\b": "support contact messaging admin",
    r"\bregist|sign.?up|creat.*account\b": "register account sign up",
    r"\bdashboard\b": "dashboard bookings loyalty account",
}


def expand_query(query: str) -> str:
    """Expand short/colloquial queries with relevant keywords for better vector search."""
    expanded = query
    query_lower = query.lower()
    additions = []
    for pattern, expansion in QUERY_EXPANSIONS.items():
        if re.search(pattern, query_lower):
            additions.append(expansion)
    if additions:
        expanded = query + " " + " ".join(additions)
    return expanded


def normalize_query(query: str) -> str:
    """Clean and normalize the user query."""
    # Strip excessive whitespace
    query = re.sub(r'\s+', ' ', query).strip()
    # Remove trailing punctuation that doesn't add meaning
    query = query.rstrip('?!.')
    return query


# ── Conversation helpers ──────────────────────────────────────────────────────

def get_history(conv_id: str) -> List[Dict]:
    return conversation_store.get(conv_id, [])


def save_turn(conv_id: str, user_msg: str, bot_msg: str):
    if conv_id not in conversation_store:
        conversation_store[conv_id] = []
    h = conversation_store[conv_id]
    h.append({"role": "user",      "content": user_msg})
    h.append({"role": "assistant", "content": bot_msg})
    # Keep last 10 exchanges (20 messages)
    if len(h) > 20:
        conversation_store[conv_id] = h[-20:]


# ── Prompt builder ────────────────────────────────────────────────────────────

def build_messages(user_message: str, context: str, history: List[Dict]) -> List[Dict]:
    """Build the messages array for the Groq chat completion API.

    Key improvement: the KB context is injected as a dedicated user-turn block
    IMMEDIATELY before the actual question, not buried at the end of the system
    prompt. This dramatically increases the model's attention to it.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include last 6 turns (3 exchanges) of history for context
    for turn in history[-6:]:
        messages.append({"role": turn["role"], "content": turn["content"]})

    # If we have KB context, inject it as a grounding block right before the question
    if context:
        grounding = (
            "Here are the most relevant knowledge base entries for the question below. "
            "Use these as your PRIMARY reference when composing your answer:\n\n"
            "---\n"
            f"{context}\n"
            "---\n\n"
            f"User question: {user_message}"
        )
        messages.append({"role": "user", "content": grounding})
    else:
        messages.append({"role": "user", "content": user_message})

    return messages


# ── Groq call ─────────────────────────────────────────────────────────────────

def query_groq(user_message: str, context: str, history: List[Dict]) -> Optional[str]:
    """Call Groq API and return the response text."""
    if not groq_client:
        return None
    try:
        messages = build_messages(user_message, context, history)
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.2,    # lower = more factual, less hallucination
            max_tokens=512,
            top_p=0.9,
            stream=False,
        )
        text = completion.choices[0].message.content.strip()
        return text if text else None
    except Exception as e:
        print(f"⚠️  Groq error: {e}")
        return None


# ── Fallback KB answer ────────────────────────────────────────────────────────

def direct_kb_answer(user_message: str, relevant_docs: List[str]) -> str:
    """Smart fallback: pick the best-matching KB entry and return its answer cleanly."""
    if not relevant_docs:
        return (
            "I'm here to help with bookings, schedules, loyalty points, refunds, "
            "train information, and account support. Please ask your question!"
        )

    user_lower = user_message.lower()

    # Score each doc by keyword overlap with the user message for better selection
    def score_doc(doc: str) -> int:
        doc_lower = doc.lower()
        user_words = set(re.findall(r'\w+', user_lower))
        doc_words = set(re.findall(r'\w+', doc_lower))
        return len(user_words & doc_words)

    best = max(relevant_docs, key=score_doc)

    # Extract just the Answer portion
    lines = best.split('\n')
    answer_lines = []
    capturing = False
    for line in lines:
        if line.startswith('Answer:'):
            answer_lines.append(line.replace('Answer:', '').strip())
            capturing = True
        elif capturing:
            if line.startswith(('Category:', 'Question:')):
                break
            if line.strip():
                answer_lines.append(line.strip())

    if answer_lines:
        return ' '.join(answer_lines)

    return best[:500]


# ── Response cleaner ──────────────────────────────────────────────────────────

def clean_response(text: str) -> str:
    for prefix in ["Assistant:", "AI Assistant:", "ANSWER:", "Answer:"]:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    return text.strip()


# ── Request / Response models ─────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    conversation_id: str
    model: str
    timestamp: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"\n📝 [{datetime.now().strftime('%H:%M:%S')}] User: {request.message}")

    conv_id = request.conversation_id or str(uuid.uuid4())
    history = get_history(conv_id)

    # ── Step 1: Intent classification — handle non-railway queries instantly ──
    intent, instant_reply = classify_intent(request.message)
    if instant_reply:
        print(f"🎯 Intent [{intent}] — instant reply, skipping KB+Groq")
        save_turn(conv_id, request.message, instant_reply)
        return ChatResponse(
            response=instant_reply,
            sources=[],
            conversation_id=conv_id,
            model="intent-classifier",
            timestamp=datetime.now().isoformat()
        )

    # ── Step 2: Railway query — normalize, expand, search KB, call Groq ──
    clean_query = normalize_query(request.message)
    search_query = expand_query(clean_query)

    # Search knowledge base — 3 tightly-matched results is better than 4 noisy ones
    relevant_docs = chroma_store.search(search_query, n_results=3)
    context = "\n\n---\n\n".join(relevant_docs) if relevant_docs else ""
    print(f"📚 KB docs found: {len(relevant_docs)} (search: '{search_query[:60]}...')")

    # Try Groq first
    raw = query_groq(clean_query, context, history)

    if raw:
        response_text = clean_response(raw)
        model_used = GROQ_MODEL
        print(f"⚡ Groq responded successfully")
    else:
        # Fallback: answer directly from knowledge base
        print("📖 Groq unavailable — using direct KB fallback")
        response_text = direct_kb_answer(clean_query, relevant_docs)
        model_used = "kb-fallback"

    if not response_text:
        response_text = (
            "I can help you with bookings, refunds, loyalty points, train schedules, "
            "and more. Please ask your question!"
        )

    print(f"🤖 Response ({len(response_text)} chars): {response_text[:120]}...")
    save_turn(conv_id, request.message, response_text)

    return ChatResponse(
        response=response_text,
        sources=relevant_docs,
        conversation_id=conv_id,
        model=model_used,
        timestamp=datetime.now().isoformat()
    )


@app.get("/api/health")
async def health():
    groq_ok = False
    if groq_client:
        try:
            groq_client.models.list()
            groq_ok = True
        except Exception:
            groq_ok = False

    return {
        "status": "ok" if groq_ok else "degraded",
        "service": "National Railway System AI",
        "groq": {
            "running": groq_ok,
            "model": GROQ_MODEL,
            "api_key_set": bool(GROQ_API_KEY),
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
    print(f"⚡ Groq Model: {GROQ_MODEL}")
    print(f"🔑 API Key: {'set ✅' if GROQ_API_KEY else 'MISSING ❌ — set GROQ_API_KEY in .env'}")
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)