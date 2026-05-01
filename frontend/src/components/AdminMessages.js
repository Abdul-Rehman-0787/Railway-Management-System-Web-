import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../api';
import './AdminMessages.css';

function AdminMessages() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await adminAPI.getAllConversations();
            setConversations(res.data.data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            toast.error('Failed to load conversations');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        setReplyText('');
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) {
            toast.error('Please enter a reply');
            return;
        }
        
        setSending(true);
        try {
            const response = await adminAPI.sendAdminReply(selectedConversation.ConversationID, replyText);
            
            if (response.data.success) {
                toast.success('Reply sent successfully');
                setReplyText('');
                await fetchConversations();
                
                // Update selected conversation
                const updated = conversations.find(c => c.ConversationID === selectedConversation.ConversationID);
                if (updated) {
                    setSelectedConversation(prev => ({ ...prev, AdminReply: replyText, AdminReplyDate: new Date(), Status: 'Replied' }));
                }
            } else {
                toast.error(response.data.message || 'Failed to send reply');
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error(error.response?.data?.message || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'Pending') {
            return <span className="pending-badge">🟡 Awaiting Reply</span>;
        }
        return <span className="replied-badge">✅ Replied</span>;
    };

    if (loading) return <div className="loading-spinner">Loading conversations...</div>;

    return (
        <div className="admin-messages-container">
            <div className="messages-header">
                <h1>💬 User Support Conversations</h1>
                <button className="refresh-btn" onClick={fetchConversations} disabled={refreshing}>
                    🔄 Refresh
                </button>
            </div>
            
            <div className="messages-layout">
                {/* Left Panel - List of conversations */}
                <div className="conversations-list">
                    <h3>📋 All Conversations ({conversations.length})</h3>
                    {conversations.length === 0 ? (
                        <p className="no-conversations">No conversations yet</p>
                    ) : (
                        conversations.map(conv => (
                            <div 
                                key={conv.ConversationID} 
                                className={`conversation-item ${selectedConversation?.ConversationID === conv.ConversationID ? 'active' : ''}`}
                                onClick={() => handleSelectConversation(conv)}
                            >
                                <div className="conversation-subject">
                                    <strong>{conv.Subject}</strong>
                                    {conv.Status === 'Pending' && <span className="pending-dot">●</span>}
                                </div>
                                <div className="conversation-user">
                                    👤 {conv.UserName} ({conv.UserEmail})
                                </div>
                                <div className="conversation-preview">
                                    {conv.UserMessage.substring(0, 60)}...
                                </div>
                                <div className="conversation-status">
                                    {getStatusBadge(conv.Status)}
                                </div>
                                <div className="conversation-date">
                                    📅 {new Date(conv.UserMessageDate).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Panel - Full conversation */}
                <div className="conversation-area">
                    {selectedConversation ? (
                        <>
                            <div className="conversation-header">
                                <h3>📧 {selectedConversation.Subject}</h3>
                                <div className="user-details">
                                    <p><strong>From:</strong> {selectedConversation.UserName} ({selectedConversation.UserEmail})</p>
                                    {getStatusBadge(selectedConversation.Status)}
                                </div>
                            </div>
                            
                            <div className="messages-display">
                                {/* User Message */}
                                <div className="message-block user-message">
                                    <div className="message-header">
                                        <span className="sender">👤 {selectedConversation.UserName}</span>
                                        <span className="date">{new Date(selectedConversation.UserMessageDate).toLocaleString()}</span>
                                    </div>
                                    <div className="message-content">
                                        {selectedConversation.UserMessage}
                                    </div>
                                </div>

                                {/* Admin Reply (if exists) */}
                                {selectedConversation.AdminReply && (
                                    <div className="message-block admin-message">
                                        <div className="message-header">
                                            <span className="sender">👨‍💼 Admin (You)</span>
                                            <span className="date">{new Date(selectedConversation.AdminReplyDate).toLocaleString()}</span>
                                        </div>
                                        <div className="message-content">
                                            {selectedConversation.AdminReply}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Reply Input - Only show if status is Pending (not replied yet) */}
                            {selectedConversation.Status === 'Pending' && (
                                <div className="reply-input-area">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="✏️ Type your reply here..."
                                        rows="4"
                                        disabled={sending}
                                    />
                                    <button onClick={handleSendReply} disabled={sending}>
                                        {sending ? '📤 Sending...' : '📤 Send Reply'}
                                    </button>
                                </div>
                            )}
                            {selectedConversation.Status === 'Replied' && (
                                <div className="already-replied">
                                    ✅ Reply already sent. User will send follow-up if needed.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-selection">
                            <h3>📭 Select a Conversation</h3>
                            <p>Choose a conversation from the left panel to view and reply.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminMessages;