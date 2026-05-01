import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

    // Get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    };

    // Fetch all data
    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = getAuthHeaders();
            
            const [schedulesRes, trainsRes, stationsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/admin/schedules', { headers }),
                axios.get('http://localhost:5000/api/trains'),
                axios.get('http://localhost:5000/api/stations')
            ]);
            
            setSchedules(schedulesRes.data.data || []);
            setTrains(trainsRes.data.data || []);
            setStations(stationsRes.data.data || []);
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (formData.departureTime >= formData.arrivalTime) {
            toast.error('Arrival time must be after departure time');
            return;
        }
        
        const headers = getAuthHeaders();
        
        // Format dates for SQL Server (YYYY-MM-DD HH:MM:SS)
        const formatForSQL = (dateTimeStr) => {
            if (!dateTimeStr) return null;
            return new Date(dateTimeStr).toISOString().slice(0, 19).replace('T', ' ');
        };
        
        const payload = {
            trainId: parseInt(formData.trainId),
            departureStationId: parseInt(formData.departureStationId),
            arrivalStationId: parseInt(formData.arrivalStationId),
            departureTime: formatForSQL(formData.departureTime),
            arrivalTime: formatForSQL(formData.arrivalTime),
            ticketPrice: parseFloat(formData.ticketPrice),
            availableSeats: parseInt(formData.availableSeats),
            status: formData.status
        };
        
        try {
            if (editingSchedule) {
                await axios.put(
                    `http://localhost:5000/api/admin/schedules/${editingSchedule.ScheduleID}`,
                    payload,
                    { headers }
                );
                toast.success('Schedule updated successfully!');
            } else {
                await axios.post(
                    'http://localhost:5000/api/admin/schedules',
                    payload,
                    { headers }
                );
                toast.success('Schedule added successfully!');
            }
            
            // Close modal and refresh data
            setShowForm(false);
            setEditingSchedule(null);
            resetForm();
            
            // IMPORTANT: Refresh the schedules list
            await fetchData();
            
        } catch (error) {
            console.error('Submit error:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const resetForm = () => {
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
    };

    const handleEdit = (schedule) => {
        const formatDateForInput = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toISOString().slice(0, 16);
        };
        
        setEditingSchedule(schedule);
        setFormData({
            trainId: schedule.TrainID,
            departureStationId: schedule.DepartureStationID,
            arrivalStationId: schedule.ArrivalStationID,
            departureTime: formatDateForInput(schedule.DepartureTime),
            arrivalTime: formatDateForInput(schedule.ArrivalTime),
            ticketPrice: schedule.TicketPrice,
            availableSeats: schedule.AvailableSeats,
            status: schedule.Status || 'Scheduled'
        });
        setShowForm(true);
    };

    const handleDelete = async (scheduleId) => {
        if (!window.confirm('Are you sure you want to delete this schedule? This may affect existing bookings.')) return;
        
        const headers = getAuthHeaders();
        
        try {
            await axios.delete(`http://localhost:5000/api/admin/schedules/${scheduleId}`, { headers });
            toast.success('Schedule deleted successfully!');
            await fetchData(); // Refresh after delete
        } catch (error) {
            console.error('Delete error:', error);
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
        return <span className={`status-badge ${statusClass[status] || 'status-scheduled'}`}>{status || 'Scheduled'}</span>;
    };

    if (loading) return (
    <div className="loading-spinner">
        🚆 Loading schedules...
    </div>
    );

    return (
        <div className="admin-schedules">
            <div className="header-section">
                <h1>Schedule Management</h1>
                <button className="add-btn" onClick={() => setShowForm(true)}>
                    <FaPlus /> Add New Schedule
                </button>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="modal-overlay" onClick={() => {
                    setShowForm(false);
                    setEditingSchedule(null);
                    resetForm();
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Train *</label>
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
                                    <label>Departure Station *</label>
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
                                    <label>Arrival Station *</label>
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

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ticket Price (Rs.) *</label>
                                    <input 
                                        type="number" 
                                        name="ticketPrice" 
                                        value={formData.ticketPrice} 
                                        onChange={handleInputChange} 
                                        required 
                                        min="0" 
                                        step="0.01" 
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Available Seats *</label>
                                    <input 
                                        type="number" 
                                        name="availableSeats" 
                                        value={formData.availableSeats} 
                                        onChange={handleInputChange} 
                                        required 
                                        min="0" 
                                    />
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
                                    resetForm();
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    Save Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Schedules Table */}
            <div className="schedules-table-container">
                {schedules.length === 0 ? (
                    <div className="no-data">No schedules found. Click "Add New Schedule" to create one.</div>
                ) : (
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
                )}
            </div>
        </div>
    );
}

export default AdminSchedules;