import React, { useState, useEffect } from 'react';
import { publicAPI } from '../api';
import './SeatMap.css';

// Layout rules
const COMPARTMENTS = 5;
// Berth coach: 6 berths + 2 seats per compartment
// Seater coach: 6 seats + 2 berths per compartment

function buildLayout(sleeperCoaches, seaterCoaches, bookedSet) {
    const seats = [];
    const sc = parseInt(sleeperCoaches) || 0;
    const ec = parseInt(seaterCoaches) || 0;

    // Sleeper (berth) coaches come first, labeled A, B, C...
    for (let c = 0; c < sc; c++) {
        const coachLetter = String.fromCharCode(65 + c);
        for (let comp = 1; comp <= COMPARTMENTS; comp++) {
            // 6 berths per compartment in sleeper coach
            const berthLabels = ['LB', 'MB', 'UB', 'SLB', 'SMB', 'SUB'];
            for (let b = 0; b < 6; b++) {
                const id = `${coachLetter}${comp}-${berthLabels[b]}`;
                seats.push({
                    id, number: id, type: 'berth',
                    coachIndex: c, coachLetter, coachType: 'sleeper',
                    compartment: comp,
                    isBooked: bookedSet.has(id)
                });
            }
            // 2 seats per compartment in sleeper coach
            ['S1', 'S2'].forEach(sl => {
                const id = `${coachLetter}${comp}-${sl}`;
                seats.push({
                    id, number: id, type: 'seat',
                    coachIndex: c, coachLetter, coachType: 'sleeper',
                    compartment: comp,
                    isBooked: bookedSet.has(id)
                });
            });
        }
    }

    // Seater coaches follow sleeper coaches
    for (let c = 0; c < ec; c++) {
        const coachLetter = String.fromCharCode(65 + sc + c);
        for (let comp = 1; comp <= COMPARTMENTS; comp++) {
            // 6 seats per compartment in seater coach
            const rowLabels = ['A', 'B', 'C'];
            ['L', 'R'].forEach(side => {
                rowLabels.forEach(row => {
                    const id = `${coachLetter}${comp}-${row}${side}`;
                    seats.push({
                        id, number: id, type: 'seat',
                        coachIndex: sc + c, coachLetter, coachType: 'seater',
                        compartment: comp,
                        isBooked: bookedSet.has(id)
                    });
                });
            });
            // 2 berths per compartment in seater coach
            ['UB', 'LB'].forEach(bl => {
                const id = `${coachLetter}${comp}-${bl}`;
                seats.push({
                    id, number: id, type: 'berth',
                    coachIndex: sc + c, coachLetter, coachType: 'seater',
                    compartment: comp,
                    isBooked: bookedSet.has(id)
                });
            });
        }
    }

    return seats;
}

function SeatMap({ trainId, scheduleId, trainName, bookingType, onSeatSelect, selectedSeat, price, sleeperCoaches, seaterCoaches }) {
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookedSeats, setBookedSeats] = useState([]);
    const [error, setError] = useState(null);
    const [hoveredSeat, setHoveredSeat] = useState(null);

    useEffect(() => {
        loadSeatMap();
    }, [scheduleId, sleeperCoaches, seaterCoaches]);

    const loadSeatMap = async () => {
        setLoading(true);
        setError(null);
        try {
            const bookedResponse = scheduleId
                ? await publicAPI.getBookedSeats(scheduleId)
                : { data: { success: true, data: [] } };

            const booked = (bookedResponse.data?.success ? bookedResponse.data.data : []).map(item => String(item).trim());
            setBookedSeats(booked);
            const bookedSet = new Set(booked);

            const sc = sleeperCoaches ?? 2;
            const ec = seaterCoaches ?? 6;
            const generated = buildLayout(sc, ec, bookedSet);
            setSeats(generated);
        } catch (err) {
            setError('Could not load seat data. Using default layout.');
            const bookedSet = new Set(bookedSeats.map(s => String(s).trim()));
            setSeats(buildLayout(2, 6, bookedSet));
        } finally {
            setLoading(false);
        }
    };

    const handleSeatClick = (seat) => {
        if (seat.isBooked) {
            alert('This spot is already booked. Please choose another.');
            return;
        }
        if (seat.type !== bookingType) {
            alert(`This is a ${seat.type}. Please select a ${bookingType === 'seat' ? 'Seat 💺' : 'Berth 🛌'}.`);
            return;
        }
        onSeatSelect(seat.id, price, seat.type);
    };

    const filteredSeats = seats.filter(s => s.type === bookingType);

    // Group by coach
    const byCoach = filteredSeats.reduce((acc, seat) => {
        const key = seat.coachLetter;
        if (!acc[key]) acc[key] = { letter: seat.coachLetter, type: seat.coachType, seats: [] };
        acc[key].seats.push(seat);
        return acc;
    }, {});

    const totalSeats = seats.filter(s => s.type === 'seat').length;
    const totalBerths = seats.filter(s => s.type === 'berth').length;
    const availableOfType = filteredSeats.filter(s => !s.isBooked).length;

    if (loading) return <div className="seat-map-loading">Loading seat layout...</div>;

    return (
        <div className="seat-map-container">
            <div className="map-header">
                <h3>{trainName || 'Train'} — {bookingType === 'seat' ? '💺 Seat Layout' : '🛌 Berth Layout'}</h3>
                <div className="legend">
                    <div className="legend-item"><span className="legend-box available"></span><span>Available</span></div>
                    <div className="legend-item"><span className="legend-box selected"></span><span>Selected</span></div>
                    <div className="legend-item"><span className="legend-box booked"></span><span>Booked</span></div>
                </div>
                <div className="price-info">
                    Price per {bookingType}: <strong>PKR {price}</strong>
                </div>
                <div className="seat-summary">
                    <span>Total Seats: {totalSeats}</span>
                    <span>Total Berths: {totalBerths}</span>
                    <span>Available {bookingType}s: {availableOfType}</span>
                </div>
            </div>

            {error && <div className="seat-map-error">{error}</div>}

            {filteredSeats.length === 0 ? (
                <div className="seat-map-empty">
                    No {bookingType === 'seat' ? 'seats' : 'berths'} found for this schedule.
                    Try switching booking type.
                </div>
            ) : (
                <div className="train-layout">
                    <div className="train-engine">🚂 ENGINE</div>

                    {Object.values(byCoach).map(coach => (
                        <div key={coach.letter} className={`coach-section coach-${coach.type}`}>
                            <div className="coach-header">
                                <span>Coach {coach.letter}</span>
                                <span className="coach-type-badge">
                                    {coach.type === 'sleeper' ? '🛌 Sleeper' : '💺 Seater'}
                                    &nbsp;·&nbsp;
                                    {bookingType === 'seat'
                                        ? `${coach.type === 'sleeper' ? 2 : 6} seats/compartment`
                                        : `${coach.type === 'sleeper' ? 6 : 2} berths/compartment`}
                                </span>
                            </div>
                            <div className="seats-grid">
                                {coach.seats.map(seat => {
                                    const isSelected = selectedSeat === seat.id;
                                    return (
                                        <div
                                            key={seat.id}
                                            className={`seat-item ${seat.type} ${seat.isBooked ? 'booked' : 'available'} ${isSelected ? 'selected' : ''} ${hoveredSeat === seat.id ? 'hover' : ''}`}
                                            onClick={() => handleSeatClick(seat)}
                                            onMouseEnter={() => setHoveredSeat(seat.id)}
                                            onMouseLeave={() => setHoveredSeat(null)}
                                            title={`${seat.id} — ${seat.isBooked ? 'Booked' : 'Available'}`}
                                        >
                                            <div className="seat-number">{seat.number}</div>
                                            <div className="seat-type">{seat.type === 'seat' ? '💺' : '🛌'}</div>
                                            {seat.isBooked && <div className="seat-status">Booked</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="train-guard">🚃 GUARD VAN</div>
                </div>
            )}

            {selectedSeat && (
                <div className="selected-info">
                    ✅ Selected {bookingType}: <strong>{selectedSeat}</strong> at PKR {price}
                </div>
            )}
        </div>
    );
}

export default SeatMap;