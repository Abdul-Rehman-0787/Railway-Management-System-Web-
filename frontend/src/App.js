import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Schedules from './components/Schedules';
import Bookings from './components/Bookings';
import Catalogue from './components/Catalogue';
import Ratings from './components/Ratings';
import Contact from './components/Contact';
import AdminDashboard from './components/AdminDashboard';
import AdminCreate from './components/AdminCreate';
import AdminSchedules from './components/AdminSchedules';
import { isAuthenticated, getCurrentUser } from './api';
import './App.css';

// Protect routes for authenticated users
const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// Admin-only route guard
const AdminRoute = ({ children }) => {
    const user = getCurrentUser();
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    if (user?.role !== 'Admin') {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

function App() {
    return (
        <Router>
            <Toaster position="top-right" />
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* Routes with Layout */}
                <Route path="/" element={
                    <Layout>
                        <Navigate to="/schedules" replace />
                    </Layout>
                } />
                <Route path="/schedules" element={
                    <Layout>
                        <Schedules />
                    </Layout>
                } />
                <Route path="/catalogue" element={
                    <Layout>
                        <Catalogue />
                    </Layout>
                } />
                <Route path="/ratings" element={
                    <Layout>
                        <Ratings />
                    </Layout>
                } />
                <Route path="/contact" element={
                    <Layout>
                        <Contact />
                    </Layout>
                } />
                
                {/* Protected User Routes */}
                <Route path="/dashboard" element={
                    <Layout>
                        <ProtectedRoute><Dashboard /></ProtectedRoute>
                    </Layout>
                } />
                <Route path="/bookings" element={
                    <Layout>
                        <ProtectedRoute><Bookings /></ProtectedRoute>
                    </Layout>
                } />
                
                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={
                    <Layout>
                        <AdminRoute><AdminDashboard /></AdminRoute>
                    </Layout>
                } />
                <Route path="/admin/create" element={
                    <Layout>
                        <AdminRoute><AdminCreate /></AdminRoute>
                    </Layout>
                } />
                <Route path="/admin/schedules" element={
                    <Layout>
                        <AdminRoute><AdminSchedules /></AdminRoute>
                    </Layout>
                } />
            </Routes>
        </Router>
    );
}

export default App;