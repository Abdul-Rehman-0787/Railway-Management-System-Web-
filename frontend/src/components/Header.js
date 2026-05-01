import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser, logout } from '../api';
import logo from '../assets/logo.jpg';
import './Header.css';

function Header() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAuth, setIsAuth] = useState(false);
    const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

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

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isAdminDropdownOpen && !event.target.closest('.admin-dropdown')) {
                setIsAdminDropdownOpen(false);
            }
            if (isUserDropdownOpen && !event.target.closest('.user-dropdown')) {
                setIsUserDropdownOpen(false);
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isAdminDropdownOpen, isUserDropdownOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const closeAllDropdowns = () => {
        setIsAdminDropdownOpen(false);
        setIsUserDropdownOpen(false);
    };

    const isAdmin = user?.role === 'Admin';

    return (
        <header className="header">
            <div className="header-container">
                <div className="logo">
                    <img src={logo} alt="Train Logo" className="logo-image" />
                    <span className="logo-text">National Railway System</span>
                </div>

                <div className="nav-auth-wrapper">
                    <nav className="nav-menu">
                        {/* Public Links - Always Visible (Contact hidden for Admin) */}
                        <Link to="/schedules" className="nav-link" onClick={closeAllDropdowns}>📅 Schedules</Link>
                        <Link to="/catalogue" className="nav-link" onClick={closeAllDropdowns}>📚 Catalogue</Link>
                        <Link to="/ratings" className="nav-link" onClick={closeAllDropdowns}>⭐ Ratings</Link>
                        
                        {/* Contact Page - Hidden for Admin, Visible for Everyone Else */}
                        {!isAdmin && (
                            <Link to="/contact" className="nav-link" onClick={closeAllDropdowns}>📞 Contact</Link>
                        )}

                        {/* User Dropdown (Visible when logged in as User or Admin) */}
                        {isAuth && (
                            <div className="dropdown user-dropdown">
                                <button 
                                    className={`dropdown-btn nav-link ${isUserDropdownOpen ? 'open' : ''}`}
                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                >
                                    👤 My Account ▼
                                </button>
                                {isUserDropdownOpen && (
                                    <div className="dropdown-content">
                                        <Link to="/my-messages" onClick={closeAllDropdowns}>
                                            💬 My Messages
                                        </Link>
                                        <Link to="/dashboard" onClick={closeAllDropdowns}>
                                            📊 Dashboard
                                        </Link>
                                        <Link to="/bookings" onClick={closeAllDropdowns}>
                                            🎫 My Bookings
                                        </Link>
                                        <Link to="/my-payments" onClick={closeAllDropdowns}>
                                            💳 My Payments
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Admin Dropdown (Visible only for Admin) */}
                        {isAuth && isAdmin && (
                            <div className="dropdown admin-dropdown">
                                <button 
                                    className={`dropdown-btn nav-link admin-link ${isAdminDropdownOpen ? 'open' : ''}`}
                                    onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                                >
                                    👑 Admin Panel ▼
                                </button>
                                {isAdminDropdownOpen && (
                                    <div className="dropdown-content">
                                        <Link to="/admin/dashboard" onClick={closeAllDropdowns}>
                                            📊 Dashboard
                                        </Link>
                                        <Link to="/admin/schedules" onClick={closeAllDropdowns}>
                                            🗓️ Manage Schedules
                                        </Link>
                                        <Link to="/admin/refunds" onClick={closeAllDropdowns}>
                                            💰 Refund Requests
                                        </Link>
                                        <Link to="/admin/messages" onClick={closeAllDropdowns}>
                                            💬 Support Messages
                                        </Link>
                                        <Link to="/admin/create" onClick={closeAllDropdowns}>
                                            👤 Create Admin
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>

                    <div className="auth-buttons">
                        {!isAuth ? (
                            <>
                                <Link to="/login" className="login-btn-nav">🔐 Login</Link>
                                <Link to="/signup" className="signup-btn-nav">📝 Sign Up</Link>
                            </>
                        ) : (
                            <div className="user-menu">
                                <span className="user-name">Hi, {user?.firstName || user?.FirstName}</span>
                                {isAdmin && <span className="admin-badge">Admin</span>}
                                <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;