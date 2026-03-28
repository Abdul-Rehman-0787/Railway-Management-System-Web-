import React, { useEffect, useState } from 'react';
import { adminAPI } from '../api';
import './AdminDashboard.css';

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, bookingsRes] = await Promise.all([
                adminAPI.getAllUsers(),
                adminAPI.getAllBookings()
            ]);
            setUsers(usersRes.data.data);
            setBookings(bookingsRes.data.data);
        } catch (err) {
            console.error('Error fetching admin data:', err);
            setError('Failed to load data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading admin dashboard...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>

            <h2>All Users</h2>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Created At</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.ClientID}>
                            <td>{user.ClientID}</td>
                            <td>{user.FirstName} {user.LastName}</td>
                            <td>{user.Email}</td>
                            <td>{user.Phone || '-'}</td>
                            <td>
                                <span className={`role-badge ${user.Role.toLowerCase()}`}>
                                    {user.Role}
                                </span>
                            </td>
                            <td>{new Date(user.CreatedAt).toLocaleDateString()}</td>
                            <td>{user.IsActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h2>All Bookings</h2>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Passenger</th>
                        <th>Train</th>
                        <th>Route</th>
                        <th>Date</th>
                        <th>Seat</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {bookings.map(booking => (
                        <tr key={booking.BookingID}>
                            <td>{booking.BookingID}</td>
                            <td>{booking.FirstName} {booking.LastName}<br/><small>{booking.Email}</small></td>
                            <td>{booking.TrainName}<br/><small>{booking.TrainNumber}</small></td>
                            <td>{booking.DepartureStation} → {booking.ArrivalStation}</td>
                            <td>{new Date(booking.DepartureTime).toLocaleString()}</td>
                            <td>{booking.SeatNumber || '-'}</td>
                            <td>Rs. {booking.TotalAmount}</td>
                            <td>
                                <span className={`booking-status ${booking.Status.toLowerCase()}`}>
                                    {booking.Status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminDashboard;