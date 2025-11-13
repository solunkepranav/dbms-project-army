// --- 1. IMPORTS ---
// Load environment variables from .env file
require('dotenv').config(); 

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- 2. SETUP ---
const app = express();
// Use the PORT variable from .env, or default to 5500
const PORT = process.env.PORT || 5500;
const JWT_SECRET = process.env.JWT_SECRET || 'afms_secret_key_change_in_production';

console.log("--- AFMS SERVER.JS (with Authentication)");

// --- 3. CORE MIDDLEWARE ---
// CRITICAL: This section MUST come BEFORE your API routes.
app.use(cors({
    origin: '*', 
    credentials: true,
    exposedHeaders: ['Authorization']
}));
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// --- 4. DATABASE CONNECTION ---
// IMPORTANT: Using environment variables for robustness and security.
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_DATABASE || 'afms_db' 
};

const pool = mysql.createPool(dbConfig);

// --- 5. DATABASE HELPER FUNCTIONS ---

/**
 * Executes a query that is expected to return a single row (e.g., SELECT by ID).
 */
async function getSql(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows[0];
}

/**
 * Executes a query that is expected to return multiple rows (e.g., SELECT all).
 */
async function allSql(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

/**
 * Executes a DML query (INSERT, UPDATE, DELETE).
 */
async function runSql(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return result;
}

// --- 6. AUTHENTICATION MIDDLEWARE ---

/**
 * Middleware to authenticate JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware to authorize roles
 */
function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

// --- 7. AUTHENTICATION ROUTES ---

// Initialize Users table (called on server start)
async function initializeUsersTable() {
    try {
        await runSql(`
            CREATE TABLE IF NOT EXISTS Users (
                userID INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table initialized');
    } catch (e) {
        console.error('❌ Error initializing Users table:', e);
    }
}

// Register route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input format' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username already exists
        const existingUser = await getSql('SELECT userID FROM Users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user (default role is 'user')
        await runSql(
            'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, 'user']
        );

        res.json({ success: true, message: 'Registration successful. Please login.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input format' });
        }

        // Find user in database
        const user = await getSql('SELECT * FROM Users WHERE username = ?', [username]);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userID: user.userID, 
                username: user.username, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            role: user.role,
            username: user.username
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// --- 8. API ROUTES ---

// ============================================
// SERVING PERSONNEL ENDPOINTS
// ============================================

// Get all serving personnel with optional filters (Read - accessible to all authenticated users)
app.get('/api/personnel/serving', authenticateToken, async (req, res) => {
    try {
        const { rank, regiment, postingType } = req.query;
        let clauses = [];
        let params = [];

        if (rank) {
            clauses.push('currRank = ?');
            params.push(rank);
        }
        if (regiment) {
            clauses.push('regiment LIKE ?');
            params.push('%' + regiment + '%');
        }
        if (postingType) {
            clauses.push('postingType = ?');
            params.push(postingType);
        }

        const where = clauses.length ? (' WHERE ' + clauses.join(' AND ')) : '';
        const sql = 'SELECT * FROM ServingPersonnel' + where + ' ORDER BY serviceID';
        const rows = await allSql(sql, params);
        res.json({ personnel: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific serving personnel (Read - accessible to all authenticated users)
app.get('/api/personnel/serving/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const row = await getSql('SELECT * FROM ServingPersonnel WHERE serviceID = ?', [id]);
        if (!row) return res.status(404).json({ error: 'Personnel not found' });
        res.json({ personnel: row });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new serving personnel (Create - Admin only)
app.post('/api/personnel/serving', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { serviceID, firstName, lastName, DOB, currRank, regiment, salary, awards, skills, postingType, medical, healthPlan } = req.body;
        
        if (!serviceID || !firstName || !lastName || !DOB || !currRank || !salary || !postingType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'INSERT INTO ServingPersonnel (serviceID, firstName, lastName, DOB, currRank, regiment, salary, awards, skills, postingType, medical, healthPlan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [serviceID, firstName, lastName, DOB, currRank, regiment || null, salary, awards || null, skills || null, postingType, medical || null, healthPlan || null]
        );

        res.json({ success: true, serviceID });
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Service ID already exists' });
        }
        if (e.sqlState === '45000') {
            return res.status(400).json({ error: e.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update serving personnel (Admin only)
app.put('/api/personnel/serving/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        const { firstName, lastName, DOB, currRank, regiment, salary, awards, skills, postingType, medical, healthPlan } = req.body;
        
        if (!firstName || !lastName || !DOB || !currRank || !salary || !postingType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'UPDATE ServingPersonnel SET firstName = ?, lastName = ?, DOB = ?, currRank = ?, regiment = ?, salary = ?, awards = ?, skills = ?, postingType = ?, medical = ?, healthPlan = ? WHERE serviceID = ?',
            [firstName, lastName, DOB, currRank, regiment || null, salary, awards || null, skills || null, postingType, medical || null, healthPlan || null, id]
        );

        res.json({ success: true, message: 'Personnel updated successfully' });
    } catch (e) {
        console.error(e);
        if (e.sqlState === '45000') {
            return res.status(400).json({ error: e.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete serving personnel (Admin only)
app.delete('/api/personnel/serving/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        await runSql('DELETE FROM ServingPersonnel WHERE serviceID = ?', [id]);
        res.json({ success: true, message: 'Personnel deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// RETIRED PERSONNEL ENDPOINTS
// ============================================

// Get all retired personnel (Read - accessible to all authenticated users)
app.get('/api/personnel/retired', authenticateToken, async (req, res) => {
    try {
        const rows = await allSql('SELECT * FROM RetiredPersonnel ORDER BY retirementDate DESC');
        res.json({ personnel: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific retired personnel (Read - accessible to all authenticated users)
app.get('/api/personnel/retired/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const row = await getSql('SELECT * FROM RetiredPersonnel WHERE serviceID = ?', [id]);
        if (!row) return res.status(404).json({ error: 'Personnel not found' });
        res.json({ personnel: row });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new retired personnel (Create - Admin only)
app.post('/api/personnel/retired', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { serviceID, firstName, lastName, DOB, lastRank, regiment, retirementDate, pension, awards, skills, healthPlan } = req.body;
        
        if (!serviceID || !firstName || !lastName || !DOB || !lastRank || !retirementDate || !pension) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'INSERT INTO RetiredPersonnel (serviceID, firstName, lastName, DOB, lastRank, regiment, retirementDate, pension, awards, skills, healthPlan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [serviceID, firstName, lastName, DOB, lastRank, regiment || null, retirementDate, pension, awards || null, skills || null, healthPlan || null]
        );

        res.json({ success: true, serviceID });
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Service ID already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update retired personnel (Admin only)
app.put('/api/personnel/retired/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        const { firstName, lastName, DOB, lastRank, regiment, retirementDate, pension, awards, skills, healthPlan } = req.body;
        
        if (!firstName || !lastName || !DOB || !lastRank || !retirementDate || !pension) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'UPDATE RetiredPersonnel SET firstName = ?, lastName = ?, DOB = ?, lastRank = ?, regiment = ?, retirementDate = ?, pension = ?, awards = ?, skills = ?, healthPlan = ? WHERE serviceID = ?',
            [firstName, lastName, DOB, lastRank, regiment || null, retirementDate, pension, awards || null, skills || null, healthPlan || null, id]
        );

        res.json({ success: true, message: 'Personnel updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete retired personnel (Admin only)
app.delete('/api/personnel/retired/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        await runSql('DELETE FROM RetiredPersonnel WHERE serviceID = ?', [id]);
        res.json({ success: true, message: 'Personnel deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// LOGISTICS & EQUIPMENT ENDPOINTS
// ============================================

// Get all logistics equipment with optional filters (Read - accessible to all authenticated users)
app.get('/api/logistics', authenticateToken, async (req, res) => {
    try {
        const { type, location, assignedTo } = req.query;
        let clauses = [];
        let params = [];

        if (type) {
            clauses.push('logisticsType = ?');
            params.push(type);
        }
        if (location) {
            clauses.push('location LIKE ?');
            params.push('%' + location + '%');
        }
        if (assignedTo) {
            clauses.push('assignedTo = ?');
            params.push(assignedTo);
        }

        const where = clauses.length ? (' WHERE ' + clauses.join(' AND ')) : '';
        const sql = 'SELECT * FROM Logistics' + where + ' ORDER BY equipmentID';
        const rows = await allSql(sql, params);
        res.json({ equipment: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific equipment (Read - accessible to all authenticated users)
app.get('/api/logistics/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const row = await getSql('SELECT * FROM Logistics WHERE equipmentID = ?', [id]);
        if (!row) return res.status(404).json({ error: 'Equipment not found' });
        res.json({ equipment: row });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new equipment (Create - Admin only)
app.post('/api/logistics', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { equipmentID, logisticsType, cost, procurementDate, tech, location, assignedTo } = req.body;
        
        if (!equipmentID || !logisticsType || !cost || !procurementDate || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'INSERT INTO Logistics (equipmentID, logisticsType, cost, procurementDate, tech, location, assignedTo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [equipmentID, logisticsType, cost, procurementDate, tech || null, location, assignedTo || null]
        );

        res.json({ success: true, equipmentID });
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Equipment ID already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update equipment (Admin only)
app.put('/api/logistics/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        const { logisticsType, cost, procurementDate, tech, location, assignedTo } = req.body;
        
        if (!logisticsType || !cost || !procurementDate || !location) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'UPDATE Logistics SET logisticsType = ?, cost = ?, procurementDate = ?, tech = ?, location = ?, assignedTo = ? WHERE equipmentID = ?',
            [logisticsType, cost, procurementDate, tech || null, location, assignedTo || null, id]
        );

        res.json({ success: true, message: 'Equipment updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete equipment (Admin only)
app.delete('/api/logistics/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        await runSql('DELETE FROM Logistics WHERE equipmentID = ?', [id]);
        res.json({ success: true, message: 'Equipment deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// ARTILLERY ENDPOINTS
// ============================================

// Get all artillery (Read - accessible to all authenticated users)
app.get('/api/artillery', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT a.*, l.logisticsType, l.cost, l.procurementDate, l.tech, l.location, l.assignedTo
            FROM Artillery a
            INNER JOIN Logistics l ON a.equipmentID = l.equipmentID
            ORDER BY a.equipmentID
        `;
        const rows = await allSql(sql);
        res.json({ artillery: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new artillery (Create - Admin only)
app.post('/api/artillery', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { equipmentID, type, artRange, commissioningDate } = req.body;
        
        if (!equipmentID || !type || !artRange || !commissioningDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'INSERT INTO Artillery (equipmentID, type, artRange, commissioningDate) VALUES (?, ?, ?, ?)',
            [equipmentID, type, artRange, commissioningDate]
        );

        res.json({ success: true, equipmentID });
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Equipment ID already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update artillery (Admin only)
app.put('/api/artillery/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        const { type, artRange, commissioningDate } = req.body;
        
        if (!type || !artRange || !commissioningDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'UPDATE Artillery SET type = ?, artRange = ?, commissioningDate = ? WHERE equipmentID = ?',
            [type, artRange, commissioningDate, id]
        );

        res.json({ success: true, message: 'Artillery updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete artillery (Admin only)
app.delete('/api/artillery/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        await runSql('DELETE FROM Artillery WHERE equipmentID = ?', [id]);
        res.json({ success: true, message: 'Artillery deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// SHIPS ENDPOINTS
// ============================================

// Get all ships (Read - accessible to all authenticated users)
app.get('/api/ships', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT s.*, l.logisticsType, l.cost, l.procurementDate, l.tech, l.location, l.assignedTo
            FROM Ships s
            INNER JOIN Logistics l ON s.equipmentID = l.equipmentID
            ORDER BY s.equipmentID
        `;
        const rows = await allSql(sql);
        res.json({ ships: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new ship (Create - Admin only)
app.post('/api/ships', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { equipmentID, shipName, shipType, staffSize, commissioningDate } = req.body;
        
        if (!equipmentID || !shipName || !shipType || !staffSize || !commissioningDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'INSERT INTO Ships (equipmentID, shipName, shipType, staffSize, commissioningDate) VALUES (?, ?, ?, ?, ?)',
            [equipmentID, shipName, shipType, staffSize, commissioningDate]
        );

        res.json({ success: true, equipmentID });
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Equipment ID already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update ship (Admin only)
app.put('/api/ships/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        const { shipName, shipType, staffSize, commissioningDate } = req.body;
        
        if (!shipName || !shipType || !staffSize || !commissioningDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'UPDATE Ships SET shipName = ?, shipType = ?, staffSize = ?, commissioningDate = ? WHERE equipmentID = ?',
            [shipName, shipType, staffSize, commissioningDate, id]
        );

        res.json({ success: true, message: 'Ship updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete ship (Admin only)
app.delete('/api/ships/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        await runSql('DELETE FROM Ships WHERE equipmentID = ?', [id]);
        res.json({ success: true, message: 'Ship deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// JETS ENDPOINTS
// ============================================

// Get all jets (Read - accessible to all authenticated users)
app.get('/api/jets', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT j.*, l.logisticsType, l.cost, l.procurementDate, l.tech, l.location, l.assignedTo
            FROM Jets j
            INNER JOIN Logistics l ON j.equipmentID = l.equipmentID
            ORDER BY j.equipmentID
        `;
        const rows = await allSql(sql);
        res.json({ jets: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new jet (Create - Admin only)
app.post('/api/jets', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { equipmentID, jetName, jetType, speed, commissioningDate } = req.body;
        
        if (!equipmentID || !jetName || !jetType || !speed || !commissioningDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'INSERT INTO Jets (equipmentID, jetName, jetType, speed, commissioningDate) VALUES (?, ?, ?, ?, ?)',
            [equipmentID, jetName, jetType, speed, commissioningDate]
        );

        res.json({ success: true, equipmentID });
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Equipment ID already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update jet (Admin only)
app.put('/api/jets/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        const { jetName, jetType, speed, commissioningDate } = req.body;
        
        if (!jetName || !jetType || !speed || !commissioningDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await runSql(
            'UPDATE Jets SET jetName = ?, jetType = ?, speed = ?, commissioningDate = ? WHERE equipmentID = ?',
            [jetName, jetType, speed, commissioningDate, id]
        );

        res.json({ success: true, message: 'Jet updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete jet (Admin only)
app.delete('/api/jets/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const id = req.params.id;
        await runSql('DELETE FROM Jets WHERE equipmentID = ?', [id]);
        res.json({ success: true, message: 'Jet deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// STATISTICS & REPORTS
// ============================================

// Get dashboard statistics (Read - accessible to all authenticated users)
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const serving = await getSql('SELECT COUNT(*) as c FROM ServingPersonnel');
        const retired = await getSql('SELECT COUNT(*) as c FROM RetiredPersonnel');
        const logistics = await getSql('SELECT COUNT(*) as c FROM Logistics');
        const artillery = await getSql('SELECT COUNT(*) as c FROM Artillery');
        const ships = await getSql('SELECT COUNT(*) as c FROM Ships');
        const jets = await getSql('SELECT COUNT(*) as c FROM Jets');
        
        res.json({
            total_serving: serving.c,
            total_retired: retired.c,
            total_equipment: logistics.c,
            total_artillery: artillery.c,
            total_ships: ships.c,
            total_jets: jets.c
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get personnel with assigned equipment (JOIN query) (Read - accessible to all authenticated users)
app.get('/api/reports/personnel-equipment', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT 
                sp.serviceID,
                sp.firstName,
                sp.lastName,
                sp.currRank,
                sp.regiment,
                l.equipmentID,
                l.logisticsType,
                l.location,
                l.cost
            FROM ServingPersonnel sp
            LEFT JOIN Logistics l ON sp.serviceID = l.assignedTo
            ORDER BY sp.serviceID
        `;
        const rows = await allSql(sql);
        res.json({ assignments: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get equipment assigned to specific personnel (Read - accessible to all authenticated users)
app.get('/api/equipment/assigned/:personnelId', authenticateToken, async (req, res) => {
    try {
        const personnelId = req.params.personnelId;
        const sql = `
            SELECT * FROM Logistics 
            WHERE assignedTo = ?
            ORDER BY equipmentID
        `;
        const rows = await allSql(sql, [personnelId]);
        res.json({ equipment: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// USER MANAGEMENT (Admin Only)
// ============================================

// Get all users (Admin only)
app.get('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const rows = await allSql('SELECT userID, username, role, createdAt FROM Users ORDER BY createdAt DESC');
        res.json({ users: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user role (Admin only)
app.put('/api/users/:userId/role', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const { role } = req.body;

        if (!role || (role !== 'admin' && role !== 'user')) {
            return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
        }

        // Prevent admin from removing their own admin role if they're the only admin
        if (role === 'user') {
            const currentUser = await getSql('SELECT role FROM Users WHERE userID = ?', [userId]);
            if (currentUser && currentUser.role === 'admin') {
                const adminCount = await getSql('SELECT COUNT(*) as c FROM Users WHERE role = "admin"');
                if (adminCount.c <= 1) {
                    return res.status(400).json({ error: 'Cannot remove the last admin user' });
                }
            }
        }

        await runSql('UPDATE Users SET role = ? WHERE userID = ?', [role, userId]);
        res.json({ success: true, message: 'User role updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete user (Admin only)
app.delete('/api/users/:userId', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Prevent deleting the last admin
        const user = await getSql('SELECT role FROM Users WHERE userID = ?', [userId]);
        if (user && user.role === 'admin') {
            const adminCount = await getSql('SELECT COUNT(*) as c FROM Users WHERE role = "admin"');
            if (adminCount.c <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin user' });
            }
        }

        await runSql('DELETE FROM Users WHERE userID = ?', [userId]);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- 9. FRONTEND STATIC FILES & CATCH-ALL ---
// CRITICAL: This section MUST come AFTER all your API routes.
app.use(express.static(path.join(__dirname, 'public')));

// CRITICAL: This is the final catch-all for the frontend. It must be last.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 10. START SERVER (AFTER DB CHECK) ---
// Test the connection pool and START the server
pool.getConnection()
    .then(async conn => {
        console.log('✅ Connected to MySQL database!');
        conn.release();
        
        // Initialize Users table
        await initializeUsersTable();
        
        // --- START SERVER ---
        // Only listen for connections AFTER the database is confirmed to be working
        app.listen(PORT, () => console.log(`🚀 AFMS Server running on http://localhost:${PORT}`));
    })
    .catch(err => {
        console.error('❌ FATAL ERROR: Could not connect to the database. Check your .env file and MySQL service:', err.message);
        process.exit(1); 
    });
