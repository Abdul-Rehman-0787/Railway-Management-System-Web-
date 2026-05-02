import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../api';
import './AdminDashboard.css';

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('id');
    const [searchCategory, setSearchCategory] = useState('users');
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [editForm, setEditForm] = useState({ status: '', seatNumber: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, bookingsRes] = await Promise.all([
                adminAPI.getAllUsers(),
                adminAPI.getAllBookings()
            ]);
            setUsers(usersRes.data.data || []);
            setBookings(bookingsRes.data.data || []);
            setSearchPerformed(false);
        } catch (err) {
            console.error('Error fetching admin data:', err);
            setError('Failed to load data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error('Please enter a search term');
            return;
        }

        setLoading(true);
        setSearchPerformed(true);
        
        try {
            if (searchCategory === 'users') {
                let results = [];
                
                if (searchType === 'id') {
                    const allUsers = await adminAPI.getAllUsers();
                    const user = allUsers.data.data.find(u => 
                        u.ClientID?.toString() === searchQuery.trim()
                    );
                    results = user ? [user] : [];
                } else if (searchType === 'name') {
                    const allUsers = await adminAPI.getAllUsers();
                    results = allUsers.data.data.filter(u => 
                        (u.FirstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                        (u.LastName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                    );
                } else if (searchType === 'email') {
                    const allUsers = await adminAPI.getAllUsers();
                    results = allUsers.data.data.filter(u => 
                        (u.Email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                    );
                }
                
                setUsers(results);
                setBookings([]);
                toast.success(`Found ${results.length} user(s)`);
                
            } else if (searchCategory === 'bookings') {
                let results = [];
                
                if (searchType === 'id') {
                    const allBookings = await adminAPI.getAllBookings();
                    const booking = allBookings.data.data.find(b => 
                        b.BookingID?.toString() === searchQuery.trim()
                    );
                    results = booking ? [booking] : [];
                } else if (searchType === 'name') {
                    const allBookings = await adminAPI.getAllBookings();
                    results = allBookings.data.data.filter(b => 
                        (b.FirstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                        (b.LastName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                    );
                } else if (searchType === 'email') {
                    const allBookings = await adminAPI.getAllBookings();
                    results = allBookings.data.data.filter(b => 
                        (b.Email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                    );
                }
                
                setBookings(results);
                setUsers([]);
                toast.success(`Found ${results.length} booking(s)`);
            }
        } catch (err) {
            console.error('Search error:', err);
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSearchQuery('');
        setSearchPerformed(false);
        fetchData();
    };

    const handleUpdateBooking = async (bookingId) => {
        try {
            // If status is being changed to 'Cancelled', use admin-cancel endpoint for FULL refund
            if (editForm.status === 'Cancelled') {
                const booking = bookings.find(b => b.BookingID === bookingId);
                const reason = prompt(`Enter reason for cancellation:\nBooking #${bookingId}\nPassenger: ${booking.FirstName} ${booking.LastName}\nTrain: ${booking.TrainName}\nAmount: Rs. ${booking.TotalAmount}\n\n⚠️ This will give a 100% FULL REFUND.`);
                if (!reason) return;
                
                const response = await adminAPI.adminCancelBooking(bookingId, reason);
                if (response.data.success) {
                    toast.success(response.data.message);
                    setEditingBooking(null);
                    fetchData();
                } else {
                    toast.error(response.data.message);
                }
            } else {
                // For status changes to Confirmed or Completed, use regular update
                const response = await adminAPI.updateBookingStatus(bookingId, editForm.status, editForm.seatNumber);
                if (response.data.success) {
                    toast.success(`Booking #${bookingId} updated successfully`);
                    setEditingBooking(null);
                    fetchData();
                }
            }
        } catch (err) {
            console.error('Update error:', err);
            const errorMsg = err.response?.data?.message || err.message;
            if (errorMsg.includes('duplicate') || errorMsg.includes('2601')) {
                toast.error(`Seat "${editForm.seatNumber}" is already booked. Please choose a different seat.`);
            } else {
                toast.error('Update failed: ' + errorMsg);
            }
        }
    };

    const openEditModal = (booking) => {
        // Only allow editing if not already cancelled or refunded
        if (booking.Status === 'Cancelled' || booking.PaymentStatus === 'Refunded_Admin' || booking.PaymentStatus === 'Refunded_User') {
            toast.error('Cannot edit cancelled or refunded booking');
            return;
        }
        setEditingBooking(booking);
        setEditForm({
            status: booking.Status,
            seatNumber: booking.SeatNumber || ''
        });
    };

    const getStatusBadge = (status) => {
        const statusClass = {
            Confirmed: 'status-confirmed',
            Pending: 'status-pending',
            Cancelled: 'status-cancelled',
            Completed: 'status-completed'
        };
        return <span className={`status-badge ${statusClass[status] || ''}`}>{status || 'N/A'}</span>;
    };

    // FIXED: Function name corrected from getPadge to getPaymentBadge
    const getPaymentBadge = (paymentStatus) => {
        const paymentClass = {
            Paid: 'payment-paid',
            Pending: 'payment-pending',
            Refunded_Admin: 'payment-refunded-admin',
            Refunded_User: 'payment-refunded-user',
            RefundRequested: 'payment-refund-requested',
            Failed: 'payment-failed'
        };
        
        const paymentText = {
            Paid: '✅ Paid',
            Pending: '⏳ Pending',
            Refunded_Admin: '💰 Refunded (100% - Admin)',
            Refunded_User: '💰 Refunded (70% - User Request)',
            RefundRequested: '📝 Refund Requested',
            Failed: '❌ Failed'
        };
        
        return <span className={`payment-badge ${paymentClass[paymentStatus] || ''}`}>
            {paymentText[paymentStatus] || paymentStatus || 'N/A'}
        </span>;
    };

    // Check if booking is locked (cannot be edited)
    const isBookingLocked = (booking) => {
        return booking.Status === 'Cancelled' || 
               booking.PaymentStatus === 'Refunded_Admin' || 
               booking.PaymentStatus === 'Refunded_User';
    };

    if (loading && !searchPerformed) return <div className="loading-spinner">Loading admin dashboard...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>

            {/* Search Section */}
            <div className="search-section">
                <h3>🔍 Search Database</h3>
                
                <div className="category-buttons">
                    <button 
                        className={`category-btn ${searchCategory === 'users' ? 'active' : ''}`}
                        onClick={() => {
                            setSearchCategory('users');
                            setSearchType('id');
                            setSearchQuery('');
                            setSearchPerformed(false);
                        }}
                    >
                        👥 Search Users
                    </button>
                    <button 
                        className={`category-btn ${searchCategory === 'bookings' ? 'active' : ''}`}
                        onClick={() => {
                            setSearchCategory('bookings');
                            setSearchType('id');
                            setSearchQuery('');
                            setSearchPerformed(false);
                        }}
                    >
                        🎫 Search Bookings
                    </button>
                </div>

                <div className="search-type-group">
                    <label>Search by:</label>
                    <select 
                        value={searchType} 
                        onChange={(e) => {
                            setSearchType(e.target.value);
                            setSearchQuery('');
                        }}
                        className="search-type-select"
                    >
                        <option value="id">🔢 ID (exact match)</option>
                        <option value="name">👤 Name (partial match)</option>
                        <option value="email">📧 Email (partial match)</option>
                    </select>
                    
                    <div className="search-hint">
                        {searchType === 'id' && (
                            <span className="hint-text">💡 Enter exact ID number (e.g., 1, 2, 999999)</span>
                        )}
                        {searchType === 'name' && (
                            <span className="hint-text">💡 Enter first name or last name (e.g., John, Doe)</span>
                        )}
                        {searchType === 'email' && (
                            <span className="hint-text">💡 Enter email address (e.g., user@example.com)</span>
                        )}
                    </div>
                </div>

                <div className="search-input-group">
                    <input
                        type="text"
                        placeholder={
                            searchType === 'id' ? `Enter ${searchCategory === 'users' ? 'User ID' : 'Booking ID'}...` :
                            searchType === 'name' ? `Enter ${searchCategory === 'users' ? 'User' : 'Passenger'} name...` :
                            `Enter email address...`
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="search-btn" onClick={handleSearch}>
                        🔍 Search
                    </button>
                    <button className="reset-btn" onClick={handleReset}>
                        🔄 Show All
                    </button>
                </div>
            </div>

            {/* Results Summary */}
            {searchPerformed && (
                <div className="results-summary">
                    {searchCategory === 'users' && (
                        <p>
                            🔍 Searched {searchCategory} by <strong>{searchType}</strong>: "{searchQuery}" → Found <strong>{users.length}</strong> result(s)
                        </p>
                    )}
                    {searchCategory === 'bookings' && (
                        <p>
                            🔍 Searched {searchCategory} by <strong>{searchType}</strong>: "{searchQuery}" → Found <strong>{bookings.length}</strong> result(s)
                        </p>
                    )}
                </div>
            )}

            {/* Users Table */}
            {users.length > 0 && (
                <>
                    <h2>{searchPerformed && searchCategory === 'users' ? 'Search Results - Users' : 'All Users'}</h2>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Role</th>
                                    <th>Created At</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.ClientID}>
                                        <td><span className="id-highlight">#{user.ClientID}</span> </td>
                                        <td>{user.FirstName} {user.LastName} </td>
                                        <td>{user.Email} </td>
                                        <td>{user.Phone || '-'} </td>
                                        <td>
                                            <span className={`role-badge ${user.Role?.toLowerCase() || 'user'}`}>
                                                {user.Role || 'User'}
                                            </span>
                                         </td>
                                        <td>{user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString() : '-'} </td>
                                        <td>{user.IsActive ? '✅ Active' : '❌ Inactive'} </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Bookings Table */}
            {bookings.length > 0 && (
                <>
                    <h2>{searchPerformed && searchCategory === 'bookings' ? 'Search Results - Bookings' : 'All Bookings'}</h2>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Booking ID</th>
                                    <th>Passenger</th>
                                    <th>Train</th>
                                    <th>Route</th>
                                    <th>Date</th>
                                    <th>Seat</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map(booking => (
                                    <tr key={booking.BookingID}>
                                        <td><span className="id-highlight">#{booking.BookingID}</span> </td>
                                        <td>
                                            <strong>{booking.FirstName} {booking.LastName}</strong>
                                            <br/><small>{booking.Email}</small>
                                         </td>
                                        <td>{booking.TrainName}<br/><small>{booking.TrainNumber}</small> </td>
                                        <td>{booking.DepartureStation} → {booking.ArrivalStation} </td>
                                        <td>{booking.DepartureTime ? new Date(booking.DepartureTime).toLocaleString() : '-'} </td>
                                        <td>{booking.SeatNumber || '-'} </td>
                                        <td>Rs. {booking.TotalAmount} </td>
                                        <td>{getStatusBadge(booking.Status)} </td>
                                        <td>{getPaymentBadge(booking.PaymentStatus)} </td>
                                        <td>
                                            {!isBookingLocked(booking) ? (
                                                <button 
                                                    className="edit-btn" 
                                                    onClick={() => openEditModal(booking)}
                                                >
                                                    ✏️ Edit
                                                </button>
                                            ) : (
                                                <span className="locked-badge" title="Cannot edit cancelled or refunded bookings">
                                                    🔒 Locked
                                                </span>
                                            )}
                                         </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* No Results Message */}
            {searchPerformed && users.length === 0 && bookings.length === 0 && searchQuery && (
                <div className="no-results-card">
                    <h3>❌ No Results Found</h3>
                    <p>No {searchCategory} found matching your search:</p>
                    <p><strong>Search by:</strong> {searchType}</p>
                    <p><strong>Query:</strong> "{searchQuery}"</p>
                    <button onClick={handleReset}>View All Data</button>
                </div>
            )}

            {/* Edit Booking Modal */}
            {editingBooking && (
                <div className="modal-overlay" onClick={() => setEditingBooking(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>✏️ Edit Booking #{editingBooking.BookingID}</h3>
                        
                        <div className="booking-info">
                            <p><strong>Passenger:</strong> {editingBooking.FirstName} {editingBooking.LastName}</p>
                            <p><strong>Train:</strong> {editingBooking.TrainName} ({editingBooking.TrainNumber})</p>
                            <p><strong>Route:</strong> {editingBooking.DepartureStation} → {editingBooking.ArrivalStation}</p>
                            <p><strong>Amount:</strong> Rs. {editingBooking.TotalAmount}</p>
                            <p><strong>Current Payment:</strong> {editingBooking.PaymentStatus}</p>
                        </div>
                        
                        <div className="form-group">
                            <label>Status</label>
                            <select 
                                value={editForm.status} 
                                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                            >
                                <option value="Confirmed">✅ Confirmed</option>
                                <option value="Cancelled">❌ Cancelled (100% Full Refund)</option>
                                <option value="Completed">🏁 Completed</option>
                            </select>
                            {editForm.status === 'Cancelled' && (
                                <div className="warning-note">
                                    ⚠️ This will issue a 100% FULL REFUND to the passenger.
                                </div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label>Seat Number</label>
                            <input
                                type="text"
                                value={editForm.seatNumber}
                                onChange={(e) => setEditForm({...editForm, seatNumber: e.target.value})}
                                placeholder="e.g., A12, B08"
                            />
                            <small className="seat-hint">Leave as is to keep current seat</small>
                        </div>
                        
                        <div className="modal-actions">
                            <button className="cancel-modal" onClick={() => setEditingBooking(null)}>Cancel</button>
                            <button className="submit-edit" onClick={() => handleUpdateBooking(editingBooking.BookingID)}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;