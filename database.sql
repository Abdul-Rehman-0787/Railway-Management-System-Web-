-- =====================================================
-- RAILWAY MANAGEMENT SYSTEM – COMPLETE DATABASE SCRIPT
-- =====================================================
-- This script drops the existing database (if it exists) 
-- and creates a fresh one with all tables, constraints, 
-- procedures, and sample data.
-- =====================================================

USE master;
GO

-- =====================================================
-- 1. DROP DATABASE IF EXISTS (with forced disconnection)
-- =====================================================
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'RailwayManagementSystem')
BEGIN
    ALTER DATABASE RailwayManagementSystem SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE RailwayManagementSystem;
    PRINT '✅ Database RailwayManagementSystem dropped.';
END
GO

-- =====================================================
-- 2. CREATE DATABASE
-- =====================================================
CREATE DATABASE RailwayManagementSystem;
GO
USE RailwayManagementSystem;
GO

-- =====================================================
-- 3. CREATE TABLES WITH CONSTRAINTS
-- =====================================================

-- Clients (users)
CREATE TABLE Clients (
    ClientID      INT IDENTITY(1,1) PRIMARY KEY,
    FirstName     VARCHAR(50)  NOT NULL,
    LastName      VARCHAR(50)  NOT NULL,
    Email         VARCHAR(100) NOT NULL UNIQUE,
    Phone         VARCHAR(20),
    PasswordHash  VARCHAR(255) NOT NULL,
    DateOfBirth   DATE,
    Address       VARCHAR(255),
    Role          VARCHAR(20)  DEFAULT 'User',      -- 'User' or 'Admin'
    CreatedAt     DATETIME     DEFAULT GETDATE(),
    LastLogin     DATETIME,
    IsActive      BIT          DEFAULT 1
);
PRINT '✅ Table Clients created.';

-- Stations
CREATE TABLE Stations (
    StationID   INT IDENTITY(1,1) PRIMARY KEY,
    StationName VARCHAR(100) NOT NULL,
    City        VARCHAR(100) NOT NULL,
    Province    VARCHAR(100),
    Country     VARCHAR(100) DEFAULT 'Pakistan',
    IsActive    BIT DEFAULT 1
);
PRINT '✅ Table Stations created.';

-- Trains
CREATE TABLE Trains (
    TrainID     INT IDENTITY(1,1) PRIMARY KEY,
    TrainName   VARCHAR(100) NOT NULL,
    TrainNumber VARCHAR(20)  NOT NULL UNIQUE,
    TotalSeats  INT          NOT NULL,
    AvailableSeats INT       NOT NULL,   -- will be updated when bookings happen
    TrainType   VARCHAR(50),            -- 'Express', 'Local', etc.
    IsActive    BIT DEFAULT 1
);
PRINT '✅ Table Trains created.';

-- Schedule (train rides)
CREATE TABLE Schedule (
    ScheduleID       INT IDENTITY(1,1) PRIMARY KEY,
    TrainID          INT          NOT NULL,
    DepartureStation INT          NOT NULL,
    ArrivalStation   INT          NOT NULL,
    DepartureTime    DATETIME     NOT NULL,
    ArrivalTime      DATETIME     NOT NULL,
    TicketPrice      DECIMAL(8,2) NOT NULL,
    AvailableSeats   INT          NOT NULL,
    Status           VARCHAR(20)  DEFAULT 'Scheduled',  -- Scheduled, Delayed, Cancelled, Completed
    CONSTRAINT FK_Schedule_Train FOREIGN KEY (TrainID) REFERENCES Trains(TrainID) ON DELETE CASCADE,
    CONSTRAINT FK_Schedule_DepStn FOREIGN KEY (DepartureStation) REFERENCES Stations(StationID),
    CONSTRAINT FK_Schedule_ArrStn FOREIGN KEY (ArrivalStation) REFERENCES Stations(StationID),
    CONSTRAINT CHK_Stations_Diff CHECK (DepartureStation <> ArrivalStation),
    CONSTRAINT CHK_Arrival_After CHECK (ArrivalTime > DepartureTime)
);
PRINT '✅ Table Schedule created.';

-- Bookings
CREATE TABLE Bookings (
    BookingID    INT IDENTITY(1,1) PRIMARY KEY,
    ClientID     INT          NOT NULL,
    ScheduleID   INT          NOT NULL,
    BookingDate  DATETIME     DEFAULT GETDATE(),
    SeatNumber   VARCHAR(10),
    TotalAmount  DECIMAL(8,2) NOT NULL,
    Status       VARCHAR(20)  DEFAULT 'Confirmed',  -- Confirmed, Cancelled, Completed
    CONSTRAINT FK_Bookings_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE CASCADE,
    CONSTRAINT FK_Bookings_Schedule FOREIGN KEY (ScheduleID) REFERENCES Schedule(ScheduleID) ON DELETE CASCADE
);
PRINT '✅ Table Bookings created.';

-- Payments
CREATE TABLE Payments (
    PaymentID     INT IDENTITY(1,1) PRIMARY KEY,
    BookingID     INT          NOT NULL,
    Amount        DECIMAL(8,2) NOT NULL,
    PaymentDate   DATETIME     DEFAULT GETDATE(),
    PaymentMethod VARCHAR(50),
    PaymentStatus VARCHAR(20)  DEFAULT 'Paid',
    TransactionRef VARCHAR(100),
    CONSTRAINT FK_Payments_Booking FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE
);
PRINT '✅ Table Payments created.';

-- Cancellations
CREATE TABLE Cancellations (
    CancellationID   INT IDENTITY(1,1) PRIMARY KEY,
    BookingID        INT      NOT NULL,
    CancellationDate DATETIME DEFAULT GETDATE(),
    Reason           VARCHAR(255),
    RefundAmount     DECIMAL(8,2) DEFAULT 0,
    RefundStatus     VARCHAR(20)  DEFAULT 'Pending',
    CONSTRAINT FK_Cancellations_Booking FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE
);
PRINT '✅ Table Cancellations created.';

-- Ratings & Reviews
CREATE TABLE Ratings (
    RatingID    INT IDENTITY(1,1) PRIMARY KEY,
    ClientID    INT          NOT NULL,
    ScheduleID  INT,
    Rating      TINYINT      NOT NULL,
    Review      TEXT,
    RatingDate  DATETIME     DEFAULT GETDATE(),
    CONSTRAINT FK_Ratings_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE CASCADE,
    CONSTRAINT FK_Ratings_Schedule FOREIGN KEY (ScheduleID) REFERENCES Schedule(ScheduleID),
    CONSTRAINT CHK_Rating_Range CHECK (Rating BETWEEN 1 AND 5)
);
PRINT '✅ Table Ratings created.';

-- Loyalty Rewards
CREATE TABLE LoyaltyRewards (
    RewardID     INT IDENTITY(1,1) PRIMARY KEY,
    ClientID     INT          NOT NULL,
    TotalPoints  INT          DEFAULT 0,
    TierLevel    VARCHAR(20)  DEFAULT 'Bronze',
    LastUpdated  DATETIME     DEFAULT GETDATE(),
    CONSTRAINT FK_Loyalty_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE CASCADE
);
PRINT '✅ Table LoyaltyRewards created.';

-- Reward Transactions
CREATE TABLE RewardTransactions (
    TransactionID   INT IDENTITY(1,1) PRIMARY KEY,
    ClientID        INT          NOT NULL,
    BookingID       INT,
    PointsChanged   INT          NOT NULL,
    TransactionType VARCHAR(20)  NOT NULL,
    TransactionDate DATETIME     DEFAULT GETDATE(),
    CONSTRAINT FK_RewardTx_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE CASCADE,
    CONSTRAINT FK_RewardTx_Booking FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID)
);
PRINT '✅ Table RewardTransactions created.';

-- Catalogue (train experiences)
CREATE TABLE Catalogue (
    CatalogueID   INT IDENTITY(1,1) PRIMARY KEY,
    TrainID       INT          NOT NULL,
    Title         VARCHAR(100) NOT NULL,
    Description   TEXT,
    ImageURL      VARCHAR(255),
    CONSTRAINT FK_Catalogue_Train FOREIGN KEY (TrainID) REFERENCES Trains(TrainID) ON DELETE CASCADE
);
PRINT '✅ Table Catalogue created.';

-- Contact Support
CREATE TABLE ContactSupport (
    TicketID      INT IDENTITY(1,1) PRIMARY KEY,
    ClientID      INT,
    Name          VARCHAR(100) NOT NULL,
    Email         VARCHAR(100) NOT NULL,
    Subject       VARCHAR(200) NOT NULL,
    Message       TEXT         NOT NULL,
    SubmittedAt   DATETIME     DEFAULT GETDATE(),
    Status        VARCHAR(20)  DEFAULT 'Open',
    CONSTRAINT FK_Support_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE SET NULL
);
PRINT '✅ Table ContactSupport created.';

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IX_Clients_Email ON Clients(Email);
CREATE INDEX IX_Schedule_DepartureTime ON Schedule(DepartureTime);
CREATE INDEX IX_Bookings_ClientID ON Bookings(ClientID);
CREATE INDEX IX_Bookings_ScheduleID ON Bookings(ScheduleID);
PRINT '✅ Indexes created.';

-- =====================================================
-- 5. STORED PROCEDURES
-- =====================================================

-- Register a new client (user)
GO
CREATE OR ALTER PROCEDURE sp_RegisterClient
    @FirstName VARCHAR(50),
    @LastName VARCHAR(50),
    @Email VARCHAR(100),
    @Phone VARCHAR(20),
    @PasswordHash VARCHAR(255),
    @DateOfBirth DATE = NULL,
    @Address VARCHAR(255) = NULL,
    @Role VARCHAR(20) = 'User'   -- default to User, can be overridden by Admin
AS
BEGIN
    SET NOCOUNT ON;
    
    IF EXISTS (SELECT 1 FROM Clients WHERE Email = @Email)
    BEGIN
        SELECT 0 AS Success, 'Email already exists' AS Message;
        RETURN;
    END
    
    INSERT INTO Clients (FirstName, LastName, Email, Phone, PasswordHash, DateOfBirth, Address, Role)
    VALUES (@FirstName, @LastName, @Email, @Phone, @PasswordHash, @DateOfBirth, @Address, @Role);
    
    DECLARE @ClientID INT = SCOPE_IDENTITY();
    
    INSERT INTO LoyaltyRewards (ClientID, TotalPoints, TierLevel)
    VALUES (@ClientID, 0, 'Bronze');
    
    SELECT 1 AS Success, 'Registration successful' AS Message, @ClientID AS ClientID;
END
GO
PRINT '✅ Stored procedure sp_RegisterClient created.';

-- Login client
GO
CREATE OR ALTER PROCEDURE sp_LoginClient
    @Email VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT ClientID, FirstName, LastName, Email, Phone, Role, PasswordHash, IsActive
    FROM Clients
    WHERE Email = @Email AND IsActive = 1;
    
    UPDATE Clients SET LastLogin = GETDATE() WHERE Email = @Email;
END
GO
PRINT '✅ Stored procedure sp_LoginClient created.';

-- Get client by ID
GO
CREATE OR ALTER PROCEDURE sp_GetClientByID
    @ClientID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT ClientID, FirstName, LastName, Email, Phone, DateOfBirth, Address, Role,
           CreatedAt, LastLogin, IsActive
    FROM Clients
    WHERE ClientID = @ClientID;
END
GO
PRINT '✅ Stored procedure sp_GetClientByID created.';

-- Get all schedules (public)
GO
CREATE OR ALTER PROCEDURE sp_GetAllSchedules
AS
BEGIN
    SELECT 
        s.ScheduleID,
        t.TrainName,
        t.TrainNumber,
        t.TrainType,
        dep.StationName AS DepartureStation,
        arr.StationName AS ArrivalStation,
        s.DepartureTime,
        s.ArrivalTime,
        s.TicketPrice,
        s.AvailableSeats,
        s.Status
    FROM Schedule s
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    WHERE s.DepartureTime > GETDATE() AND s.Status = 'Scheduled'
    ORDER BY s.DepartureTime;
END
GO
PRINT '✅ Stored procedure sp_GetAllSchedules created.';

-- Get schedule by ID
GO
CREATE OR ALTER PROCEDURE sp_GetScheduleByID
    @ScheduleID INT
AS
BEGIN
    SELECT 
        s.ScheduleID,
        s.TrainID,
        t.TrainName,
        t.TrainNumber,
        t.TrainType,
        dep.StationName AS DepartureStation,
        arr.StationName AS ArrivalStation,
        s.DepartureTime,
        s.ArrivalTime,
        s.TicketPrice,
        s.AvailableSeats,
        s.Status
    FROM Schedule s
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    WHERE s.ScheduleID = @ScheduleID;
END
GO
PRINT '✅ Stored procedure sp_GetScheduleByID created.';

-- Book a ticket
GO
CREATE OR ALTER PROCEDURE sp_BookTicket
    @ClientID INT,
    @ScheduleID INT,
    @SeatNumber VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @TicketPrice DECIMAL(8,2), @AvailableSeats INT;
    
    SELECT @TicketPrice = TicketPrice, @AvailableSeats = AvailableSeats
    FROM Schedule WHERE ScheduleID = @ScheduleID;
    
    IF @AvailableSeats <= 0
    BEGIN
        SELECT 0 AS Success, 'No seats available' AS Message;
        ROLLBACK;
        RETURN;
    END
    
    -- Create booking
    INSERT INTO Bookings (ClientID, ScheduleID, SeatNumber, TotalAmount, Status)
    VALUES (@ClientID, @ScheduleID, @SeatNumber, @TicketPrice, 'Confirmed');
    
    DECLARE @BookingID INT = SCOPE_IDENTITY();
    
    -- Update available seats
    UPDATE Schedule SET AvailableSeats = AvailableSeats - 1
    WHERE ScheduleID = @ScheduleID;
    
    -- Add loyalty points (10 points per 100 rupees)
    DECLARE @PointsEarned INT = @TicketPrice / 10;
    
    UPDATE LoyaltyRewards 
    SET TotalPoints = TotalPoints + @PointsEarned,
        LastUpdated = GETDATE()
    WHERE ClientID = @ClientID;
    
    -- Record reward transaction
    INSERT INTO RewardTransactions (ClientID, BookingID, PointsChanged, TransactionType)
    VALUES (@ClientID, @BookingID, @PointsEarned, 'Earned');
    
    SELECT 1 AS Success, 'Booking successful' AS Message, @BookingID AS BookingID;
    
    COMMIT;
END
GO
PRINT '✅ Stored procedure sp_BookTicket created.';

-- Cancel booking
GO
CREATE OR ALTER PROCEDURE sp_CancelBooking
    @BookingID INT,
    @Reason VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @ClientID INT, @ScheduleID INT, @TotalAmount DECIMAL(8,2);
    
    SELECT @ClientID = ClientID, @ScheduleID = ScheduleID, @TotalAmount = TotalAmount
    FROM Bookings WHERE BookingID = @BookingID AND Status = 'Confirmed';
    
    IF @ClientID IS NULL
    BEGIN
        SELECT 0 AS Success, 'Booking not found or already cancelled' AS Message;
        ROLLBACK;
        RETURN;
    END
    
    -- Update booking status
    UPDATE Bookings SET Status = 'Cancelled' WHERE BookingID = @BookingID;
    
    -- Update available seats
    UPDATE Schedule SET AvailableSeats = AvailableSeats + 1
    WHERE ScheduleID = @ScheduleID;
    
    -- Add cancellation record
    INSERT INTO Cancellations (BookingID, Reason, RefundAmount, RefundStatus)
    VALUES (@BookingID, @Reason, @TotalAmount, 'Pending');
    
    -- Deduct loyalty points
    DECLARE @PointsDeducted INT = @TotalAmount / 10;
    
    UPDATE LoyaltyRewards 
    SET TotalPoints = CASE 
        WHEN TotalPoints >= @PointsDeducted THEN TotalPoints - @PointsDeducted
        ELSE 0
    END,
    LastUpdated = GETDATE()
    WHERE ClientID = @ClientID;
    
    -- Record reward transaction
    INSERT INTO RewardTransactions (ClientID, BookingID, PointsChanged, TransactionType)
    VALUES (@ClientID, @BookingID, -@PointsDeducted, 'Redeemed');
    
    SELECT 1 AS Success, 'Booking cancelled successfully' AS Message;
    
    COMMIT;
END
GO
PRINT '✅ Stored procedure sp_CancelBooking created.';

-- Get client bookings
GO
CREATE OR ALTER PROCEDURE sp_GetClientBookings
    @ClientID INT
AS
BEGIN
    SELECT 
        b.BookingID,
        b.BookingDate,
        b.SeatNumber,
        b.TotalAmount,
        b.Status AS BookingStatus,
        s.DepartureTime,
        s.ArrivalTime,
        t.TrainName,
        t.TrainNumber,
        dep.StationName AS DepartureStation,
        arr.StationName AS ArrivalStation,
        s.TicketPrice
    FROM Bookings b
    INNER JOIN Schedule s ON b.ScheduleID = s.ScheduleID
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    WHERE b.ClientID = @ClientID
    ORDER BY b.BookingDate DESC;
END
GO
PRINT '✅ Stored procedure sp_GetClientBookings created.';

-- Get client loyalty info
GO
CREATE OR ALTER PROCEDURE sp_GetClientLoyalty
    @ClientID INT
AS
BEGIN
    SELECT 
        lr.TotalPoints,
        lr.TierLevel,
        COUNT(b.BookingID) AS TotalBookings,
        ISNULL(SUM(b.TotalAmount), 0) AS TotalSpent
    FROM LoyaltyRewards lr
    LEFT JOIN Bookings b ON lr.ClientID = b.ClientID AND b.Status = 'Confirmed'
    WHERE lr.ClientID = @ClientID
    GROUP BY lr.TotalPoints, lr.TierLevel;
END
GO
PRINT '✅ Stored procedure sp_GetClientLoyalty created.';

-- Get all stations (public)
GO
CREATE OR ALTER PROCEDURE sp_GetAllStations
AS
BEGIN
    SELECT StationID, StationName, City, Province 
    FROM Stations 
    WHERE IsActive = 1
    ORDER BY City, StationName;
END
GO
PRINT '✅ Stored procedure sp_GetAllStations created.';

-- Get all trains (public)
GO
CREATE OR ALTER PROCEDURE sp_GetAllTrains
AS
BEGIN
    SELECT TrainID, TrainName, TrainNumber, TrainType, TotalSeats, AvailableSeats 
    FROM Trains 
    WHERE IsActive = 1;
END
GO
PRINT '✅ Stored procedure sp_GetAllTrains created.';

-- =====================================================
-- 6. SAMPLE DATA
-- =====================================================

-- Stations
INSERT INTO Stations (StationName, City, Province) VALUES
('Lahore Junction', 'Lahore', 'Punjab'),
('Karachi Cantt', 'Karachi', 'Sindh'),
('Rawalpindi', 'Rawalpindi', 'Punjab'),
('Multan Cantt', 'Multan', 'Punjab'),
('Faisalabad', 'Faisalabad', 'Punjab'),
('Peshawar Cantt', 'Peshawar', 'KPK');
PRINT '✅ Sample stations inserted.';

-- Trains
INSERT INTO Trains (TrainName, TrainNumber, TotalSeats, AvailableSeats, TrainType) VALUES
('Green Line Express', 'GL-001', 300, 300, 'Express'),
('Karakoram Express', 'KK-102', 250, 250, 'Express'),
('Awam Express', 'AW-205', 400, 400, 'Local'),
('Tezgam Express', 'TZ-310', 280, 280, 'Express'),
('Bahauddin Zakariya', 'BZ-415', 220, 220, 'Local');
PRINT '✅ Sample trains inserted.';

-- Schedule (future departures)
DECLARE @BaseDate DATE = DATEADD(DAY, 1, GETDATE());  -- tomorrow
INSERT INTO Schedule (TrainID, DepartureStation, ArrivalStation, DepartureTime, ArrivalTime, TicketPrice, AvailableSeats) VALUES
(1, 1, 2, DATEADD(HOUR, 8, CAST(@BaseDate AS DATETIME)), DATEADD(HOUR, 14, CAST(@BaseDate AS DATETIME)), 2500, 300),
(2, 2, 3, DATEADD(HOUR, 9, CAST(DATEADD(DAY, 1, @BaseDate) AS DATETIME)), DATEADD(HOUR, 23.5, CAST(DATEADD(DAY, 1, @BaseDate) AS DATETIME)), 2200, 250),
(3, 1, 4, DATEADD(HOUR, 7.5, CAST(DATEADD(DAY, 2, @BaseDate) AS DATETIME)), DATEADD(HOUR, 13, CAST(DATEADD(DAY, 2, @BaseDate) AS DATETIME)), 1200, 400),
(4, 3, 6, DATEADD(HOUR, 6, CAST(DATEADD(DAY, 3, @BaseDate) AS DATETIME)), DATEADD(HOUR, 12, CAST(DATEADD(DAY, 3, @BaseDate) AS DATETIME)), 1800, 280),
(5, 4, 5, DATEADD(HOUR, 10, CAST(DATEADD(DAY, 1, @BaseDate) AS DATETIME)), DATEADD(HOUR, 14.5, CAST(DATEADD(DAY, 1, @BaseDate) AS DATETIME)), 950, 220);
PRINT '✅ Sample schedule inserted.';

-- Clients (including admin)
-- Password for both users is "password123" (bcrypt hash)
DECLARE @PasswordHash VARCHAR(255) = '$2b$10$6eI6q8XvZ5xY9zM7wP2QKOVs7cT9jFyKz3LmNpQrStUvWxYzAbCd';

INSERT INTO Clients (FirstName, LastName, Email, Phone, PasswordHash, Role) VALUES
('Admin', 'User', 'admin@railway.com', '0300-0000000', @PasswordHash, 'Admin'),
('Test', 'User', 'test@test.com', '0300-1111111', @PasswordHash, 'User');
PRINT '✅ Sample users inserted.';

-- Loyalty Rewards for the users
INSERT INTO LoyaltyRewards (ClientID, TotalPoints, TierLevel)
SELECT ClientID, 0, 'Bronze' FROM Clients;
PRINT '✅ Loyalty rewards inserted.';

-- Catalogue
INSERT INTO Catalogue (TrainID, Title, Description) VALUES
(1, 'Green Line Luxury', 'Experience premium travel with air-conditioned coaches, reclining seats, and on-board dining.'),
(2, 'Karakoram Comfort', 'Travel through scenic routes with panoramic windows and dedicated luggage storage.'),
(3, 'Awam Economy', 'Affordable fares for everyday commuters with clean and safe coaches.'),
(4, 'Tezgam Business', 'Business class cabin with Wi-Fi, charging ports, and complimentary meals.'),
(5, 'Bahauddin Expedition', 'Explore Punjab with our regional express service connecting major cities.');
PRINT '✅ Catalogue inserted.';

-- =====================================================
-- 7. FINAL VERIFICATION
-- =====================================================
PRINT '';
PRINT '========================================';
PRINT '✅ Database setup complete!';
PRINT '========================================';
PRINT 'Test Credentials:';
PRINT '  Admin:  admin@railway.com / password123';
PRINT '  User:   test@test.com / password123';
PRINT '';
PRINT 'Tables created:';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;
PRINT '';
PRINT 'Stored procedures created:';
SELECT name FROM sys.procedures ORDER BY name;
PRINT '========================================';

USE RailwayManagementSystem;
GO

-- ============================================
-- ADD ADMIN SCHEDULE MANAGEMENT STORED PROCEDURES
-- ============================================

-- Get all schedules for admin (including past and future)
CREATE OR ALTER PROCEDURE sp_GetAllSchedulesAdmin
AS
BEGIN
    SELECT 
        s.ScheduleID,
        t.TrainID,
        t.TrainName,
        t.TrainNumber,
        t.TrainType,
        dep.StationID AS DepartureStationID,
        dep.StationName AS DepartureStation,
        dep.City AS DepartureCity,
        arr.StationID AS ArrivalStationID,
        arr.StationName AS ArrivalStation,
        arr.City AS ArrivalCity,
        s.DepartureTime,
        s.ArrivalTime,
        s.TicketPrice,
        s.AvailableSeats,
        s.Status
    FROM Schedule s
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    ORDER BY s.DepartureTime DESC;
END
GO

-- Add new schedule
CREATE OR ALTER PROCEDURE sp_AddSchedule
    @TrainID INT,
    @DepartureStationID INT,
    @ArrivalStationID INT,
    @DepartureTime DATETIME,
    @ArrivalTime DATETIME,
    @TicketPrice DECIMAL(8,2),
    @AvailableSeats INT,
    @Status VARCHAR(20) = 'Scheduled'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if train exists
    IF NOT EXISTS (SELECT 1 FROM Trains WHERE TrainID = @TrainID AND IsActive = 1)
    BEGIN
        SELECT 0 AS Success, 'Train not found' AS Message;
        RETURN;
    END
    
    -- Check if stations exist
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @DepartureStationID AND IsActive = 1)
    BEGIN
        SELECT 0 AS Success, 'Departure station not found' AS Message;
        RETURN;
    END
    
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @ArrivalStationID AND IsActive = 1)
    BEGIN
        SELECT 0 AS Success, 'Arrival station not found' AS Message;
        RETURN;
    END
    
    -- Check if departure and arrival are different
    IF @DepartureStationID = @ArrivalStationID
    BEGIN
        SELECT 0 AS Success, 'Departure and arrival stations cannot be the same' AS Message;
        RETURN;
    END
    
    -- Check if arrival time is after departure time
    IF @ArrivalTime <= @DepartureTime
    BEGIN
        SELECT 0 AS Success, 'Arrival time must be after departure time' AS Message;
        RETURN;
    END
    
    -- Insert schedule
    INSERT INTO Schedule (
        TrainID, DepartureStation, ArrivalStation, 
        DepartureTime, ArrivalTime, TicketPrice, 
        AvailableSeats, Status
    )
    VALUES (
        @TrainID, @DepartureStationID, @ArrivalStationID,
        @DepartureTime, @ArrivalTime, @TicketPrice,
        @AvailableSeats, @Status
    );
    
    SELECT 1 AS Success, 'Schedule added successfully' AS Message, SCOPE_IDENTITY() AS ScheduleID;
END
GO

-- Update schedule
CREATE OR ALTER PROCEDURE sp_UpdateSchedule
    @ScheduleID INT,
    @TrainID INT,
    @DepartureStationID INT,
    @ArrivalStationID INT,
    @DepartureTime DATETIME,
    @ArrivalTime DATETIME,
    @TicketPrice DECIMAL(8,2),
    @AvailableSeats INT,
    @Status VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if schedule exists
    IF NOT EXISTS (SELECT 1 FROM Schedule WHERE ScheduleID = @ScheduleID)
    BEGIN
        SELECT 0 AS Success, 'Schedule not found' AS Message;
        RETURN;
    END
    
    -- Check if train exists
    IF NOT EXISTS (SELECT 1 FROM Trains WHERE TrainID = @TrainID AND IsActive = 1)
    BEGIN
        SELECT 0 AS Success, 'Train not found' AS Message;
        RETURN;
    END
    
    -- Check if stations exist
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @DepartureStationID AND IsActive = 1)
    BEGIN
        SELECT 0 AS Success, 'Departure station not found' AS Message;
        RETURN;
    END
    
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @ArrivalStationID AND IsActive = 1)
    BEGIN
        SELECT 0 AS Success, 'Arrival station not found' AS Message;
        RETURN;
    END
    
    -- Check if departure and arrival are different
    IF @DepartureStationID = @ArrivalStationID
    BEGIN
        SELECT 0 AS Success, 'Departure and arrival stations cannot be the same' AS Message;
        RETURN;
    END
    
    -- Check if arrival time is after departure time
    IF @ArrivalTime <= @DepartureTime
    BEGIN
        SELECT 0 AS Success, 'Arrival time must be after departure time' AS Message;
        RETURN;
    END
    
    -- Update schedule
    UPDATE Schedule
    SET 
        TrainID = @TrainID,
        DepartureStation = @DepartureStationID,
        ArrivalStation = @ArrivalStationID,
        DepartureTime = @DepartureTime,
        ArrivalTime = @ArrivalTime,
        TicketPrice = @TicketPrice,
        AvailableSeats = @AvailableSeats,
        Status = @Status
    WHERE ScheduleID = @ScheduleID;
    
    SELECT 1 AS Success, 'Schedule updated successfully' AS Message;
END
GO

-- Delete schedule
CREATE OR ALTER PROCEDURE sp_DeleteSchedule
    @ScheduleID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if schedule exists
    IF NOT EXISTS (SELECT 1 FROM Schedule WHERE ScheduleID = @ScheduleID)
    BEGIN
        SELECT 0 AS Success, 'Schedule not found' AS Message;
        RETURN;
    END
    
    -- Check if there are any bookings for this schedule
    IF EXISTS (SELECT 1 FROM Bookings WHERE ScheduleID = @ScheduleID)
    BEGIN
        SELECT 0 AS Success, 'Cannot delete schedule with existing bookings' AS Message;
        RETURN;
    END
    
    -- Delete schedule
    DELETE FROM Schedule WHERE ScheduleID = @ScheduleID;
    
    SELECT 1 AS Success, 'Schedule deleted successfully' AS Message;
END
GO

PRINT '✅ Admin schedule management stored procedures added successfully';