import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { publicAPI, getCurrentUser } from '../api';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import './Contact.css';

function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const user = getCurrentUser();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            toast.error('Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            const response = await publicAPI.contactSupport({
                ...formData,
                clientId: user?.id || null
            });
            
            if (response.data.success) {
                toast.success('Message sent successfully!');
                setFormData({ name: '', email: '', subject: '', message: '' });
            }
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contact-container">
            <div className="contact-header">
                <h1>Contact Us</h1>
                <p>We're here to help! Send us a message and we'll get back to you soon.</p>
            </div>

            <div className="contact-content">
                <div className="contact-info">
                    <div className="info-card">
                        <FaEnvelope className="info-icon" />
                        <h3>Email Us</h3>
                        <p>support@railway.com</p>
                        <p>complaints@railway.com</p>
                    </div>
                    <div className="info-card">
                        <FaPhone className="info-icon" />
                        <h3>Call Us</h3>
                        <p>111-111-111</p>
                        <p>24/7 Customer Support</p>
                    </div>
                    <div className="info-card">
                        <FaMapMarkerAlt className="info-icon" />
                        <h3>Visit Us</h3>
                        <p>Railway Headquarters</p>
                        <p>Lahore, Pakistan</p>
                    </div>
                    <div className="info-card">
                        <FaClock className="info-icon" />
                        <h3>Support Hours</h3>
                        <p>Monday - Friday: 9AM - 6PM</p>
                        <p>Saturday: 10AM - 4PM</p>
                    </div>
                </div>

                <div className="contact-form">
                    <h2>Send us a Message</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Your Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your name"
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Address *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Subject *</label>
                            <input
                                type="text"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                placeholder="What is this regarding?"
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label>Message *</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows="5"
                                placeholder="Describe your issue or question..."
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="send-btn" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Contact;