-- ============================================
-- Armed Forces Management System (AFMS)
-- COMPLETE & FIXED DATABASE SCRIPT
-- ============================================

DROP DATABASE IF EXISTS afms_db; -- Optional: Resets the DB to avoid conflicts

CREATE DATABASE afms_db;

USE afms_db;

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Serving Personnel Table
CREATE TABLE ServingPersonnel (
    serviceID CHAR(8) PRIMARY KEY,
    firstName VARCHAR(20) NOT NULL,
    lastName VARCHAR(20) NOT NULL,
    DOB DATE NOT NULL,
    currRank VARCHAR(9) NOT NULL,
    regiment VARCHAR(100),
    salary INT NOT NULL CHECK (salary > 0),
    awards VARCHAR(255),
    skills VARCHAR(255),
    postingType CHAR(1) NOT NULL,
    medical VARCHAR(255),
    healthPlan VARCHAR(100)
);

-- Retired Personnel Table
CREATE TABLE RetiredPersonnel (
    serviceID CHAR(8) PRIMARY KEY,
    firstName VARCHAR(20) NOT NULL,
    lastName VARCHAR(20) NOT NULL,
    DOB DATE NOT NULL,
    lastRank VARCHAR(9) NOT NULL,
    regiment VARCHAR(100),
    retirementDate DATE NOT NULL,
    pension INT NOT NULL CHECK (pension > 0),
    awards VARCHAR(255),
    skills VARCHAR(255),
    healthPlan VARCHAR(100)
);

-- Logistics Table
-- FIX: Changed equipmentID from CHAR(10) to CHAR(12) to fit data like 'EQ0012345678'
CREATE TABLE Logistics (
    equipmentID CHAR(12) PRIMARY KEY, 
    logisticsType VARCHAR(50) NOT NULL,
    cost INT NOT NULL CHECK (cost > 0),
    procurementDate DATE NOT NULL,
    tech VARCHAR(100),
    location VARCHAR(100) NOT NULL,
    assignedTo CHAR(8),
    FOREIGN KEY (assignedTo) REFERENCES ServingPersonnel(serviceID) ON DELETE SET NULL
);

-- Artillery Table (Weak Entity)
-- FIX: Changed equipmentID to CHAR(12) to match Logistics
CREATE TABLE Artillery (
    equipmentID CHAR(12) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    artRange DECIMAL(10, 2) NOT NULL,
    commissioningDate DATE NOT NULL,
    FOREIGN KEY (equipmentID) REFERENCES Logistics(equipmentID) ON DELETE CASCADE
);

-- Ships Table (Weak Entity)
-- FIX: Changed equipmentID to CHAR(12) to match Logistics
CREATE TABLE Ships (
    equipmentID CHAR(12) PRIMARY KEY,
    shipName VARCHAR(100) NOT NULL,
    shipType VARCHAR(50) NOT NULL,
    staffSize INT NOT NULL CHECK (staffSize > 0),
    commissioningDate DATE NOT NULL,
    FOREIGN KEY (equipmentID) REFERENCES Logistics(equipmentID) ON DELETE CASCADE
);

-- Jets Table (Weak Entity)
-- FIX: Changed equipmentID to CHAR(12) to match Logistics
CREATE TABLE Jets (
    equipmentID CHAR(12) PRIMARY KEY,
    jetName VARCHAR(100) NOT NULL,
    jetType VARCHAR(50) NOT NULL,
    speed DECIMAL(10, 2) NOT NULL CHECK (speed > 0),
    commissioningDate DATE NOT NULL,
    FOREIGN KEY (equipmentID) REFERENCES Logistics(equipmentID) ON DELETE CASCADE
);

-- ============================================
-- 2. TRIGGER FOR AGE VALIDATION
-- ============================================

DELIMITER //

CREATE TRIGGER check_age_serving_personnel
BEFORE INSERT ON ServingPersonnel
FOR EACH ROW
BEGIN
    DECLARE age INT;
    SET age = TIMESTAMPDIFF(YEAR, NEW.DOB, CURDATE());

    IF age < 18 OR age >= 60 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Violation: Serving Personnel must be between 18 and 60 years old.';
    END IF;
END;

//

DELIMITER ;

-- ============================================
-- 3. INDEXES & SEED DATA
-- ============================================

CREATE INDEX idx_serving_rank ON ServingPersonnel(currRank);
CREATE INDEX idx_serving_posting ON ServingPersonnel(postingType);
CREATE INDEX idx_serving_regiment ON ServingPersonnel(regiment);
CREATE INDEX idx_logistics_type ON Logistics(logisticsType);
CREATE INDEX idx_logistics_location ON Logistics(location);

-- Insert Serving Personnel
INSERT INTO ServingPersonnel (serviceID, firstName, lastName, DOB, currRank, regiment, salary, awards, skills, postingType, medical, healthPlan) VALUES
('AR001234', 'Aarav', 'Sharma', '1995-05-15', 'Maj', 'Grenadiers Regiment', 120000, 'VSM', 'Leadership, CQC', 'F', NULL, NULL),
('AR001235', 'Priya', 'Patel', '1992-08-20', 'Col', 'Rajputana Rifles', 150000, 'PVSM, VSM', 'Strategy, Leadership', 'H', NULL, NULL),
('AR001236', 'Rahul', 'Kumar', '1990-03-10', 'Lt Col', 'Sikh Regiment', 140000, 'VSM', 'Combat, Tactics', 'F', NULL, NULL),
('AR001237', 'Anjali', 'Singh', '1993-11-25', 'Maj', 'Gorkha Rifles', 125000, NULL, 'Intelligence, Analysis', 'H', NULL, NULL),
('AR001238', 'Vikram', 'Reddy', '1988-07-05', 'Col', 'Maratha Light Infantry', 155000, 'PVSM', 'Command, Strategy', 'F', NULL, NULL),
('AR001239', 'Sneha', 'Iyer', '1994-02-18', 'Capt', 'Jat Regiment', 110000, NULL, 'Communication, Logistics', 'T', NULL, NULL),
('AR001240', 'Arjun', 'Mehta', '1991-09-30', 'Maj', 'Rajput Regiment', 130000, 'VSM', 'Combat, Leadership', 'F', NULL, NULL),
('AR001241', 'Kavya', 'Nair', '1996-01-12', 'Capt', 'Dogra Regiment', 105000, NULL, 'Medical, First Aid', 'T', NULL, NULL),
('AR001242', 'Rohan', 'Gupta', '1989-06-22', 'Lt Col', 'Punjab Regiment', 145000, 'VSM', 'Artillery, Tactics', 'F', NULL, NULL),
('AR001243', 'Meera', 'Joshi', '1995-12-08', 'Maj', 'Garhwal Rifles', 120000, NULL, 'Intelligence, Reconnaissance', 'H', NULL, NULL);

-- Insert Retired Personnel
INSERT INTO RetiredPersonnel (serviceID, firstName, lastName, DOB, lastRank, regiment, retirementDate, pension, awards, skills, healthPlan) VALUES
('AR000001', 'Raj', 'Kumar', '1960-01-10', 'Lt Gen', 'Grenadiers Regiment', '2020-01-10', 80000, 'PVSM', 'Leadership', NULL),
('AR000002', 'Suresh', 'Sharma', '1962-05-20', 'Maj Gen', 'Rajputana Rifles', '2020-05-20', 75000, 'PVSM, VSM', 'Strategy, Command', NULL),
('AR000003', 'Vijay', 'Patel', '1963-08-15', 'Brig', 'Sikh Regiment', '2021-08-15', 70000, 'VSM', 'Combat, Tactics', NULL),
('AR000004', 'Lakshmi', 'Iyer', '1961-03-25', 'Col', 'Gorkha Rifles', '2019-03-25', 65000, 'VSM', 'Intelligence', NULL),
('AR000005', 'Mohan', 'Reddy', '1959-11-30', 'Lt Gen', 'Maratha Light Infantry', '2019-11-30', 85000, 'PVSM', 'Command', NULL);

-- Insert Logistics (Equipment)
INSERT INTO Logistics (equipmentID, logisticsType, cost, procurementDate, tech, location, assignedTo) VALUES
('EQ0012345678', 'Artillery', 50000000, '2020-01-15', 'Advanced', 'Western Sector', 'AR001234'),
('EQ0012345679', 'Ships', 1000000000, '2019-06-20', 'Modern', 'Naval Base Mumbai', NULL),
('EQ0012345680', 'Jets', 2000000000, '2021-03-10', 'Cutting Edge', 'Air Force Base Delhi', NULL),
('EQ0012345681', 'Artillery', 45000000, '2020-05-10', 'Advanced', 'Northern Sector', 'AR001236'),
('EQ0012345682', 'Artillery', 40000000, '2019-12-05', 'Standard', 'Eastern Sector', 'AR001240'),
('EQ0012345683', 'Ships', 950000000, '2020-08-15', 'Modern', 'Naval Base Visakhapatnam', NULL),
('EQ0012345684', 'Jets', 1800000000, '2021-07-20', 'Cutting Edge', 'Air Force Base Bangalore', NULL),
('EQ0012345685', 'Artillery', 35000000, '2021-01-10', 'Standard', 'Southern Sector', 'AR001242'),
('EQ0012345686', 'Ships', 1100000000, '2019-03-25', 'Modern', 'Naval Base Kochi', NULL),
('EQ0012345687', 'Jets', 1900000000, '2020-11-30', 'Cutting Edge', 'Air Force Base Pune', NULL);

-- Insert Artillery
INSERT INTO Artillery (equipmentID, type, artRange, commissioningDate) VALUES
('EQ0012345678', 'Howitzer', 30.0, '2020-02-01'),
('EQ0012345681', 'Rocket Launcher', 45.0, '2020-06-01'),
('EQ0012345682', 'Mortar', 8.0, '2020-01-01'),
('EQ0012345685', 'Field Gun', 20.0, '2021-02-01');

-- Insert Ships
INSERT INTO Ships (equipmentID, shipName, shipType, staffSize, commissioningDate) VALUES
('EQ0012345679', 'INS Vikrant', 'Aircraft Carrier', 1500, '2019-07-15'),
('EQ0012345683', 'INS Delhi', 'Destroyer', 350, '2020-09-20'),
('EQ0012345686', 'INS Kolkata', 'Destroyer', 360, '2019-04-10');

-- Insert Jets
INSERT INTO Jets (equipmentID, jetName, jetType, speed, commissioningDate) VALUES
('EQ0012345680', 'Rafale', 'Fighter', 1912.0, '2021-04-01'),
('EQ0012345684', 'Sukhoi Su-30MKI', 'Fighter', 2120.0, '2021-08-15'),
('EQ0012345687', 'Tejas', 'Fighter', 1350.0, '2020-12-20');

-- ============================================
-- 4. VERIFICATION
-- ============================================
SELECT 'Serving Personnel' as TableName, COUNT(*) as RecordCount FROM ServingPersonnel
UNION ALL
SELECT 'Retired Personnel', COUNT(*) FROM RetiredPersonnel
UNION ALL
SELECT 'Logistics', COUNT(*) FROM Logistics
UNION ALL
SELECT 'Artillery', COUNT(*) FROM Artillery
UNION ALL
SELECT 'Ships', COUNT(*) FROM Ships
UNION ALL
SELECT 'Jets', COUNT(*) FROM Jets;

-- Sample queries to verify relationships
SELECT 
    sp.serviceID,
    sp.firstName,
    sp.lastName,
    l.equipmentID,
    l.logisticsType,
    l.location
FROM ServingPersonnel sp
LEFT JOIN Logistics l ON sp.serviceID = l.assignedTo;

SELECT 
    l.equipmentID,
    l.logisticsType,
    a.type as artilleryType,
    a.artRange
FROM Logistics l
INNER JOIN Artillery a ON l.equipmentID = a.equipmentID;

