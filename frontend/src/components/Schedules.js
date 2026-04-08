import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { publicAPI, protectedAPI, isAuthenticated, getCurrentUser } from '../api';
import { FaTrain, FaMapMarkerAlt, FaClock, FaMoneyBillWave, FaTicketAlt } from 'react-icons/fa';
import './Schedules.css';

function Schedules() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingModal, setBookingModal] = useState(null);
    const [seatNumber, setSeatNumber] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const response = await publicAPI.getSchedules();
            if (response.data.success) {
                setSchedules(response.data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch schedules');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (schedule) => {
        if (!isAuthenticated()) {
            toast.error('Please login to book tickets');
            navigate('/login');
            return;
        }

        if (!seatNumber) {
            toast.error('Please enter seat number');
            return;
        }

        try {
            const response = await protectedAPI.bookTicket({
                scheduleId: schedule.ScheduleID,
                seatNumber: seatNumber
            });

            if (response.data.success) {
                const { bookingId, paymentExpiry } = response.data.data;
                
                // Close modal
                setBookingModal(null);
                setSeatNumber('');
                
                // Navigate to payment page with booking details
                navigate('/payment', {
                    state: {
                        bookingId: bookingId,
                        scheduleDetails: schedule,
                        expiryTime: paymentExpiry,
                        amount: schedule.TicketPrice
                    }
                });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Booking failed');
        }
    };

    if (loading) return <div className="loading">Loading schedules...</div>;

    return (
        <div className="schedules-container">
            <h1>Train Schedules</h1>
            <p>Find and book your next journey</p>

            <div className="schedules-grid">
                {schedules.map(schedule => (
                    <div key={schedule.ScheduleID} className="schedule-card">
                        <div className="train-header">
                            <FaTrain className="train-icon" />
                            <div>
                                <h3>{schedule.TrainName}</h3>
                                <p className="train-number">{schedule.TrainNumber}</p>
                                <span className={`train-type ${schedule.TrainType.toLowerCase()}`}>
                                    {schedule.TrainType}
                                </span>
                            </div>
                        </div>

                        <div className="route-info">
                            <div className="station">
                                <FaMapMarkerAlt className="station-icon" />
                                <div>
                                    <strong>{schedule.DepartureStation}</strong>
                                    <p>{new Date(schedule.DepartureTime).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="arrow">→</div>
                            <div className="station">
                                <FaMapMarkerAlt className="station-icon arrival" />
                                <div>
                                    <strong>{schedule.ArrivalStation}</strong>
                                    <p>{new Date(schedule.ArrivalTime).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="journey-info">
                            <div className="info-item">
                                <FaClock />
                                <span>
                                    Duration: {Math.round((new Date(schedule.ArrivalTime) - new Date(schedule.DepartureTime)) / (1000 * 60 * 60))} hours
                                </span>
                            </div>
                            <div className="info-item">
                                <FaMoneyBillWave />
                                <span>Price: Rs. {schedule.TicketPrice}</span>
                            </div>
                            <div className="info-item">
                                <FaTicketAlt />
                                <span>Available: {schedule.AvailableSeats} seats</span>
                            </div>
                        </div>

                        <button 
                            className="book-btn"
                            onClick={() => setBookingModal(schedule)}
                            disabled={schedule.AvailableSeats === 0}
                        >
                            {schedule.AvailableSeats === 0 ? 'Sold Out' : 'Book Now'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Booking Modal */}
            {bookingModal && (
                <div className="modal-overlay" onClick={() => setBookingModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Book Ticket</h2>
                        <div className="modal-details">
                            <p><strong>Train:</strong> {bookingModal.TrainName} ({bookingModal.TrainNumber})</p>
                            <p><strong>From:</strong> {bookingModal.DepartureStation}</p>
                            <p><strong>To:</strong> {bookingModal.ArrivalStation}</p>
                            <p><strong>Departure:</strong> {new Date(bookingModal.DepartureTime).toLocaleString()}</p>
                            <p><strong>Price:</strong> Rs. {bookingModal.TicketPrice}</p>
                        </div>
                        <div className="form-group">
                            <label>Seat Number:</label>
                            <input
                                type="text"
                                value={seatNumber}
                                onChange={(e) => setSeatNumber(e.target.value)}
                                placeholder="e.g., A12, B08"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setBookingModal(null)}>Cancel</button>
                            <button className="confirm-btn" onClick={() => handleBook(bookingModal)}>Confirm Booking</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Schedules;