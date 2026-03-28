import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { protectedAPI, getCurrentUser } from '../api';
import { FaTicketAlt, FaStar, FaCalendarAlt, FaCrown, FaArrowRight } from 'react-icons/fa';
import './Dashboard.css';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [loyalty, setLoyalty] = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const userData = getCurrentUser();
            setUser(userData);

            const [loyaltyRes, bookingsRes] = await Promise.all([
                protectedAPI.getLoyalty(),
                protectedAPI.getMyBookings()
            ]);

            if (loyaltyRes.data.success) setLoyalty(loyaltyRes.data.data);
            if (bookingsRes.data.success) setRecentBookings(bookingsRes.data.data.slice(0, 3));
        } catch (error) {
            console.error('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getTierColor = (tier) => {
        switch(tier?.toLowerCase()) {
            case 'platinum': return '#eab308';
            case 'gold': return '#f59e0b';
            case 'silver': return '#94a3b8';
            default: return '#cd7b2d';
        }
    };

    if (loading) return <div className="loading">Loading dashboard...</div>;

    return (
        <div className="dashboard-container">
            <div className="welcome-section">
                <h1>Welcome back, {user?.firstName}!</h1>
                <p>Here's your railway journey summary</p>
            </div>

            {loyalty && (
                <div className="loyalty-section" style={{ borderColor: getTierColor(loyalty.TierLevel) }}>
                    <div className="loyalty-badge">
                        <FaCrown style={{ color: getTierColor(loyalty.TierLevel) }} />
                        <span className="tier-name">{loyalty.TierLevel}</span>
                    </div>
                    <div className="points-display">
                        <span className="points-value">{loyalty.TotalPoints}</span>
                        <span className="points-label">Loyalty Points</span>
                    </div>
                    <div className="stats">
                        <div className="stat">
                            <span className="stat-value">{loyalty.TotalBookings}</span>
                            <span className="stat-label">Total Bookings</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">Rs. {loyalty.TotalSpent}</span>
                            <span className="stat-label">Total Spent</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <Link to="/schedules" className="action-card">
                        <FaCalendarAlt className="action-icon" />
                        <h3>Book a Ticket</h3>
                        <p>Find and book your next journey</p>
                        <FaArrowRight className="action-arrow" />
                    </Link>
                    <Link to="/bookings" className="action-card">
                        <FaTicketAlt className="action-icon" />
                        <h3>My Bookings</h3>
                        <p>View and manage your reservations</p>
                        <FaArrowRight className="action-arrow" />
                    </Link>
                    <Link to="/ratings" className="action-card">
                        <FaStar className="action-icon" />
                        <h3>Rate Your Ride</h3>
                        <p>Share your travel experience</p>
                        <FaArrowRight className="action-arrow" />
                    </Link>
                </div>
            </div>

            {recentBookings.length > 0 && (
                <div className="recent-bookings">
                    <h2>Recent Bookings</h2>
                    <div className="bookings-list">
                        {recentBookings.map(booking => (
                            <div key={booking.BookingID} className="booking-item">
                                <div className="booking-train">
                                    <strong>{booking.TrainName}</strong>
                                    <span className="booking-number">{booking.TrainNumber}</span>
                                </div>
                                <div className="booking-route">
                                    {booking.DepartureStation} → {booking.ArrivalStation}
                                </div>
                                <div className="booking-date">
                                    {new Date(booking.DepartureTime).toLocaleDateString()}
                                </div>
                                <div className="booking-status">{booking.BookingStatus}</div>
                            </div>
                        ))}
                    </div>
                    <Link to="/bookings" className="view-all">View All Bookings →</Link>
                </div>
            )}
        </div>
    );
}

export default Dashboard;