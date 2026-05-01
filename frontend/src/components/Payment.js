import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getCurrentUser } from '../api';
import './Payment.css';

function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { bookingId, scheduleDetails, expiryTime, amount } = location.state || {};
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiry: '',
        cvv: '',
        name: ''
    });
    
    useEffect(() => {
        if (!bookingId) {
            navigate('/schedules');
            return;
        }
        if (expiryTime) {
            const interval = setInterval(() => {
                const now = new Date().getTime();
                const expiry = new Date(expiryTime).getTime();
                const diff = expiry - now;
                if (diff <= 0) {
                    clearInterval(interval);
                    toast.error('Payment window expired. Booking cancelled.');
                    navigate('/schedules');
                } else {
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft({ minutes, seconds });
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [bookingId, expiryTime, navigate]);

    const handleInputChange = (e) => {
        setCardDetails({ ...cardDetails, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!cardDetails.cardNumber || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
            toast.error('Please fill all card details');
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('/payment/confirm', {
                bookingId,
                paymentMethod: 'card',
                cardDetails
            });
            if (response.data.success) {
                toast.success('Payment successful! Booking confirmed.');
                const user = getCurrentUser();
                if (user?.role === 'Admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/dashboard');  // <-- user dashboard, not admin dashboard
                }
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (window.confirm('Cancel this booking? Your seat will be released.')) {
            try {
                await api.post(`/bookings/${bookingId}/cancel-pending`);
                toast.success('Booking cancelled');
                navigate('/schedules');
            } catch (error) {
                toast.error('Cancel failed');
            }
        }
    };

    if (loading) return (
    <div className="payment-loading">
        💳 Processing payment...
    </div>
    );
    
    return (
        <div className="payment-container">
            <div className="payment-card">
                <h1>Complete Payment</h1>
                {timeLeft && (
                    <div className="timer">
                        ⏰ Complete payment in: {timeLeft.minutes}:{timeLeft.seconds < 10 ? '0' : ''}{timeLeft.seconds}
                    </div>
                )}
                <div className="booking-summary">
                    <h3>Booking Details</h3>
                    <p><strong>Train:</strong> {scheduleDetails?.TrainName}</p>
                    <p><strong>From:</strong> {scheduleDetails?.DepartureStation} → <strong>To:</strong> {scheduleDetails?.ArrivalStation}</p>
                    <p><strong>Departure:</strong> {new Date(scheduleDetails?.DepartureTime).toLocaleString()}</p>
                    <p><strong>Amount:</strong> PKR {amount}</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Cardholder Name</label>
                        <input type="text" name="name" value={cardDetails.name} onChange={handleInputChange} placeholder="John Doe" required />
                    </div>
                    <div className="form-group">
                        <label>Card Number</label>
                        <input type="text" name="cardNumber" value={cardDetails.cardNumber} onChange={handleInputChange} placeholder="1234 5678 9012 3456" maxLength="19" required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Expiry (MM/YY)</label>
                            <input type="text" name="expiry" value={cardDetails.expiry} onChange={handleInputChange} placeholder="MM/YY" required />
                        </div>
                        <div className="form-group">
                            <label>CVV</label>
                            <input type="password" name="cvv" value={cardDetails.cvv} onChange={handleInputChange} placeholder="123" maxLength="4" required />
                        </div>
                    </div>
                    <button type="submit" className="pay-btn" disabled={loading}>
                        {loading ? 'Processing...' : `Pay PKR ${amount}`}
                    </button>
                    <button type="button" className="cancel-btn" onClick={handleCancel}>
                        Cancel Booking
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Payment;