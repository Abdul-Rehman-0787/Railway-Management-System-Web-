import React, { useState } from 'react';
import { adminAPI } from '../api';
import toast from 'react-hot-toast';
import './AdminCreate.css';

function AdminCreate() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            toast.error('Please fill all required fields');
            return;
        }
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await adminAPI.createAdmin(formData);
            toast.success('Admin user created successfully!');
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                password: ''
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="admin-create">
            <h2>Create New Admin</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>First Name *</label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        disabled={loading}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Last Name *</label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        disabled={loading}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Email *</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Phone</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={loading}
                    />
                </div>
                <div className="form-group">
                    <label>Password *</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                        required
                    />
                    <small>Minimum 6 characters</small>
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Admin'}
                </button>
            </form>
        </div>
    );
}

export default AdminCreate;