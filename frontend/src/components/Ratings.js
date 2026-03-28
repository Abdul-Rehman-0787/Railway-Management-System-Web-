import React, { useState, useEffect } from 'react';
import { publicAPI, protectedAPI, isAuthenticated, getCurrentUser } from '../api';
import toast from 'react-hot-toast';
import { FaStar, FaUser, FaCalendar } from 'react-icons/fa';
import './Ratings.css';

function Ratings() {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        rating: 5,
        review: ''
    });
    const [schedules, setSchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState('');

    useEffect(() => {
        fetchRatings();
        if (isAuthenticated()) {
            fetchSchedules();
        }
    }, []);

    const fetchRatings = async () => {
        try {
            const response = await publicAPI.getRatings();
            if (response.data.success) {
                setRatings(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch ratings');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const response = await publicAPI.getSchedules();
            if (response.data.success) {
                setSchedules(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch schedules');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedSchedule && !formData.review) {
            toast.error('Please select a journey or write a general review');
            return;
        }

        try {
            const response = await protectedAPI.submitRating({
                scheduleId: selectedSchedule || null,
                rating: formData.rating,
                review: formData.review
            });
            
            if (response.data.success) {
                toast.success('Rating submitted successfully!');
                setShowForm(false);
                setFormData({ rating: 5, review: '' });
                setSelectedSchedule('');
                fetchRatings();
            }
        } catch (error) {
            toast.error('Failed to submit rating');
        }
    };

    const renderStars = (rating) => {
        return [...Array(5)].map((_, i) => (
            <FaStar key={i} className={i < rating ? 'star filled' : 'star'} />
        ));
    };

    if (loading) return <div className="loading">Loading ratings...</div>;

    return (
        <div className="ratings-container">
            <div className="ratings-header">
                <h1>Customer Reviews</h1>
                <p>See what others say about their journey</p>
                {isAuthenticated() && (
                    <button className="write-review-btn" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : 'Write a Review'}
                    </button>
                )}
            </div>

            {showForm && (
                <div className="review-form">
                    <h3>Share Your Experience</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Select Journey (Optional):</label>
                            <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)}>
                                <option value="">General Review</option>
                                {schedules.map(s => (
                                    <option key={s.ScheduleID} value={s.ScheduleID}>
                                        {s.TrainName}: {s.DepartureStation} → {s.ArrivalStation}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Rating:</label>
                            <div className="rating-input">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <FaStar
                                        key={star}
                                        className={star <= formData.rating ? 'star filled' : 'star'}
                                        onClick={() => setFormData({ ...formData, rating: star })}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Your Review:</label>
                            <textarea
                                value={formData.review}
                                onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                                rows="4"
                                placeholder="Tell us about your experience..."
                                required
                            />
                        </div>
                        <button type="submit" className="submit-btn">Submit Review</button>
                    </form>
                </div>
            )}

            <div className="ratings-list">
                {ratings.length === 0 ? (
                    <p>No reviews yet. Be the first to share your experience!</p>
                ) : (
                    ratings.map(rating => (
                        <div key={rating.RatingID} className="rating-card">
                            <div className="rating-header">
                                <div className="user-info">
                                    <FaUser className="user-icon" />
                                    <div>
                                        <strong>{rating.FirstName} {rating.LastName}</strong>
                                        {rating.TrainName && (
                                            <p className="train-name">{rating.TrainName}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="rating-stars">
                                    {renderStars(rating.Rating)}
                                </div>
                            </div>
                            <p className="review-text">{rating.Review}</p>
                            <div className="rating-date">
                                <FaCalendar />
                                <span>{new Date(rating.RatingDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Ratings;