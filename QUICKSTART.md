# Materials Management System (MMS) - Setup & Run Guide

## Phase 3 Implementation: Authentication & User Management

This guide covers setting up and running the MMS application with the newly implemented Phase 3 (Authentication & User Management).

## Quick Start

### 1. Database Setup

First, ensure PostgreSQL is running and set up the MMS database:

```bash
cd database
./deploy.sh  # Linux/Mac
# or
deploy.bat  # Windows
```

This will:
- Create the database schema
- Run all migrations
- Seed initial data (two test accounts: superuser, admin)

### 2. Backend Setup

```bash
cd mms-backend

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Build TypeScript
npm run build

# Set up test account passwords (optional but recommended)
npm run setup-test-accounts

# Start development server
npm run dev
```

Backend will be available at `http://localhost:3001`

### 3. Frontend Setup

In a new terminal:

```bash
cd mms-frontend

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## Testing the Application

### 1. Access the Application
Open your browser and go to `http://localhost:5173`

### 2. Login

You'll see a login page. Use one of the test credentials:

**Option A: If you ran `npm run setup-test-accounts`**
- Account: `superuser`, Password: `superuser123`
- Account: `admin`, Password: `admin123`

**Option B: If you didn't run setup script**
- You need to set passwords via SQL or API before logging in
- See instructions below

### 3. After Successful Login
You'll see the main dashboard with:
- Sidebar navigation menu
- Main content area
- User name in the header

### 4. Logout
Click the "Log Out" button in the sidebar to return to the login page

---

## Setting Up Test Account Passwords

### Method 1: Automatic (Recommended)
```bash
cd mms-backend
npm run setup-test-accounts
```

### Method 2: Manual SQL
Connect to PostgreSQL directly and run:

```sql
-- Enable pgcrypto extension (may already be installed)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set superuser password to 'superuser123'
UPDATE account 
SET password_hash = crypt('superuser123', gen_salt('bf'))
WHERE account_name = 'superuser';

-- Set admin password to 'admin123'
UPDATE account 
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE account_name = 'admin';
```

### Method 3: API
Use the backend API to set passwords (requires initial auth token - more complex, not recommended for setup)

---

## Project Structure

```
mms/
├── database/                 # Database schema & migrations
│   ├── migrations/          # SQL migration files
│   ├── seeds/               # Seed data
│   ├── deploy.sh            # Linux/Mac deployment script
│   └── deploy.bat           # Windows deployment script
│
├── mms-backend/             # Node.js/Express backend
│   ├── src/
│   │   ├── config/          # Configuration (env, database)
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Database access layer
│   │   ├── routes/          # API route definitions
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utilities (auth, errors)
│   │   └── index.ts         # Entry point
│   ├── package.json         # Dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── .env.example         # Environment template
│   └── SETUP.md            # Backend-specific setup
│
├── mms-frontend/            # React/Vite frontend
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── shared/
│   │   │   ├── api/         # API client
│   │   │   ├── components/  # Shared components
│   │   │   ├── contexts/    # React contexts
│   │   │   └── styles/      # Global CSS
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json         # Dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── vite.config.ts       # Vite config
│   ├── .env.example         # Environment template
│   └── SETUP.md            # Frontend-specific setup
│
└── README.md               # This file
```

---

## API Overview

The backend provides REST APIs for:

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/set-password` - Set/change password (authenticated)

### Account Management
- `GET /api/accounts/me` - Get current user profile
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/:id` - Get specific account
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Contact Information
- Addresses: `POST|PUT|DELETE /api/accounts/:id/addresses[/:addressId]`
- Phones: `POST|PUT|DELETE /api/accounts/:id/phones[/:phoneId]`
- Emails: `POST|PUT|DELETE /api/accounts/:id/emails[/:emailId]`

### Roles
- `POST /api/accounts/:id/roles` - Assign role to account
- `DELETE /api/accounts/:id/roles/:roleCode` - Remove role from account

All non-authentication endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Troubleshooting

### Backend won't start
1. Check PostgreSQL is running
2. Verify `.env` file has correct database credentials
3. Check port 3001 is not in use
4. Look for errors in console

### Login fails
1. Ensure backend is running (`npm run dev` in mms-backend)
2. Check test accounts have passwords set
3. Verify API endpoint in frontend `.env` is correct
4. Check browser console for API errors (F12)

### Frontend can't connect to backend
1. Verify backend is running on port 3001
2. Check VITE_API_BASE_URL in `.env` is correct
3. Check CORS is enabled in backend
4. Look for errors in browser console (F12)

### Database connection fails
1. Ensure PostgreSQL is running
2. Check credentials in backend `.env`
3. Verify database 'mms' exists
4. Check PostgreSQL logs for connection issues

---

## Next Steps

After Phase 3 is working:

1. **Phase 4 - Product Management:** Implement Material CRUD, categories, brands, and related master data
2. **Phase 5+:** Implement purchasing, inventory, and reporting modules

See `docs/` for detailed ERD and workflow documentation.

---

## Development Tips

### VS Code Setup
Install extensions:
- TypeScript Vue Plugin
- Vite
- PostgreSQL (optional for DB browsing)

### Debugging
- Backend: Add `console.log()` or use debugger
- Frontend: Use browser DevTools (F12) Network and Console tabs
- Database: Use psql or pgAdmin to query directly

### Hot Reload
- Backend: Uses ts-node ESM loader for instant reloads
- Frontend: Vite provides hot module replacement

### Database Changes
After modifying migrations:
1. Back up current data if needed
2. Drop and recreate database
3. Re-run `./deploy.sh`

---

## Support

For issues or questions:
1. Check error messages in console
2. Review API responses in Network tab (browser F12)
3. Consult database schema in `database/migrations/`
4. Review documentation in `docs/`
