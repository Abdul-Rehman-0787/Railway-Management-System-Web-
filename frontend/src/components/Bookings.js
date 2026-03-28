import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { protectedAPI, publicAPI } from '../api';
import { FaTrain, FaCalendar, FaMoneyBillWave, FaTrash, FaStar } from 'react-icons/fa';
import './Bookings.css';

function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loyalty, setLoyalty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelModal, setCancelModal] = useState(null);
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [bookingsRes, loyaltyRes] = await Promise.all([
                protectedAPI.getMyBookings(),
                protectedAPI.getLoyalty()
            ]);
            if (bookingsRes.data.success) setBookings(bookingsRes.data.data);
            if (loyaltyRes.data.success) setLoyalty(loyaltyRes.data.data);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason for cancellation');
            return;
        }

        try {
            const response = await protectedAPI.cancelBooking(cancelModal.BookingID, reason);
            if (response.data.success) {
                toast.success('Booking cancelled successfully');
                setCancelModal(null);
                setReason('');
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cancellation failed');
        }
    };

    if (loading) return <div className="loading">Loading bookings...</div>;

    return (
        <div className="bookings-container">
            <h1>My Bookings</h1>
            
            {loyalty && (
                <div className="loyalty-card">
                    <div className="loyalty-info">
                        <FaStar className="loyalty-icon" />
                        <div>
                            <h3>Loyalty Rewards</h3>
                            <p className="tier">{loyalty.TierLevel} Tier</p>
                        </div>
                    </div>
                    <div className="points-info">
                        <span className="points">{loyalty.TotalPoints} Points</span>
                        <span className="bookings-count">{loyalty.TotalBookings} Bookings</span>
                    </div>
                </div>
            )}

            {bookings.length === 0 ? (
                <div className="no-bookings">
                    <p>No bookings found. Book your first train ticket now!</p>
                </div>
            ) : (
                <div className="bookings-list">
                    {bookings.map(booking => (
                        <div key={booking.BookingID} className="booking-card">
                            <div className="booking-header">
                                <FaTrain className="train-icon" />
                                <div>
                                    <h3>{booking.TrainName}</h3>
                                    <p className="train-number">{booking.TrainNumber}</p>
                                </div>
                                <span className={`booking-status ${booking.BookingStatus.toLowerCase()}`}>
                                    {booking.BookingStatus}
                                </span>
                            </div>

                            <div className="booking-details">
                                <div className="route">
                                    <div>
                                        <strong>{booking.DepartureStation}</strong>
                                        <p>{new Date(booking.DepartureTime).toLocaleString()}</p>
                                    </div>
                                    <div className="arrow">→</div>
                                    <div>
                                        <strong>{booking.ArrivalStation}</strong>
                                        <p>{new Date(booking.ArrivalTime).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="booking-info">
                                    <div className="info-item">
                                        <FaCalendar />
                                        <span>Booked: {new Date(booking.BookingDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="info-item">
                                        <FaMoneyBillWave />
                                        <span>Amount: Rs. {booking.TotalAmount}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="seat-label">Seat: {booking.SeatNumber}</span>
                                    </div>
                                </div>
                            </div>

                            {booking.BookingStatus === 'Confirmed' && (
                                <button 
                                    className="cancel-booking-btn"
                                    onClick={() => setCancelModal(booking)}
                                >
                                    <FaTrash /> Cancel Booking
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Cancel Modal */}
            {cancelModal && (
                <div className="modal-overlay" onClick={() => setCancelModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Cancel Booking</h2>
                        <p><strong>Train:</strong> {cancelModal.TrainName}</p>
                        <p><strong>Date:</strong> {new Date(cancelModal.DepartureTime).toLocaleString()}</p>
                        <p><strong>Amount:</strong> Rs. {cancelModal.TotalAmount}</p>
                        <div className="form-group">
                            <label>Reason for cancellation:</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows="3"
                                placeholder="Please tell us why you're cancelling..."
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setCancelModal(null)}>Keep Booking</button>
                            <button className="confirm-btn" onClick={handleCancel}>Confirm Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Bookings;