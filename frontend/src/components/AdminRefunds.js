import React, { useState, useEffect } from 'react';
import api, { getUserRole } from '../api';
import toast from 'react-hot-toast';
import './AdminRefunds.css';

function AdminRefunds() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState({});

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/admin/refund-requests');
            setRequests(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load refund requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        const adminComment = comment[requestId] || '';
        if (window.confirm('Approve this refund? 30% fee will be deducted.')) {
            try {
                await api.post(`/admin/refund-requests/${requestId}/approve`, { comment: adminComment });
                toast.success('Refund approved');
                fetchRequests();
            } catch (error) {
                toast.error('Approval failed');
            }
        }
    };

    const handleReject = async (requestId) => {
        const adminComment = comment[requestId] || '';
        if (window.confirm('Reject this refund request?')) {
            try {
                await api.post(`/admin/refund-requests/${requestId}/reject`, { comment: adminComment });
                toast.success('Refund rejected');
                fetchRequests();
            } catch (error) {
                toast.error('Rejection failed');
            }
        }
    };

    if (loading) return (
    <div className="loading-spinner">
        💰 Loading refund requests...
    </div>
    );

    return (
        <div className="admin-refunds">
            <h1>Refund Requests</h1>
            <table className="refunds-table">
                <thead>
                    <tr>
                        <th>ID</th><th>User</th><th>Train</th><th>Amount</th><th>Refund (70%)</th><th>Reason</th><th>Status</th><th>Admin Comment</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => (
                        <tr key={req.RequestID}>
                            <td>{req.RequestID}</td>
                            <td>{req.FirstName} {req.LastName}<br/><small>{req.Email}</small></td>
                            <td>{req.TrainName}</td>
                            <td>PKR {req.RequestedAmount}</td>
                            <td>PKR {req.RefundAmount}</td>
                            <td>{req.Reason}</td>
                            <td className={`status-${req.Status.toLowerCase()}`}>{req.Status}</td>
                            <td>
                                <input 
                                    type="text" 
                                    placeholder="Add comment" 
                                    value={comment[req.RequestID] || ''}
                                    onChange={(e) => setComment({...comment, [req.RequestID]: e.target.value})}
                                />
                            </td>
                            <td>
                                {req.Status === 'Pending' && (
                                    <>
                                        <button className="approve-btn" onClick={() => handleApprove(req.RequestID)}>Approve</button>
                                        <button className="reject-btn" onClick={() => handleReject(req.RequestID)}>Reject</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminRefunds;