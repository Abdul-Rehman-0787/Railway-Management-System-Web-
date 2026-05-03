import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    FaRobot, FaPaperPlane, FaTrash, FaUser,
    FaMicrophone, FaStop, FaCircle
} from 'react-icons/fa';
import './Chatbot.css';

// ─── Suggestion chips shown at start ────────────────────────────────────────
const SUGGESTIONS = [
    { label: '🚂 About trains', text: 'Tell me about train travel and booking' },
    { label: '🎫 How to book', text: 'How do I book a train ticket?' },
    { label: '💰 Refunds', text: 'What is the refund policy?' },
    { label: '⭐ Loyalty program', text: 'How do loyalty points work?' },
    { label: '📍 Stations', text: 'Which cities do you serve?' },
    { label: '🆘 Help', text: 'I need help with something' },
];

// ─── Simple markdown-like formatter ─────────────────────────────────────────
function FormattedMessage({ text }) {
    const lines = text.split('\n');
    return (
        <div className="message-text">
            {lines.map((line, i) => {
                if (!line.trim()) return <br key={i} />;

                // Bullet points
                if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                    const content = line.trim().replace(/^[•\-]\s*/, '');
                    return (
                        <div key={i} className="msg-bullet">
                            <span className="bullet-dot">•</span>
                            <span dangerouslySetInnerHTML={{ __html: boldify(content) }} />
                        </div>
                    );
                }

                // Numbered list
                const numberedMatch = line.trim().match(/^(\d+)\.\s+(.+)/);
                if (numberedMatch) {
                    return (
                        <div key={i} className="msg-bullet">
                            <span className="bullet-dot">{numberedMatch[1]}.</span>
                            <span dangerouslySetInnerHTML={{ __html: boldify(numberedMatch[2]) }} />
                        </div>
                    );
                }

                return (
                    <p key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />
                );
            })}
        </div>
    );
}

function boldify(text) {
    // *word* → <strong>word</strong>
    return text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
}

// ─── Status dot ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const map = {
        online: { color: '#10b981', label: 'Online' },
        checking: { color: '#f59e0b', label: 'Connecting…' },
        offline: { color: '#ef4444', label: 'Offline' },
    };
    const { color, label } = map[status] || map.offline;
    return (
        <span className="status-badge-row">
            <FaCircle style={{ color, fontSize: '0.45rem' }} />
            <span style={{ color }}>{label}</span>
        </span>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
function Chatbot() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [aiStatus, setAiStatus] = useState('checking'); // checking | online | offline
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [showWelcome, setShowWelcome] = useState(true); // Welcome screen toggle

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const recognitionRef = useRef(null);

    // ── Initialise ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    text: "Hello! I'm your *AI Assistant* for the National Railway System 🤖\n\nI can help you with train bookings, travel information, account questions, and more. Feel free to ask me anything!",
                    sender: 'bot',
                    timestamp: new Date(),
                },
            ]);
        }

        // Speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SR();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.onresult = (e) => {
                setInput(e.results[0][0].transcript);
                setIsListening(false);
            };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }

        checkAIStatus();

        return () => recognitionRef.current?.abort();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // ── Health check ─────────────────────────────────────────────────────────
    const checkAIStatus = async () => {
        setAiStatus('checking');
        try {
            const res = await axios.get('http://localhost:5000/api/ai/health', { timeout: 5000 });
            setAiStatus(res.data?.ollama?.running ? 'online' : 'offline');
        } catch {
            setAiStatus('offline');
        }
    };

    // ── Send message ─────────────────────────────────────────────────────────
    const sendMessage = useCallback(async (overrideText) => {
        const text = (overrideText || input).trim();
        if (!text || loading) return;

        const userMsg = {
            id: Date.now(),
            text,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setShowSuggestions(false);
        setLoading(true);

        try {
            const res = await axios.post(
                'http://localhost:5000/api/ai/chat',
                { message: text, conversation_id: conversationId },
                { timeout: 90000 }
            );

            const botMsg = {
                id: Date.now() + 1,
                text: res.data.response,
                sender: 'bot',
                timestamp: new Date(),
                sources: res.data.sources || [],
                model: res.data.model,
            };

            setMessages((prev) => [...prev, botMsg]);
            setConversationId(res.data.conversation_id);
            setAiStatus('online');
        } catch (err) {
            const status = err.response?.status;
            let errorText;
            if (status === 503) {
                errorText = "⚠️ The AI engine isn't running right now.\n\nPlease start Ollama:\n• Run `ollama serve` in your terminal\n• Make sure the model is pulled: `ollama pull llama3.2`";
                setAiStatus('offline');
            } else {
                errorText = "Sorry, something went wrong on my end. Please try again or contact support! 🎫";
            }
            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, text: errorText, sender: 'bot', timestamp: new Date(), isError: true },
            ]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, conversationId]);

    // ── Clear chat ───────────────────────────────────────────────────────────
    const clearChat = () => {
        // Tell backend to clear conversation memory
        if (conversationId) {
            axios.delete(`http://localhost:5000/api/ai/conversation/${conversationId}`).catch(() => {});
        }
        setMessages([
            {
                id: 'welcome-new',
                text: "Chat cleared! 🤖 How can I help you today?",
                sender: 'bot',
                timestamp: new Date(),
            },
        ]);
        setConversationId(null);
        setShowSuggestions(true);
    };

    // ── Voice ────────────────────────────────────────────────────────────────
    const toggleVoice = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    // ── Keyboard ─────────────────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (date) =>
        new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Show welcome screen first
    if (showWelcome) {
        return (
            <div className="chatbot-welcome-container">
                <div className="welcome-content">
                    <div className="robot-animation-wrapper">
                        <div className="robot-head">
                            <div className="robot-eyes">
                                <div className="robot-eye left"></div>
                                <div className="robot-eye right"></div>
                            </div>
                            <div className="robot-mouth"></div>
                        </div>
                        <div className="robot-body">
                            <div className="robot-arms">
                                <div className="robot-arm left"></div>
                                <div className="robot-arm right"></div>
                            </div>
                            <div className="robot-torso"></div>
                        </div>
                        <div className="robot-legs">
                            <div className="robot-leg left"></div>
                            <div className="robot-leg right"></div>
                        </div>
                    </div>
                    <h1 className="welcome-title">National Railway System <span>AI Assistant</span></h1>
                    <p className="welcome-subtitle">Your intelligent travel companion — bookings, schedules, and more.</p>
                    <button 
                        className="welcome-start-btn" 
                        onClick={() => setShowWelcome(false)}
                    >
                        Start Chatting
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="chatgpt-container">
            {/* Header */}
            <div className="chatgpt-header">
                <div className="chatgpt-header-left">
                    <div className="chatgpt-avatar">
                        <FaRobot />
                    </div>
                    <div>
                        <div className="chatgpt-title">AI Assistant</div>
                        <StatusBadge status={aiStatus} />
                    </div>
                </div>
                <div className="chatgpt-header-right">
                    <button
                        className="chatgpt-icon-btn"
                        onClick={checkAIStatus}
                        title="Check connection"
                    >
                        ⟳
                    </button>
                    <button className="chatgpt-icon-btn" onClick={clearChat} title="Clear chat">
                        <FaTrash />
                    </button>
                </div>
            </div>

            {/* Offline banner */}
            {aiStatus === 'offline' && (
                <div className="chatgpt-offline-banner">
                    ⚠️ AI engine offline — run <code>ollama serve</code> to enable
                </div>
            )}

            {/* Messages */}
            <div className="chatgpt-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`chatgpt-msg-row ${msg.sender}`}>
                        {msg.sender === 'bot' && (
                            <div className="chatgpt-avatar bot-avatar">
                                <FaRobot />
                            </div>
                        )}
                        <div className={`chatgpt-bubble ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                            <FormattedMessage text={msg.text} />
                            <div className="chatgpt-time">{formatTime(msg.timestamp)}</div>
                        </div>
                        {msg.sender === 'user' && (
                            <div className="chatgpt-avatar user-avatar">
                                <FaUser />
                            </div>
                        )}
                    </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                    <div className="chatgpt-msg-row bot">
                        <div className="chatgpt-avatar bot-avatar">
                            <FaRobot />
                        </div>
                        <div className="chatgpt-bubble bot chatgpt-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {/* Suggestion chips */}
                {showSuggestions && !loading && (
                    <div className="chatgpt-suggestions">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s.text}
                                className="chatgpt-chip"
                                onClick={() => sendMessage(s.text)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chatgpt-input-area">
                <div className="chatgpt-input-container">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything about trains, bookings, or travel..."
                        rows={1}
                        disabled={loading}
                        className="chatgpt-textarea"
                    />
                    <div className="chatgpt-input-actions">
                        {recognitionRef.current && (
                            <button
                                className={`chatgpt-action-btn voice ${isListening ? 'listening' : ''}`}
                                onClick={toggleVoice}
                                title={isListening ? 'Stop listening' : 'Voice input'}
                            >
                                {isListening ? <FaStop /> : <FaMicrophone />}
                            </button>
                        )}
                        <button
                            className="chatgpt-action-btn send"
                            onClick={() => sendMessage()}
                            disabled={loading || !input.trim()}
                            title="Send"
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chatbot;