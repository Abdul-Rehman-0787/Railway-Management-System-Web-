# Data Flow in National Railway System

## Overview
The National Railway System is a full-stack web application that manages railway bookings, user accounts, admin operations, and AI-powered customer support. This document explains how data flows through the system from user interactions to database storage and back.

## Data Sources

### 1. User Inputs
- **Registration/Login**: User credentials, personal information
- **Booking Requests**: Schedule selection, seat/berth choice, payment details
- **Support Messages**: Contact forms, user queries
- **Ratings & Reviews**: Post-journey feedback
- **Refund Requests**: Cancellation reasons and amounts

### 2. Admin Inputs
- **Schedule Management**: Train routes, timings, pricing
- **Booking Oversight**: Status updates, cancellations
- **Refund Processing**: Approval/rejection with comments
- **User Management**: Account monitoring

### 3. AI Chatbot Queries
- **User Questions**: Travel information, booking help
- **Knowledge Base**: Pre-loaded railway information
- **Conversation History**: Context for follow-up questions

### 4. System Data
- **Database Seed**: Initial stations, trains, schedules
- **Background Jobs**: Payment expiry checks, auto-cancellations

## Data Flow Architecture

### Frontend Layer (React)
**Location**: `frontend/src/`
- User interactions captured through forms and UI components
- Data sent via Axios API calls to backend
- JWT tokens stored in localStorage for authentication
- Real-time UI updates based on API responses

### Backend API Layer (Node.js/Express)
**Location**: `backend/server.js`
- Receives HTTP requests from frontend
- Validates authentication tokens
- Processes business logic
- Executes database operations via stored procedures
- Proxies AI requests to Python service

### Database Layer (Microsoft SQL Server)
**Location**: `database.sql`
- Stores all application data in normalized tables
- Uses stored procedures for complex operations
- Maintains data integrity with constraints and triggers
- Indexes for query performance

### AI Service Layer (Python/FastAPI)
**Location**: `backend/ai_chatbot/`
- Handles chatbot conversations
- Uses Groq API for LLM responses
- ChromaDB/FAISS for knowledge base embeddings
- Maintains conversation context

## Step-by-Step Data Flow Examples

### Example 1: User Registration
1. **Frontend**: User fills registration form → `authAPI.register(data)`
2. **API Call**: POST `/api/auth/register` with user data
3. **Backend**: Validates input, hashes password → calls `sp_RegisterClient`
4. **Database**: Inserts new client record → returns success/failure
5. **Backend**: Generates JWT token → returns to frontend
6. **Frontend**: Stores token, redirects to dashboard

### Example 2: Train Booking
1. **Frontend**: User selects schedule and seat → `protectedAPI.bookTicket(data)`
2. **API Call**: POST `/api/bookings` with booking details
3. **Backend**: Validates user auth → calls `sp_BookTicket`
4. **Database**: Creates booking record, sets payment expiry → updates seat availability
5. **Backend**: Returns booking ID and payment window
6. **Frontend**: Redirects to payment page with countdown timer

### Example 3: AI Chatbot Query
1. **Frontend**: User types message → sends to `/api/ai/chat`
2. **Backend Proxy**: Forwards request to Python service at `localhost:8001`
3. **AI Service**: Processes query with Groq API + vector search
4. **Database**: Retrieves relevant knowledge base chunks
5. **AI Service**: Generates response using conversation context
6. **Backend**: Returns AI response to frontend
7. **Frontend**: Displays response in chat interface

### Example 4: Admin Schedule Management
1. **Frontend**: Admin creates new schedule → `adminAPI.createSchedule(data)`
2. **API Call**: POST `/api/admin/schedules` with schedule data
3. **Backend**: Validates admin role → calls `sp_CreateSchedule`
4. **Database**: Inserts schedule, updates train availability
5. **Backend**: Returns success confirmation
6. **Frontend**: Updates schedule list, shows success toast

## Data Processing Steps

### Authentication Flow
1. User submits credentials
2. Backend validates against database or hardcoded admin
3. Password verification with bcrypt
4. JWT token generation and return
5. Frontend stores token for subsequent requests

### Booking Flow
1. Seat selection with availability check
2. Booking creation with pending status
3. Payment window activation (60 min standard, 15 min for imminent)
4. Background job monitors expiry
5. Payment confirmation updates status to confirmed
6. Loyalty points calculation and update

### Refund Flow
1. User requests refund for confirmed booking
2. Admin reviews request
3. Approval triggers refund calculation (partial/full based on timing)
4. Database updates booking and payment status
5. User receives refund notification

### AI Response Flow
1. User message received
2. Query embedded using sentence transformers
3. Vector similarity search in ChromaDB/FAISS
4. Relevant knowledge chunks retrieved
5. Context assembled with conversation history
6. Groq API generates response
7. Response stored in conversation memory

## Data Storage & Retrieval

### Primary Data Tables
- **Clients**: User accounts and profiles
- **Schedule**: Train routes and timings
- **Bookings**: Reservation records
- **Payments**: Transaction history
- **Ratings**: User reviews
- **Conversations**: Support messages
- **RefundRequests**: Cancellation requests

### Secondary Data Tables
- **Stations**: Location master data
- **Trains**: Train information
- **LoyaltyRewards**: Points system
- **Catalogue**: Train showcase data

### Indexing Strategy
- Email lookups for authentication
- Schedule searches by departure time
- Booking queries by client/schedule
- Payment expiry monitoring

## Error Handling & Validation

### Input Validation
- Frontend form validation
- Backend schema validation
- Database constraints and triggers
- API error responses with descriptive messages

### Transaction Management
- Database transactions for multi-step operations
- Rollback on failures
- Atomic booking and payment operations

### Security Measures
- Password hashing with bcrypt
- JWT token authentication
- CORS configuration
- Input sanitization

## Performance Considerations

### Query Optimization
- Stored procedures for complex operations
- Database indexing on frequently queried columns
- Pagination for large result sets
- Background job processing for non-critical tasks

### Caching Strategy
- Browser localStorage for user sessions
- Conversation memory in AI service
- Vector embeddings pre-computed and stored

### Scalability Features
- Modular architecture (frontend/backend/AI separation)
- Database connection pooling
- API rate limiting considerations
- Background job scheduling with node-cron

## Monitoring & Logging

### System Health
- `/api/health` endpoint for service status
- AI service availability checks
- Database connection monitoring

### Error Tracking
- Console logging in backend services
- API error responses
- User-facing error messages

### Performance Metrics
- Query execution times
- API response times
- Background job completion status