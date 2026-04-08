# 🚂 Railway Management System – Complete Documentation

## 📖 Project Overview

The **Railway Management System** is a full‑stack web application that allows passengers to search for train schedules, book tickets, manage reservations, earn loyalty points, leave reviews, and contact support. The system also includes a dedicated **Admin Panel** for managing trains, stations, schedules, users, bookings, cancellations, and support tickets.  

The project is built with a **React frontend**, a **Node.js + Express backend**, and a **Microsoft SQL Server** database. It demonstrates modern web development practices, including JWT authentication, role‑based access control, and a responsive UI.

---

## ✨ Features

### Public (No Login Required)
- View upcoming train schedules
- Browse the train catalogue (images & descriptions)
- Read ratings & reviews posted by users
- Contact customer support

### User (Authenticated – Role: `User`)
- Register / Login (with password hashing)
- Book tickets for available schedules
- View personal booking history
- Cancel reservations (with refund and loyalty point adjustment)
- Check loyalty points and tier (Bronze / Silver / Gold / Platinum)
- Rate and review completed rides
- Edit profile (planned)

### Admin (Authenticated – Role: `Admin`)
- **Admin Dashboard** – overview and quick links
- **Manage Schedules** – create, update, delete train schedules
- **Manage Trains** – add, edit, deactivate trains
- **Manage Stations** – add, edit, deactivate stations
- **View All Bookings** – see all user bookings, filter by user/date
- **View All Users** – list users, change roles, deactivate accounts
- **View Cancellations** – process refunds
- **View Support Tickets** – reply to contact messages

### Core Functionality
- **Role‑based authentication** (User / Admin)
- **Secure password hashing** (bcrypt)
- **JWT token** for stateless authentication
- **Loyalty points system** – 10 points per 100 PKR spent
- **Automatic tier upgrade** (triggered on points update)
- **Cascading referential integrity** in the database

---

## 🛠️ Tech Stack

| Layer       | Technology                         |
|-------------|------------------------------------|
| Frontend    | React 18, React Router DOM, Axios, React Hot Toast, CSS3 |
| Backend     | Node.js, Express, bcryptjs, dotenv, mssql |
| Database    | Microsoft SQL Server (LocalDB / Express) |
| Auth        | JWT (Base64 encoding for simplicity) |
| Build Tool  | Create React App (frontend), Nodemon (backend) |

---

## 📁 Project Structure

```
railway-management-system/
│
├── backend/
│   ├── config/
│   │   └── database.js          # SQL Server connection pool & helpers
│   ├── .env                     # Environment variables
│   ├── package.json             # Backend dependencies
│   ├── server.js                # Express server, all API endpoints
│   └── node_modules/
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminCreate.js       # Create new admin (if separate)
│   │   │   ├── AdminDashboard.js    # Admin landing page
│   │   │   ├── AdminSchedules.js    # Manage schedules
│   │   │   ├── Bookings.js          # User bookings list
│   │   │   ├── Catalogue.js         # Train catalogue
│   │   │   ├── Contact.js           # Contact support form
│   │   │   ├── Dashboard.js         # User dashboard
│   │   │   ├── Footer.js            # Footer component
│   │   │   ├── Header.js            # Header/navigation
│   │   │   ├── Layout.js            # Main layout wrapper
│   │   │   ├── Login.js             # Login form
│   │   │   ├── Ratings.js           # Ratings & reviews
│   │   │   ├── Schedules.js         # View schedules & book tickets
│   │   │   └── Signup.js            # Registration with admin code
│   │   ├── styles/
│   │   │   ├── AdminCreate.css
│   │   │   ├── AdminDashboard.css
│   │   │   ├── AdminSchedules.css
│   │   │   ├── Bookings.css
│   │   │   ├── Catalogue.css
│   │   │   ├── Contact.css
│   │   │   ├── Dashboard.css
│   │   │   ├── Headers.css
│   │   │   ├── Layout.css
│   │   │   ├── Login.css
│   │   │   ├── Ratings.css
│   │   │   ├── Schedules.css
│   │   │   └── Signup.css
│   │   ├── api.js               # Axios instance & auth helpers
│   │   ├── App.js               # Routing & role‑based protected routes
│   │   ├── App.css              # Global styles
│   │   ├── index.js             # React entry point
│   │   └── index.css            # Base styles
│   ├── package.json
│   └── node_modules/
│
├── database.sql                 # Full database schema + stored procedures + sample data
└── README.md                    # This file
```

---

## 🗄️ Database Schema

The database `RailwayManagementSystem` contains the following tables:

| Table | Description |
|-------|-------------|
| `Clients` | User accounts (first name, last name, email, password hash, role, etc.) |
| `Stations` | Railway stations (name, city, province) |
| `Trains` | Train details (name, number, total seats, type) |
| `Schedule` | Train rides (departure/arrival stations, times, ticket price, available seats) |
| `Bookings` | Ticket reservations (client, schedule, seat number, status) |
| `Payments` | Payment records linked to bookings |
| `Cancellations` | Cancellation records with refund amount and status |
| `Ratings` | User ratings & reviews (1‑5 stars) – `ON DELETE SET NULL` on schedule |
| `LoyaltyRewards` | Points and tier per client |
| `RewardTransactions` | Audit log of points earned/redeemed |
| `Catalogue` | Marketing content per train (title, description, image URL) |
| `ContactSupport` | Support tickets submitted by users |

**Key stored procedures** (used by backend):

- `sp_RegisterClient` – creates user and loyalty record (supports role)
- `sp_LoginClient` – returns user data for authentication
- `sp_GetAllSchedules` – upcoming trains
- `sp_GetScheduleByID` – single schedule details
- `sp_BookTicket` – atomic booking with points addition
- `sp_CancelBooking` – cancellation with seat release and points deduction
- `sp_GetClientBookings` – history for logged‑in user
- `sp_GetClientLoyalty` – points, tier, total spent
- `sp_GetAllStations`, `sp_GetAllTrains`

**Triggers**:  
- `trg_UpdateLoyaltyTier` – automatically upgrades tier when points cross thresholds (500, 2000, 5000).

**Indexes**: on `Clients.Email`, `Schedule.DepartureTime`, `Bookings.ClientID`, `Bookings.ScheduleID`.

---

## 🚀 Setup Instructions

### Prerequisites
- **Node.js** (v14 or higher)
- **Microsoft SQL Server** (LocalDB, Express, or Developer Edition)
- **SQL Server Management Studio** (SSMS) or Azure Data Studio (optional)
- **Git** (optional)

### Step 1: Clone / Download the Project

```bash
git clone https://github.com/your-repo/railway-management-system.git
cd railway-management-system
```

### Step 2: Database Setup

1. Open **SSMS** and connect to your SQL Server instance (e.g., `localhost` or `localhost\SQLEXPRESS`).
2. Run the entire `database.sql` script. It will:
   - Drop and recreate the `RailwayManagementSystem` database.
   - Create all tables, constraints, stored procedures, views, triggers, indexes.
   - Insert sample stations, trains, a client (`admin@railway.com` / `password123`), and upcoming schedules.
3. Verify that the database is created and the login `railway_user` exists (the script creates it). If not, create it manually:

```sql
USE master;
CREATE LOGIN railway_user WITH PASSWORD = 'Railway@123';
USE RailwayManagementSystem;
CREATE USER railway_user FOR LOGIN railway_user;
ALTER ROLE db_owner ADD MEMBER railway_user;
```

### Step 3: Backend Configuration

Navigate to the `backend/` folder:

```bash
cd backend
```

Create a `.env` file with the following content (adjust values as needed):

```env
PORT=5000
DB_NAME=RailwayManagementSystem
ADMIN_SECRET_CODE=Admin123
```

> **Note:** The backend uses hardcoded database credentials in `config/database.js` (`railway_user` / `Railway@123`). You can modify that file if your SQL Server authentication differs.

Install dependencies and start the backend:

```bash
npm install
npm run dev   # or npm start
```

You should see:

```
========================================
🚀 Railway Management System Backend
========================================
📡 Server: http://localhost:5000
🔗 API: http://localhost:5000/api

✅ Test Login: admin@railway.com / password123
========================================
```

### Step 4: Frontend Configuration

Open a new terminal, navigate to the `frontend/` folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm start
```

The application will open at `http://localhost:3000`.

> The frontend is configured to proxy API requests to `http://localhost:5000` (see `package.json` proxy field). If your backend runs on a different port, update the `proxy` or the `API_URL` in `src/api.js`.

### Step 5: Test the Application

- **Register a normal user** – leave admin code empty.
- **Register an admin** – use admin code `Admin123`.
- **Login** – you will be redirected to the appropriate dashboard.
- Browse schedules, book tickets, cancel bookings, and check loyalty points.
- As admin, visit `/admin-dashboard` and use the management links.

---

## 🌐 Frontend Pages & Workflows (Complete)

### Public Pages (No Login Required)

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/login` | Email/password sign‑in. On success, stores token and redirects based on role (User → `/user-dashboard`, Admin → `/admin-dashboard`). |
| **Signup** | `/signup` | Registration form with optional **Admin Registration Code** field. If the code matches the backend secret, the account is created with role `Admin`; otherwise, role `User`. |
| **Schedules** | `/schedules` | Lists upcoming trains. For authenticated users, a “Book Now” button appears. |
| **Catalogue** | `/catalogue` | Displays train images and descriptions (marketing content). |
| **Ratings** | `/ratings` | Shows all user reviews; logged‑in users can submit their own rating. |
| **Contact** | `/contact` | Support ticket form (name, email, subject, message). |

### User Pages (Role = `User` or `Admin`)

| Page | Route | Description |
|------|-------|-------------|
| **User Dashboard** | `/user-dashboard` | Shows personal booking summary, loyalty points, tier, total spent, and recent bookings with cancel option. |
| **My Bookings** | `/bookings` | Full history of user’s bookings; cancel active ones. |

### Admin Pages (Role = `Admin` only)

| Page | Route | Description |
|------|-------|-------------|
| **Admin Dashboard** | `/admin-dashboard` | Overview page with links to all admin management sections. |
| **Manage Schedules** | `/admin/schedules` | View, add, and delete train schedules (with validation to protect existing bookings). |
| **Manage Trains** | `/admin/trains` | Add, edit, deactivate trains. |
| **Manage Stations** | `/admin/stations` | Add, edit, deactivate stations. |
| **View All Bookings** | `/admin/bookings` | See all user bookings, filter by user or date. |
| **View All Users** | `/admin/users` | List all registered users, change roles, or deactivate accounts. |
| **View Cancellations** | `/admin/cancellations` | Process pending refunds. |
| **View Support Tickets** | `/admin/support` | Reply to contact messages. |
| **Admin Create** | `/admin/create` | (Optional) Form to create another admin account. |

> **Note:** Admin signup is **not a separate page** – it uses the same `/signup` page with an admin code field. The `AdminCreate` component may be used by existing admins to create additional admin accounts directly.

---

## 📡 API Endpoints (Backend)

| Method | Endpoint                  | Auth Required | Description |
|--------|---------------------------|---------------|-------------|
| POST   | `/api/auth/register`      | No            | Register new user (supports `adminCode`) |
| POST   | `/api/auth/login`         | No            | Login, returns token & user |
| GET    | `/api/auth/me`            | Yes           | Get current user info |
| GET    | `/api/schedules`          | No            | List all upcoming schedules |
| GET    | `/api/schedules/:id`      | No            | Get schedule by ID |
| GET    | `/api/stations`           | No            | All active stations |
| GET    | `/api/trains`             | No            | All active trains |
| GET    | `/api/catalogue`          | No            | Catalogue items |
| GET    | `/api/ratings`            | No            | All ratings with user/train info |
| POST   | `/api/ratings`            | Yes           | Submit a rating |
| POST   | `/api/bookings`           | Yes           | Book a ticket |
| GET    | `/api/my-bookings`        | Yes           | User's bookings |
| POST   | `/api/bookings/:id/cancel`| Yes           | Cancel a booking |
| GET    | `/api/loyalty`            | Yes           | Get loyalty points & tier |
| POST   | `/api/contact`            | No            | Submit support message |
| GET    | `/api/health`             | No            | Health check |

**Admin‑only endpoints** (to be added):

| Method | Endpoint                     | Auth Required | Description |
|--------|------------------------------|---------------|-------------|
| POST   | `/api/admin/schedules`       | Admin         | Create new schedule |
| PUT    | `/api/admin/schedules/:id`   | Admin         | Update schedule |
| DELETE | `/api/admin/schedules/:id`   | Admin         | Delete schedule |
| POST   | `/api/admin/trains`          | Admin         | Add new train |
| PUT    | `/api/admin/trains/:id`      | Admin         | Update train |
| DELETE | `/api/admin/trains/:id`      | Admin         | Deactivate train |
| GET    | `/api/admin/users`           | Admin         | List all users |
| PUT    | `/api/admin/users/:id/role`  | Admin         | Change user role |
| GET    | `/api/admin/bookings`        | Admin         | List all bookings |
| GET    | `/api/admin/support`         | Admin         | List support tickets |

---

## 🔐 Authentication & Role‑Based Access

- **JWT storage**: The backend generates a simple Base64‑encoded token containing `{ id, email, role }`. The token is stored in `localStorage`.
- **Authorization**: The frontend `api.js` intercepts every request and adds the `Authorization: Bearer <token>` header. Protected API endpoints verify the token and extract the user.
- **Protected Routes**: In `App.js`, the `<ProtectedRoute>` component checks authentication and role. If not authenticated → redirect to `/login`. If role not allowed → redirect to `/user-dashboard`.

**Role matrix**:

| Page                     | User | Admin | Public |
|--------------------------|------|-------|--------|
| `/login`, `/signup`      | ✅   | ✅    | ✅     |
| `/schedules`, `/catalogue`, `/ratings`, `/contact` | ✅ | ✅ | ✅ |
| `/user-dashboard`        | ✅   | ✅    | ❌     |
| `/bookings`              | ✅   | ✅    | ❌     |
| `/admin/*` (all admin pages) | ❌ | ✅ | ❌ |

---

## 🔮 Future Enhancements

The current system is fully functional but can be extended in many ways:

| Area | Suggested Improvement |
|------|----------------------|
| **Payment integration** | Integrate a real payment gateway (Stripe, JazzCash, EasyPaisa) instead of mock payments. |
| **Email notifications** | Send booking confirmation, cancellation, and promotional emails via Nodemailer. |
| **Real‑time seat selection** | Show a seat map with available/occupied seats. |
| **Train status tracking** | Live location / delay updates (integration with external APIs or manual updates). |
| **Improved UI/UX** | Add loading skeletons, better mobile responsiveness, dark mode. |
| **Password reset** | Implement “forgot password” with email token. |
| **Multi‑language** | Support Urdu and English. |
| **Dockerisation** | Provide `docker-compose` for easy deployment. |
| **Unit & integration tests** | Add Jest / Supertest for backend and React Testing Library for frontend. |
| **Admin analytics** | Charts for booking trends, revenue, popular routes. |
| **Export reports** | Export bookings, cancellations, or user lists to PDF/Excel. |

---

## 👥 Contributors

- Taha Ijaz  
- Abdul Rehman  
- Mian Bilal Razzaq  

---

## 📄 License

This project is for educational purposes. You are free to use and modify it for learning and personal projects.

---

**Happy Coding! 🚆**