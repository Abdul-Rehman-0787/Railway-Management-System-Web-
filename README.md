# 🚂 Railway Management System – Complete Documentation

## 📖 Project Overview

The **Railway Management System** is a full‑stack web application that allows passengers to search for train schedules, book tickets, pay later, manage reservations, earn loyalty points, leave reviews, request refunds (with admin approval), and contact support. The system includes dedicated **User** and **Admin** dashboards.

Built with **React (frontend)**, **Node.js + Express (backend)**, and **Microsoft SQL Server (database)**, it demonstrates modern web practices including JWT authentication, role‑based access, payment expiry, and an admin approval workflow for refunds.

---

## ✨ Core Features

### Public (No Login)
- View upcoming train schedules
- Browse train catalogue (images & descriptions)
- Read ratings & reviews
- Contact customer support

### User (Authenticated – Role: `User`)
- Register / Login
- Book tickets → booking goes to **Pending Payment** state with expiry (1 hour, or 15 min if departure is within 1 hour)
- **My Payments** page: list pending bookings, pay later, or cancel pending booking
- **My Bookings** page: view all bookings (paid, pending, refunded)
  - For paid bookings: **Request Refund** (admin approval required, 30% fee deducted)
  - For pending bookings: **Cancel Booking** (immediate, seat released)
- Loyalty points: 10 points per 100 PKR spent, automatic tier upgrade (Bronze/Silver/Gold/Platinum)
- Rate and review rides

### Admin (Authenticated – Role: `Admin`)
- **Admin Dashboard** – overview
- **Manage Schedules** – add, edit, delete train schedules (with validation)
- **Refund Requests** – approve/reject user refund requests with optional comment (30% deduction on approval)
- View all users and all bookings (planned, can be extended)

### Core Functionality
- Role‑based authentication (JWT stored in localStorage)
- Payment expiry and auto‑cancellation of expired pending bookings (cron job every 5 minutes)
- Refund workflow: user requests → admin approves/rejects → points deducted, seat released (if train not departed)
- Cascading referential integrity with proper `ON DELETE` rules (e.g., `ON DELETE SET NULL` for ratings)

---

## 🛠️ Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | React 18, React Router DOM, Axios, React Hot Toast, CSS3 |
| Backend     | Node.js, Express, bcryptjs, dotenv, mssql, node-cron |
| Database    | Microsoft SQL Server (LocalDB / Express)       |
| Auth        | JWT (Base64 encoded)                           |
| Build Tool  | Create React App, Nodemon                      |

---

## 📁 Project Structure

```
railway-management-system/
│
├── backend/
│   ├── config/
│   │   └── database.js          # SQL Server connection
│   ├── .env                     # Environment variables
│   ├── package.json
│   ├── server.js                # All API endpoints (auth, bookings, payments, admin)
│   └── node_modules/
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── assets/              # Logo, images
│   │   ├── components/
│   │   │   ├── AdminDashboard.js
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
│   │   │   └── Signup.js
│   │   ├── api.js               # Axios instance, auth helpers
│   │   ├── App.js               # Routing with role‑based guards
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── node_modules/
│
├── database.sql                 # Complete DB schema + stored procedures + sample data
└── README.md
└── Required_Changes.md
```

---

## 🗄️ Database Schema Highlights

Key tables: `Clients`, `Stations`, `Trains`, `Schedule`, `Bookings` (includes `PaymentStatus`, `PaymentExpiry`), `Payments`, `Cancellations`, `Ratings`, `LoyaltyRewards`, `RewardTransactions`, `Catalogue`, `ContactSupport`, `RefundRequests`.

**Important stored procedures**:
- `sp_BookTicket` – creates booking with payment expiry, reserves seat
- `sp_ConfirmPayment` – marks booking as paid, adds loyalty points
- `sp_CancelPendingBooking` – releases seat, marks as failed
- `sp_RequestRefund` – creates refund request, changes status to `RefundRequested`
- `sp_ApproveRefund` – cancels booking, deducts 30% fee, refunds 70%, adjusts points
- `sp_RejectRefund` – reverts booking to `Paid`
- `sp_GetClientBookings` – returns `PaymentStatus` and `PaymentExpiry` for frontend

**Triggers**: `trg_UpdateLoyaltyTier` – updates tier automatically.

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14+)
- Microsoft SQL Server (Express or Developer)
- SQL Server Management Studio (SSMS)

### Step 1 – Database
1. Open SSMS, connect to your server (e.g., `localhost` or `localhost\SQLEXPRESS`).
2. Run the entire `database.sql` script. It will:
   - Drop and recreate `RailwayManagementSystem`
   - Create all tables, indexes, stored procedures, trigger
   - Insert sample stations, trains, schedules, users (admin, test user), catalogue
3. Verify that login `railway_user` exists (script creates it). If not, run:
   ```sql
   USE master;
   CREATE LOGIN railway_user WITH PASSWORD = 'Railway@123';
   USE RailwayManagementSystem;
   CREATE USER railway_user FOR LOGIN railway_user;
   ALTER ROLE db_owner ADD MEMBER railway_user;
   ```

### Step 2 – Backend
```bash
cd backend
npm install
# Create .env file with:
# PORT=5000
# DB_NAME=RailwayManagementSystem
# ADMIN_SECRET_CODE=Admin123
npm run dev
```
Backend runs on `http://localhost:5000`.

### Step 3 – Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`.

### Test Credentials
- **Hardcoded Admin**: `l230787@lhr.nu.edu.pk` / `l230787`
- **Database Admin**: `admin@railway.com` / `password123`
- **Normal User**: `test@test.com` / `password123`

---

## 🌐 Frontend Pages & Workflows

### Public Routes
| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password, redirects based on role |
| Signup | `/signup` | Optional admin code field (Admin123) |
| Schedules | `/schedules` | Upcoming trains, “Book Now” opens modal |
| Catalogue | `/catalogue` | Train info & images |
| Ratings | `/ratings` | View reviews, logged‑in users can submit |
| Contact | `/contact` | Support ticket form |

### User Routes (authenticated, role `User` or `Admin`)
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Loyalty points, total spent, recent bookings |
| My Bookings | `/bookings` | List all bookings; pending: cancel; paid: request refund |
| My Payments | `/my-payments` | View pending payments (unpaid) and pay later |
| Payment | `/payment` | Mock credit card form; confirms payment and redirects to dashboard |

### Admin Routes (role `Admin` only)
| Page | Route | Description |
|------|-------|-------------|
| Admin Dashboard | `/admin/dashboard` | Admin landing (links to management) |
| Manage Schedules | `/admin/schedules` | Add/edit/delete train schedules |
| Refund Requests | `/admin/refunds` | Approve/reject refunds with comment; 30% fee deducted on approval |

---

## 📡 Key API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST   | `/api/auth/register` | No | Register (optional adminCode) |
| POST   | `/api/auth/login` | No | Returns token & user |
| POST   | `/api/bookings` | Yes | Create pending booking (returns bookingId + paymentExpiry) |
| POST   | `/api/payment/confirm` | Yes | Confirm payment (mock) |
| POST   | `/api/bookings/:id/cancel-pending` | Yes | Cancel unpaid booking |
| POST   | `/api/bookings/:id/request-refund` | Yes | Request refund for paid booking |
| GET    | `/api/my-bookings` | Yes | List bookings (includes PaymentStatus, PaymentExpiry) |
| GET    | `/api/admin/schedules` | Admin | Get all schedules (for admin) |
| POST   | `/api/admin/schedules` | Admin | Add schedule |
| PUT    | `/api/admin/schedules/:id` | Admin | Update schedule |
| DELETE | `/api/admin/schedules/:id` | Admin | Delete schedule (only if no confirmed bookings) |
| GET    | `/api/admin/refund-requests` | Admin | List refund requests |
| POST   | `/api/admin/refund-requests/:id/approve` | Admin | Approve refund (30% fee) |
| POST   | `/api/admin/refund-requests/:id/reject` | Admin | Reject refund |

---

## 🔐 Authentication & Role‑Based Access

- Token is a Base64‑encoded JSON `{ id, email, role }`, stored in `localStorage`.
- `api.js` interceptors add `Authorization: Bearer <token>`.
- `App.js` defines `ProtectedRoute` (any authenticated user) and `AdminRoute` (checks `role === 'Admin'`).
- Unauthorized access redirects to `/login`.

---

## 🔮 Future Enhancements

| Area | Suggested Improvement |
|------|----------------------|
| Payment | Integrate real gateway (Stripe, JazzCash) |
| Notifications | Email confirmation / refund status |
| Real‑time seat map | Visual seat selection |
| Train status | Live tracking / delay updates |
| Admin analytics | Charts for revenue, popular routes |
| Password reset | Forgot password flow |
| Mobile app | React Native version |

---

## 👥 Contributors

- Abdul Rehman Naseer

---

## 📄 License

Educational use only.

---

**Happy Coding! 🚆**