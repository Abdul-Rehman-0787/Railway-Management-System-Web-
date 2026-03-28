import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, clearAuthData } from '../api';
import { FaTrain, FaTicketAlt, FaCalendarAlt, FaStar, FaEnvelope, FaUser, FaSignOutAlt } from 'react-icons/fa';
import './Layout.css';

function Layout({ children }) {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const authenticated = isAuthenticated();

    const handleLogout = () => {
        clearAuthData();
        navigate('/login');
    };

    return (
        <div className="layout">
            <header className="header">
                <div className="header-container">
                    <div className="logo">
                        <FaTrain className="logo-icon" />
                        <Link to="/">Railway Management System</Link>
                    </div>
                    <nav className="nav-menu">
                        <Link to="/schedules" className="nav-link">
                            <FaCalendarAlt /> Schedules
                        </Link>
                        {authenticated && (
                            <>
                                <Link to="/bookings" className="nav-link">
                                    <FaTicketAlt /> My Bookings
                                </Link>
                                <Link to="/catalogue" className="nav-link">
                                    <FaStar /> Catalogue
                                </Link>
                                <Link to="/ratings" className="nav-link">
                                    <FaStar /> Ratings
                                </Link>
                                <Link to="/dashboard" className="nav-link">
                                    <FaUser /> Dashboard
                                </Link>
                            </>
                        )}
                        <Link to="/contact" className="nav-link">
                            <FaEnvelope /> Contact
                        </Link>
                        {authenticated ? (
                            <button onClick={handleLogout} className="logout-btn">
                                <FaSignOutAlt /> Logout
                            </button>
                        ) : (
                            <Link to="/login" className="login-btn-nav">Login</Link>
                        )}
                    </nav>
                </div>
            </header>
            <main className="main-content">
                {children}
            </main>
            <footer className="footer">
                <div className="footer-container">
                    <div className="footer-section">
                        <h3>Railway Management System</h3>
                        <p>Your trusted partner for railway travel in Pakistan</p>
                    </div>
                    <div className="footer-section">
                        <h4>Quick Links</h4>
                        <Link to="/schedules">Train Schedules</Link>
                        <Link to="/contact">Contact Us</Link>
                        <Link to="/ratings">Reviews</Link>
                    </div>
                    <div className="footer-section">
                        <h4>Contact Info</h4>
                        <p>Email: support@railway.com</p>
                        <p>Phone: 111-111-111</p>
                        <p>24/7 Customer Support</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2024 Railway Management System. All rights reserved.</p>
                    <p>Team: Taha Ijaz, Abdul Rehman, Mian Bilal Razzaq</p>
                </div>
            </footer>
        </div>
    );
}

export default Layout;