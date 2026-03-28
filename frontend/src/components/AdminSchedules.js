import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentUser } from '../api';
import toast from 'react-hot-toast';
import { FaEdit, FaTrash, FaPlus, FaTrain, FaMapMarkerAlt, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import './AdminSchedules.css';

function AdminSchedules() {
    const [schedules, setSchedules] = useState([]);
    const [trains, setTrains] = useState([]);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [formData, setFormData] = useState({
        trainId: '',
        departureStationId: '',
        arrivalStationId: '',
        departureTime: '',
        arrivalTime: '',
        ticketPrice: '',
        availableSeats: '',
        status: 'Scheduled'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const [schedulesRes, trainsRes, stationsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/schedules', { headers }),
                axios.get('http://localhost:5000/api/trains'),
                axios.get('http://localhost:5000/api/stations')
            ]);
            
            setSchedules(schedulesRes.data.data);
            setTrains(trainsRes.data.data);
            setStations(stationsRes.data.data);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        try {
            if (editingSchedule) {
                // Update existing schedule
                await axios.put(
                    `http://localhost:5000/api/admin/schedules/${editingSchedule.ScheduleID}`,
                    formData,
                    { headers }
                );
                toast.success('Schedule updated successfully!');
            } else {
                // Add new schedule
                await axios.post(
                    'http://localhost:5000/api/admin/schedules',
                    formData,
                    { headers }
                );
                toast.success('Schedule added successfully!');
            }
            
            setShowForm(false);
            setEditingSchedule(null);
            setFormData({
                trainId: '',
                departureStationId: '',
                arrivalStationId: '',
                departureTime: '',
                arrivalTime: '',
                ticketPrice: '',
                availableSeats: '',
                status: 'Scheduled'
            });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            trainId: schedule.TrainID,
            departureStationId: schedule.DepartureStationID,
            arrivalStationId: schedule.ArrivalStationID,
            departureTime: schedule.DepartureTime.slice(0, 16),
            arrivalTime: schedule.ArrivalTime.slice(0, 16),
            ticketPrice: schedule.TicketPrice,
            availableSeats: schedule.AvailableSeats,
            status: schedule.Status
        });
        setShowForm(true);
    };

    const handleDelete = async (scheduleId) => {
        if (!window.confirm('Are you sure you want to delete this schedule?')) return;
        
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        try {
            await axios.delete(`http://localhost:5000/api/admin/schedules/${scheduleId}`, { headers });
            toast.success('Schedule deleted successfully!');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    const getStatusBadge = (status) => {
        const statusClass = {
            Scheduled: 'status-scheduled',
            Delayed: 'status-delayed',
            Cancelled: 'status-cancelled',
            Completed: 'status-completed'
        };
        return <span className={`status-badge ${statusClass[status]}`}>{status}</span>;
    };

    if (loading) return <div className="loading">Loading schedules...</div>;

    return (
        <div className="admin-schedules">
            <div className="header-section">
                <h1>Schedule Management</h1>
                <button className="add-btn" onClick={() => setShowForm(true)}>
                    <FaPlus /> Add New Schedule
                </button>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => {
                    setShowForm(false);
                    setEditingSchedule(null);
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Train</label>
                                <select name="trainId" value={formData.trainId} onChange={handleInputChange} required>
                                    <option value="">Select Train</option>
                                    {trains.map(train => (
                                        <option key={train.TrainID} value={train.TrainID}>
                                            {train.TrainName} ({train.TrainNumber})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Departure Station</label>
                                    <select name="departureStationId" value={formData.departureStationId} onChange={handleInputChange} required>
                                        <option value="">Select Station</option>
                                        {stations.map(station => (
                                            <option key={station.StationID} value={station.StationID}>
                                                {station.StationName}, {station.City}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Arrival Station</label>
                                    <select name="arrivalStationId" value={formData.arrivalStationId} onChange={handleInputChange} required>
                                        <option value="">Select Station</option>
                                        {stations.map(station => (
                                            <option key={station.StationID} value={station.StationID}>
                                                {station.StationName}, {station.City}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Departure Time</label>
                                    <input type="datetime-local" name="departureTime" value={formData.departureTime} onChange={handleInputChange} required />
                                </div>

                                <div className="form-group">
                                    <label>Arrival Time</label>
                                    <input type="datetime-local" name="arrivalTime" value={formData.arrivalTime} onChange={handleInputChange} required />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ticket Price (Rs.)</label>
                                    <input type="number" name="ticketPrice" value={formData.ticketPrice} onChange={handleInputChange} required min="0" step="0.01" />
                                </div>

                                <div className="form-group">
                                    <label>Available Seats</label>
                                    <input type="number" name="availableSeats" value={formData.availableSeats} onChange={handleInputChange} required min="0" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select name="status" value={formData.status} onChange={handleInputChange}>
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Delayed">Delayed</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={() => {
                                    setShowForm(false);
                                    setEditingSchedule(null);
                                }}>Cancel</button>
                                <button type="submit" className="submit-btn">Save Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="schedules-table-container">
                <table className="schedules-table">
                    <thead>
                        <tr>
                            <th>Train</th>
                            <th>Route</th>
                            <th>Departure</th>
                            <th>Arrival</th>
                            <th>Price</th>
                            <th>Seats</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedules.map(schedule => (
                            <tr key={schedule.ScheduleID}>
                                <td>
                                    <div className="train-info">
                                        <FaTrain className="train-icon" />
                                        <div>
                                            <strong>{schedule.TrainName}</strong>
                                            <br />
                                            <small>{schedule.TrainNumber}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="route-info">
                                        <FaMapMarkerAlt className="departure-icon" />
                                        {schedule.DepartureStation}
                                        <span className="arrow">→</span>
                                        <FaMapMarkerAlt className="arrival-icon" />
                                        {schedule.ArrivalStation}
                                    </div>
                                </td>
                                <td>
                                    <div className="time-info">
                                        <FaClock />
                                        {new Date(schedule.DepartureTime).toLocaleString()}
                                    </div>
                                </td>
                                <td>
                                    <div className="time-info">
                                        <FaClock />
                                        {new Date(schedule.ArrivalTime).toLocaleString()}
                                    </div>
                                </td>
                                <td>
                                    <div className="price-info">
                                        <FaMoneyBillWave />
                                        Rs. {schedule.TicketPrice}
                                    </div>
                                </td>
                                <td className="text-center">{schedule.AvailableSeats}</td>
                                <td>{getStatusBadge(schedule.Status)}</td>
                                <td className="actions">
                                    <button className="edit-btn" onClick={() => handleEdit(schedule)}>
                                        <FaEdit />
                                    </button>
                                    <button className="delete-btn" onClick={() => handleDelete(schedule.ScheduleID)}>
                                        <FaTrash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminSchedules;