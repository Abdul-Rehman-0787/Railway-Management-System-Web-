import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI, setAuthData } from '../api';
import './Signup.css';

function Signup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            toast.error('Please fill all required fields');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        try {
            const response = await authAPI.register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone || null,
                password: formData.password
            });
            
            if (response.data.success) {
                const { token, user } = response.data.data;
                setAuthData(token, user);
                toast.success('Registration successful!');
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-card">
                <div className="signup-header">
                    <div className="train-icon">🚂</div>
                    <h1>Create Account</h1>
                    <p>Join us for a seamless railway experience</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name *</label>
                            <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} disabled={loading} />
                        </div>
                        <div className="form-group">
                            <label>Last Name *</label>
                            <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} disabled={loading} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Email *</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={loading} />
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} disabled={loading} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Password *</label>
                            <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} disabled={loading} />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password *</label>
                            <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} disabled={loading} />
                        </div>
                    </div>
                    <button type="submit" className="signup-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
                <div className="signup-footer">
                    <p>Already have an account? <Link to="/login">Login here</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Signup;