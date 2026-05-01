// Railway Management System Backend
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { executeProcedure, executeQuery } = require('./config/database');
const cron = require('node-cron'); // npm install node-cron

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express.json());

// ============================================
// HARDCODED ADMIN CREDENTIALS
// ============================================
const HARDCODED_ADMIN = {
    email: 'l230787@lhr.nu.edu.pk',
    password: 'l230787',
    firstName: 'Admin',
    lastName: 'User',
    phone: '0300-0000000',
    role: 'Admin'
};

// Helper: Generate token
function generateToken(user) {
    return Buffer.from(JSON.stringify({ 
        id: user.ClientID || user.id, 
        email: user.Email || user.email, 
        role: user.Role || user.role 
    })).toString('base64');
}

function verifyToken(token) {
    try {
        return JSON.parse(Buffer.from(token, 'base64').toString());
    } catch {
        return null;
    }
}

// Auth Middleware
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    req.user = decoded;
    next();
}

// Admin Middleware
const requireAdmin = async (req, res, next) => {
    try {
        // Check if it's hardcoded admin
        if (req.user.email === HARDCODED_ADMIN.email) {
            return next();
        }
        
        // Otherwise check database
        const user = await executeQuery(
            'SELECT Role FROM Clients WHERE ClientID = @param0',
            [req.user.id]
        );
        if (!user.recordset[0] || user.recordset[0].Role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error checking admin status' });
    }
};

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Get all schedules (public)
app.get('/api/schedules', async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllSchedules');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ success: false, message: 'Error fetching schedules' });
    }
});

// Get schedule by ID
app.get('/api/schedules/:id', async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetScheduleByID', { ScheduleID: parseInt(req.params.id) });
        if (result.recordset && result.recordset[0]) {
            res.json({ success: true, data: result.recordset[0] });
        } else {
            res.status(404).json({ success: false, message: 'Schedule not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching schedule' });
    }
});

// Get all stations
app.get('/api/stations', async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllStations');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stations' });
    }
});

// Get all trains
app.get('/api/trains', async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllTrains');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching trains' });
    }
});

// Get catalogue
app.get('/api/catalogue', async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT c.*, t.TrainName, t.TrainNumber, t.TrainType
            FROM Catalogue c
            INNER JOIN Trains t ON c.TrainID = t.TrainID
        `);
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching catalogue' });
    }
});

// Get ratings
app.get('/api/ratings', async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT r.*, c.FirstName, c.LastName, t.TrainName
            FROM Ratings r
            INNER JOIN Clients c ON r.ClientID = c.ClientID
            LEFT JOIN Schedule s ON r.ScheduleID = s.ScheduleID
            LEFT JOIN Trains t ON s.TrainID = t.TrainID
            ORDER BY r.RatingDate DESC
        `);
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching ratings' });
    }
});

// Submit contact support (public)
// Submit contact support - Now creates conversation in unified system
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message, clientId } = req.body;
        
        // Check if user exists (logged in)
        if (clientId) {
            // User is logged in - check for existing pending conversation
            const checkResult = await executeQuery(
                'SELECT ConversationID FROM Conversations WHERE UserID = @param0 AND Status = ''Pending''',
                [clientId]
            );
            
            if (checkResult.recordset && checkResult.recordset.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You already have a pending message. Please wait for admin reply before sending a new message.' 
                });
            }
            
            // Get user details
            const userResult = await executeQuery(
                'SELECT FirstName, LastName FROM Clients WHERE ClientID = @param0',
                [clientId]
            );
            
            const userName = `${userResult.recordset[0].FirstName} ${userResult.recordset[0].LastName}`;
            
            // Create conversation
            await executeProcedure('sp_SendUserMessage', {
                UserID: clientId,
                UserName: userName,
                UserEmail: email,
                Subject: subject,
                Message: message
            });
        } else {
            // User is not logged in - create temporary user record? Or just store differently
            // For now, store as guest
            await executeQuery(
                'INSERT INTO Conversations (UserID, UserName, UserEmail, Subject, UserMessage, Status) VALUES (@param0, @param1, @param2, @param3, @param4, ''Pending'')',
                [0, name, email, subject, message]
            );
        }
        
        res.json({ success: true, message: 'Message sent successfully. Admin will reply shortly.' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, dateOfBirth, address } = req.body;
        
        // Check if trying to register with hardcoded admin email
        if (email === HARDCODED_ADMIN.email) {
            return res.status(400).json({ 
                success: false, 
                message: 'This email is reserved for admin' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await executeProcedure('sp_RegisterClient', {
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            Phone: phone || null,
            PasswordHash: hashedPassword,
            DateOfBirth: dateOfBirth || null,
            Address: address || null,
            Role: 'User'
        });
        
        if (result.recordset && result.recordset[0]) {
            const regResult = result.recordset[0];
            if (regResult.Success === 1) {
                const user = { ClientID: regResult.ClientID, Email: email, Role: 'User' };
                const token = generateToken(user);
                res.json({ success: true, message: 'Registration successful', data: { token, user } });
            } else {
                res.status(400).json({ success: false, message: regResult.Message });
            }
        } else {
            res.status(500).json({ success: false, message: 'Registration failed' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // HARDCODED ADMIN CHECK
        if (email === HARDCODED_ADMIN.email && password === HARDCODED_ADMIN.password) {
            console.log('✅ Hardcoded admin logged in:', email);
            
            const user = {
                ClientID: 999999,
                FirstName: HARDCODED_ADMIN.firstName,
                LastName: HARDCODED_ADMIN.lastName,
                Email: HARDCODED_ADMIN.email,
                Phone: HARDCODED_ADMIN.phone,
                Role: HARDCODED_ADMIN.role
            };
            
            const token = generateToken(user);
            
            return res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.ClientID,
                        firstName: user.FirstName,
                        lastName: user.LastName,
                        email: user.Email,
                        phone: user.Phone,
                        role: user.Role
                    }
                }
            });
        }
        
        // Regular database login
        const result = await executeProcedure('sp_LoginClient', { Email: email });
        
        if (!result.recordset || result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const user = result.recordset[0];
        const isValid = await bcrypt.compare(password, user.PasswordHash);
        
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const token = generateToken(user);
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.ClientID,
                    firstName: user.FirstName,
                    lastName: user.LastName,
                    email: user.Email,
                    phone: user.Phone,
                    role: user.Role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        // Check if it's hardcoded admin
        if (req.user.email === HARDCODED_ADMIN.email) {
            return res.json({
                success: true,
                data: {
                    ClientID: 999999,
                    FirstName: HARDCODED_ADMIN.firstName,
                    LastName: HARDCODED_ADMIN.lastName,
                    Email: HARDCODED_ADMIN.email,
                    Phone: HARDCODED_ADMIN.phone,
                    Role: HARDCODED_ADMIN.role
                }
            });
        }
        
        const result = await executeQuery(
            'SELECT ClientID, FirstName, LastName, Email, Phone, Role FROM Clients WHERE ClientID = @param0',
            [req.user.id]
        );
        if (result.recordset && result.recordset[0]) {
            res.json({ success: true, data: result.recordset[0] });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching user' });
    }
});

app.post('/api/auth/logout', authenticate, (req, res) => {
    res.json({ success: true, message: 'Logged out' });
});

// ============================================
// PROTECTED ROUTES (Requires Authentication)
// ============================================

// Submit rating
app.post('/api/ratings', authenticate, async (req, res) => {
    try {
        const { scheduleId, rating, review } = req.body;
        await executeQuery(
            'INSERT INTO Ratings (ClientID, ScheduleID, Rating, Review) VALUES (@param0, @param1, @param2, @param3)',
            [req.user.id, scheduleId || null, rating, review || null]
        );
        res.json({ success: true, message: 'Rating submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting rating' });
    }
});

// Book ticket (returns bookingId and paymentExpiry)
app.post('/api/bookings', authenticate, async (req, res) => {
    try {
        const { scheduleId, seatNumber } = req.body;
        const result = await executeProcedure('sp_BookTicket', {
            ClientID: req.user.id,
            ScheduleID: scheduleId,
            SeatNumber: seatNumber
        });
        if (result.recordset && result.recordset[0]) {
            const bookingResult = result.recordset[0];
            if (bookingResult.Success === 1) {
                res.json({ 
                    success: true, 
                    message: bookingResult.Message,
                    data: { 
                        bookingId: bookingResult.BookingID,
                        paymentExpiry: bookingResult.PaymentExpiry
                    }
                });
            } else {
                res.status(400).json({ success: false, message: bookingResult.Message });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

// Get my bookings
app.get('/api/my-bookings', authenticate, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetClientBookings', { ClientID: req.user.id });
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching bookings' });
    }
});

// Cancel confirmed booking (with refund request logic)
app.post('/api/bookings/:id/cancel', authenticate, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await executeProcedure('sp_CancelBooking', {
            BookingID: parseInt(req.params.id),
            Reason: reason || 'Cancelled by user'
        });
        if (result.recordset && result.recordset[0]) {
            const cancelResult = result.recordset[0];
            if (cancelResult.Success === 1) {
                res.json({ success: true, message: 'Booking cancelled' });
            } else {
                res.status(400).json({ success: false, message: cancelResult.Message });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Cancellation failed' });
    }
});

// Cancel pending booking (before payment)
app.post('/api/bookings/:id/cancel-pending', authenticate, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const result = await executeProcedure('sp_CancelPendingBooking', { BookingID: bookingId });
        if (result.recordset && result.recordset[0]) {
            const cancelResult = result.recordset[0];
            if (cancelResult.Success === 1) {
                res.json({ success: true, message: cancelResult.Message });
            } else {
                res.status(400).json({ success: false, message: cancelResult.Message });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Cancel failed' });
    }
});

// Request refund for paid booking
app.post('/api/bookings/:id/request-refund', authenticate, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { reason } = req.body;
        const result = await executeProcedure('sp_RequestRefund', {
            BookingID: bookingId,
            ClientID: req.user.id,
            Reason: reason || 'Customer request'
        });
        if (result.recordset && result.recordset[0]) {
            const refundResult = result.recordset[0];
            if (refundResult.Success === 1) {
                res.json({ success: true, message: refundResult.Message });
            } else {
                res.status(400).json({ success: false, message: refundResult.Message });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Refund request failed' });
    }
});

// Confirm payment (simulate payment gateway)
app.post('/api/payment/confirm', authenticate, async (req, res) => {
    try {
        const { bookingId, paymentMethod, cardDetails } = req.body;
        const result = await executeProcedure('sp_ConfirmPayment', {
            BookingID: bookingId,
            PaymentIntentId: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8)
        });
        if (result.recordset && result.recordset[0]) {
            const paymentResult = result.recordset[0];
            if (paymentResult.Success === 1) {
                res.json({ success: true, message: paymentResult.Message });
            } else {
                res.status(400).json({ success: false, message: paymentResult.Message });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Payment confirmation failed' });
    }
});

// Get loyalty info
app.get('/api/loyalty', authenticate, async (req, res) => {
    try {
        // Handle hardcoded admin
        if (req.user.email === HARDCODED_ADMIN.email) {
            return res.json({
                success: true,
                data: {
                    TotalPoints: 999999,
                    TierLevel: 'Platinum',
                    TotalBookings: 0,
                    TotalSpent: 0
                }
            });
        }
        
        const result = await executeProcedure('sp_GetClientLoyalty', { ClientID: req.user.id });
        res.json({
            success: true,
            data: result.recordset?.[0] || { TotalPoints: 0, TierLevel: 'Bronze', TotalBookings: 0, TotalSpent: 0 }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching loyalty info' });
    }
});

// ============================================
// USER MESSAGING ROUTES (New Conversation System)
// ============================================

// User sends new message
app.post('/api/messages/send', authenticate, async (req, res) => {
    try {
        const { subject, message } = req.body;
        const user = await executeQuery(
            'SELECT FirstName, LastName, Email FROM Clients WHERE ClientID = @param0',
            [req.user.id]
        );
        
        const userName = `${user.recordset[0].FirstName} ${user.recordset[0].LastName}`;
        const userEmail = user.recordset[0].Email;
        
        const result = await executeProcedure('sp_SendUserMessage', {
            UserID: req.user.id,
            UserName: userName,
            UserEmail: userEmail,
            Subject: subject,
            Message: message
        });
        
        if (result.recordset && result.recordset[0]) {
            res.json({ 
                success: result.recordset[0].Success === 1, 
                message: result.recordset[0].Message,
                conversationId: result.recordset[0].ConversationID
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

// User sends follow-up message
app.post('/api/messages/:id/followup', authenticate, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const { message } = req.body;
        
        const result = await executeProcedure('sp_SendFollowUpMessage', {
            ConversationID: conversationId,
            UserID: req.user.id,
            NewMessage: message
        });
        
        if (result.recordset && result.recordset[0]) {
            res.json({ 
                success: result.recordset[0].Success === 1, 
                message: result.recordset[0].Message 
            });
        }
    } catch (error) {
        console.error('Error sending follow-up:', error);
        res.status(500).json({ success: false, message: 'Error sending follow-up' });
    }
});

// Get user's conversation
app.get('/api/messages/my-conversation', authenticate, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetUserConversation', { UserID: req.user.id });
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ success: false, message: 'Error fetching conversation' });
    }
});

// ============================================
// ADMIN MESSAGING ROUTES (New Conversation System)
// ============================================

// Get all conversations (admin)
app.get('/api/admin/messages/all', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAdminAllConversations');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Error fetching conversations' });
    }
});

// Get pending messages (admin)
app.get('/api/admin/messages/pending', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAdminPendingMessages');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching pending messages:', error);
        res.status(500).json({ success: false, message: 'Error fetching pending messages' });
    }
});

// Admin sends reply
app.post('/api/admin/messages/:id/reply', authenticate, requireAdmin, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const { reply } = req.body;
        
        const result = await executeProcedure('sp_SendAdminReply', {
            ConversationID: conversationId,
            AdminReply: reply
        });
        
        if (result.recordset && result.recordset[0]) {
            res.json({ 
                success: result.recordset[0].Success === 1, 
                message: result.recordset[0].Message 
            });
        }
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ success: false, message: 'Error sending reply' });
    }
});

// Get conversation details (admin)
app.get('/api/admin/messages/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const result = await executeProcedure('sp_GetConversationById', { ConversationID: conversationId });
        res.json({ success: true, data: result.recordset?.[0] || null });
    } catch (error) {
        console.error('Error fetching conversation details:', error);
        res.status(500).json({ success: false, message: 'Error fetching conversation details' });
    }
});

// ============================================
// ADMIN ROUTES (Existing)
// ============================================

// Get all users
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeQuery(
            'SELECT ClientID, FirstName, LastName, Email, Phone, Role, CreatedAt, IsActive FROM Clients ORDER BY ClientID'
        );
        
        const users = result.recordset || [];
        const hasHardcodedAdmin = users.some(u => u.Email === HARDCODED_ADMIN.email);
        
        if (!hasHardcodedAdmin) {
            users.unshift({
                ClientID: 999999,
                FirstName: HARDCODED_ADMIN.firstName,
                LastName: HARDCODED_ADMIN.lastName,
                Email: HARDCODED_ADMIN.email,
                Phone: HARDCODED_ADMIN.phone,
                Role: HARDCODED_ADMIN.role,
                CreatedAt: new Date().toISOString(),
                IsActive: true
            });
        }
        
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// Get all bookings
app.get('/api/admin/bookings', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT b.BookingID, b.BookingDate, b.SeatNumber, b.TotalAmount, b.Status, b.PaymentStatus,
                   c.FirstName, c.LastName, c.Email,
                   t.TrainName, t.TrainNumber,
                   dep.StationName AS DepartureStation, arr.StationName AS ArrivalStation,
                   s.DepartureTime, s.ArrivalTime
            FROM Bookings b
            INNER JOIN Clients c ON b.ClientID = c.ClientID
            INNER JOIN Schedule s ON b.ScheduleID = s.ScheduleID
            INNER JOIN Trains t ON s.TrainID = t.TrainID
            INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
            INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
            ORDER BY b.BookingDate DESC
        `);
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, message: 'Error fetching bookings' });
    }
});

// Create admin user
app.post('/api/admin/create', authenticate, requireAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;
        
        if (email === HARDCODED_ADMIN.email) {
            return res.status(400).json({ 
                success: false, 
                message: 'This email is reserved for system admin' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await executeProcedure('sp_RegisterClient', {
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            Phone: phone || null,
            PasswordHash: hashedPassword,
            DateOfBirth: null,
            Address: null,
            Role: 'Admin'
        });
        
        if (result.recordset && result.recordset[0]) {
            const regResult = result.recordset[0];
            if (regResult.Success === 1) {
                res.json({ success: true, message: 'Admin user created successfully' });
            } else {
                res.status(400).json({ success: false, message: regResult.Message });
            }
        } else {
            res.status(500).json({ success: false, message: 'Failed to create admin user' });
        }
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// ADMIN SCHEDULE MANAGEMENT ROUTES
// ============================================

app.get('/api/admin/schedules', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllSchedulesAdmin');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ success: false, message: 'Error fetching schedules' });
    }
});

app.post('/api/admin/schedules', authenticate, requireAdmin, async (req, res) => {
    try {
        const { trainId, departureStationId, arrivalStationId, departureTime, arrivalTime, ticketPrice, availableSeats, status } = req.body;
        
        if (!trainId || !departureStationId || !arrivalStationId || !departureTime || !arrivalTime || !ticketPrice || !availableSeats) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        const result = await executeProcedure('sp_AddSchedule', {
            TrainID: trainId,
            DepartureStationID: departureStationId,
            ArrivalStationID: arrivalStationId,
            DepartureTime: departureTime,
            ArrivalTime: arrivalTime,
            TicketPrice: ticketPrice,
            AvailableSeats: availableSeats,
            Status: status || 'Scheduled'
        });
        
        if (result.recordset && result.recordset[0]) {
            const addResult = result.recordset[0];
            if (addResult.Success === 1) {
                res.json({ success: true, message: addResult.Message, data: { scheduleId: addResult.ScheduleID } });
            } else {
                res.status(400).json({ success: false, message: addResult.Message });
            }
        }
    } catch (error) {
        console.error('Error adding schedule:', error);
        res.status(500).json({ success: false, message: 'Error adding schedule' });
    }
});

app.put('/api/admin/schedules/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id);
        const { trainId, departureStationId, arrivalStationId, departureTime, arrivalTime, ticketPrice, availableSeats, status } = req.body;
        
        const result = await executeProcedure('sp_UpdateSchedule', {
            ScheduleID: scheduleId,
            TrainID: trainId,
            DepartureStationID: departureStationId,
            ArrivalStationID: arrivalStationId,
            DepartureTime: departureTime,
            ArrivalTime: arrivalTime,
            TicketPrice: ticketPrice,
            AvailableSeats: availableSeats,
            Status: status
        });
        
        if (result.recordset && result.recordset[0]) {
            const updateResult = result.recordset[0];
            if (updateResult.Success === 1) {
                res.json({ success: true, message: updateResult.Message });
            } else {
                res.status(400).json({ success: false, message: updateResult.Message });
            }
        }
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ success: false, message: 'Error updating schedule' });
    }
});

app.delete('/api/admin/schedules/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id);
        const result = await executeProcedure('sp_DeleteSchedule', { ScheduleID: scheduleId });
        
        if (result.recordset && result.recordset[0]) {
            const deleteResult = result.recordset[0];
            if (deleteResult.Success === 1) {
                res.json({ success: true, message: deleteResult.Message });
            } else {
                res.status(400).json({ success: false, message: deleteResult.Message });
            }
        }
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ success: false, message: 'Error deleting schedule' });
    }
});

// ============================================
// ADMIN REFUND MANAGEMENT ROUTES
// ============================================

app.get('/api/admin/refund-requests', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT rr.*, b.TotalAmount, b.BookingID, c.FirstName, c.LastName, c.Email,
                   s.DepartureTime, t.TrainName
            FROM RefundRequests rr
            INNER JOIN Bookings b ON rr.BookingID = b.BookingID
            INNER JOIN Clients c ON rr.ClientID = c.ClientID
            LEFT JOIN Schedule s ON b.ScheduleID = s.ScheduleID
            LEFT JOIN Trains t ON s.TrainID = t.TrainID
            ORDER BY rr.RequestDate DESC
        `);
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching refund requests:', error);
        res.status(500).json({ success: false, message: 'Error fetching refund requests' });
    }
});

app.post('/api/admin/refund-requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { comment } = req.body;
        const result = await executeProcedure('sp_ApproveRefund', {
            RequestID: requestId,
            AdminComment: comment || 'Approved by admin'
        });
        if (result.recordset && result.recordset[0]) {
            res.json({ success: true, message: result.recordset[0].Message });
        }
    } catch (error) {
        console.error('Error approving refund:', error);
        res.status(500).json({ success: false, message: 'Approval failed' });
    }
});

app.post('/api/admin/refund-requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { comment } = req.body;
        const result = await executeProcedure('sp_RejectRefund', {
            RequestID: requestId,
            AdminComment: comment || 'Rejected by admin'
        });
        if (result.recordset && result.recordset[0]) {
            res.json({ success: true, message: result.recordset[0].Message });
        }
    } catch (error) {
        console.error('Error rejecting refund:', error);
        res.status(500).json({ success: false, message: 'Rejection failed' });
    }
});

app.post('/api/admin/clean-expired-bookings', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeProcedure('sp_CancelExpiredPendingBookings');
        res.json({ success: true, message: 'Expired bookings cleaned', data: result.recordset?.[0] });
    } catch (error) {
        console.error('Error cleaning expired bookings:', error);
        res.status(500).json({ success: false, message: 'Cleanup failed' });
    }
});

// ============================================
// ADMIN SEARCH ROUTES
// ============================================

// Search users
app.get('/api/admin/users/search', authenticate, requireAdmin, async (req, res) => {
    try {
        const { q } = req.query;
        const result = await executeQuery(`
            SELECT ClientID, FirstName, LastName, Email, Phone, Role, CreatedAt, IsActive 
            FROM Clients 
            WHERE FirstName LIKE @param0 OR LastName LIKE @param0 OR Email LIKE @param0 OR CAST(ClientID AS VARCHAR) LIKE @param0
            ORDER BY ClientID
        `, [`%${q}%`]);
        
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ success: false, message: 'Error searching users' });
    }
});

// Search bookings
app.get('/api/admin/bookings/search', authenticate, requireAdmin, async (req, res) => {
    try {
        const { q } = req.query;
        const result = await executeQuery(`
            SELECT b.BookingID, b.BookingDate, b.SeatNumber, b.TotalAmount, b.Status, b.PaymentStatus,
                   c.FirstName, c.LastName, c.Email,
                   t.TrainName, t.TrainNumber,
                   dep.StationName AS DepartureStation, arr.StationName AS ArrivalStation,
                   s.DepartureTime, s.ArrivalTime
            FROM Bookings b
            INNER JOIN Clients c ON b.ClientID = c.ClientID
            INNER JOIN Schedule s ON b.ScheduleID = s.ScheduleID
            INNER JOIN Trains t ON s.TrainID = t.TrainID
            INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
            INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
            WHERE c.FirstName LIKE @param0 OR c.LastName LIKE @param0 OR c.Email LIKE @param0 
               OR CAST(b.BookingID AS VARCHAR) LIKE @param0
            ORDER BY b.BookingDate DESC
        `, [`%${q}%`]);
        
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error searching bookings:', error);
        res.status(500).json({ success: false, message: 'Error searching bookings' });
    }
});

// ============================================
// SCHEDULED JOB: Auto-cancel expired pending bookings every 5 minutes
// ============================================
cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Running expired bookings cleanup...');
    try {
        await executeProcedure('sp_CancelExpiredPendingBookings');
        console.log('[CRON] Cleanup completed');
    } catch (error) {
        console.error('[CRON] Cleanup error:', error);
    }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 Railway Management System Backend`);
    console.log(`========================================`);
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`\n✅ HARDCODED ADMIN LOGIN:`);
    console.log(`   Email: l230787@lhr.nu.edu.pk`);
    console.log(`   Password: l230787`);
    console.log(`\n✅ Regular Test Login: test@test.com / password123`);
    console.log(`========================================\n`);
});

module.exports = app;