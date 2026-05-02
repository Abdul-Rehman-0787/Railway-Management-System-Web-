# 🚂 National Railway System

> **A modern full-stack railway booking application with AI-powered chat assistance, passenger management, admin controls, loyalty rewards, refunds, and messaging.**

---

## 📖 Project Overview

The **National Railway System** is a complete web application designed for railway passengers and administrators.

Passengers can:
- browse train schedules,
- book tickets,
- manage reservations,
- request refunds,
- earn loyalty rewards,
- leave reviews,
- and interact with an AI travel assistant.

Admins can:
- manage schedules,
- review bookings,
- approve or deny refunds,
- monitor loyalty programs,
- and respond to support conversations.

The system combines:
- a **React** frontend,
- a **Node.js + Express** backend,
- a **Python AI assistant service**,
- a **Microsoft SQL Server** database.

---

## ✨ What’s Included

- **AI chat assistant** with animated welcome screen and start button
- **Full-page chatbot interface** in `frontend/src/pages/Chatbot.js`
- **Separate Python AI service** in `backend/ai_chatbot/`
- **Passenger and admin role-based workflows**
- **Rich railway-themed UI** with header-matching accent colors and 3D visual polish
- **Booking, refunds, loyalty, reviews, and messaging** support

---

## 🚀 Core Features

### 🧠 AI Assistant
- Robot welcome animation before chat begins
- Start button opens the full chat interface
- Dynamic chatbot UI with glassmorphism styling
- Status banner when AI service is offline

### 🌐 Public Access
- Browse upcoming train schedules
- View train catalogue and reviews
- Submit support/contact messages

### 👤 User Experience
- Register and login
- Personal dashboard with loyalty tier and booking summaries
- Ticket booking and pending-payment flows
- Cancel pending bookings or request refunds
- Real-time messaging with support
- Rating and review completed rides

### 🔐 Admin Experience
- View dashboard analytics
- Manage schedules (add/edit/delete)
- Oversee bookings and refunds
- Reply to support conversations

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router DOM, Axios, React Hot Toast, React Icons, CSS3 |
| Backend | Node.js, Express, bcryptjs, dotenv, mssql, node-cron |
| AI Assistant | Python, custom chatbot API, Chroma/FAISS knowledge store |
| Database | Microsoft SQL Server |
| Authentication | JWT stored in `localStorage` |
| Build Tools | Create React App, Nodemon |

---

## 📁 Project Structure

```
RailwaySystem/
│
├── backend/
│   ├── ai_chatbot/              # Python AI assistant service
│   │   ├── chatbot_api.py
│   │   ├── chroma_store.py
│   │   ├── embeddings.py
│   │   ├── knowledge_base.json
│   │   ├── requirements.txt
│   │   ├── .env
│   │   └── venv/
│   ├── config/
│   │   └── database.js          # SQL Server connection helper
│   ├── package.json
│   ├── server.js                # Main Express backend API
│   └── node_modules/
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api.js               # Axios helpers and auth utilities
│   │   ├── App.js               # App routing and layout
│   │   ├── App.css
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── pages/
│   │   │   ├── Chatbot.js       # Full-page AI chat interface
│   │   │   ├── Chatbot.css
│   │   │   └── ... other page files
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── Layout.js
│   │   │   ├── Login.js
│   │   │   ├── Signup.js
│   │   │   ├── Dashboard.js
│   │   │   ├── MyPayments.js
│   │   │   ├── UserMessages.js
│   │   │   ├── AdminDashboard.js
│   │   │   ├── AdminSchedules.js
│   │   │   └── ...
│   ├── package.json
│   └── node_modules/
│
├── database.sql                 # Database schema and seed data
├── LICENSE
└── README.md
```

---

## 🧪 Setup & Run

### 1. Run the backend API
```bash
cd backend
npm install
npm run dev
```

### 2. Run the AI assistant service
```bash
cd backend/ai_chatbot
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python chatbot_api.py
```

### 3. Run the frontend
```bash
cd frontend
npm install
npm start
```

> The frontend proxies requests to `http://localhost:5000`.

---

## 🔧 Notes

- Start the AI assistant service before using the chatbot page.
- If the AI engine is not running, the chatbot shows an offline banner.
- The app supports both `User` and `Admin` roles.
- Database schema and seed data are available in `database.sql`.

---

## 📌 Highlights

- Full-page **AI chatbot** with animated robot launch screen
- **Header-contrast colors** matching the railway branding
- Clean separation of frontend, backend, and AI service layers
- Comprehensive support for bookings, refunds, loyalty, reviews, and messaging


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