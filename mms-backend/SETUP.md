# Backend Setup

## Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+

## Installation Steps

1. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Configure database connection in `.env`:**
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=mms
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up database (from project root):**
   ```bash
   cd ../database
   ./deploy.sh  # On Linux/Mac
   # or
   deploy.bat  # On Windows
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will start on `http://localhost:3001`

6. **Test API:**
   ```bash
   curl http://localhost:3001/health
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with account_name and password
- `POST /api/auth/set-password` - Set or change password

### Accounts
- `GET /api/accounts/me` - Get current account (requires auth)
- `GET /api/accounts` - List all accounts (requires auth)
- `GET /api/accounts/:id` - Get specific account (requires auth)
- `POST /api/accounts` - Create new account (requires auth)
- `PUT /api/accounts/:id` - Update account (requires auth)
- `DELETE /api/accounts/:id` - Delete account (requires auth)

### Account Relationships
- `POST /api/accounts/:id/addresses` - Create address
- `PUT /api/accounts/:id/addresses/:addressId` - Update address
- `DELETE /api/accounts/:id/addresses/:addressId` - Delete address
- `POST /api/accounts/:id/phones` - Create phone
- `PUT /api/accounts/:id/phones/:phoneId` - Update phone
- `DELETE /api/accounts/:id/phones/:phoneId` - Delete phone
- `POST /api/accounts/:id/emails` - Create email
- `PUT /api/accounts/:id/emails/:emailId` - Update email
- `DELETE /api/accounts/:id/emails/:emailId` - Delete email

### Roles
- `POST /api/accounts/:id/roles` - Assign role to account
- `DELETE /api/accounts/:id/roles/:roleCode` - Remove role from account

## Test Credentials

Two accounts are seeded in the database:
- Account: `superuser` (password not set)
- Account: `admin` (password not set)

Before first login, set password using:
```bash
curl -X POST http://localhost:3001/api/auth/set-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_new_password"}'
```

Or directly update the `password_hash` in the database:
```sql
UPDATE account SET password_hash = crypt('admin', gen_salt('bf')) WHERE account_name = 'admin';
```

(Note: This requires the pgcrypto extension - see database setup)
