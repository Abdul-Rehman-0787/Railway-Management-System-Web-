import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { publicAPI, protectedAPI, isAuthenticated } from '../api';
import { FaTrain, FaMapMarkerAlt, FaClock, FaMoneyBillWave, FaTicketAlt, FaChair, FaBed } from 'react-icons/fa';
import SeatMap from './SeatMap';
import './Schedules.css';

function Schedules() {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingModal, setBookingModal] = useState(null);
    const [selectedSeat, setSelectedSeat] = useState('');
    const [bookingType, setBookingType] = useState('seat');
    const navigate = useNavigate();

    useEffect(() => { fetchSchedules(); }, []);

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

    const handleBookClick = (schedule) => {
        if (!isAuthenticated()) {
            toast.error('Please login to book tickets');
            navigate('/login');
            return;
        }
        setBookingModal(schedule);
        setSelectedSeat('');
        setBookingType('seat');
    };

    const handleSeatSelect = (seatId) => {
        setSelectedSeat(seatId);
    };

    const getSeatPrice = () => bookingModal?.SeatPrice || 500;
    const getBerthPrice = () => bookingModal?.BerthPrice || 1000;

    const handleConfirmBooking = async () => {
        if (!selectedSeat) {
            toast.error('Please select a seat or berth');
            return;
        }

        const price = bookingType === 'seat' ? getSeatPrice() : getBerthPrice();

        try {
            const response = await protectedAPI.bookTicket({
                scheduleId: bookingModal.ScheduleID,
                seatNumber: selectedSeat,
                bookingType: bookingType,
                price: price
            });

            if (response.data.success) {
                const { bookingId, paymentExpiry } = response.data.data;
                toast.success('Booking created! Proceed to payment.');
                navigate('/payment', {
                    state: {
                        bookingId,
                        scheduleDetails: bookingModal,
                        selectedSeat,
                        bookingType,
                        amount: price,
                        expiryTime: paymentExpiry
                    }
                });
                setBookingModal(null);
                setSelectedSeat('');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Booking failed');
        }
    };

    if (loading) return (
        <div className="schedules-loading">🚂 Loading train schedules...</div>
    );

    return (
        <div className="schedules-container">
            <h1>Train Schedules</h1>
            <p>Find and book your next journey</p>

            <div className="schedules-grid">
                {schedules.map(schedule => {
                    const sc = parseInt(schedule.SleeperCoaches) || 0;
                    const ec = parseInt(schedule.SeaterCoaches) || 0;
                    const totalBerths = sc * 5 * 6 + ec * 5 * 2;
                    const totalSeats = sc * 5 * 2 + ec * 5 * 6;

                    return (
                        <div key={schedule.ScheduleID} className="schedule-card">
                            <div className="train-header">
                                <FaTrain className="train-icon" />
                                <div>
                                    <h3>{schedule.TrainName}</h3>
                                    <p className="train-number">{schedule.TrainNumber}</p>
                                    <span className={`train-type ${schedule.TrainType?.toLowerCase() || 'express'}`}>
                                        {schedule.TrainType || 'Express'}
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
                                    <FaChair />
                                    <span>Seat: PKR {schedule.SeatPrice || 500}</span>
                                    <FaBed style={{ marginLeft: '8px' }} />
                                    <span>Berth: PKR {schedule.BerthPrice || 1000}</span>
                                </div>
                                <div className="info-item">
                                    <FaTicketAlt />
                                    <span>
                                        {schedule.SleeperCoaches || 0} sleeper + {schedule.SeaterCoaches || 0} seater coaches
                                        &nbsp;({totalSeats} seats, {totalBerths} berths)
                                    </span>
                                </div>
                                <div className="info-item">
                                    <FaMoneyBillWave />
                                    <span>Available: {schedule.AvailableSeats} spots</span>
                                </div>
                            </div>

                            <button
                                className="book-btn"
                                onClick={() => handleBookClick(schedule)}
                                disabled={schedule.AvailableSeats === 0}
                            >
                                {schedule.AvailableSeats === 0 ? 'Sold Out' : 'Book Now'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Booking Modal */}
            {bookingModal && (
                <div className="modal-overlay" onClick={() => setBookingModal(null)}>
                    <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
                        <h2>Book Ticket</h2>
                        <div className="modal-details">
                            <p><strong>Train:</strong> {bookingModal.TrainName} ({bookingModal.TrainNumber})</p>
                            <p><strong>Route:</strong> {bookingModal.DepartureStation} → {bookingModal.ArrivalStation}</p>
                            <p><strong>Departure:</strong> {new Date(bookingModal.DepartureTime).toLocaleString()}</p>
                            <p><strong>Coaches:</strong> {bookingModal.SleeperCoaches || 0} Sleeper + {bookingModal.SeaterCoaches || 0} Seater</p>
                        </div>

                        {/* Booking Type */}
                        <div className="form-group">
                            <label>Select Booking Type</label>
                            <div className="booking-type-selector">
                                <button
                                    className={`type-btn ${bookingType === 'seat' ? 'active' : ''}`}
                                    onClick={() => { setBookingType('seat'); setSelectedSeat(''); }}
                                >
                                    <FaChair /> Seat (PKR {getSeatPrice()})
                                </button>
                                <button
                                    className={`type-btn ${bookingType === 'berth' ? 'active' : ''}`}
                                    onClick={() => { setBookingType('berth'); setSelectedSeat(''); }}
                                >
                                    <FaBed /> Berth (PKR {getBerthPrice()})
                                </button>
                            </div>
                        </div>

                        {/* Seat Map */}
                        <SeatMap
                            trainId={bookingModal.TrainID}
                            scheduleId={bookingModal.ScheduleID}
                            trainName={bookingModal.TrainName}
                            bookingType={bookingType}
                            onSeatSelect={handleSeatSelect}
                            selectedSeat={selectedSeat}
                            price={bookingType === 'seat' ? getSeatPrice() : getBerthPrice()}
                            sleeperCoaches={bookingModal.SleeperCoaches}
                            seaterCoaches={bookingModal.SeaterCoaches}
                        />

                        <div className="booking-summary">
                            <div className="summary-row">
                                <span>Selected:</span>
                                <strong>{selectedSeat || 'Not selected'}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Price:</span>
                                <strong>PKR {bookingType === 'seat' ? getSeatPrice() : getBerthPrice()}</strong>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setBookingModal(null)}>Cancel</button>
                            <button
                                className="confirm-btn"
                                onClick={handleConfirmBooking}
                                disabled={!selectedSeat}
                            >
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Schedules;