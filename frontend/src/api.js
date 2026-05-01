import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle auth errors
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ============================================
// AUTH APIs
// ============================================
export const authAPI = {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    getCurrentUser: () => API.get('/auth/me'),
    logout: () => API.post('/auth/logout')
};

// ============================================
// PUBLIC APIs
// ============================================
export const publicAPI = {
    getSchedules: () => API.get('/schedules'),
    getScheduleById: (id) => API.get(`/schedules/${id}`),
    getStations: () => API.get('/stations'),
    getTrains: () => API.get('/trains'),
    getCatalogue: () => API.get('/catalogue'),
    getRatings: () => API.get('/ratings'),
    contactSupport: (data) => API.post('/contact', data)
};

// ============================================
// PROTECTED APIs (User)
// ============================================
export const protectedAPI = {
    // Booking
    bookTicket: (data) => API.post('/bookings', data),
    getMyBookings: () => API.get('/my-bookings'),
    cancelBooking: (id, reason) => API.post(`/bookings/${id}/cancel`, { reason }),
    cancelPendingBooking: (id) => API.post(`/bookings/${id}/cancel-pending`),
    requestRefund: (id, reason) => API.post(`/bookings/${id}/request-refund`, { reason }),
    
    // Ratings & Loyalty
    submitRating: (data) => API.post('/ratings', data),
    getLoyalty: () => API.get('/loyalty'),
    
    // User Messaging - New Functions
    sendUserMessage: (subject, message) => API.post('/messages/send', { subject, message }),
    sendFollowUp: (conversationId, message) => API.post(`/messages/${conversationId}/followup`, { message }),
    getUserConversation: () => API.get('/messages/my-conversation'),
    getConversationMessages: (conversationId) => API.get(`/messages/${conversationId}`)
};

// ============================================
// ADMIN APIs
// ============================================
export const adminAPI = {
    // User Management
    getAllUsers: () => API.get('/admin/users'),
    createAdmin: (data) => API.post('/admin/create', data),
    searchUsers: (query) => API.get(`/admin/users/search?q=${query}`),
    
    // Booking Management
    getAllBookings: () => API.get('/admin/bookings'),
    updateBookingStatus: (bookingId, status, seatNumber) => API.put(`/admin/bookings/${bookingId}`, { status, seatNumber }),
    searchBookings: (query) => API.get(`/admin/bookings/search?q=${query}`),
    
    // Refund Management
    getRefundRequests: () => API.get('/admin/refund-requests'),
    approveRefund: (id, comment) => API.post(`/admin/refund-requests/${id}/approve`, { comment }),
    rejectRefund: (id, comment) => API.post(`/admin/refund-requests/${id}/reject`, { comment }),
    
    // Schedule Management
    getSchedules: () => API.get('/admin/schedules'),
    addSchedule: (data) => API.post('/admin/schedules', data),
    updateSchedule: (id, data) => API.put(`/admin/schedules/${id}`, data),
    deleteSchedule: (id) => API.delete(`/admin/schedules/${id}`),
    
    // Admin Messaging - New Functions
    getAllConversations: () => API.get('/admin/messages/all'),
    sendAdminReply: (conversationId, reply) => API.post(`/admin/messages/${conversationId}/reply`, { reply }),
    getConversationDetail: (conversationId) => API.get(`/admin/messages/${conversationId}`),
    getPendingMessages: () => API.get('/admin/messages/pending')
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export const isAuthenticated = () => !!localStorage.getItem('token');

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
};

export const setAuthData = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const logout = () => {
    clearAuthData();
    window.location.href = '/login';
};

export default API;