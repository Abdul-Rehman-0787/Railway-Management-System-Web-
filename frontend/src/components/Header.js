import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, clearAuthData } from '../api';
import toast from 'react-hot-toast';
import logo from '../assets/logo.jpg';
import './Header.css';

function Header() {
    const navigate = useNavigate();
    const isLoggedIn = isAuthenticated();
    const user = getCurrentUser();
    const isAdmin = user?.role === 'Admin';

    const handleLogout = () => {
        clearAuthData();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="header-container">
                <div className="logo">
                    {/* Logo Image - This is what was missing */}
                    <img src={logo} alt="Railway Logo" className="logo-image" />
                    <Link to="/">
                        <span className="train-icon">🚂</span>
                        <span className="logo-text">Railway System</span>
                    </Link>
                </div>
                <nav className="nav-menu">
                    <Link to="/schedules" className="nav-link">Schedules</Link>
                    <Link to="/catalogue" className="nav-link">Catalogue</Link>
                    <Link to="/ratings" className="nav-link">Ratings</Link>
                    <Link to="/contact" className="nav-link">Contact</Link>
                    {isLoggedIn && (
                        <>
                            <Link to="/bookings" className="nav-link">My Bookings</Link>
                            <Link to="/dashboard" className="nav-link">Dashboard</Link>
                        </>
                    )}
                    {isAdmin && (
                        <>
                            <Link to="/admin/dashboard" className="nav-link admin-link">Admin Dashboard</Link>
                            <Link to="/admin/schedules" className="nav-link admin-link">Manage Schedules</Link>
                            <Link to="/admin/create" className="nav-link admin-link">Create Admin</Link>
                        </>
                    )}
                </nav>
                <div className="auth-buttons">
                    {isLoggedIn ? (
                        <div className="user-menu">
                            <span className="user-name">👤 {user?.firstName}</span>
                            {isAdmin && <span className="admin-badge">Admin</span>}
                            <button onClick={handleLogout} className="logout-btn">Logout</button>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="login-btn-nav">Login</Link>
                            <Link to="/signup" className="signup-btn-nav">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;