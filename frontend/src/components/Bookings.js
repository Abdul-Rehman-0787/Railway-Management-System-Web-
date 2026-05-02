import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { protectedAPI } from '../api';
import './Bookings.css';

function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refundReason, setRefundReason] = useState({});
    const [showRefundModal, setShowRefundModal] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await protectedAPI.getMyBookings();
            setBookings(response.data.data || []);
        } catch (error) {
            toast.error('Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelPending = async (bookingId) => {
        if (window.confirm('Cancel this pending booking? The seat will be released.')) {
            try {
                await protectedAPI.cancelPendingBooking(bookingId);
                toast.success('Booking cancelled');
                fetchBookings();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Cancel failed');
            }
        }
    };

    const handleRequestRefund = async (bookingId) => {
        const reason = refundReason[bookingId] || '';
        if (!reason.trim()) {
            toast.error('Please provide a reason for refund');
            return;
        }
        try {
            const response = await protectedAPI.requestRefund(bookingId, reason);
            if (response.data.success) {
                toast.success('Refund request submitted. Admin will review.');
                setShowRefundModal(null);
                setRefundReason({});
                fetchBookings();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Refund request failed');
        }
    };

    const getStatusBadge = (bookingStatus, paymentStatus) => {
        if (paymentStatus === 'Refunded_Admin') {
            return <span className="badge refunded-admin">✅ Fully Refunded (100%)</span>;
        }
        if (paymentStatus === 'Refunded_User') {
            return <span className="badge refunded-user">💰 Refunded (70% after fee)</span>;
        }
        if (bookingStatus === 'Cancelled') {
            return <span className="badge cancelled">❌ Cancelled</span>;
        }
        if (paymentStatus === 'Pending') {
            return <span className="badge pending">⏳ Payment Pending</span>;
        }
        if (paymentStatus === 'Paid' && bookingStatus === 'Confirmed') {
            return <span className="badge confirmed">✅ Confirmed</span>;
        }
        if (paymentStatus === 'RefundRequested') {
            return <span className="badge refund-requested">📝 Refund Requested</span>;
        }
        return <span className="badge">{bookingStatus}</span>;
    };

    if (loading) return <div className="bookings-loading">🎫 Loading your bookings...</div>;

    return (
        <div className="bookings-container">
            <h1>My Bookings</h1>
            {bookings.length === 0 ? (
                <div className="no-bookings">No bookings found.</div>
            ) : (
                <div className="bookings-list">
                    {bookings.map(booking => (
                        <div key={booking.BookingID} className="booking-card">
                            <div className="booking-header">
                                <h3>{booking.TrainName} ({booking.TrainNumber})</h3>
                                {getStatusBadge(booking.BookingStatus, booking.PaymentStatus)}
                            </div>
                            <div className="booking-details">
                                <p><strong>Route:</strong> {booking.DepartureStation} → {booking.ArrivalStation}</p>
                                <p><strong>Departure:</strong> {new Date(booking.DepartureTime).toLocaleString()}</p>
                                <p><strong>Booking Type:</strong> 
                                    <span className={`booking-type ${booking.BookingType}`}>
                                        {booking.BookingType === 'berth' ? '🛌 Sleeper Berth' : '💺 Seat'}
                                    </span>
                                </p>
                                <p><strong>Selected:</strong> {booking.SeatNumber || 'Not assigned'}</p>
                                <p><strong>Amount:</strong> PKR {booking.TotalAmount}</p>
                                <p><strong>Booked on:</strong> {new Date(booking.BookingDate).toLocaleString()}</p>
                                {booking.PaymentExpiry && booking.PaymentStatus === 'Pending' && (
                                    <p className="expiry">⏰ Pay before: {new Date(booking.PaymentExpiry).toLocaleString()}</p>
                                )}
                                {booking.PaymentStatus === 'RefundRequested' && (
                                    <p className="pending-msg">⏳ Waiting for admin approval</p>
                                )}
                            </div>
                            <div className="booking-actions">
                                {booking.PaymentStatus === 'Pending' && (
                                    <button className="cancel-pending-btn" onClick={() => handleCancelPending(booking.BookingID)}>
                                        Cancel Booking
                                    </button>
                                )}
                                {booking.PaymentStatus === 'Paid' && booking.BookingStatus === 'Confirmed' && (
                                    <button className="refund-btn" onClick={() => setShowRefundModal(booking.BookingID)}>
                                        Request Refund
                                    </button>
                                )}
                                {booking.PaymentStatus === 'RefundRequested' && (
                                    <span className="info-text">📋 Refund request under review</span>
                                )}
                                {(booking.PaymentStatus === 'Refunded_Admin' || booking.PaymentStatus === 'Refunded_User') && (
                                    <span className="info-text refunded-info">✅ Refund completed</span>
                                )}
                            </div>

                            {showRefundModal === booking.BookingID && (
                                <div className="modal-overlay" onClick={() => setShowRefundModal(null)}>
                                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                                        <h3>Request Refund</h3>
                                        <p>Please provide a reason for cancellation and refund:</p>
                                        <textarea
                                            rows="3"
                                            placeholder="e.g., Change of plans, train delayed, medical emergency, etc."
                                            value={refundReason[booking.BookingID] || ''}
                                            onChange={(e) => setRefundReason({...refundReason, [booking.BookingID]: e.target.value})}
                                        />
                                        <div className="refund-info">
                                            <p><strong>Original amount:</strong> PKR {booking.TotalAmount}</p>
                                            <p><strong>Deduction (30% fee):</strong> PKR {Math.round(booking.TotalAmount * 0.3)}</p>
                                            <p><strong>Refund amount:</strong> PKR {Math.round(booking.TotalAmount * 0.7)}</p>
                                        </div>
                                        <div className="modal-actions">
                                            <button className="cancel-modal" onClick={() => setShowRefundModal(null)}>Close</button>
                                            <button className="submit-refund" onClick={() => handleRequestRefund(booking.BookingID)}>Submit Request</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Bookings;