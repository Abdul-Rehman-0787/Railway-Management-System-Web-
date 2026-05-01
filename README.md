# 🚂 Railway Management System

> **A full-stack web application for end-to-end railway ticket booking, passenger management, loyalty rewards, refund processing, and admin-user communication.**

---

## 📖 Project Overview

The **Railway Management System** is a comprehensive full-stack web application designed to streamline train travel management for both passengers and administrators. Passengers can search for train schedules, book tickets with deferred payment, manage reservations, earn loyalty rewards, leave reviews, request refunds (subject to admin approval), and communicate with support staff — all from a single interface.

Administrators are equipped with a dedicated dashboard to manage schedules, approve or reject refund requests, and respond to support conversations in real-time.

Built using **React** on the frontend, **Node.js + Express** on the backend, and **Microsoft SQL Server** as the database engine, the system demonstrates modern full-stack development practices including:

- JWT-based authentication
- Role-based access control (User / Admin)
- Deferred payment with automatic expiry
- Admin approval workflows
- A unified, stateful messaging system for support communications
- Loyalty point accumulation with automatic tier upgrades
- Cron-based background jobs for expired booking cleanup

---

## ✨ Core Features

### 🌐 Public Access (No Login Required)
- View upcoming train schedules
- Browse the train catalogue (with images and descriptions)
- Read passenger ratings and reviews
- Submit a contact/support message (automatically creates a support conversation)

---

### 👤 User Access (Authenticated — Role: `User`)

#### Account Management
- Register a new account
- Login and logout
- View personal dashboard (loyalty points, tier, total spent, recent bookings)

#### Ticket Booking & Payment
- Search and browse available train schedules
- Book tickets — booking immediately enters **Pending Payment** state
  - Payment expiry: **1 hour** standard, or **15 minutes** if departure is within 1 hour
- **My Payments** page: view all pending bookings, pay later, or cancel pending bookings
- **My Bookings** page: view full booking history across all statuses (Paid, Pending, Refunded)

#### Refund & Cancellation
- **Cancel a Pending Booking**: immediate cancellation, seat released instantly
- **Request a Refund** on a paid booking: routed to admin for approval, **30% deduction fee** applied on approval

#### Messaging / Support
- **My Messages** page: view full conversation history with support
- Send a new support ticket
- Receive and view admin replies
- Send a follow-up message after the admin has replied

#### Loyalty Program
- Earn **10 loyalty points per 100 PKR** spent
- Automatic tier upgrade based on point thresholds:
  - 🥉 Bronze → 🥈 Silver (500 pts) → 🥇 Gold (2,000 pts) → 💎 Platinum (5,000 pts)

#### Reviews
- Rate and review completed train rides (1–5 stars)

---

### 🔐 Admin Access (Authenticated — Role: `Admin`)

#### Dashboard
- High-level overview of system activity
- Search users/bookings by ID, Name, or Email

#### Schedule Management
- View all train schedules (including past and future)
- Add new schedules with full validation
- Edit existing schedule details
- Delete schedules (only if no confirmed bookings exist)

#### Refund Request Management
- View all pending refund requests
- **Approve** a refund: triggers 30% fee deduction, seat released (if train has not yet departed), loyalty points adjusted
- **Reject** a refund: optionally add a comment/reason for the passenger

#### Support Conversation Management
- View all support conversations (Pending and Replied)
- Reply to user inquiries
- Real-time status updates reflected for users

---

## 🔄 Unified Messaging Workflow

The system uses a **single conversation per user** with a clearly defined state machine:

| Step | Action | Status |
|------|--------|--------|
| 1 | User sends a new message | `Pending` |
| 2 | Admin replies | `Replied` — user sees both messages |
| 3 | User sends a follow-up | Old reply is cleared → back to `Pending` |

> **Rule**: Users cannot send multiple messages while a message is pending. They must wait for an admin reply before sending a follow-up.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router DOM, Axios, React Hot Toast, CSS3 |
| Backend | Node.js, Express, bcryptjs, dotenv, mssql, node-cron |
| Database | Microsoft SQL Server (LocalDB / Express Edition) |
| Authentication | JWT (Base64 encoded), stored in `localStorage` |
| Build Tools | Create React App, Nodemon |

---

## 📁 Project Structure

```
railway-management-system/
│
├── backend/
│   ├── config/
│   │   └── database.js          # SQL Server connection configuration
│   ├── .env                     # Environment variables
│   ├── package.json
│   ├── server.js                # All API route handlers and middleware
│   └── node_modules/
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── assets/              # Logo and static images
│   │   ├── components/
│   │   │   ├── AdminDashboard.js
│   │   │   ├── AdminMessages.js
│   │   │   ├── AdminRefunds.js
│   │   │   ├── AdminSchedules.js
│   │   │   ├── Bookings.js
│   │   │   ├── Catalogue.js
│   │   │   ├── Contact.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Footer.js
│   │   │   ├── Header.js
│   │   │   ├── Layout.js
│   │   │   ├── Login.js
│   │   │   ├── MyPayments.js
│   │   │   ├── Payment.js
│   │   │   ├── Ratings.js
│   │   │   ├── Schedules.js
│   │   │   ├── Signup.js
│   │   │   └── UserMessages.js
│   │   ├── api.js               # Axios instance and auth helper functions
│   │   ├── App.js               # Routing with role-based route guards
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── node_modules/
│
├── database.sql                 # Complete DB schema, stored procedures, triggers, seed data
└── README.md
```

---

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `Clients` | User accounts — first name, last name, email, password hash, role, etc. |
| `Stations` | Railway stations — name, city, province |
| `Trains` | Train details — name, number, total seats, type |
| `Schedule` | Train ride instances — departure/arrival stations, times, ticket price, available seats |
| `Bookings` | Ticket reservations — client, schedule, seat number, status, payment status, expiry |
| `Payments` | Payment records linked to individual bookings |
| `Cancellations` | Cancellation records with refund amount and status |
| `Ratings` | User ratings and reviews (1–5 stars) with comments |
| `LoyaltyRewards` | Points balance and tier per client |
| `RewardTransactions` | Audit log of all points earned and redeemed |
| `Catalogue` | Marketing content (images, descriptions) per train |
| `RefundRequests` | Refund requests with admin approval/rejection workflow |
| `Conversations` | Unified messaging — one conversation per user with status tracking |

---

### Stored Procedures

| Procedure | Description |
|-----------|-------------|
| `sp_RegisterClient` | Creates a new user account and initialises their loyalty record |
| `sp_LoginClient` | Validates credentials and returns user data for authentication |
| `sp_GetAllSchedules` | Fetches upcoming train schedules for the public view |
| `sp_BookTicket` | Creates a booking with payment expiry timer and reserves the seat |
| `sp_ConfirmPayment` | Marks booking as paid and adds loyalty points to the user's account |
| `sp_CancelPendingBooking` | Releases reserved seat and marks booking as failed/cancelled |
| `sp_CancelBooking` | Cancels a confirmed (paid) booking |
| `sp_RequestRefund` | Creates a refund request record pending admin review |
| `sp_ApproveRefund` | Approves a refund request with 30% fee deduction applied |
| `sp_RejectRefund` | Rejects a refund request (with optional admin comment) |
| `sp_GetClientBookings` | Returns all bookings for a user including payment status |
| `sp_GetClientLoyalty` | Returns current loyalty points balance and tier for a user |
| `sp_SendUserMessage` | Creates a new user-initiated support conversation |
| `sp_SendAdminReply` | Records admin reply to a user conversation, updates status to `Replied` |
| `sp_SendFollowUpMessage` | Allows user to send follow-up after admin has replied; resets to `Pending` |
| `sp_GetUserConversation` | Retrieves the conversation and message history for the logged-in user |
| `sp_GetAdminAllConversations` | Retrieves all conversations across all users for admin management |
| `sp_GetAllSchedulesAdmin` | Returns all schedules (past and future) for admin management view |
| `sp_AddSchedule` | Inserts a new train schedule with validation |
| `sp_UpdateSchedule` | Updates details of an existing schedule |
| `sp_DeleteSchedule` | Deletes a schedule (blocked if confirmed bookings exist) |

---

### Triggers

| Trigger | Description |
|---------|-------------|
| `trg_UpdateLoyaltyTier` | Fires after loyalty points update — automatically upgrades user tier when thresholds are crossed (500 → Silver, 2,000 → Gold, 5,000 → Platinum) |

---

### Indexes

Indexes are created on the following columns for query performance:

- `Clients.Email`
- `Schedule.DepartureTime`
- `Bookings.ClientID`
- `Bookings.ScheduleID`
- `Bookings.PaymentExpiry`
- `Conversations.UserID`
- `Conversations.Status`

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Microsoft SQL Server (Express or Developer Edition)
- SQL Server Management Studio (SSMS)

---

### Step 1 — Database Setup

1. Open **SSMS** and connect to your SQL Server instance (e.g., `localhost` or `localhost\SQLEXPRESS`).
2. Open the `database.sql` file from the project root.
3. Execute the **entire script**. It will:
   - Drop and recreate the `RailwayManagementSystem` database
   - Create all tables, indexes, stored procedures, and triggers
   - Insert sample data: stations, trains, schedules, users, and catalogue entries
4. Verify the database was created successfully — you should see a completion message in the output pane.

---

### Step 2 — Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder with the following content:

```env
PORT=5000
DB_NAME=RailwayManagementSystem
ADMIN_SECRET_CODE=Admin123
```

Start the backend development server:

```bash
npm run dev
```

On successful startup, you will see:

```
========================================
🚀 Railway Management System Backend
========================================
📡 Server: http://localhost:5000
🔗 API: http://localhost:5000/api

✅ HARDCODED ADMIN LOGIN:
   Email: l230787@lhr.nu.edu.pk
   Password: l230787

✅ Regular Test Login: test@test.com / password123
========================================
```

---

### Step 3 — Frontend Setup

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
npm start
```

The application will automatically open at **http://localhost:3000**.

---

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Hardcoded Admin | `l230787@lhr.nu.edu.pk` | `l230787` |
| Database Admin | `admin@railway.com` | `password123` |
| Normal User | `test@test.com` | `password123` |

---

## 🌐 Frontend Pages & Workflows

### Public Routes (No Login Required)

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password sign-in. Redirects to appropriate dashboard based on role. |
| Signup | `/signup` | User registration. Entering the Admin Secret Code (`Admin123`) during registration creates an Admin account. |
| Schedules | `/schedules` | View upcoming train schedules. Click **"Book Now"** to initiate a booking. |
| Catalogue | `/catalogue` | Browse train images and descriptions. |
| Ratings | `/ratings` | View all passenger reviews. Logged-in users can submit their own ratings. |
| Contact | `/contact` | Support ticket submission form — creates a conversation in the messaging system. |

---

### User Routes (Authenticated — Role: `User`)

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Personal overview: loyalty points, tier level, total amount spent, and recent bookings. |
| My Bookings | `/bookings` | Full booking history. Cancel pending bookings or request refunds on paid bookings. |
| My Payments | `/my-payments` | View all unpaid/pending bookings. Proceed with payment or cancel the booking. |
| My Messages | `/my-messages` | View support conversation. Create new support tickets and view admin replies. Send follow-up messages. |
| Payment | `/payment` | Mock payment confirmation page. Finalises a pending booking. |

---

### Admin Routes (Role: `Admin` Only)

| Page | Route | Description |
|------|-------|-------------|
| Admin Dashboard | `/admin/dashboard` | System-wide overview with search functionality (search by ID, Name, or Email). |
| Manage Schedules | `/admin/schedules` | Add, edit, and delete train schedules with form validation. |
| Refund Requests | `/admin/refunds` | Review, approve, or reject user refund requests. 30% fee automatically deducted on approval. |
| Support Messages | `/admin/messages` | View all user conversations (Pending and Replied). Reply to inquiries. |

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `POST` | `/api/auth/register` | ❌ | Register a new user account |
| `POST` | `/api/auth/login` | ❌ | Login — returns JWT token and user data |
| `GET` | `/api/auth/me` | ✅ | Get currently authenticated user's info |

---

### Public Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `GET` | `/api/schedules` | ❌ | Get all upcoming train schedules |
| `GET` | `/api/stations` | ❌ | Get all available stations |
| `GET` | `/api/trains` | ❌ | Get all trains |
| `GET` | `/api/catalogue` | ❌ | Get all catalogue entries (train images/descriptions) |
| `GET` | `/api/ratings` | ❌ | Get all passenger ratings and reviews |
| `POST` | `/api/contact` | ❌ | Submit a support message (creates a conversation) |

---

### User Endpoints (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/bookings` | Create a new pending booking |
| `GET` | `/api/my-bookings` | Get all bookings for the authenticated user |
| `POST` | `/api/bookings/:id/cancel-pending` | Cancel a specific pending booking |
| `POST` | `/api/bookings/:id/request-refund` | Request a refund for a paid booking |
| `POST` | `/api/payment/confirm` | Confirm payment for a pending booking |
| `GET` | `/api/loyalty` | Get user's loyalty points balance and tier |
| `POST` | `/api/messages/send` | Send a new support message |
| `GET` | `/api/messages/my-conversation` | Retrieve the user's conversation history |

---

### Admin Endpoints (Authenticated — Admin Role Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | Get all registered users |
| `GET` | `/api/admin/bookings` | Get all bookings system-wide |
| `GET` | `/api/admin/schedules` | Get all train schedules (past and future) |
| `POST` | `/api/admin/schedules` | Add a new train schedule |
| `PUT` | `/api/admin/schedules/:id` | Update an existing schedule |
| `DELETE` | `/api/admin/schedules/:id` | Delete a schedule (if no confirmed bookings) |
| `GET` | `/api/admin/refund-requests` | Get all refund requests |
| `POST` | `/api/admin/refund-requests/:id/approve` | Approve a refund request |
| `POST` | `/api/admin/refund-requests/:id/reject` | Reject a refund request |
| `GET` | `/api/admin/messages/all` | Get all conversations from all users |
| `POST` | `/api/admin/messages/:id/reply` | Send a reply to a user's conversation |

---

## 🔐 Authentication & Role-Based Access

### How Authentication Works
- **Token Storage**: JWT is stored in `localStorage` upon login.
- **Request Interceptor**: Axios automatically attaches `Authorization: Bearer <token>` header to every authenticated request.
- **Protected Routes**: Two types of route guards are implemented:
  - `ProtectedRoute` — requires any authenticated user (User or Admin)
  - `AdminRoute` — requires authenticated user with Admin role

---

### Role Permission Matrix

| Page / Route | 👤 User | 🔐 Admin | 🌐 Public |
|---|:---:|:---:|:---:|
| `/login`, `/signup` | ✅ | ✅ | ✅ |
| `/schedules`, `/catalogue`, `/ratings`, `/contact` | ✅ | ✅ | ✅ |
| `/dashboard`, `/bookings`, `/my-payments`, `/my-messages`, `/payment` | ✅ | ✅ | ❌ |
| `/admin/*` | ❌ | ✅ | ❌ |

---

## ⚙️ Background Jobs

A **cron job** runs every **5 minutes** to automatically:
- Scan for bookings whose `PaymentExpiry` has passed
- Cancel expired pending bookings
- Release reserved seats back into availability

This ensures system consistency even when users abandon the payment flow.

---

## 🔮 Future Enhancements

| Area | Suggested Improvement |
|------|-----------------------|
| Payment Gateway | Integrate a real payment processor (Stripe, JazzCash, EasyPaisa) |
| Email Notifications | Send automated emails for booking confirmation, refund approval/rejection |
| Real-Time Seat Map | Visual interactive seat selection with live availability |
| Train Status Tracking | Live train location and delay update notifications |
| Admin Analytics | Revenue charts, popular routes, booking trends, and usage reports |
| Password Reset | Forgot password flow using email-based token verification |
| Multi-Language Support | Full Urdu and English interface switching |
| Mobile Application | React Native version for iOS and Android |

---

## 👥 Contributors

| Name | Role |
|------|------|
| **Abdul Rehman Naseer** | Full Stack Developer |


---

## 📄 License

This project is for **educational use only**.

---

*Happy Coding! 🚆*

> Last Updated: May 2025 &nbsp;|&nbsp; Version 2.0