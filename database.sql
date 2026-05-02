-- =====================================================
-- RAILWAY MANAGEMENT SYSTEM – COMPLETE DATABASE SCRIPT
-- =====================================================
-- Run this ONCE in SQL Server Management Studio.
-- This will create a fresh database with all tables,
-- stored procedures, triggers, and sample data.
-- =====================================================

USE master;
GO

-- Drop existing database if it exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'RailwayManagementSystem')
BEGIN
    ALTER DATABASE RailwayManagementSystem SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE RailwayManagementSystem;
END
GO

-- Create new database
CREATE DATABASE RailwayManagementSystem;
GO

USE RailwayManagementSystem;
GO

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE Clients (
    ClientID      INT IDENTITY(1,1) PRIMARY KEY,
    FirstName     VARCHAR(50)  NOT NULL,
    LastName      VARCHAR(50)  NOT NULL,
    Email         VARCHAR(100) NOT NULL UNIQUE,
    Phone         VARCHAR(20),
    PasswordHash  VARCHAR(255) NOT NULL,
    DateOfBirth   DATE,
    Address       VARCHAR(255),
    Role          VARCHAR(20)  DEFAULT 'User',
    CreatedAt     DATETIME     DEFAULT GETDATE(),
    LastLogin     DATETIME,
    IsActive      BIT          DEFAULT 1
);

CREATE TABLE Stations (
    StationID   INT IDENTITY(1,1) PRIMARY KEY,
    StationName VARCHAR(100) NOT NULL,
    City        VARCHAR(100) NOT NULL,
    Province    VARCHAR(100),
    Country     VARCHAR(100) DEFAULT 'Pakistan',
    IsActive    BIT DEFAULT 1
);

CREATE TABLE Trains (
    TrainID             INT IDENTITY(1,1) PRIMARY KEY,
    TrainName           VARCHAR(100) NOT NULL,
    TrainNumber         VARCHAR(20)  NOT NULL UNIQUE,
    TrainType           VARCHAR(50),
    TotalSeats          INT          NOT NULL DEFAULT 0,
    AvailableSeats      INT          NOT NULL DEFAULT 0,
    SeatPrice           DECIMAL(8,2) DEFAULT 500,
    BerthPrice          DECIMAL(8,2) DEFAULT 1000,
    IsActive            BIT          DEFAULT 1
);

CREATE TABLE Schedule (
    ScheduleID       INT IDENTITY(1,1) PRIMARY KEY,
    TrainID          INT          NOT NULL,
    DepartureStation INT          NOT NULL,
    ArrivalStation   INT          NOT NULL,
    DepartureTime    DATETIME     NOT NULL,
    ArrivalTime      DATETIME     NOT NULL,
    TicketPrice      DECIMAL(8,2) NOT NULL DEFAULT 0,
    SeatPrice        DECIMAL(8,2) NOT NULL DEFAULT 500,
    BerthPrice       DECIMAL(8,2) NOT NULL DEFAULT 1000,
    SleeperCoaches   INT          NOT NULL DEFAULT 2,
    SeaterCoaches    INT          NOT NULL DEFAULT 6,
    AvailableSeats   INT          NOT NULL,
    Status           VARCHAR(20)  DEFAULT 'Scheduled',
    CONSTRAINT FK_Schedule_Train FOREIGN KEY (TrainID) REFERENCES Trains(TrainID) ON DELETE CASCADE,
    CONSTRAINT FK_Schedule_DepStn FOREIGN KEY (DepartureStation) REFERENCES Stations(StationID),
    CONSTRAINT FK_Schedule_ArrStn FOREIGN KEY (ArrivalStation) REFERENCES Stations(StationID),
    CONSTRAINT CHK_Stations_Diff CHECK (DepartureStation <> ArrivalStation),
    CONSTRAINT CHK_Arrival_After CHECK (ArrivalTime > DepartureTime)
);

CREATE TABLE Bookings (
    BookingID       INT IDENTITY(1,1) PRIMARY KEY,
    ClientID        INT          NOT NULL,
    ScheduleID      INT          NOT NULL,
    BookingDate     DATETIME     DEFAULT GETDATE(),
    SeatNumber      VARCHAR(10),
    TotalAmount     DECIMAL(8,2) NOT NULL,
    Status          VARCHAR(20)  DEFAULT 'Pending',
    PaymentStatus   VARCHAR(20)  DEFAULT 'Pending',
    PaymentIntentId VARCHAR(100) NULL,
    PaymentExpiry   DATETIME     NULL,
    BookingType     VARCHAR(10)  DEFAULT 'seat',
    CONSTRAINT FK_Bookings_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE CASCADE,
    CONSTRAINT FK_Bookings_Schedule FOREIGN KEY (ScheduleID) REFERENCES Schedule(ScheduleID)
);

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

CREATE TABLE Cancellations (
    CancellationID   INT IDENTITY(1,1) PRIMARY KEY,
    BookingID        INT      NOT NULL,
    CancellationDate DATETIME DEFAULT GETDATE(),
    Reason           VARCHAR(255),
    RefundAmount     DECIMAL(8,2) DEFAULT 0,
    RefundStatus     VARCHAR(20)  DEFAULT 'Pending',
    CONSTRAINT FK_Cancellations_Booking FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE
);

CREATE TABLE Ratings (
    RatingID    INT IDENTITY(1,1) PRIMARY KEY,
    ClientID    INT          NOT NULL,
    ScheduleID  INT,
    Rating      TINYINT      NOT NULL,
    Review      TEXT,
    RatingDate  DATETIME     DEFAULT GETDATE(),
    CONSTRAINT FK_Ratings_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE CASCADE,
    CONSTRAINT FK_Ratings_Schedule FOREIGN KEY (ScheduleID) REFERENCES Schedule(ScheduleID) ON DELETE SET NULL,
    CONSTRAINT CHK_Rating_Range CHECK (Rating BETWEEN 1 AND 5)
);

CREATE TABLE LoyaltyRewards (
    RewardID     INT IDENTITY(1,1) PRIMARY KEY,
    ClientID     INT          NOT NULL,
    TotalPoints  INT          DEFAULT 0,
    TierLevel    VARCHAR(20)  DEFAULT 'Bronze',
    LastUpdated  DATETIME     DEFAULT GETDATE(),
    CONSTRAINT FK_Loyalty_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID) ON DELETE CASCADE
);

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

CREATE TABLE Catalogue (
    CatalogueID   INT IDENTITY(1,1) PRIMARY KEY,
    TrainID       INT          NOT NULL,
    Title         VARCHAR(100) NOT NULL,
    Description   TEXT,
    ImageURL      VARCHAR(255),
    CONSTRAINT FK_Catalogue_Train FOREIGN KEY (TrainID) REFERENCES Trains(TrainID) ON DELETE CASCADE
);

CREATE TABLE RefundRequests (
    RequestID       INT IDENTITY(1,1) PRIMARY KEY,
    BookingID       INT NOT NULL,
    ClientID        INT NOT NULL,
    RequestDate     DATETIME DEFAULT GETDATE(),
    Reason          VARCHAR(500),
    RequestedAmount DECIMAL(8,2) NOT NULL,
    DeductionAmount DECIMAL(8,2) DEFAULT 0,
    RefundAmount    DECIMAL(8,2) DEFAULT 0,
    Status          VARCHAR(20) DEFAULT 'Pending',
    AdminComment    VARCHAR(500) NULL,
    ProcessedDate   DATETIME NULL,
    CONSTRAINT FK_Refund_Booking FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE,
    CONSTRAINT FK_Refund_Client FOREIGN KEY (ClientID) REFERENCES Clients(ClientID)
);

CREATE TABLE Conversations (
    ConversationID  INT IDENTITY(1,1) PRIMARY KEY,
    UserID          INT NOT NULL,
    UserName        VARCHAR(100) NOT NULL,
    UserEmail       VARCHAR(100) NOT NULL,
    Subject         VARCHAR(200) NOT NULL,
    UserMessage     TEXT NOT NULL,
    UserMessageDate DATETIME DEFAULT GETDATE(),
    AdminReply      TEXT NULL,
    AdminReplyDate  DATETIME NULL,
    Status          VARCHAR(20) DEFAULT 'Pending',
    CreatedAt       DATETIME DEFAULT GETDATE(),
    UpdatedAt       DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Conversations_User FOREIGN KEY (UserID) REFERENCES Clients(ClientID) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IX_Clients_Email ON Clients(Email);
CREATE INDEX IX_Schedule_DepartureTime ON Schedule(DepartureTime);
CREATE INDEX IX_Bookings_ClientID ON Bookings(ClientID);
CREATE INDEX IX_Bookings_ScheduleID ON Bookings(ScheduleID);
CREATE INDEX IX_Bookings_PaymentExpiry ON Bookings(PaymentExpiry) WHERE PaymentStatus = 'Pending';
CREATE INDEX IX_Conversations_UserID ON Conversations(UserID);
CREATE INDEX IX_Conversations_Status ON Conversations(Status);
CREATE UNIQUE INDEX IX_Unique_SeatPerSchedule ON Bookings(ScheduleID, SeatNumber) WHERE PaymentStatus IN ('Paid', 'Pending');
GO

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Register client
CREATE OR ALTER PROCEDURE sp_RegisterClient
    @FirstName VARCHAR(50), @LastName VARCHAR(50), @Email VARCHAR(100),
    @Phone VARCHAR(20), @PasswordHash VARCHAR(255), @DateOfBirth DATE = NULL,
    @Address VARCHAR(255) = NULL, @Role VARCHAR(20) = 'User'
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Clients WHERE Email = @Email)
        SELECT 0 AS Success, 'Email already exists' AS Message;
    ELSE
    BEGIN
        INSERT INTO Clients (FirstName, LastName, Email, Phone, PasswordHash, DateOfBirth, Address, Role)
        VALUES (@FirstName, @LastName, @Email, @Phone, @PasswordHash, @DateOfBirth, @Address, @Role);
        DECLARE @ClientID INT = SCOPE_IDENTITY();
        INSERT INTO LoyaltyRewards (ClientID, TotalPoints, TierLevel) VALUES (@ClientID, 0, 'Bronze');
        SELECT 1 AS Success, 'Registration successful' AS Message, @ClientID AS ClientID;
    END
END
GO

-- Login client
CREATE OR ALTER PROCEDURE sp_LoginClient @Email VARCHAR(100)
AS
BEGIN
    SELECT ClientID, FirstName, LastName, Email, Phone, Role, PasswordHash, IsActive
    FROM Clients WHERE Email = @Email AND IsActive = 1;
    UPDATE Clients SET LastLogin = GETDATE() WHERE Email = @Email;
END
GO

-- Get all schedules (public)
CREATE OR ALTER PROCEDURE sp_GetAllSchedules
AS
BEGIN
    SELECT s.ScheduleID, s.TrainID, t.TrainName, t.TrainNumber, t.TrainType,
           s.SeatPrice, s.BerthPrice, s.SleeperCoaches, s.SeaterCoaches,
           dep.StationName AS DepartureStation, arr.StationName AS ArrivalStation,
           s.DepartureTime, s.ArrivalTime, s.TicketPrice, s.AvailableSeats, s.Status
    FROM Schedule s
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    WHERE s.DepartureTime > GETDATE() AND s.Status = 'Scheduled'
    ORDER BY s.DepartureTime;
END
GO

-- Get schedule by ID
CREATE OR ALTER PROCEDURE sp_GetScheduleByID @ScheduleID INT
AS
BEGIN
    SELECT s.ScheduleID, s.TrainID, t.TrainName, t.TrainNumber, t.TrainType,
           s.SeatPrice, s.BerthPrice, s.SleeperCoaches, s.SeaterCoaches,
           dep.StationName AS DepartureStation, arr.StationName AS ArrivalStation,
           s.DepartureTime, s.ArrivalTime, s.TicketPrice, s.AvailableSeats, s.Status
    FROM Schedule s
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    WHERE s.ScheduleID = @ScheduleID;
END
GO

-- Get train config (pricing only)
CREATE OR ALTER PROCEDURE sp_GetTrainConfig @TrainID INT
AS
BEGIN
    SELECT TrainID, TrainName, TrainNumber, TrainType, SeatPrice, BerthPrice
    FROM Trains WHERE TrainID = @TrainID;
END
GO

-- Update train pricing
CREATE OR ALTER PROCEDURE sp_UpdateTrainConfig
    @TrainID INT,
    @SeatPrice DECIMAL(8,2),
    @BerthPrice DECIMAL(8,2)
AS
BEGIN
    UPDATE Trains
    SET SeatPrice = @SeatPrice,
        BerthPrice = @BerthPrice
    WHERE TrainID = @TrainID;
    SELECT 1 AS Success, 'Train pricing updated successfully' AS Message;
END
GO

-- Get all schedules for admin
CREATE OR ALTER PROCEDURE sp_GetAllSchedulesAdmin
AS
BEGIN
    SELECT s.ScheduleID, t.TrainID, t.TrainName, t.TrainNumber, t.TrainType,
           s.SeatPrice, s.BerthPrice,
           dep.StationID AS DepartureStationID, dep.StationName AS DepartureStation,
           arr.StationID AS ArrivalStationID, arr.StationName AS ArrivalStation,
           s.DepartureTime, s.ArrivalTime, s.TicketPrice,
           s.SleeperCoaches, s.SeaterCoaches, s.AvailableSeats, s.Status
    FROM Schedule s
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    ORDER BY s.DepartureTime DESC;
END
GO

-- Add schedule
CREATE OR ALTER PROCEDURE sp_AddSchedule
    @TrainID INT, @DepartureStationID INT, @ArrivalStationID INT,
    @DepartureTime DATETIME, @ArrivalTime DATETIME,
    @SeatPrice DECIMAL(8,2), @BerthPrice DECIMAL(8,2),
    @SleeperCoaches INT, @SeaterCoaches INT, @Status VARCHAR(20)
AS
BEGIN
    -- Capacity: Berth coach = 5 compartments × (6 berths + 2 seats) = 40 total per coach
    --           Seater coach = 5 compartments × (6 seats + 2 berths) = 40 total per coach
    DECLARE @TotalCapacity INT = (@SleeperCoaches + @SeaterCoaches) * 40;

    INSERT INTO Schedule (TrainID, DepartureStation, ArrivalStation, DepartureTime, ArrivalTime,
                          TicketPrice, SeatPrice, BerthPrice, SleeperCoaches, SeaterCoaches, AvailableSeats, Status)
    VALUES (@TrainID, @DepartureStationID, @ArrivalStationID, @DepartureTime, @ArrivalTime,
            0, @SeatPrice, @BerthPrice, @SleeperCoaches, @SeaterCoaches, @TotalCapacity, @Status);

    SELECT 1 AS Success, 'Schedule added successfully' AS Message, SCOPE_IDENTITY() AS ScheduleID;
END
GO

-- Update schedule
CREATE OR ALTER PROCEDURE sp_UpdateSchedule
    @ScheduleID INT, @TrainID INT, @DepartureStationID INT, @ArrivalStationID INT,
    @DepartureTime DATETIME, @ArrivalTime DATETIME,
    @SeatPrice DECIMAL(8,2), @BerthPrice DECIMAL(8,2),
    @SleeperCoaches INT, @SeaterCoaches INT, @Status VARCHAR(20)
AS
BEGIN
    DECLARE @TotalCapacity INT = (@SleeperCoaches + @SeaterCoaches) * 40;
    DECLARE @BookedCount INT;
    
    SELECT @BookedCount = COUNT(*) FROM Bookings
    WHERE ScheduleID = @ScheduleID AND Status IN ('Confirmed', 'Pending');

    DECLARE @NewAvailable INT = @TotalCapacity - @BookedCount;
    IF @NewAvailable < 0 SET @NewAvailable = 0;

    UPDATE Schedule SET
        TrainID = @TrainID,
        DepartureStation = @DepartureStationID,
        ArrivalStation = @ArrivalStationID,
        DepartureTime = @DepartureTime,
        ArrivalTime = @ArrivalTime,
        TicketPrice = 0,
        SeatPrice = @SeatPrice,
        BerthPrice = @BerthPrice,
        SleeperCoaches = @SleeperCoaches,
        SeaterCoaches = @SeaterCoaches,
        AvailableSeats = @NewAvailable,
        Status = @Status
    WHERE ScheduleID = @ScheduleID;

    SELECT 1 AS Success, 'Schedule updated successfully' AS Message;
END
GO

-- Delete schedule
CREATE OR ALTER PROCEDURE sp_DeleteSchedule @ScheduleID INT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Bookings WHERE ScheduleID = @ScheduleID AND Status = 'Confirmed')
        SELECT 0 AS Success, 'Cannot delete schedule with confirmed bookings' AS Message;
    ELSE
    BEGIN
        DELETE FROM Schedule WHERE ScheduleID = @ScheduleID;
        SELECT 1 AS Success, 'Schedule deleted successfully' AS Message;
    END
END
GO

-- Book ticket
CREATE OR ALTER PROCEDURE sp_BookTicket
    @ClientID INT, @ScheduleID INT, @SeatNumber VARCHAR(10),
    @BookingType VARCHAR(10) = 'seat', @Price DECIMAL(8,2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;

    DECLARE @AvailableSeats INT, @DepartureTime DATETIME;
    SELECT @AvailableSeats = AvailableSeats, @DepartureTime = DepartureTime
    FROM Schedule WHERE ScheduleID = @ScheduleID;

    IF @AvailableSeats <= 0
    BEGIN
        SELECT 0 AS Success, 'No seats available' AS Message;
        ROLLBACK; RETURN;
    END

    IF EXISTS (SELECT 1 FROM Bookings WHERE ScheduleID = @ScheduleID AND SeatNumber = @SeatNumber AND Status IN ('Confirmed', 'Pending'))
    BEGIN
        SELECT 0 AS Success, 'Seat already booked' AS Message;
        ROLLBACK; RETURN;
    END

    DECLARE @PaymentExpiry DATETIME;
    IF DATEDIFF(HOUR, GETDATE(), @DepartureTime) < 1
        SET @PaymentExpiry = DATEADD(MINUTE, 15, GETDATE());
    ELSE
        SET @PaymentExpiry = DATEADD(HOUR, 1, GETDATE());

    INSERT INTO Bookings (ClientID, ScheduleID, SeatNumber, TotalAmount, Status, PaymentStatus, PaymentExpiry, BookingType)
    VALUES (@ClientID, @ScheduleID, @SeatNumber, @Price, 'Pending', 'Pending', @PaymentExpiry, @BookingType);

    DECLARE @BookingID INT = SCOPE_IDENTITY();
    UPDATE Schedule SET AvailableSeats = AvailableSeats - 1 WHERE ScheduleID = @ScheduleID;

    SELECT 1 AS Success, 'Booking created, proceed to payment' AS Message, @BookingID AS BookingID, @PaymentExpiry AS PaymentExpiry;
    COMMIT;
END
GO

-- Confirm payment
CREATE OR ALTER PROCEDURE sp_ConfirmPayment @BookingID INT, @PaymentIntentId VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @ClientID INT, @TotalAmount DECIMAL(8,2), @ScheduleID INT, @PaymentExpiry DATETIME;
    
    SELECT @ClientID = ClientID, @TotalAmount = TotalAmount, @ScheduleID = ScheduleID, @PaymentExpiry = PaymentExpiry
    FROM Bookings WHERE BookingID = @BookingID AND PaymentStatus = 'Pending';
    
    IF @ClientID IS NULL
    BEGIN
        SELECT 0 AS Success, 'Booking not found or already paid/cancelled' AS Message;
        ROLLBACK; RETURN;
    END
    
    IF @PaymentExpiry < GETDATE()
    BEGIN
        UPDATE Schedule SET AvailableSeats = AvailableSeats + 1 WHERE ScheduleID = @ScheduleID;
        UPDATE Bookings SET Status = 'Cancelled', PaymentStatus = 'Failed' WHERE BookingID = @BookingID;
        SELECT 0 AS Success, 'Payment window expired. Booking cancelled.' AS Message;
        ROLLBACK; RETURN;
    END
    
    UPDATE Bookings SET PaymentStatus = 'Paid', Status = 'Confirmed', PaymentIntentId = @PaymentIntentId, BookingDate = GETDATE()
    WHERE BookingID = @BookingID;
    
    DECLARE @PointsEarned INT = @TotalAmount / 10;
    UPDATE LoyaltyRewards SET TotalPoints = TotalPoints + @PointsEarned, LastUpdated = GETDATE() WHERE ClientID = @ClientID;
    INSERT INTO RewardTransactions (ClientID, BookingID, PointsChanged, TransactionType) 
    VALUES (@ClientID, @BookingID, @PointsEarned, 'Earned');
    INSERT INTO Payments (BookingID, Amount, PaymentMethod, PaymentStatus, TransactionRef) 
    VALUES (@BookingID, @TotalAmount, 'Card', 'Paid', @PaymentIntentId);
    
    SELECT 1 AS Success, 'Payment confirmed, booking successful' AS Message;
    COMMIT;
END
GO

-- Cancel pending booking
CREATE OR ALTER PROCEDURE sp_CancelPendingBooking @BookingID INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @ScheduleID INT, @PaymentStatus VARCHAR(20);
    SELECT @ScheduleID = ScheduleID, @PaymentStatus = PaymentStatus FROM Bookings WHERE BookingID = @BookingID;
    
    IF @PaymentStatus != 'Pending'
    BEGIN
        SELECT 0 AS Success, 'Only pending bookings can be cancelled this way' AS Message;
        ROLLBACK; RETURN;
    END
    
    UPDATE Schedule SET AvailableSeats = AvailableSeats + 1 WHERE ScheduleID = @ScheduleID;
    UPDATE Bookings SET Status = 'Cancelled', PaymentStatus = 'Failed' WHERE BookingID = @BookingID;
    
    SELECT 1 AS Success, 'Pending booking cancelled' AS Message;
    COMMIT;
END
GO

-- Admin cancel booking (100% full refund)
CREATE OR ALTER PROCEDURE sp_AdminCancelBooking
    @BookingID INT, @Reason VARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @ClientID INT, @ScheduleID INT, @TotalAmount DECIMAL(8,2);
    
    SELECT @ClientID = ClientID, @ScheduleID = ScheduleID, @TotalAmount = TotalAmount
    FROM Bookings WHERE BookingID = @BookingID AND PaymentStatus = 'Paid';
    
    IF @ClientID IS NULL
    BEGIN
        SELECT 0 AS Success, 'Booking not found or not paid' AS Message;
        ROLLBACK; RETURN;
    END
    
    UPDATE Bookings SET Status = 'Cancelled', PaymentStatus = 'Refunded_Admin' WHERE BookingID = @BookingID;
    
    DECLARE @DepartureTime DATETIME;
    SELECT @DepartureTime = DepartureTime FROM Schedule WHERE ScheduleID = @ScheduleID;
    IF @DepartureTime > GETDATE()
        UPDATE Schedule SET AvailableSeats = AvailableSeats + 1 WHERE ScheduleID = @ScheduleID;
    
    INSERT INTO Cancellations (BookingID, Reason, RefundAmount, RefundStatus)
    VALUES (@BookingID, @Reason, @TotalAmount, 'Approved');
    
    DECLARE @PointsToDeduct INT = @TotalAmount / 10;
    UPDATE LoyaltyRewards 
    SET TotalPoints = CASE WHEN TotalPoints >= @PointsToDeduct THEN TotalPoints - @PointsToDeduct ELSE 0 END,
        LastUpdated = GETDATE()
    WHERE ClientID = @ClientID;
    
    INSERT INTO RewardTransactions (ClientID, BookingID, PointsChanged, TransactionType)
    VALUES (@ClientID, @BookingID, -@PointsToDeduct, 'AdminCancellation');
    
    SELECT 1 AS Success, 'Booking cancelled. Full refund of Rs. ' + CAST(@TotalAmount AS VARCHAR) + ' will be processed.' AS Message;
    COMMIT;
END
GO

-- User request refund (30% deduction)
CREATE OR ALTER PROCEDURE sp_RequestRefund @BookingID INT, @ClientID INT, @Reason VARCHAR(500)
AS
BEGIN
    DECLARE @TotalAmount DECIMAL(8,2), @PaymentStatus VARCHAR(20), @BookingClientID INT;
    SELECT @TotalAmount = TotalAmount, @PaymentStatus = PaymentStatus, @BookingClientID = ClientID FROM Bookings WHERE BookingID = @BookingID;
    
    IF @BookingClientID != @ClientID SELECT 0 AS Success, 'Unauthorized' AS Message;
    ELSE IF @PaymentStatus != 'Paid' SELECT 0 AS Success, 'Only paid bookings can be refunded' AS Message;
    ELSE IF EXISTS (SELECT 1 FROM RefundRequests WHERE BookingID = @BookingID AND Status IN ('Pending', 'Approved')) 
        SELECT 0 AS Success, 'Refund already requested or processed' AS Message;
    ELSE
    BEGIN
        INSERT INTO RefundRequests (BookingID, ClientID, Reason, RequestedAmount, DeductionAmount, RefundAmount)
        VALUES (@BookingID, @ClientID, @Reason, @TotalAmount, @TotalAmount * 0.30, @TotalAmount * 0.70);
        UPDATE Bookings SET PaymentStatus = 'RefundRequested' WHERE BookingID = @BookingID;
        SELECT 1 AS Success, 'Refund request submitted' AS Message;
    END
END
GO

-- Approve refund (70% refund)
CREATE OR ALTER PROCEDURE sp_ApproveRefund @RequestID INT, @AdminComment VARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @BookingID INT, @RefundAmount DECIMAL(8,2), @ClientID INT, @TotalAmount DECIMAL(8,2);
    
    SELECT @BookingID = BookingID, @RefundAmount = RefundAmount, @ClientID = ClientID 
    FROM RefundRequests WHERE RequestID = @RequestID AND Status = 'Pending';
    
    IF @BookingID IS NULL
    BEGIN
        SELECT 0 AS Success, 'Request not found or already processed' AS Message;
        ROLLBACK; RETURN;
    END
    
    UPDATE RefundRequests SET Status = 'Approved', AdminComment = @AdminComment, ProcessedDate = GETDATE() WHERE RequestID = @RequestID;
    UPDATE Bookings SET PaymentStatus = 'Refunded_User', Status = 'Cancelled' WHERE BookingID = @BookingID;
    
    SET @TotalAmount = (SELECT TotalAmount FROM Bookings WHERE BookingID = @BookingID);
    DECLARE @PointsToDeduct INT = @TotalAmount / 10;
    UPDATE LoyaltyRewards 
    SET TotalPoints = CASE WHEN TotalPoints >= @PointsToDeduct THEN TotalPoints - @PointsToDeduct ELSE 0 END,
        LastUpdated = GETDATE()
    WHERE ClientID = @ClientID;
    
    INSERT INTO RewardTransactions (ClientID, BookingID, PointsChanged, TransactionType)
    VALUES (@ClientID, @BookingID, -@PointsToDeduct, 'Refund');
    
    DECLARE @ScheduleID INT, @DepartureTime DATETIME;
    SELECT @ScheduleID = ScheduleID FROM Bookings WHERE BookingID = @BookingID;
    SELECT @DepartureTime = DepartureTime FROM Schedule WHERE ScheduleID = @ScheduleID;
    IF @DepartureTime > GETDATE()
        UPDATE Schedule SET AvailableSeats = AvailableSeats + 1 WHERE ScheduleID = @ScheduleID;
    
    SELECT 1 AS Success, 'Refund approved. Amount ' + CAST(@RefundAmount AS VARCHAR) + ' will be refunded (30% fee deducted).' AS Message;
    COMMIT;
END
GO

-- Reject refund
CREATE OR ALTER PROCEDURE sp_RejectRefund @RequestID INT, @AdminComment VARCHAR(500)
AS
BEGIN
    UPDATE RefundRequests SET Status = 'Rejected', AdminComment = @AdminComment, ProcessedDate = GETDATE() WHERE RequestID = @RequestID;
    UPDATE Bookings SET PaymentStatus = 'Paid' WHERE BookingID = (SELECT BookingID FROM RefundRequests WHERE RequestID = @RequestID);
    SELECT 1 AS Success, 'Refund rejected' AS Message;
END
GO

-- Get client bookings
CREATE OR ALTER PROCEDURE sp_GetClientBookings @ClientID INT
AS
BEGIN
    SELECT b.BookingID, b.BookingDate, b.SeatNumber, b.TotalAmount, 
           CASE WHEN s.DepartureTime < GETDATE() AND b.Status = 'Confirmed' THEN 'Completed' ELSE b.Status END AS BookingStatus,
           b.PaymentStatus, b.PaymentExpiry, b.BookingType,
           s.DepartureTime, s.ArrivalTime, t.TrainName, t.TrainNumber,
           dep.StationName AS DepartureStation, arr.StationName AS ArrivalStation
    FROM Bookings b
    INNER JOIN Schedule s ON b.ScheduleID = s.ScheduleID
    INNER JOIN Trains t ON s.TrainID = t.TrainID
    INNER JOIN Stations dep ON s.DepartureStation = dep.StationID
    INNER JOIN Stations arr ON s.ArrivalStation = arr.StationID
    WHERE b.ClientID = @ClientID
    ORDER BY b.BookingDate DESC;
END
GO

-- Get client loyalty
CREATE OR ALTER PROCEDURE sp_GetClientLoyalty @ClientID INT
AS
BEGIN
    SELECT lr.TotalPoints, lr.TierLevel, COUNT(b.BookingID) AS TotalBookings, ISNULL(SUM(b.TotalAmount), 0) AS TotalSpent
    FROM LoyaltyRewards lr LEFT JOIN Bookings b ON lr.ClientID = b.ClientID AND b.Status = 'Confirmed'
    WHERE lr.ClientID = @ClientID GROUP BY lr.TotalPoints, lr.TierLevel;
END
GO

-- Get all stations
CREATE OR ALTER PROCEDURE sp_GetAllStations
AS
BEGIN SELECT StationID, StationName, City, Province FROM Stations WHERE IsActive = 1 ORDER BY City, StationName; END
GO

-- Get all trains
CREATE OR ALTER PROCEDURE sp_GetAllTrains
AS
BEGIN SELECT TrainID, TrainName, TrainNumber, TrainType, TotalSeats, AvailableSeats, SeatPrice, BerthPrice FROM Trains WHERE IsActive = 1; END
GO

-- Auto-complete past bookings
CREATE OR ALTER PROCEDURE sp_AutoCompleteBookings
AS
BEGIN
    UPDATE b SET b.Status = 'Completed'
    FROM Bookings b INNER JOIN Schedule s ON b.ScheduleID = s.ScheduleID
    WHERE s.DepartureTime < GETDATE() AND b.Status = 'Confirmed' AND b.PaymentStatus = 'Paid';
    SELECT @@ROWCOUNT AS CompletedCount;
END
GO

-- Cancel expired pending bookings
CREATE OR ALTER PROCEDURE sp_CancelExpiredPendingBookings
AS
BEGIN
    DECLARE @BookingID INT, @ScheduleID INT;
    DECLARE cur CURSOR FOR SELECT BookingID, ScheduleID FROM Bookings WHERE PaymentStatus = 'Pending' AND PaymentExpiry < GETDATE();
    OPEN cur;
    FETCH NEXT FROM cur INTO @BookingID, @ScheduleID;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRANSACTION;
        UPDATE Schedule SET AvailableSeats = AvailableSeats + 1 WHERE ScheduleID = @ScheduleID;
        UPDATE Bookings SET Status = 'Cancelled', PaymentStatus = 'Failed' WHERE BookingID = @BookingID;
        COMMIT;
        FETCH NEXT FROM cur INTO @BookingID, @ScheduleID;
    END
    CLOSE cur;
    DEALLOCATE cur;
    SELECT @@ROWCOUNT AS ExpiredCount;
END
GO

-- =====================================================
-- MESSAGING STORED PROCEDURES
-- =====================================================

CREATE OR ALTER PROCEDURE sp_SendUserMessage
    @UserID INT, @UserName VARCHAR(100), @UserEmail VARCHAR(100),
    @Subject VARCHAR(200), @Message TEXT
AS
BEGIN
    IF EXISTS (SELECT 1 FROM Conversations WHERE UserID = @UserID AND Status = 'Pending')
        SELECT 0 AS Success, 'You already have a pending message. Please wait for admin reply.' AS Message;
    ELSE
    BEGIN
        INSERT INTO Conversations (UserID, UserName, UserEmail, Subject, UserMessage, Status, CreatedAt, UpdatedAt)
        VALUES (@UserID, @UserName, @UserEmail, @Subject, @Message, 'Pending', GETDATE(), GETDATE());
        SELECT 1 AS Success, 'Message sent successfully.' AS Message, SCOPE_IDENTITY() AS ConversationID;
    END
END
GO

CREATE OR ALTER PROCEDURE sp_SendAdminReply @ConversationID INT, @AdminReply TEXT
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Conversations WHERE ConversationID = @ConversationID AND Status = 'Pending')
        SELECT 0 AS Success, 'Conversation not found or already replied.' AS Message;
    ELSE
    BEGIN
        UPDATE Conversations 
        SET AdminReply = @AdminReply, AdminReplyDate = GETDATE(), Status = 'Replied', UpdatedAt = GETDATE()
        WHERE ConversationID = @ConversationID;
        SELECT 1 AS Success, 'Reply sent successfully.' AS Message;
    END
END
GO

CREATE OR ALTER PROCEDURE sp_SendFollowUpMessage @ConversationID INT, @UserID INT, @NewMessage TEXT
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Conversations WHERE ConversationID = @ConversationID AND UserID = @UserID AND Status = 'Replied')
        SELECT 0 AS Success, 'Cannot send follow-up. Admin has not replied yet.' AS Message;
    ELSE
    BEGIN
        UPDATE Conversations 
        SET UserMessage = @NewMessage, UserMessageDate = GETDATE(), AdminReply = NULL, AdminReplyDate = NULL, Status = 'Pending', UpdatedAt = GETDATE()
        WHERE ConversationID = @ConversationID;
        SELECT 1 AS Success, 'Follow-up sent. Admin will reply.' AS Message;
    END
END
GO

CREATE OR ALTER PROCEDURE sp_GetUserConversation @UserID INT
AS
BEGIN
    SELECT ConversationID, Subject, UserMessage, UserMessageDate, AdminReply, AdminReplyDate, Status
    FROM Conversations WHERE UserID = @UserID ORDER BY UpdatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_GetAdminAllConversations
AS
BEGIN
    SELECT ConversationID, UserID, UserName, UserEmail, Subject, UserMessage, UserMessageDate,
           AdminReply, AdminReplyDate, Status, CreatedAt, UpdatedAt
    FROM Conversations ORDER BY CASE WHEN Status = 'Pending' THEN 0 ELSE 1 END, UpdatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_GetConversationById @ConversationID INT
AS
BEGIN
    SELECT ConversationID, UserID, UserName, UserEmail, Subject, UserMessage, UserMessageDate,
           AdminReply, AdminReplyDate, Status
    FROM Conversations WHERE ConversationID = @ConversationID;
END
GO

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR ALTER TRIGGER trg_UpdateLoyaltyTier ON LoyaltyRewards AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE lr
    SET TierLevel = CASE 
        WHEN inserted.TotalPoints >= 5000 THEN 'Platinum'
        WHEN inserted.TotalPoints >= 2000 THEN 'Gold'
        WHEN inserted.TotalPoints >= 500 THEN 'Silver'
        ELSE 'Bronze'
    END
    FROM LoyaltyRewards lr INNER JOIN inserted ON lr.RewardID = inserted.RewardID
    WHERE lr.TierLevel != CASE 
        WHEN inserted.TotalPoints >= 5000 THEN 'Platinum'
        WHEN inserted.TotalPoints >= 2000 THEN 'Gold'
        WHEN inserted.TotalPoints >= 500 THEN 'Silver'
        ELSE 'Bronze'
    END;
END
GO

-- =====================================================
-- SAMPLE DATA
-- =====================================================

INSERT INTO Stations (StationName, City, Province) VALUES
('Lahore Junction', 'Lahore', 'Punjab'),
('Karachi Cantt', 'Karachi', 'Sindh'),
('Rawalpindi', 'Rawalpindi', 'Punjab'),
('Multan Cantt', 'Multan', 'Punjab'),
('Faisalabad', 'Faisalabad', 'Punjab'),
('Peshawar Cantt', 'Peshawar', 'KPK'),
('Quetta', 'Quetta', 'Balochistan'),
('Islamabad', 'Islamabad', 'ICT');

INSERT INTO Trains (TrainName, TrainNumber, TrainType, TotalSeats, AvailableSeats, SeatPrice, BerthPrice) VALUES
('Green Line Express', 'GL-001', 'Express', 0, 0, 500, 1000),
('Karakoram Express', 'KK-102', 'Express', 0, 0, 500, 1000),
('Awam Express', 'AW-205', 'Local', 0, 0, 400, 800),
('Tezgam Express', 'TZ-310', 'Express', 0, 0, 600, 1200),
('Bahauddin Zakariya', 'BZ-415', 'Local', 0, 0, 350, 700);

INSERT INTO Schedule (TrainID, DepartureStation, ArrivalStation, DepartureTime, ArrivalTime, TicketPrice, SeatPrice, BerthPrice, SleeperCoaches, SeaterCoaches, AvailableSeats) VALUES
(1, 1, 2, DATEADD(HOUR, 8, DATEADD(DAY, 1, GETDATE())), DATEADD(HOUR, 14, DATEADD(DAY, 1, GETDATE())), 0, 500, 1000, 2, 6, 320),
(2, 2, 3, DATEADD(HOUR, 9, DATEADD(DAY, 2, GETDATE())), DATEADD(HOUR, 23.5, DATEADD(DAY, 2, GETDATE())), 0, 500, 1000, 2, 6, 320),
(3, 1, 4, DATEADD(HOUR, 7.5, DATEADD(DAY, 3, GETDATE())), DATEADD(HOUR, 13, DATEADD(DAY, 3, GETDATE())), 0, 400, 800, 2, 6, 320),
(4, 3, 6, DATEADD(HOUR, 6, DATEADD(DAY, 4, GETDATE())), DATEADD(HOUR, 12, DATEADD(DAY, 4, GETDATE())), 0, 600, 1200, 2, 6, 320),
(5, 4, 5, DATEADD(HOUR, 10, DATEADD(DAY, 2, GETDATE())), DATEADD(HOUR, 14.5, DATEADD(DAY, 2, GETDATE())), 0, 350, 700, 2, 6, 320);

DECLARE @PasswordHash VARCHAR(255) = '$2b$10$6eI6q8XvZ5xY9zM7wP2QKOVs7cT9jFyKz3LmNpQrStUvWxYzAbCd';
INSERT INTO Clients (FirstName, LastName, Email, Phone, PasswordHash, Role) VALUES
('Admin', 'User', 'admin@railway.com', '0300-0000000', @PasswordHash, 'Admin'),
('Test', 'User', 'test@test.com', '0300-1111111', @PasswordHash, 'User'),
('Super', 'Admin', 'l230787@lhr.nu.edu.pk', '0300-2222222', @PasswordHash, 'Admin');

INSERT INTO LoyaltyRewards (ClientID, TotalPoints, TierLevel) SELECT ClientID, 0, 'Bronze' FROM Clients;

INSERT INTO Catalogue (TrainID, Title, Description) VALUES
(1, 'Green Line Luxury', 'Experience premium travel with air-conditioned coaches, reclining seats, and on-board dining.'),
(2, 'Karakoram Comfort', 'Travel through scenic routes with panoramic windows and dedicated luggage storage.'),
(3, 'Awam Economy', 'Affordable fares for everyday commuters with clean and safe coaches.'),
(4, 'Tezgam Business', 'Business class cabin with Wi-Fi, charging ports, and complimentary meals.'),
(5, 'Bahauddin Expedition', 'Explore Punjab with our regional express service connecting major cities.');

-- =====================================================
-- FINAL OUTPUT
-- =====================================================
PRINT '========================================';
PRINT '✅ Database setup complete!';
PRINT '========================================';
PRINT 'Test Credentials:';
PRINT '  Admin (hardcoded): l230787@lhr.nu.edu.pk / password123';
PRINT '  Admin (DB):        admin@railway.com / password123';
PRINT '  User:              test@test.com / password123';
PRINT '========================================';
PRINT 'Tables created:';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;
PRINT '========================================';