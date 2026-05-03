import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    FaRobot, FaPaperPlane, FaTrash, FaUser,
    FaMicrophone, FaStop, FaCircle, FaCopy,
    FaChevronDown, FaBolt
} from 'react-icons/fa';
import './Chatbot.css';

const SUGGESTIONS = [
    { label: '🚂 Train routes',    text: 'What trains and routes are available?' },
    { label: '🎫 How to book',     text: 'How do I book a train ticket step by step?' },
    { label: '💰 Refund policy',   text: 'What is the refund and cancellation policy?' },
    { label: '⭐ Loyalty points',  text: 'How do loyalty points and tiers work?' },
    { label: '📍 Stations',        text: 'Which cities and stations do you serve?' },
    { label: '🛏️ Seats vs Berths', text: 'What is the difference between a seat and a berth?' },
    { label: '⏱️ Payment window',  text: 'How long do I have to pay after booking?' },
    { label: '🆘 Contact support', text: 'How do I contact support?' },
];

function boldify(text) {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g,     '<strong>$1</strong>');
}

function FormattedMessage({ text }) {
    const lines = text.split('\n');
    return (
        <div className="message-text">
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="msg-spacer" />;
                if (line.trim().startsWith('## '))
                    return <p key={i} className="msg-heading"
                               dangerouslySetInnerHTML={{ __html: boldify(line.replace(/^##\s*/, '')) }} />;
                if (/^[•\-]\s/.test(line.trim()))
                    return (
                        <div key={i} className="msg-bullet">
                            <span className="bullet-dot">•</span>
                            <span dangerouslySetInnerHTML={{ __html: boldify(line.trim().replace(/^[•\-]\s*/, '')) }} />
                        </div>
                    );
                const num = line.trim().match(/^(\d+)[.)]\s+(.+)/);
                if (num)
                    return (
                        <div key={i} className="msg-bullet">
                            <span className="bullet-dot num">{num[1]}.</span>
                            <span dangerouslySetInnerHTML={{ __html: boldify(num[2]) }} />
                        </div>
                    );
                return <p key={i} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
            })}
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        online:   { color: '#10b981', label: 'Online · Groq AI' },
        checking: { color: '#f59e0b', label: 'Connecting…' },
        offline:  { color: '#ef4444', label: 'Offline' },
    };
    const { color, label } = map[status] || map.offline;
    return (
        <span className="status-badge-row">
            <FaCircle style={{ color, fontSize: '0.45rem' }} />
            <span style={{ color }}>{label}</span>
        </span>
    );
}

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false);
    return (
        <button className="msg-copy-btn" title="Copy"
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
            {copied ? '✓' : <FaCopy />}
        </button>
    );
}

function StatPill({ icon, label }) {
    return <div className="stat-pill"><span className="stat-icon">{icon}</span><span>{label}</span></div>;
}

export default function Chatbot() {
    const [messages,        setMessages]        = useState([]);
    const [input,           setInput]           = useState('');
    const [loading,         setLoading]         = useState(false);
    const [conversationId,  setConversationId]  = useState(null);
    const [isListening,     setIsListening]     = useState(false);
    const [aiStatus,        setAiStatus]        = useState('checking');
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [showWelcome,     setShowWelcome]     = useState(true);
    const [showScrollBtn,   setShowScrollBtn]   = useState(false);
    const [charCount,       setCharCount]       = useState(0);

    const messagesEndRef  = useRef(null);
    const messagesAreaRef = useRef(null);
    const textareaRef     = useRef(null);
    const recognitionRef  = useRef(null);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome', sender: 'bot', timestamp: new Date(),
                text: "Hello! I'm your *AI Assistant* for the National Railway System 🚂\n\nI can help you with train bookings, schedules, refunds, loyalty points, and more. What can I help you with today?",
            }]);
        }
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SR();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.onresult = (e) => {
                const t = e.results[0][0].transcript;
                setInput(t); setCharCount(t.length); setIsListening(false);
            };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend   = () => setIsListening(false);
        }
        checkAIStatus();
        return () => recognitionRef.current?.abort();
    }, []);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    useEffect(() => {
        const el = messagesAreaRef.current;
        if (!el) return;
        const fn = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 180);
        el.addEventListener('scroll', fn);
        return () => el.removeEventListener('scroll', fn);
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 138) + 'px';
        }
    }, [input]);

    const checkAIStatus = async () => {
        setAiStatus('checking');
        try {
            const res = await axios.get('http://localhost:5000/api/ai/health', { timeout: 6000 });
            const ok = res.data?.groq?.running ?? res.data?.ollama?.running ?? false;
            setAiStatus(ok ? 'online' : 'offline');
        } catch { setAiStatus('offline'); }
    };

    const sendMessage = useCallback(async (overrideText) => {
        const text = (overrideText || input).trim();
        if (!text || loading) return;
        setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user', timestamp: new Date() }]);
        setInput(''); setCharCount(0); setShowSuggestions(false); setLoading(true);
        try {
            const res = await axios.post(
                'http://localhost:5000/api/ai/chat',
                { message: text, conversation_id: conversationId },
                { timeout: 30000 }
            );
            setMessages(prev => [...prev, {
                id: Date.now() + 1, sender: 'bot', timestamp: new Date(),
                text: res.data.response, model: res.data.model,
            }]);
            setConversationId(res.data.conversation_id);
            setAiStatus('online');
        } catch {
            setMessages(prev => [...prev, {
                id: Date.now() + 1, sender: 'bot', timestamp: new Date(),
                text: "I'm having a brief connectivity issue. Please try again in a moment — I'm here to help! 🚂",
            }]);
        } finally { setLoading(false); }
    }, [input, loading, conversationId]);

    const clearChat = () => {
        if (conversationId)
            axios.delete(`http://localhost:5000/api/ai/conversation/${conversationId}`).catch(() => {});
        setMessages([{ id: 'welcome-new', sender: 'bot', timestamp: new Date(), text: "Chat cleared! 🤖 How can I help you today?" }]);
        setConversationId(null); setShowSuggestions(true);
    };

    const toggleVoice = () => {
        if (!recognitionRef.current) return;
        if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
        else             { recognitionRef.current.start(); setIsListening(true); }
    };

    const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    /* ── Welcome screen ── */
    if (showWelcome) return (
        <div className="chatbot-welcome-container">
            <div className="welcome-content">
                <div className="robot-animation-wrapper">
                    <div className="robot-head">
                        <div className="robot-eyes">
                            <div className="robot-eye left" /><div className="robot-eye right" />
                        </div>
                        <div className="robot-mouth" />
                    </div>
                    <div className="robot-body">
                        <div className="robot-arms">
                            <div className="robot-arm left" /><div className="robot-arm right" />
                        </div>
                        <div className="robot-torso" />
                    </div>
                    <div className="robot-legs">
                        <div className="robot-leg left" /><div className="robot-leg right" />
                    </div>
                </div>

                <h1 className="welcome-title">National Railway System <span>AI Assistant</span></h1>
                <p className="welcome-subtitle">Your intelligent travel companion — bookings, schedules, loyalty rewards, and more.</p>

                <div className="welcome-stats">
                    <StatPill icon="⚡" label="Powered by Groq AI" />
                    <StatPill icon="🚂" label="5 Train Routes" />
                    <StatPill icon="🏙️" label="8 Cities" />
                    <StatPill icon="⭐" label="Loyalty Rewards" />
                </div>

                <button className="welcome-start-btn" onClick={() => setShowWelcome(false)}>
                    Start Chatting
                </button>
            </div>
        </div>
    );

    /* ── Chat interface ── */
    return (
        <div className="chatgpt-container">
            <div className="chatgpt-header">
                <div className="chatgpt-header-left">
                    <div className="chatgpt-avatar bot-avatar"><FaRobot /></div>
                    <div>
                        <div className="chatgpt-title">
                            Railway AI Assistant
                            <span className="groq-badge"><FaBolt /> Groq</span>
                        </div>
                        <StatusBadge status={aiStatus} />
                    </div>
                </div>
                <div className="chatgpt-header-right">
                    <button className="chatgpt-icon-btn" onClick={checkAIStatus} title="Refresh status">⟳</button>
                    <button className="chatgpt-icon-btn" onClick={clearChat} title="Clear chat"><FaTrash /></button>
                </div>
            </div>

            <div className="chatgpt-messages" ref={messagesAreaRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`chatgpt-msg-row ${msg.sender}`}>
                        {msg.sender === 'bot'  && <div className="chatgpt-avatar bot-avatar"><FaRobot /></div>}
                        <div className={`chatgpt-bubble ${msg.sender}`}>
                            <FormattedMessage text={msg.text} />
                            <div className="chatgpt-bubble-footer">
                                <span className="chatgpt-time">{formatTime(msg.timestamp)}</span>
                                {msg.sender === 'bot' && <CopyBtn text={msg.text} />}
                            </div>
                        </div>
                        {msg.sender === 'user' && <div className="chatgpt-avatar user-avatar"><FaUser /></div>}
                    </div>
                ))}

                {loading && (
                    <div className="chatgpt-msg-row bot">
                        <div className="chatgpt-avatar bot-avatar"><FaRobot /></div>
                        <div className="chatgpt-bubble bot chatgpt-typing"><span /><span /><span /></div>
                    </div>
                )}

                {showSuggestions && !loading && (
                    <div className="chatgpt-suggestions">
                        {SUGGESTIONS.map(s => (
                            <button key={s.text} className="chatgpt-chip" onClick={() => sendMessage(s.text)}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {showScrollBtn && (
                <button className="scroll-to-bottom" onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                    <FaChevronDown />
                </button>
            )}

            <div className="chatgpt-input-area">
                <div className="chatgpt-input-container">
                    <div className="textarea-wrapper">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => { setInput(e.target.value); setCharCount(e.target.value.length); }}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Ask about bookings, schedules, loyalty points, refunds…"
                            rows={1}
                            disabled={loading}
                            className="chatgpt-textarea"
                            maxLength={1000}
                        />
                        {charCount > 0 && <span className="char-count">{charCount}/1000</span>}
                    </div>
                    <div className="chatgpt-input-actions">
                        {recognitionRef.current && (
                            <button className={`chatgpt-action-btn voice ${isListening ? 'listening' : ''}`}
                                    onClick={toggleVoice} title={isListening ? 'Stop' : 'Voice input'}>
                                {isListening ? <FaStop /> : <FaMicrophone />}
                            </button>
                        )}
                        <button className="chatgpt-action-btn send"
                                onClick={() => sendMessage()}
                                disabled={loading || !input.trim()}>
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
                <div className="input-hint">
                    Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
                </div>
            </div>
        </div>
    );
}