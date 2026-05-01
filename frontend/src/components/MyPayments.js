import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { protectedAPI, getCurrentUser } from '../api';
import './MyPayments.css';

function MyPayments() {
    const [pendingBookings, setPendingBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPendingPayments();
    }, []);

    const fetchPendingPayments = async () => {
        try {
            const response = await protectedAPI.getMyBookings();
            const allBookings = response.data.data || [];
            const pending = allBookings.filter(b => b.PaymentStatus === 'Pending');
            setPendingBookings(pending);
        } catch (error) {
            toast.error('Failed to load pending payments');
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = (booking) => {
        navigate('/payment', {
            state: {
                bookingId: booking.BookingID,
                scheduleDetails: {
                    TrainName: booking.TrainName,
                    DepartureStation: booking.DepartureStation,
                    ArrivalStation: booking.ArrivalStation,
                    DepartureTime: booking.DepartureTime,
                    TicketPrice: booking.TotalAmount
                },
                expiryTime: booking.PaymentExpiry,
                amount: booking.TotalAmount
            }
        });
    };

    const handleCancelPending = async (bookingId) => {
        if (window.confirm('Cancel this pending booking? The seat will be released.')) {
            try {
                await protectedAPI.cancelPendingBooking(bookingId);
                toast.success('Booking cancelled');
                fetchPendingPayments();
            } catch (error) {
                toast.error('Cancel failed');
            }
        }
    };

    if (loading) return (
    <div className="loading-spinner">
        💳 Loading pending payments...
    </div>
    );
    

    return (
        <div className="my-payments-container">
            <h1>My Pending Payments</h1>
            {pendingBookings.length === 0 ? (
                <div className="no-payments">No pending payments. All your bookings are paid or cancelled.</div>
            ) : (
                <div className="payments-list">
                    {pendingBookings.map(booking => (
                        <div key={booking.BookingID} className="payment-card">
                            <h3>{booking.TrainName} ({booking.TrainNumber})</h3>
                            <p><strong>Route:</strong> {booking.DepartureStation} → {booking.ArrivalStation}</p>
                            <p><strong>Departure:</strong> {new Date(booking.DepartureTime).toLocaleString()}</p>
                            <p><strong>Seat:</strong> {booking.SeatNumber || 'Not assigned'}</p>
                            <p><strong>Amount:</strong> Rs. {booking.TotalAmount}</p>
                            {booking.PaymentExpiry && (
                                <p className="expiry">
                                    <strong>Pay before:</strong> {new Date(booking.PaymentExpiry).toLocaleString()}
                                </p>
                            )}
                            <div className="payment-actions">
                                <button className="pay-now-btn" onClick={() => handlePayNow(booking)}>
                                    Pay Now
                                </button>
                                <button className="cancel-pending-btn" onClick={() => handleCancelPending(booking.BookingID)}>
                                    Cancel Booking
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyPayments;