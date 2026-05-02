// Railway Management System Backend
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { executeProcedure, executeQuery } = require('./config/database');
const cron = require('node-cron');

dotenv.config();

const app = express();

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

const requireAdmin = async (req, res, next) => {
    try {
        if (req.user.email === HARDCODED_ADMIN.email) {
            return next();
        }
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
// PUBLIC ROUTES
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/api/schedules', async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllSchedules');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ success: false, message: 'Error fetching schedules' });
    }
});

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

app.get('/api/schedules/:id/booked-seats', async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id);
        const result = await executeQuery(`
            SELECT SeatNumber FROM Bookings 
            WHERE ScheduleID = @param0 
            AND (Status = 'Confirmed' OR Status = 'Pending')
            AND SeatNumber IS NOT NULL
        `, [scheduleId]);
        
        const bookedSeats = result.recordset.map(row => row.SeatNumber);
        res.json({ success: true, data: bookedSeats });
    } catch (error) {
        console.error('Error fetching booked seats:', error);
        res.status(500).json({ success: false, message: 'Error fetching booked seats' });
    }
});

app.get('/api/stations', async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllStations');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching stations' });
    }
});

app.get('/api/trains', async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllTrains');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching trains' });
    }
});

// Get train config (pricing only – coach layout is now per-schedule)
app.get('/api/trains/:id/config', async (req, res) => {
    try {
        const trainId = parseInt(req.params.id);
        const result = await executeProcedure('sp_GetTrainConfig', { TrainID: trainId });
        const trainConfig = result.recordset[0];
        res.json({ 
            success: true, 
            data: {
                train: trainConfig,
                coaches: []
            }
        });
    } catch (error) {
        console.error('Error fetching train config:', error);
        res.status(500).json({ success: false, message: 'Error fetching train configuration' });
    }
});

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

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message, clientId } = req.body;
        
        if (clientId) {
            const checkResult = await executeQuery(
                "SELECT ConversationID FROM Conversations WHERE UserID = @param0 AND Status = 'Pending'",
                [clientId]
            );
            
            if (checkResult.recordset && checkResult.recordset.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You already have a pending message. Please wait for admin reply.' 
                });
            }
            
            const userResult = await executeQuery(
                'SELECT FirstName, LastName FROM Clients WHERE ClientID = @param0',
                [clientId]
            );
            
            const userName = `${userResult.recordset[0].FirstName} ${userResult.recordset[0].LastName}`;
            
            await executeProcedure('sp_SendUserMessage', {
                UserID: clientId,
                UserName: userName,
                UserEmail: email,
                Subject: subject,
                Message: message
            });
        } else {
            await executeQuery(
                "INSERT INTO Conversations (UserID, UserName, UserEmail, Subject, UserMessage, Status) VALUES (@param0, @param1, @param2, @param3, @param4, 'Pending')",
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

app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, dateOfBirth, address } = req.body;
        
        if (email === HARDCODED_ADMIN.email) {
            return res.status(400).json({ success: false, message: 'This email is reserved for admin' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await executeProcedure('sp_RegisterClient', {
            FirstName: firstName, LastName: lastName, Email: email,
            Phone: phone || null, PasswordHash: hashedPassword,
            DateOfBirth: dateOfBirth || null, Address: address || null, Role: 'User'
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

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (email === HARDCODED_ADMIN.email && password === HARDCODED_ADMIN.password) {
            const user = {
                ClientID: 999999, FirstName: HARDCODED_ADMIN.firstName,
                LastName: HARDCODED_ADMIN.lastName, Email: HARDCODED_ADMIN.email,
                Phone: HARDCODED_ADMIN.phone, Role: HARDCODED_ADMIN.role
            };
            const token = generateToken(user);
            return res.json({ success: true, data: { token, user: { id: user.ClientID, firstName: user.FirstName, lastName: user.LastName, email: user.Email, phone: user.Phone, role: user.Role } } });
        }
        
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
        res.json({ success: true, data: { token, user: { id: user.ClientID, firstName: user.FirstName, lastName: user.LastName, email: user.Email, phone: user.Phone, role: user.Role } } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        if (req.user.email === HARDCODED_ADMIN.email) {
            return res.json({ success: true, data: { ClientID: 999999, FirstName: HARDCODED_ADMIN.firstName, LastName: HARDCODED_ADMIN.lastName, Email: HARDCODED_ADMIN.email, Phone: HARDCODED_ADMIN.phone, Role: HARDCODED_ADMIN.role } });
        }
        const result = await executeQuery('SELECT ClientID, FirstName, LastName, Email, Phone, Role FROM Clients WHERE ClientID = @param0', [req.user.id]);
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
// PROTECTED USER ROUTES
// ============================================

app.post('/api/ratings', authenticate, async (req, res) => {
    try {
        const { scheduleId, rating, review } = req.body;
        await executeQuery('INSERT INTO Ratings (ClientID, ScheduleID, Rating, Review) VALUES (@param0, @param1, @param2, @param3)', [req.user.id, scheduleId || null, rating, review || null]);
        res.json({ success: true, message: 'Rating submitted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting rating' });
    }
});

app.post('/api/bookings', authenticate, async (req, res) => {
    try {
        const { scheduleId, seatNumber, bookingType, price } = req.body;
        const result = await executeProcedure('sp_BookTicket', { 
            ClientID: req.user.id, 
            ScheduleID: scheduleId, 
            SeatNumber: seatNumber,
            BookingType: bookingType || 'seat',
            Price: price
        });
        if (result.recordset && result.recordset[0]) {
            const bookingResult = result.recordset[0];
            if (bookingResult.Success === 1) {
                res.json({ success: true, message: bookingResult.Message, data: { bookingId: bookingResult.BookingID, paymentExpiry: bookingResult.PaymentExpiry } });
            } else {
                res.status(400).json({ success: false, message: bookingResult.Message });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Booking failed' });
    }
});

app.get('/api/my-bookings', authenticate, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetClientBookings', { ClientID: req.user.id });
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching bookings' });
    }
});

app.post('/api/bookings/:id/cancel', authenticate, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await executeProcedure('sp_CancelBooking', { BookingID: parseInt(req.params.id), Reason: reason || 'Cancelled by user' });
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

app.post('/api/bookings/:id/request-refund', authenticate, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { reason } = req.body;
        const result = await executeProcedure('sp_RequestRefund', { BookingID: bookingId, ClientID: req.user.id, Reason: reason || 'Customer request' });
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

app.post('/api/payment/confirm', authenticate, async (req, res) => {
    try {
        const { bookingId } = req.body;
        const result = await executeProcedure('sp_ConfirmPayment', { BookingID: bookingId, PaymentIntentId: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8) });
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

app.get('/api/loyalty', authenticate, async (req, res) => {
    try {
        if (req.user.email === HARDCODED_ADMIN.email) {
            return res.json({ success: true, data: { TotalPoints: 999999, TierLevel: 'Platinum', TotalBookings: 0, TotalSpent: 0 } });
        }
        const result = await executeProcedure('sp_GetClientLoyalty', { ClientID: req.user.id });
        res.json({ success: true, data: result.recordset?.[0] || { TotalPoints: 0, TierLevel: 'Bronze', TotalBookings: 0, TotalSpent: 0 } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching loyalty info' });
    }
});

// ============================================
// USER MESSAGING ROUTES
// ============================================

app.get('/api/my-tickets', authenticate, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetUserTickets', { ClientID: req.user.id });
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching tickets' });
    }
});

app.post('/api/tickets/:id/message', authenticate, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { message } = req.body;
        const result = await executeProcedure('sp_SendMessage', {
            TicketID: ticketId, SenderID: req.user.id, SenderRole: 'User', MessageText: message
        });
        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

app.get('/api/tickets/:id/messages', authenticate, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const result = await executeProcedure('sp_GetMessages', { TicketID: ticketId, ClientID: req.user.id });
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
});

app.get('/api/messages/unread-count', authenticate, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetUnreadMessageCount', { ClientID: req.user.id });
        res.json({ success: true, data: { unreadCount: result.recordset?.[0]?.UnreadCount || 0 } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error getting unread count' });
    }
});

app.get('/api/messages/my-conversation', authenticate, async (req, res) => {
    try {
        const result = await executeQuery(
            `SELECT * FROM Conversations WHERE UserID = @param0 ORDER BY ConversationID DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching conversation' });
    }
});

app.post('/api/messages/send', authenticate, async (req, res) => {
    try {
        const { subject, message } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'Subject and message are required' });
        }

        const userId = req.user.id;
        const existing = await executeQuery(
            `SELECT ConversationID FROM Conversations WHERE UserID = @param0 AND Status = 'Pending'`,
            [userId]
        );

        if (existing.recordset && existing.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'You already have a pending message. Please wait for admin reply.' });
        }

        const user = await executeQuery('SELECT FirstName, LastName, Email FROM Clients WHERE ClientID = @param0', [userId]);
        const userName = `${user.recordset?.[0]?.FirstName || ''} ${user.recordset?.[0]?.LastName || ''}`.trim();
        const userEmail = user.recordset?.[0]?.Email || req.user.email || '';

        await executeProcedure('sp_SendUserMessage', {
            UserID: userId, UserName: userName, UserEmail: userEmail, Subject: subject, Message: message
        });

        res.json({ success: true, message: 'Message sent successfully. Admin will reply shortly.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending message' });
    }
});

app.post('/api/messages/:id/followup', authenticate, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id, 10);
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Follow-up message is required' });
        }

        const result = await executeQuery(
            `SELECT ConversationID, UserID, UserMessage FROM Conversations WHERE ConversationID = @param0`,
            [conversationId]
        );

        const conversation = result.recordset?.[0];
        if (!conversation || conversation.UserID !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const updatedMessage = `${conversation.UserMessage}\n\nFollow-up: ${message}`;
        await executeQuery(
            `UPDATE Conversations SET UserMessage = @param0, UserMessageDate = GETDATE(), Status = 'Pending' WHERE ConversationID = @param1`,
            [updatedMessage, conversationId]
        );

        res.json({ success: true, message: 'Follow-up sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending follow-up message' });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeQuery('SELECT ClientID, FirstName, LastName, Email, Phone, Role, CreatedAt, IsActive FROM Clients ORDER BY ClientID');
        const users = result.recordset || [];
        const hasHardcodedAdmin = users.some(u => u.Email === HARDCODED_ADMIN.email);
        if (!hasHardcodedAdmin) {
            users.unshift({ ClientID: 999999, FirstName: HARDCODED_ADMIN.firstName, LastName: HARDCODED_ADMIN.lastName, Email: HARDCODED_ADMIN.email, Phone: HARDCODED_ADMIN.phone, Role: HARDCODED_ADMIN.role, CreatedAt: new Date().toISOString(), IsActive: true });
        }
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

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
        res.status(500).json({ success: false, message: 'Error searching users' });
    }
});

app.post('/api/admin/create', authenticate, requireAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;
        if (email === HARDCODED_ADMIN.email) {
            return res.status(400).json({ success: false, message: 'This email is reserved for system admin' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await executeProcedure('sp_RegisterClient', {
            FirstName: firstName, LastName: lastName, Email: email,
            Phone: phone || null, PasswordHash: hashedPassword,
            DateOfBirth: null, Address: null, Role: 'Admin'
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
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/admin/messages/all', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeQuery('SELECT * FROM Conversations ORDER BY ConversationID DESC');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching conversations' });
    }
});

app.get('/api/admin/messages/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id, 10);
        const result = await executeQuery('SELECT * FROM Conversations WHERE ConversationID = @param0', [conversationId]);
        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching conversation' });
    }
});

app.post('/api/admin/messages/:id/reply', authenticate, requireAdmin, async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id, 10);
        const { reply } = req.body;
        if (!reply) {
            return res.status(400).json({ success: false, message: 'Reply message is required' });
        }
        await executeQuery(
            `UPDATE Conversations SET AdminReply = @param0, AdminReplyDate = GETDATE(), Status = 'Replied' WHERE ConversationID = @param1`,
            [reply, conversationId]
        );
        res.json({ success: true, message: 'Reply sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending reply' });
    }
});

// Booking Management
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
        res.status(500).json({ success: false, message: 'Error fetching bookings' });
    }
});

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
        res.status(500).json({ success: false, message: 'Error searching bookings' });
    }
});

app.put('/api/admin/bookings/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { status, seatNumber } = req.body;
        await executeQuery(`
            UPDATE Bookings SET Status = @param0, SeatNumber = @param1 WHERE BookingID = @param2
        `, [status, seatNumber, bookingId]);
        res.json({ success: true, message: 'Booking updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating booking' });
    }
});

app.post('/api/admin/bookings/:id/admin-cancel', authenticate, requireAdmin, async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { reason } = req.body;
        const result = await executeProcedure('sp_AdminCancelBooking', {
            BookingID: bookingId, Reason: reason || 'Cancelled by admin'
        });
        if (result.recordset && result.recordset[0]) {
            const cancelResult = result.recordset[0];
            if (cancelResult.Success === 1) {
                res.json({ success: true, message: cancelResult.Message });
            } else {
                res.status(400).json({ success: false, message: cancelResult.Message });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Admin cancellation failed' });
    }
});

// ============================================
// TRAIN CONFIGURATION (pricing only)
// ============================================

app.post('/api/admin/update-train-config', authenticate, requireAdmin, async (req, res) => {
    try {
        const { trainId, seatPrice, berthPrice } = req.body;
        const result = await executeProcedure('sp_UpdateTrainConfig', {
            TrainID: trainId,
            SeatPrice: seatPrice,
            BerthPrice: berthPrice
        });
        if (result.recordset && result.recordset[0]) {
            res.json({ success: true, message: 'Train pricing updated successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to update train pricing' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating train pricing: ' + error.message });
    }
});

// Schedule Management
app.get('/api/admin/schedules', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllSchedulesAdmin');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching schedules' });
    }
});

// ADD SCHEDULE – accepts sleeperCoaches + seaterCoaches, auto-calculates capacity
app.post('/api/admin/schedules', authenticate, requireAdmin, async (req, res) => {
    try {
        const { trainId, departureStationId, arrivalStationId, departureTime, arrivalTime, seatPrice, berthPrice, sleeperCoaches, seaterCoaches, status } = req.body;
        if (!trainId
            || !departureStationId
            || !arrivalStationId
            || !departureTime
            || !arrivalTime
            || seatPrice === undefined
            || seatPrice === null
            || seatPrice === ''
            || berthPrice === undefined
            || berthPrice === null
            || berthPrice === '') {
            return res.status(400).json({ success: false, message: 'All required fields must be provided' });
        }
        const result = await executeProcedure('sp_AddSchedule', {
            TrainID: trainId,
            DepartureStationID: departureStationId,
            ArrivalStationID: arrivalStationId,
            DepartureTime: departureTime,
            ArrivalTime: arrivalTime,
            SeatPrice: parseFloat(seatPrice) || 0,
            BerthPrice: parseFloat(berthPrice) || 0,
            SleeperCoaches: parseInt(sleeperCoaches) || 0,
            SeaterCoaches: parseInt(seaterCoaches) || 0,
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
        res.status(500).json({ success: false, message: 'Error adding schedule' });
    }
});

// UPDATE SCHEDULE – accepts sleeperCoaches + seaterCoaches + schedule pricing
app.put('/api/admin/schedules/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id);
        const { trainId, departureStationId, arrivalStationId, departureTime, arrivalTime, seatPrice, berthPrice, sleeperCoaches, seaterCoaches, status } = req.body;
        if (!trainId
            || !departureStationId
            || !arrivalStationId
            || !departureTime
            || !arrivalTime
            || seatPrice === undefined
            || seatPrice === null
            || seatPrice === ''
            || berthPrice === undefined
            || berthPrice === null
            || berthPrice === '') {
            return res.status(400).json({ success: false, message: 'All required fields must be provided' });
        }
        const result = await executeProcedure('sp_UpdateSchedule', {
            ScheduleID: scheduleId,
            TrainID: trainId,
            DepartureStationID: departureStationId,
            ArrivalStationID: arrivalStationId,
            DepartureTime: departureTime,
            ArrivalTime: arrivalTime,
            SeatPrice: parseFloat(seatPrice) || 0,
            BerthPrice: parseFloat(berthPrice) || 0,
            SleeperCoaches: parseInt(sleeperCoaches) || 0,
            SeaterCoaches: parseInt(seaterCoaches) || 0,
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
        res.status(500).json({ success: false, message: 'Error deleting schedule' });
    }
});

// Refund Management
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
        res.status(500).json({ success: false, message: 'Error fetching refund requests' });
    }
});

app.post('/api/admin/refund-requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { comment } = req.body;
        const result = await executeProcedure('sp_ApproveRefund', { RequestID: requestId, AdminComment: comment || 'Approved by admin' });
        if (result.recordset && result.recordset[0]) {
            res.json({ success: true, message: result.recordset[0].Message });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Approval failed' });
    }
});

app.post('/api/admin/refund-requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { comment } = req.body;
        const result = await executeProcedure('sp_RejectRefund', { RequestID: requestId, AdminComment: comment || 'Rejected by admin' });
        if (result.recordset && result.recordset[0]) {
            res.json({ success: true, message: result.recordset[0].Message });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Rejection failed' });
    }
});

// Admin Messaging
app.get('/api/admin/support-tickets', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await executeProcedure('sp_GetAllSupportTickets');
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching tickets' });
    }
});

app.post('/api/admin/support-tickets/:id/reply', authenticate, requireAdmin, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { message } = req.body;
        const result = await executeProcedure('sp_SendMessage', {
            TicketID: ticketId, SenderID: req.user.id, SenderRole: 'Admin', MessageText: message
        });
        res.json({ success: true, message: 'Reply sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error sending reply' });
    }
});

app.get('/api/admin/support-tickets/:id/messages', authenticate, requireAdmin, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const result = await executeProcedure('sp_GetMessages', { TicketID: ticketId, ClientID: req.user.id });
        res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
});

// ============================================
// SCHEDULED JOB - Runs every 5 minutes
// ============================================
cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Running scheduled tasks at:', new Date().toLocaleTimeString());
    
    try {
        await executeProcedure('sp_CancelExpiredPendingBookings');
        console.log('[CRON] Expired bookings cleanup completed');
    } catch (error) {
        console.error('[CRON] Cleanup error:', error.message);
    }
    
    try {
        const result = await executeProcedure('sp_AutoCompleteBookings');
        const completedCount = result.recordset?.[0]?.CompletedCount || 0;
        if (completedCount > 0) {
            console.log(`[CRON] ✅ ${completedCount} bookings marked as Completed`);
        }
    } catch (error) {
        console.error('[CRON] Auto-complete error:', error.message);
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
    console.log(`========================================\n`);
});

module.exports = app;