# 🚂 Railway Management System

> **A full-stack web application for end-to-end railway ticket booking, passenger management, loyalty rewards, refund processing, and admin–user communication.**

---

## 📖 Project Overview

The **Railway Management System** is a comprehensive full-stack web application designed to streamline train travel management for both passengers and administrators. Passengers can search for train schedules, book tickets with deferred payment, manage reservations, earn loyalty rewards, leave reviews, request refunds (subject to admin approval), and communicate with support staff — all from a single interface.

Administrators are equipped with a dedicated dashboard to manage schedules (add, edit, delete), approve or reject refund requests, manage bookings, and respond to support conversations.

Built using **React** on the frontend, **Node.js + Express** on the backend, and **Microsoft SQL Server** as the database engine, the system demonstrates modern full-stack development practices including:

- JWT-based authentication (Base64 encoded, stored in `localStorage`)
- Role-based access control (User / Admin)
- Deferred payment with automatic expiry (1 hr standard, 15 min if departure is imminent)
- Admin approval workflows for refunds
- A unified, stateful messaging system for support communications
- Loyalty point accumulation with automatic tier upgrades
- Cron-based background jobs for expired booking cleanup and auto-completion

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

#### Schedule Management *(fixed in v2.1)*
- View all train schedules (including past and future) with full coach & pricing detail
- **Add** new schedules — specify train, stations, departure/arrival times, seat/berth prices, and coach composition; total capacity is auto-calculated
- **Edit** existing schedules — all fields (including coach counts and prices) pre-populate correctly in the edit modal
- **Delete** schedules (blocked if confirmed bookings exist)

#### Booking Management
- View all bookings system-wide
- Update booking status and seat number
- Admin-cancel any booking with a reason

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
| Frontend | React 18, React Router DOM, Axios, React Hot Toast, React Icons, CSS3 |
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
│   │   └── database.js          # SQL Server connection pool & helper functions
│   ├── .env                     # Environment variables (PORT, DB_NAME)
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
│   │   │   ├── AdminSchedules.js   ← fixed in v2.1
│   │   │   ├── AdminSchedules.css
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
├── schedule_fix_patch.sql       # ← Patch to fix admin schedule Add/Edit (run this if upgrading)
└── README.md
```

---

## 🗄️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `Clients` | User accounts — first name, last name, email, password hash, role, etc. |
| `Stations` | Railway stations — name, city, province |
| `Trains` | Train details — name, number, total seats, type, default pricing |
| `Schedule` | Train ride instances — departure/arrival stations, times, per-journey seat/berth prices, coach counts, available seats |
| `Bookings` | Ticket reservations — client, schedule, seat number, status, payment status, expiry |
| `Payments` | Payment records linked to individual bookings |
| `Cancellations` | Cancellation records with refund amount and status |
| `Ratings` | User ratings and reviews (1–5 stars) with comments |
| `LoyaltyRewards` | Points balance and tier per client |
| `RewardTransactions` | Audit log of all points earned and redeemed |
| `Catalogue` | Marketing content (images, descriptions) per train |
| `RefundRequests` | Refund requests with admin approval/rejection workflow |
| `Conversations` | Unified messaging — one conversation per user with status tracking |

> **Coach layout (per-schedule):** Seat/berth prices and coach counts (`SleeperCoaches`, `SeaterCoaches`) are stored on the `Schedule` table, not on `Trains`. This allows each journey to have its own composition.

---

### Stored Procedures

| Procedure | Description |
|-----------|-------------|
| `sp_RegisterClient` | Creates a new user account and initialises their loyalty record |
| `sp_LoginClient` | Returns user data for authentication |
| `sp_GetAllSchedules` | Fetches upcoming scheduled trains for the public view (includes `SeatPrice`, `BerthPrice`, `SleeperCoaches`, `SeaterCoaches`) |
| `sp_GetScheduleByID` | Returns a single schedule by ID with full detail |
| `sp_GetAllSchedulesAdmin` | Returns **all** schedules (past and future) with `DepartureStationID`, `ArrivalStationID`, `SleeperCoaches`, `SeaterCoaches`, `SeatPrice`, `BerthPrice` — used by the admin manage-schedules page |
| `sp_AddSchedule` | Inserts a new schedule; auto-calculates `AvailableSeats` from coach counts; validates stations differ and arrival > departure |
| `sp_UpdateSchedule` | Updates an existing schedule; recalculates `AvailableSeats` minus booked count; validates constraints |
| `sp_DeleteSchedule` | Deletes a schedule (blocked if confirmed bookings exist) |
| `sp_GetTrainConfig` | Returns train pricing only (`SeatPrice`, `BerthPrice`) |
| `sp_UpdateTrainConfig` | Updates default train pricing |
| `sp_BookTicket` | Creates a booking with payment expiry timer and reserves the seat |
| `sp_ConfirmPayment` | Marks booking as paid and adds loyalty points |
| `sp_CancelPendingBooking` | Releases reserved seat and cancels a pending booking |
| `sp_CancelBooking` | Cancels a confirmed (paid) booking |
| `sp_AdminCancelBooking` | Admin-initiated booking cancellation |
| `sp_RequestRefund` | Creates a refund request pending admin review |
| `sp_ApproveRefund` | Approves a refund request with 30% fee deduction |
| `sp_RejectRefund` | Rejects a refund request (with optional admin comment) |
| `sp_GetClientBookings` | Returns all bookings for a user including payment status |
| `sp_GetClientLoyalty` | Returns current loyalty points balance and tier |
| `sp_SendUserMessage` | Creates or continues a user-initiated support conversation |
| `sp_CancelExpiredPendingBookings` | Cron-invoked — cancels bookings whose payment expiry has passed |
| `sp_AutoCompleteBookings` | Cron-invoked — marks confirmed bookings as Completed after departure |

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

#### Fresh installation
1. Open **SSMS** and connect to your SQL Server instance (e.g., `localhost` or `localhost\SQLEXPRESS`).
2. Open `database.sql` from the project root.
3. Execute the **entire script**. It will:
   - Drop and recreate the `RailwayManagementSystem` database
   - Create all tables, indexes, stored procedures, and triggers
   - Insert sample data: stations, trains, schedules, users, and catalogue entries
4. Verify: you should see a success message in the SSMS output pane.

#### Upgrading an existing database (v2.0 → v2.1)
If you already have the database set up and only need to fix the admin schedule management:

1. Open `schedule_fix_patch.sql` in SSMS.
2. Execute the entire script against `RailwayManagementSystem`.
3. You should see `ALL PATCHES APPLIED SUCCESSFULLY.` in the output.

This patch is **safe to run multiple times** — all statements are idempotent.

---

### Step 2 — Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```env
PORT=5000
DB_NAME=RailwayManagementSystem
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
| Normal User | `test@test.com` | `password123` |

---

## 🌐 Frontend Pages & Workflows

### Public Routes (No Login Required)

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password sign-in. Redirects to appropriate dashboard based on role. |
| Signup | `/signup` | User registration. |
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
| My Payments | `/my-payments` | View all unpaid/pending bookings. Proceed with payment or cancel. |
| My Messages | `/my-messages` | View support conversation. Create new tickets and view admin replies. Send follow-ups. |
| Payment | `/payment` | Mock payment confirmation page. Finalises a pending booking. |

---

### Admin Routes (Role: `Admin` Only)

| Page | Route | Description |
|------|-------|-------------|
| Admin Dashboard | `/admin/dashboard` | System-wide overview with search functionality. |
| Manage Schedules | `/admin/schedules` | Add, edit, and delete train schedules with full form validation and live capacity preview. |
| Refund Requests | `/admin/refunds` | Review, approve, or reject user refund requests. 30% fee automatically deducted on approval. |
| Support Messages | `/admin/messages` | View all user conversations (Pending and Replied). Reply to inquiries. |

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/auth/register` | ❌ | Register a new user account |
| `POST` | `/api/auth/login` | ❌ | Login — returns token and user data |
| `GET` | `/api/auth/me` | ✅ | Get currently authenticated user info |
| `POST` | `/api/auth/logout` | ✅ | Logout |

---

### Public Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/schedules` | ❌ | Get all upcoming train schedules |
| `GET` | `/api/schedules/:id` | ❌ | Get a single schedule by ID |
| `GET` | `/api/schedules/:id/booked-seats` | ❌ | Get booked seat numbers for a schedule |
| `GET` | `/api/stations` | ❌ | Get all available stations |
| `GET` | `/api/trains` | ❌ | Get all trains |
| `GET` | `/api/trains/:id/config` | ❌ | Get train pricing config |
| `GET` | `/api/catalogue` | ❌ | Get all catalogue entries |
| `GET` | `/api/ratings` | ❌ | Get all passenger ratings |
| `POST` | `/api/contact` | ❌ | Submit a support message |

---

### User Endpoints (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/bookings` | Create a new pending booking |
| `GET` | `/api/my-bookings` | Get all bookings for the authenticated user |
| `POST` | `/api/bookings/:id/cancel` | Cancel a confirmed booking (request refund) |
| `POST` | `/api/bookings/:id/cancel-pending` | Cancel a pending (unpaid) booking |
| `POST` | `/api/bookings/:id/request-refund` | Request a refund for a paid booking |
| `GET` | `/api/loyalty` | Get user's loyalty points balance and tier |
| `POST` | `/api/ratings` | Submit a rating/review |
| `POST` | `/api/messages/send` | Send a new support message |
| `POST` | `/api/messages/:id/followup` | Send a follow-up to an existing conversation |
| `GET` | `/api/messages/my-conversation` | Retrieve the user's conversation history |

---

### Admin Endpoints (Authenticated — Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | Get all registered users |
| `GET` | `/api/admin/users/search` | Search users by name or email |
| `GET` | `/api/admin/bookings` | Get all bookings system-wide |
| `GET` | `/api/admin/bookings/search` | Search bookings |
| `PUT` | `/api/admin/bookings/:id` | Update booking status/seat |
| `POST` | `/api/admin/bookings/:id/admin-cancel` | Admin-cancel a booking |
| `GET` | `/api/admin/schedules` | Get all schedules (past and future) with full detail |
| `POST` | `/api/admin/schedules` | Add a new train schedule |
| `PUT` | `/api/admin/schedules/:id` | Update an existing schedule |
| `DELETE` | `/api/admin/schedules/:id` | Delete a schedule (blocked if confirmed bookings exist) |
| `GET` | `/api/admin/refund-requests` | Get all refund requests |
| `POST` | `/api/admin/refund-requests/:id/approve` | Approve a refund request |
| `POST` | `/api/admin/refund-requests/:id/reject` | Reject a refund request |
| `GET` | `/api/admin/messages/all` | Get all conversations from all users |
| `GET` | `/api/admin/messages/:id` | Get a single conversation detail |
| `POST` | `/api/admin/messages/:id/reply` | Send a reply to a user's conversation |
| `POST` | `/api/admin/update-train-config` | Update default train pricing |

---

## 🔐 Authentication & Role-Based Access

- **Token Storage**: JWT (Base64 encoded) stored in `localStorage` upon login.
- **Request Interceptor**: Axios automatically attaches `Authorization: Bearer <token>` to every authenticated request.
- **Protected Routes**: Two guards in `App.js`:
  - `ProtectedRoute` — any authenticated user (User or Admin)
  - `AdminRoute` — authenticated user with Admin role only

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

1. **Cancel expired pending bookings** — scans for bookings whose `PaymentExpiry` has passed and cancels them, releasing the seat back into availability.
2. **Auto-complete confirmed bookings** — marks confirmed, paid bookings as `Completed` once the train's `DepartureTime` has passed.

---

## 🐛 Changelog

### v2.1 (May 2026)
- **Fixed**: Admin schedule Add and Edit modal was broken due to a duplicate `sp_GetAllSchedulesAdmin` procedure in the database that omitted `SleeperCoaches`, `SeaterCoaches`, `SeatPrice`, `BerthPrice`, `DepartureStationID`, and `ArrivalStationID` columns.
- **Fixed**: Edit modal station dropdowns not pre-populating correctly — now uses a robust ID-first, then name-fallback resolution strategy.
- **Fixed**: Added input validation (arrival > departure, stations must differ) on both backend (stored procedure) and frontend (form submit guard).
- **Added**: `schedule_fix_patch.sql` — standalone DB patch script for upgrading existing installations without re-running the full database setup.
- **Improved**: Save button shows "Saving…" state during API call; error messages from the server surface directly in the toast notification.
- Currency labels changed from `₹` to `PKR` to match the Pakistan Railways context.

### v2.0 (May 2025)
- Initial full-stack release with React frontend, Express backend, and SQL Server database.
- Per-schedule coach composition (SleeperCoaches / SeaterCoaches) with auto-calculated capacity.
- Unified messaging system, loyalty program, refund workflow.

---

## 🔮 Future Enhancements

| Area | Suggested Improvement |
|------|-----------------------|
| Payment Gateway | Integrate JazzCash, EasyPaisa, or Stripe |
| Email Notifications | Automated emails for booking confirmation, refund status |
| Real-Time Seat Map | Visual interactive seat selection with live availability |
| Train Status Tracking | Live delay updates and push notifications |
| Admin Analytics | Revenue charts, popular routes, booking trends |
| Password Reset | Forgot-password flow with email token verification |
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

> Last Updated: May 2026 &nbsp;|&nbsp; Version 2.1