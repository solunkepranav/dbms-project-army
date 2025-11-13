# Armed Forces Management System (AFMS)

A comprehensive full-stack armed forces management system built with Node.js, Express, MySQL, and vanilla JavaScript. This system allows administrators to manage serving and retired personnel, track logistics equipment (artillery, ships, jets), and maintain comprehensive records of military operations.

## Features

### Personnel Management
- **Serving Personnel** - View, add, and manage active military personnel with ranks, regiments, salaries, and postings
- **Retired Personnel** - Track retired personnel with pension information and retirement dates
- **Personnel Search** - Search and filter personnel by rank, regiment, posting type, and more
- **Age Validation** - Automatic age validation trigger (18-60 years for serving personnel)

### Equipment & Logistics Management
- **Logistics Tracking** - Manage all military equipment with procurement dates, costs, and locations
- **Artillery Management** - Track artillery equipment with types, ranges, and commissioning dates
- **Naval Ships** - Manage ship inventory with names, types, staff sizes, and commissioning dates
- **Aircraft Management** - Track jet inventory with names, types, speeds, and commissioning dates
- **Equipment Assignment** - Assign equipment to serving personnel

### Administrative Features
- **Dashboard Statistics** - View total personnel, equipment counts, and distribution
- **Comprehensive Reports** - Generate reports on personnel, equipment, and assignments
- **Data Relationships** - View relationships between personnel and assigned equipment

## Technology Stack

**Backend:**
- Node.js with Express.js
- MySQL with connection pooling
- CORS enabled

**Frontend:**
- Vanilla JavaScript (no frameworks)
- Responsive CSS with modern design
- Single Page Application (SPA) architecture
- RESTful API integration

**Database:**
- MySQL with the following key tables:
  - `ServingPersonnel` - Active military personnel records
  - `RetiredPersonnel` - Retired personnel records
  - `Logistics` - Equipment and logistics inventory
  - `Artillery` - Artillery equipment (weak entity)
  - `Ships` - Naval ships (weak entity)
  - `Jets` - Aircraft inventory (weak entity)

## Prerequisites

- **Node.js** 18+ installed
- **MySQL** server running
- **Database setup** - Run the provided SQL script to create the database schema

## Installation

1. **Clone or download the project**
   ```bash
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Create a `.env` file in the project root with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_DATABASE=afms_db
   PORT=5500
   ```
   - Run the SQL script from `database/init.sql` to create the database and tables:
   ```bash
   mysql -u your_user -p < database/init.sql
   ```
   Or execute the SQL script manually in your MySQL client.

4. **Start the server**
   ```bash
   node server.js
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:5500`

## API Endpoints

### Personnel
- `GET /api/personnel/serving` - Get all serving personnel with optional filters
  - Query params: `rank`, `regiment`, `postingType`
- `GET /api/personnel/serving/:id` - Get specific serving personnel details
- `POST /api/personnel/serving` - Add new serving personnel
- `GET /api/personnel/retired` - Get all retired personnel
- `GET /api/personnel/retired/:id` - Get specific retired personnel details
- `POST /api/personnel/retired` - Add new retired personnel

### Logistics & Equipment
- `GET /api/logistics` - Get all logistics equipment with optional filters
  - Query params: `type`, `location`, `assignedTo`
- `GET /api/logistics/:id` - Get specific equipment details
- `POST /api/logistics` - Add new equipment
- `GET /api/artillery` - Get all artillery equipment
- `GET /api/ships` - Get all ships
- `GET /api/jets` - Get all jets
- `GET /api/equipment/assigned/:personnelId` - Get equipment assigned to personnel

### Statistics & Reports
- `GET /api/stats` - Get dashboard statistics
  - Returns: total serving personnel, retired personnel, equipment counts by type
- `GET /api/reports/personnel-equipment` - Get personnel with assigned equipment (JOIN query)

## Database Features

This project demonstrates various database management concepts:

1. **DML Operations** - Insert, update, and delete operations on personnel and equipment
2. **Aggregate Functions** - Statistical queries for dashboard (COUNT, SUM, etc.)
3. **Triggers** - Age validation trigger for serving personnel (18-60 years)
4. **JOINs** - Combining personnel and equipment data
5. **Foreign Keys** - Referential integrity between Logistics and ServingPersonnel
6. **Weak Entities** - Artillery, Ships, and Jets as weak entities of Logistics
7. **Indexes** - Optimized queries on rank, regiment, posting type, and logistics type
8. **CHECK Constraints** - Salary, pension, and cost validation

## Database Schema

### ServingPersonnel
- `serviceID` (CHAR(8), PK) - Unique service identifier
- `firstName`, `lastName` - Personnel name
- `DOB` - Date of birth
- `currRank` - Current rank (Maj, Col, Lt Col, Capt)
- `regiment` - Regiment assignment
- `salary` - Monthly salary (CHECK: > 0)
- `awards` - Awards and decorations
- `skills` - Skills and qualifications
- `postingType` - Posting type (F=Field, H=Headquarters, T=Training)
- `medical`, `healthPlan` - Medical information

### RetiredPersonnel
- `serviceID` (CHAR(8), PK) - Unique service identifier
- `firstName`, `lastName` - Personnel name
- `DOB` - Date of birth
- `lastRank` - Rank at retirement
- `regiment` - Last regiment assignment
- `retirementDate` - Date of retirement
- `pension` - Monthly pension (CHECK: > 0)
- `awards`, `skills`, `healthPlan` - Additional information

### Logistics
- `equipmentID` (CHAR(12), PK) - Unique equipment identifier
- `logisticsType` - Type (Artillery, Ships, Jets)
- `cost` - Procurement cost (CHECK: > 0)
- `procurementDate` - Date of procurement
- `tech` - Technology level
- `location` - Current location
- `assignedTo` (FK) - Assigned serving personnel (nullable)

### Artillery (Weak Entity)
- `equipmentID` (CHAR(12), PK, FK) - References Logistics
- `type` - Artillery type (Howitzer, Rocket Launcher, etc.)
- `artRange` - Range in km
- `commissioningDate` - Commissioning date

### Ships (Weak Entity)
- `equipmentID` (CHAR(12), PK, FK) - References Logistics
- `shipName` - Ship name
- `shipType` - Ship type (Aircraft Carrier, Destroyer, etc.)
- `staffSize` - Number of staff (CHECK: > 0)
- `commissioningDate` - Commissioning date

### Jets (Weak Entity)
- `equipmentID` (CHAR(12), PK, FK) - References Logistics
- `jetName` - Aircraft name
- `jetType` - Aircraft type (Fighter, etc.)
- `speed` - Speed in km/h (CHECK: > 0)
- `commissioningDate` - Commissioning date

## Project Structure

```
project/
├── public/
│   └── index.html          # Frontend SPA (single file with HTML, CSS, JS)
├── database/
│   └── init.sql            # Database initialization script
├── server.js               # Express backend with MySQL integration
├── package.json            # Node.js dependencies
├── package-lock.json       # Dependency lock file
├── .env                    # Environment variables (create this)
└── README.md              # This file
```

## Key Features in Code

### Frontend (public/index.html)
- **Responsive Design** - Modern gradient UI with card-based layout
- **Dynamic Navigation** - Tab-based navigation for different sections
- **Data Tables** - Comprehensive tables for personnel and equipment
- **Real-time Updates** - Automatic data refresh on navigation
- **Error Handling** - User-friendly error messages and alerts

### Backend (server.js)
- **Connection Pooling** - Efficient database connection management
- **Input Validation** - Server-side validation for all inputs
- **SQL Injection Prevention** - Parameterized queries throughout
- **Error Handling** - Comprehensive try-catch blocks with appropriate HTTP status codes
- **RESTful API** - Clean API design following REST principles

## Usage

1. **View Personnel:**
   - Navigate to "Serving Personnel" or "Retired Personnel" tabs
   - Use filters to search by rank, regiment, or posting type
   - Click on personnel to view detailed information

2. **Manage Equipment:**
   - Navigate to "Logistics" tab to view all equipment
   - View specialized equipment in "Artillery", "Ships", and "Jets" tabs
   - See equipment assignments to personnel

3. **View Statistics:**
   - Check the "Dashboard" for overview statistics
   - View personnel-equipment relationships in reports

## Troubleshooting

### Server Won't Start
- **Issue:** Database connection error
- **Solution:** Verify MySQL is running and `.env` file has correct credentials
- Check terminal for: `✅ Connected to MySQL database!`

### Port Already in Use
- **Issue:** `EADDRINUSE` error
- **Solution:** 
  - Stop other applications on port 5500, or
  - Modify `PORT` in `.env` file to use a different port

### Database Errors
- **Issue:** Table doesn't exist or connection fails
- **Solution:** 
  - Ensure database `afms_db` exists
  - Run the initialization SQL script from `database/init.sql`
  - Verify all tables are created successfully

### Age Validation Error
- **Issue:** "Violation: Serving Personnel must be between 18 and 60 years old"
- **Solution:** This is expected behavior. The trigger enforces age restrictions for serving personnel.

## Important Notes

- **Security:** Uses environment variables for database credentials via `.env` file
- **Data Integrity:** Foreign key constraints ensure referential integrity
- **Triggers:** Age validation trigger automatically enforces age restrictions
- **Weak Entities:** Artillery, Ships, and Jets are weak entities that cascade delete with their parent Logistics record

## Development

**Server:** The backend runs on port 5500 (configurable via `.env`)

**Database:** MySQL with connection pooling for efficiency

**Hot Reload:** Not configured. Restart server after changes with `node server.js`

## License

ISC

## Author

Created for DBMS course project
