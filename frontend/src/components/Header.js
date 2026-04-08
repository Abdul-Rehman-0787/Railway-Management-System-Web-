import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, logout } from '../api';
import logo from '../assets/logo.jpg';      // correct import from assets
import './Header.css';

function Header() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        const updateAuth = () => {
            const auth = isAuthenticated();
            setIsAuth(auth);
            if (auth) setUser(getCurrentUser());
            else setUser(null);
        };
        updateAuth();
        window.addEventListener('storage', updateAuth);
        return () => window.removeEventListener('storage', updateAuth);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isAdmin = user?.role === 'Admin';

    return (
        <header className="header">
            <div className="header-container">
                <div className="logo">
                    <img src={logo} alt="Train Logo" className="logo-image" />
                    <span className="logo-text">Railway System</span>
                </div>

                <div className="nav-auth-wrapper">
                    <nav className="nav-menu">
                        <Link to="/schedules" className="nav-link">Schedules</Link>
                        <Link to="/catalogue" className="nav-link">Catalogue</Link>
                        <Link to="/ratings" className="nav-link">Ratings</Link>
                        <Link to="/contact" className="nav-link">Contact</Link>

                        {isAuth && !isAdmin && (
                            <>
                                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                                <Link to="/bookings" className="nav-link">My Bookings</Link>
                                <Link to="/my-payments" className="nav-link">My Payments</Link>
                            </>
                        )}

                        {isAuth && isAdmin && (
                            <>
                                <Link to="/admin/dashboard" className="nav-link admin-link">Admin Dashboard</Link>
                                <Link to="/admin/schedules" className="nav-link admin-link">Manage Schedules</Link>
                                <Link to="/admin/refunds" className="nav-link admin-link">Refund Requests</Link>
                            </>
                        )}
                    </nav>

                    <div className="auth-buttons">
                        {!isAuth ? (
                            <>
                                <Link to="/login" className="login-btn-nav">Login</Link>
                                <Link to="/signup" className="signup-btn-nav">Sign Up</Link>
                            </>
                        ) : (
                            <div className="user-menu">
                                <span className="user-name">Hi, {user?.firstName || user?.FirstName}</span>
                                {isAdmin && <span className="admin-badge">Admin</span>}
                                <button onClick={handleLogout} className="logout-btn">Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;