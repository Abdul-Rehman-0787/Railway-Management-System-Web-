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

// Auth APIs
export const authAPI = {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    getCurrentUser: () => API.get('/auth/me'),
    logout: () => API.post('/auth/logout')
};

// Public APIs
export const publicAPI = {
    getSchedules: () => API.get('/schedules'),
    getScheduleById: (id) => API.get(`/schedules/${id}`),
    getStations: () => API.get('/stations'),
    getTrains: () => API.get('/trains'),
    getCatalogue: () => API.get('/catalogue'),
    getRatings: () => API.get('/ratings'),
    contactSupport: (data) => API.post('/contact', data)
};

// Protected APIs (require auth)
export const protectedAPI = {
    bookTicket: (data) => API.post('/bookings', data),
    getMyBookings: () => API.get('/my-bookings'),
    cancelBooking: (id, reason) => API.post(`/bookings/${id}/cancel`, { reason }),
    cancelPendingBooking: (id) => API.post(`/bookings/${id}/cancel-pending`),
    requestRefund: (id, reason) => API.post(`/bookings/${id}/request-refund`, { reason }),
    submitRating: (data) => API.post('/ratings', data),
    getLoyalty: () => API.get('/loyalty')
};

// Helper functions
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

// Admin APIs
export const adminAPI = {
    getAllUsers: () => API.get('/admin/users'),
    getAllBookings: () => API.get('/admin/bookings'),
    createAdmin: (data) => API.post('/admin/create', data),
    getRefundRequests: () => API.get('/admin/refund-requests'),
    approveRefund: (id, comment) => API.post(`/admin/refund-requests/${id}/approve`, { comment }),
    rejectRefund: (id, comment) => API.post(`/admin/refund-requests/${id}/reject`, { comment })
};

export default API;