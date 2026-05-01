import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI, setAuthData } from '../api';
import './Login.css';
import logo from '../assets/logo.jpg';

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            toast.error('Please fill all fields');
            return;
        }
        
        setLoading(true);
        try {
            const response = await authAPI.login(formData);
            if (response.data.success) {
                const { token, user } = response.data.data;
                setAuthData(token, user);
                toast.success('Login successful!');
                const userRole = user.role || 'User';
                if (userRole === 'Admin') { 
                    navigate('/admin/dashboard');
                    // Reload page after login
                    window.location.href = user.role === 'Admin' ? '/admin/dashboard' : '/dashboard';
                } else {
                    navigate('/dashboard');
                    // Reload page after login
                    window.location.href = user.role === 'Admin' ? '/admin/dashboard' : '/dashboard';
                }
            } else {
                toast.error(response.data.message || 'Login failed');
            }   
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={logo} alt="Railway Logo" className="login-logo" />
                    <div className="train-icon">🚂</div>
                    <h1>Railway Management System</h1>
                    <p>Welcome back! Please login</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})} 
                            disabled={loading} 
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            value={formData.password} 
                            onChange={(e) => setFormData({...formData, password: e.target.value})} 
                            disabled={loading} 
                            placeholder="Enter your password"
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div className="login-footer">
                    <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Login;