# Authentication Setup Guide

This guide will help you set up authentication and RBAC for the AFMS application.

## Step 1: Install Dependencies

```bash
npm install
```

This will install `jsonwebtoken` along with existing dependencies.

## Step 2: Set Up Database

### Option A: Use the Setup Route (Recommended)

1. Start your server:
   ```bash
   node server.js
   ```

2. Call the setup endpoint to create the Users table and default users:
   ```bash
   curl -X POST http://localhost:5500/api/auth/setup
   ```
   
   Or use Postman/Thunder Client to make a POST request to `http://localhost:5500/api/auth/setup`

### Option B: Manual SQL Setup

1. Run the SQL script to create the Users table:
   ```bash
   mysql -u your_user -p afms_db < database/auth_setup.sql
   ```

2. Generate bcrypt hashes by running:
   ```bash
   node database/generate_users.js
   ```

3. Copy the generated INSERT statements and run them in your MySQL client.

## Step 3: Configure Environment Variables

Ensure your `.env` file includes:

```env
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_DATABASE=afms_db
PORT=5500
JWT_SECRET=your_secret_key_here
```

**Important:** Change `JWT_SECRET` to a strong random string in production!

## Step 4: Default Users

After setup, you can login with:

- **Admin User:**
  - Username: `admin`
  - Password: `admin123`

- **Standard User:**
  - Username: `user`
  - Password: `user123`

## Step 5: Test the Application

1. Start the server:
   ```bash
   node server.js
   ```

2. Open `http://localhost:5500` in your browser

3. You should see a login modal. Login with one of the default users.

4. Test role-based access:
   - **Admin:** Can see all "Add" buttons and has full CRUD access
   - **User:** Can only view data (no "Add" buttons visible)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/setup` - Create Users table and default users (one-time use)

### Protected Routes
All other routes require authentication via JWT token in the `Authorization: Bearer <token>` header.

**Admin-only routes (POST requests):**
- `POST /api/personnel/serving`
- `POST /api/personnel/retired`
- `POST /api/logistics`
- `POST /api/artillery`
- `POST /api/ships`
- `POST /api/jets`

**All authenticated users (GET requests):**
- All GET endpoints are accessible to both admin and user roles

## Security Notes

1. **JWT Secret:** Always use a strong, random JWT secret in production
2. **Password Hashing:** Passwords are hashed using bcrypt with 10 salt rounds
3. **Token Expiry:** JWT tokens expire after 24 hours
4. **CORS:** Currently set to allow all origins. Restrict in production.

## Troubleshooting

### "Access token required" error
- Make sure you're logged in
- Check that the token is stored in localStorage
- Try logging out and logging back in

### "Insufficient permissions" error
- You're trying to access an admin-only route as a regular user
- Login with the admin account to perform create/update operations

### Setup route not working
- Ensure the database connection is working
- Check that the Users table doesn't already exist with conflicting data
- Review server console for error messages

