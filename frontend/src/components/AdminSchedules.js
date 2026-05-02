import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaEdit, FaTrash, FaPlus, FaTrain, FaTimes, FaSave,
    FaBed, FaChair, FaBox, FaCalendarAlt
} from 'react-icons/fa';
import './AdminSchedules.css';

// ─── Layout constants ──────────────────────────────────────────────────────────
const COMPARTMENTS_PER_COACH  = 5;
const BERTHS_PER_COMPARTMENT  = 6;  // berth coach: 6 berths per compartment
const SEATS_IN_BERTH_COACH    = 2;  // berth coach: 2 seats per compartment
const SEATS_PER_COMPARTMENT   = 6;  // seater coach: 6 seats per compartment
const BERTHS_IN_SEATER_COACH  = 2;  // seater coach: 2 berths per compartment

function calcCapacity(sleeperCoaches, seaterCoaches) {
    const sc = parseInt(sleeperCoaches) || 0;
    const ec = parseInt(seaterCoaches)  || 0;
    const berths          = sc * COMPARTMENTS_PER_COACH * BERTHS_PER_COMPARTMENT;
    const seatsFromSleeper = sc * COMPARTMENTS_PER_COACH * SEATS_IN_BERTH_COACH;
    const seatsFromSeater  = ec * COMPARTMENTS_PER_COACH * SEATS_PER_COMPARTMENT;
    const berthsFromSeater = ec * COMPARTMENTS_PER_COACH * BERTHS_IN_SEATER_COACH;
    return {
        berths : berths + berthsFromSeater,
        seats  : seatsFromSleeper + seatsFromSeater,
        total  : berths + seatsFromSleeper + seatsFromSeater + berthsFromSeater,
    };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
    trainId           : '',
    departureStationId: '',
    arrivalStationId  : '',
    departureTime     : '',
    arrivalTime       : '',
    seatPrice         : '',
    berthPrice        : '',
    sleeperCoaches    : '2',
    seaterCoaches     : '6',
    status            : 'Scheduled',
};

function formatForInput(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toISOString().slice(0, 16);
    } catch {
        return '';
    }
}

// Resolve station ID from a schedule row, given the full stations list.
// The admin procedure may return DepartureStationID (int) or just
// DepartureStation (name string) depending on which DB version is active.
// We try every possible field so either version works.
function resolveStationId(schedule, nameField, idField, stations) {
    // 1. Direct numeric ID field (correct procedure version)
    if (schedule[idField] != null && schedule[idField] !== '') {
        return String(schedule[idField]);
    }
    // 2. Match by station name
    const name = schedule[nameField];
    if (name) {
        const found = stations.find(
            s => s.StationName === name || s.StationName?.trim() === name?.trim()
        );
        if (found) return String(found.StationID);
    }
    return '';
}

// ─── Component ────────────────────────────────────────────────────────────────
function AdminSchedules() {
    const [schedules,       setSchedules]       = useState([]);
    const [trains,          setTrains]           = useState([]);
    const [stations,        setStations]         = useState([]);
    const [loading,         setLoading]          = useState(true);
    const [saving,          setSaving]           = useState(false);
    const [showModal,       setShowModal]        = useState(false);
    const [editingSchedule, setEditingSchedule]  = useState(null);
    const [formData,        setFormData]         = useState(EMPTY_FORM);

    useEffect(() => { fetchData(); }, []);

    // ── Data loading ────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const token   = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [schedulesRes, trainsRes, stationsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/schedules', { headers }),
                axios.get('http://localhost:5000/api/trains'),
                axios.get('http://localhost:5000/api/stations'),
            ]);
            setSchedules(schedulesRes.data.data || []);
            setTrains(trainsRes.data.data       || []);
            setStations(stationsRes.data.data   || []);
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to fetch data. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    // ── Form handlers ───────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTrainSelect = (e) => {
        setFormData(prev => ({ ...prev, trainId: e.target.value }));
    };

    // ── Open modals ─────────────────────────────────────────────────────────
    const handleOpenAddModal = () => {
        setEditingSchedule(null);
        setFormData(EMPTY_FORM);
        setShowModal(true);
    };

    const handleOpenEditModal = (schedule) => {
        // Resolve station IDs robustly (works with both old and new SP versions)
        const depId = resolveStationId(schedule, 'DepartureStation', 'DepartureStationID', stations);
        const arrId = resolveStationId(schedule, 'ArrivalStation',   'ArrivalStationID',   stations);

        setEditingSchedule(schedule);
        setFormData({
            trainId           : String(schedule.TrainID ?? ''),
            departureStationId: depId,
            arrivalStationId  : arrId,
            departureTime     : formatForInput(schedule.DepartureTime),
            arrivalTime       : formatForInput(schedule.ArrivalTime),
            seatPrice         : schedule.SeatPrice  != null ? String(schedule.SeatPrice)  : '',
            berthPrice        : schedule.BerthPrice != null ? String(schedule.BerthPrice) : '',
            sleeperCoaches    : schedule.SleeperCoaches != null ? String(schedule.SleeperCoaches) : '2',
            seaterCoaches     : schedule.SeaterCoaches != null ? String(schedule.SeaterCoaches)  : '6',
            status            : schedule.Status || 'Scheduled',
        });
        setShowModal(true);
    };

    // ── Save (add or update) ─────────────────────────────────────────────────
    const handleSaveSchedule = async (e) => {
        e.preventDefault();

        // Validate
        const seatPriceVal  = formData.seatPrice  !== '' ? Number(formData.seatPrice)  : NaN;
        const berthPriceVal = formData.berthPrice !== '' ? Number(formData.berthPrice) : NaN;

        if (
            !formData.trainId            ||
            !formData.departureStationId ||
            !formData.arrivalStationId   ||
            !formData.departureTime      ||
            !formData.arrivalTime        ||
            Number.isNaN(seatPriceVal)   ||
            Number.isNaN(berthPriceVal)
        ) {
            toast.error('Please fill all required fields with valid values.');
            return;
        }

        if (formData.departureStationId === formData.arrivalStationId) {
            toast.error('Departure and arrival stations cannot be the same.');
            return;
        }

        if (new Date(formData.arrivalTime) <= new Date(formData.departureTime)) {
            toast.error('Arrival time must be after departure time.');
            return;
        }

        const token   = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Format datetime for SQL Server  →  "YYYY-MM-DD HH:MM:SS"
        const fmt = (dt) => new Date(dt).toISOString().slice(0, 19).replace('T', ' ');

        const payload = {
            trainId           : parseInt(formData.trainId),
            departureStationId: parseInt(formData.departureStationId),
            arrivalStationId  : parseInt(formData.arrivalStationId),
            departureTime     : fmt(formData.departureTime),
            arrivalTime       : fmt(formData.arrivalTime),
            seatPrice         : parseFloat(formData.seatPrice),
            berthPrice        : parseFloat(formData.berthPrice),
            sleeperCoaches    : parseInt(formData.sleeperCoaches) || 0,
            seaterCoaches     : parseInt(formData.seaterCoaches)  || 0,
            status            : formData.status,
        };

        setSaving(true);
        try {
            if (editingSchedule) {
                const res = await axios.put(
                    `http://localhost:5000/api/admin/schedules/${editingSchedule.ScheduleID}`,
                    payload,
                    { headers }
                );
                if (res.data.success) {
                    toast.success('Schedule updated successfully!');
                } else {
                    toast.error(res.data.message || 'Update failed.');
                    return;
                }
            } else {
                const res = await axios.post(
                    'http://localhost:5000/api/admin/schedules',
                    payload,
                    { headers }
                );
                if (res.data.success) {
                    toast.success('Schedule added successfully!');
                } else {
                    toast.error(res.data.message || 'Add failed.');
                    return;
                }
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Save schedule error:', error);
            const msg = error.response?.data?.message || 'Operation failed. Check server logs.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDeleteSchedule = async (scheduleId) => {
        if (!window.confirm('Are you sure you want to delete this schedule?')) return;
        const token   = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const res = await axios.delete(
                `http://localhost:5000/api/admin/schedules/${scheduleId}`,
                { headers }
            );
            if (res.data.success) {
                toast.success('Schedule deleted successfully!');
            } else {
                toast.error(res.data.message || 'Delete failed.');
            }
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed.');
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getStatusBadge = (status) => {
        const cls = {
            Scheduled : 'status-scheduled',
            Delayed   : 'status-delayed',
            Cancelled : 'status-cancelled',
            Completed : 'status-completed',
        };
        return (
            <span className={`status-badge ${cls[status] || 'status-scheduled'}`}>
                {status || 'Scheduled'}
            </span>
        );
    };

    const capacity = calcCapacity(formData.sleeperCoaches, formData.seaterCoaches);

    // ── Render ───────────────────────────────────────────────────────────────
    if (loading) return <div className="loading-spinner">Loading schedules...</div>;

    return (
        <div className="admin-schedules-container">
            <div className="admin-header">
                <h1>📅 Schedule Management</h1>
                <button className="add-btn" onClick={handleOpenAddModal}>
                    <FaPlus /> Add Schedule
                </button>
            </div>

            {/* ── Table ── */}
            <div className="schedules-table-wrapper">
                {schedules.length === 0 ? (
                    <div className="no-data">
                        No schedules found. Click "Add Schedule" to create one.
                    </div>
                ) : (
                    <table className="schedules-table">
                        <thead>
                            <tr>
                                <th>Train</th>
                                <th>Route</th>
                                <th>Departure</th>
                                <th>Arrival</th>
                                <th>Coaches (S/E)</th>
                                <th>Capacity</th>
                                <th>Seat Price</th>
                                <th>Berth Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.map(schedule => {
                                const cap = calcCapacity(schedule.SleeperCoaches, schedule.SeaterCoaches);
                                return (
                                    <tr key={schedule.ScheduleID}>
                                        <td>
                                            <div className="train-info">
                                                <FaTrain className="train-icon" />
                                                <div>
                                                    <strong>{schedule.TrainName}</strong>
                                                    <br /><small>{schedule.TrainNumber}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="route-cell">
                                            {schedule.DepartureStation} → {schedule.ArrivalStation}
                                        </td>
                                        <td className="time-cell">
                                            {new Date(schedule.DepartureTime).toLocaleString()}
                                        </td>
                                        <td className="time-cell">
                                            {new Date(schedule.ArrivalTime).toLocaleString()}
                                        </td>
                                        <td>
                                            <div className="coach-counts">
                                                <span className="coach-badge sleeper">
                                                    🛌 {schedule.SleeperCoaches ?? '—'}
                                                </span>
                                                <span className="coach-badge seater">
                                                    💺 {schedule.SeaterCoaches ?? '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="capacity-info">
                                                <span>🛌 {cap.berths} berths</span>
                                                <span>💺 {cap.seats} seats</span>
                                                <span className="total-capacity">Total: {cap.total}</span>
                                            </div>
                                        </td>
                                        <td>PKR {schedule.SeatPrice  ?? 'N/A'}</td>
                                        <td>PKR {schedule.BerthPrice ?? 'N/A'}</td>
                                        <td>{getStatusBadge(schedule.Status)}</td>
                                        <td>
                                            <div className="actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={() => handleOpenEditModal(schedule)}
                                                >
                                                    <FaEdit /> Edit
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteSchedule(schedule.ScheduleID)}
                                                >
                                                    <FaTrash /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Modal ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingSchedule ? '✏️ Edit Schedule' : '➕ Add New Schedule'}</h2>
                            <button className="close-modal" onClick={() => setShowModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleSaveSchedule}>
                                <h3><FaCalendarAlt /> Schedule Details</h3>

                                {/* Train */}
                                <div className="form-group">
                                    <label>Train *</label>
                                    <select
                                        name="trainId"
                                        value={formData.trainId}
                                        onChange={handleTrainSelect}
                                        required
                                    >
                                        <option value="">Select Train</option>
                                        {trains.map(train => (
                                            <option key={train.TrainID} value={train.TrainID}>
                                                {train.TrainName} ({train.TrainNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Stations */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Departure Station *</label>
                                        <select
                                            name="departureStationId"
                                            value={formData.departureStationId}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Station</option>
                                            {stations.map(s => (
                                                <option key={s.StationID} value={s.StationID}>
                                                    {s.StationName}, {s.City}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Arrival Station *</label>
                                        <select
                                            name="arrivalStationId"
                                            value={formData.arrivalStationId}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Station</option>
                                            {stations.map(s => (
                                                <option key={s.StationID} value={s.StationID}>
                                                    {s.StationName}, {s.City}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Times */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Departure Time *</label>
                                        <input
                                            type="datetime-local"
                                            name="departureTime"
                                            value={formData.departureTime}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Arrival Time *</label>
                                        <input
                                            type="datetime-local"
                                            name="arrivalTime"
                                            value={formData.arrivalTime}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Prices */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label><FaChair /> Seat Price (PKR) *</label>
                                        <input
                                            type="number"
                                            name="seatPrice"
                                            value={formData.seatPrice}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            placeholder="e.g. 500"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label><FaBed /> Berth Price (PKR) *</label>
                                        <input
                                            type="number"
                                            name="berthPrice"
                                            value={formData.berthPrice}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            placeholder="e.g. 1000"
                                        />
                                    </div>
                                </div>

                                {/* Coach config */}
                                <div className="coach-config-section">
                                    <h4><FaBox /> Coach Composition for This Journey</h4>
                                    <p className="coach-rule-note">
                                        🛌 <strong>Berth coach:</strong> 5 compartments × (6 berths + 2 seats) = 30 berths + 10 seats
                                        &nbsp;|&nbsp;
                                        💺 <strong>Seater coach:</strong> 5 compartments × (6 seats + 2 berths) = 30 seats + 10 berths
                                    </p>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>🛌 Sleeper (Berth) Coaches</label>
                                            <input
                                                type="number"
                                                name="sleeperCoaches"
                                                value={formData.sleeperCoaches}
                                                onChange={handleInputChange}
                                                min="0"
                                                max="20"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>💺 Seater Coaches</label>
                                            <input
                                                type="number"
                                                name="seaterCoaches"
                                                value={formData.seaterCoaches}
                                                onChange={handleInputChange}
                                                min="0"
                                                max="20"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Live capacity preview */}
                                    <div className="capacity-preview">
                                        <div className="capacity-row">
                                            <span>Total Coaches:</span>
                                            <strong>
                                                {(parseInt(formData.sleeperCoaches) || 0) +
                                                 (parseInt(formData.seaterCoaches)  || 0)}
                                            </strong>
                                        </div>
                                        <div className="capacity-row">
                                            <span>🛌 Total Berths:</span>
                                            <strong>{capacity.berths}</strong>
                                        </div>
                                        <div className="capacity-row">
                                            <span>💺 Total Seats:</span>
                                            <strong>{capacity.seats}</strong>
                                        </div>
                                        <div className="capacity-row total">
                                            <span>Total Capacity:</span>
                                            <strong>{capacity.total}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Delayed">Delayed</option>
                                        <option value="Cancelled">Cancelled</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={() => setShowModal(false)}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={saving}
                                    >
                                        <FaSave /> {saving ? 'Saving…' : 'Save Schedule'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminSchedules;