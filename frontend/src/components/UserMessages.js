import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { protectedAPI, getCurrentUser } from '../api';
import './UserMessages.css';

function UserMessages() {
    const [conversation, setConversation] = useState(null);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [followUpMessage, setFollowUpMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const user = getCurrentUser();

    useEffect(() => {
        fetchConversation();
        const interval = setInterval(fetchConversation, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchConversation = async () => {
        try {
            const res = await protectedAPI.getUserConversation();
            const data = res.data.data || [];
            setConversation(data.length > 0 ? data[0] : null);
        } catch (error) {
            console.error('Error fetching conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!subject.trim() || !message.trim()) {
            toast.error('Please fill subject and message');
            return;
        }
        
        setSending(true);
        try {
            const response = await protectedAPI.sendUserMessage(subject, message);
            if (response.data.success) {
                toast.success('Message sent successfully. Admin will reply shortly.');
                setSubject('');
                setMessage('');
                setShowNewForm(false);
                await fetchConversation();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleSendFollowUp = async () => {
        if (!followUpMessage.trim()) {
            toast.error('Please enter your follow-up message');
            return;
        }
        
        setSending(true);
        try {
            const response = await protectedAPI.sendFollowUp(conversation.ConversationID, followUpMessage);
            if (response.data.success) {
                toast.success('Follow-up sent. Admin will reply.');
                setFollowUpMessage('');
                await fetchConversation();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send follow-up');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading...</div>;

    return (
        <div className="user-messages-container">
            <h1>💬 Support Messages</h1>
            
            {!conversation && !showNewForm && (
                <div className="no-conversation">
                    <p>You have no active support conversations.</p>
                    <button className="new-ticket-btn" onClick={() => setShowNewForm(true)}>📝 Create New Ticket</button>
                </div>
            )}

            {showNewForm && (
                <div className="message-form">
                    <h3>Create New Support Ticket</h3>
                    <input
                        type="text"
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={sending}
                    />
                    <textarea
                        placeholder="Describe your issue..."
                        rows="5"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={sending}
                    />
                    <div className="form-actions">
                        <button className="cancel-btn" onClick={() => setShowNewForm(false)}>Cancel</button>
                        <button className="send-btn" onClick={handleSendMessage} disabled={sending}>
                            {sending ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </div>
            )}

            {conversation && (
                <div className="conversation-container">
                    <div className="conversation-header">
                        <h3>📧 {conversation.Subject}</h3>
                        <div className="status">
                            Status: {conversation.Status === 'Pending' ? '🟡 Awaiting Admin Reply' : '✅ Admin Replied'}
                        </div>
                    </div>

                    <div className="messages-display">
                        <div className="message-block user">
                            <div className="message-header">
                                <span className="sender">👤 You</span>
                                <span className="date">{new Date(conversation.UserMessageDate).toLocaleString()}</span>
                            </div>
                            <div className="message-content">{conversation.UserMessage}</div>
                        </div>

                        {conversation.AdminReply && (
                            <div className="message-block admin">
                                <div className="message-header">
                                    <span className="sender">👨‍💼 Support Team</span>
                                    <span className="date">{new Date(conversation.AdminReplyDate).toLocaleString()}</span>
                                </div>
                                <div className="message-content">{conversation.AdminReply}</div>
                            </div>
                        )}
                    </div>

                    {conversation.Status === 'Replied' && (
                        <div className="follow-up-area">
                            <h4>Send Follow-up Message</h4>
                            <textarea
                                placeholder="Type your follow-up message here..."
                                rows="4"
                                value={followUpMessage}
                                onChange={(e) => setFollowUpMessage(e.target.value)}
                                disabled={sending}
                            />
                            <button onClick={handleSendFollowUp} disabled={sending}>
                                {sending ? 'Sending...' : 'Send Follow-up'}
                            </button>
                        </div>
                    )}

                    {conversation.Status === 'Pending' && (
                        <div className="waiting-message">
                            ⏳ Your message has been sent. Admin will reply shortly.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default UserMessages;