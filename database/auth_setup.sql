-- ============================================
-- Authentication Setup for AFMS
-- Users Table Creation
-- ============================================

USE afms_db;

-- Create Users Table
CREATE TABLE IF NOT EXISTS Users (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: To insert users with proper bcrypt hashes, use one of the following methods:
-- 
-- Method 1: Use the setup route (Recommended)
-- POST http://localhost:5500/api/auth/setup
-- This will create the table and insert default users with proper bcrypt hashes
--
-- Method 2: Generate hashes using Node.js
-- Run: node database/generate_users.js
-- This will output SQL INSERT statements with proper bcrypt hashes
--
-- Method 3: Manual insertion (after generating hashes)
-- Use the output from generate_users.js or create hashes manually:
-- const bcrypt = require('bcryptjs');
-- const hash = bcrypt.hashSync('admin123', 10);
-- Then insert using the generated hash

-- Example INSERT statements (hashes need to be generated):
-- INSERT INTO Users (username, password, role) VALUES
-- ('admin', '<bcrypt_hash_for_admin123>', 'admin'),
-- ('user', '<bcrypt_hash_for_user123>', 'user')
-- ON DUPLICATE KEY UPDATE username=username;
