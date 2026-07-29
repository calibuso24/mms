# MMS Phase 3 - Complete Documentation Index

## 📋 Quick Navigation

### For Getting Started
1. **[QUICKSTART.md](./QUICKSTART.md)** - Start here! Complete setup guide for entire project
2. **[mms-backend/SETUP.md](./mms-backend/SETUP.md)** - Backend-specific setup instructions
3. **[mms-frontend/SETUP.md](./mms-frontend/SETUP.md)** - Frontend-specific setup instructions

### For Understanding the Implementation
1. **[PHASE3_IMPLEMENTATION.md](./PHASE3_IMPLEMENTATION.md)** - Detailed summary of what was built
2. **[Database Schema (docs/ERD.md)](./docs/ERD.md)** - Database entity relationships
3. **[MMS Workflow (docs/MMS_workflow.md)](./docs/MMS_workflow.md)** - System process flows

### For Verification & Testing
1. **[PHASE3_VERIFICATION.md](./PHASE3_VERIFICATION.md)** - Checklist to verify everything works
2. **Backend API endpoints** - See PHASE3_IMPLEMENTATION.md API section
3. **Test Credentials** - See QUICKSTART.md Testing section

### For Developers
1. **Backend Code** - See `mms-backend/src/` directory structure in PHASE3_IMPLEMENTATION.md
2. **Frontend Code** - See `mms-frontend/src/` directory structure in PHASE3_IMPLEMENTATION.md
3. **Repository Patterns** - Database access layer in `mms-backend/src/repositories/`
4. **Error Handling** - Custom error classes in `mms-backend/src/utils/errors.ts`

---

## 📊 What's Implemented (Phase 3)

### Backend API
✅ **Authentication**
- User login with JWT tokens
- Password hashing and verification
- Set/change password endpoint

✅ **Account Management**
- Full CRUD for user accounts
- List accounts with pagination
- Account profile retrieval

✅ **Contact Information**
- Manage addresses per account
- Manage phone numbers per account
- Manage email addresses per account

✅ **Role-Based Access Control**
- Assign roles to accounts
- Remove roles from accounts
- Fetch permissions for accounts

### Frontend UI
✅ **Authentication**
- Login page with form validation
- JWT token storage in browser
- Protected routes (login required)

✅ **User Experience**
- Main dashboard
- Sidebar navigation menu
- User name display in header
- Logout functionality

✅ **State Management**
- React Context for authentication state
- Persistent sessions (localStorage)
- Auto-logout on token expiry

---

## 🏗️ Architecture Overview

### Technology Stack

**Backend:**
- Runtime: Node.js 16+
- Framework: Express.js
- Language: TypeScript
- Database: PostgreSQL
- Authentication: JWT + bcryptjs

**Frontend:**
- Framework: React 18
- Language: TypeScript
- Build Tool: Vite
- Routing: React Router v6
- State: React Context API

### Design Patterns

**Backend:**
- MVC (Model-View-Controller)
- Repository Pattern (data access)
- Service Layer (business logic)
- Middleware Pattern (cross-cutting concerns)

**Frontend:**
- Component-based architecture
- Context API for state management
- Custom hooks for logic reuse
- API client abstraction

---

## 📁 Project Structure

```
mms/
├── database/                    # Database schema & migrations
│   └── migrations/             # SQL migration files
│
├── mms-backend/                # Node.js/Express API
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── controllers/       # HTTP handlers
│   │   ├── services/          # Business logic
│   │   ├── repositories/      # Database access
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Express middleware
│   │   ├── utils/             # Utilities
│   │   └── index.ts           # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── mms-frontend/               # React/Vite UI
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── shared/            # Shared code
│   │   │   ├── api/           # API client
│   │   │   ├── components/    # Components
│   │   │   ├── contexts/      # React contexts
│   │   │   └── styles/        # CSS
│   │   ├── App.tsx            # Main app
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       # Documentation
│   ├── ERD.md                 # Entity relationships
│   └── MMS_workflow.md        # Process flows
│
├── QUICKSTART.md              # 👈 START HERE
├── PHASE3_IMPLEMENTATION.md   # What was built
└── PHASE3_VERIFICATION.md     # Verification checklist
```

---

## 🚀 Getting Started (5 Minutes)

### Step 1: Database Setup
```bash
cd database
./deploy.sh  # Linux/Mac
# or
deploy.bat  # Windows
```

### Step 2: Backend Setup
```bash
cd mms-backend
npm install
npm run setup-test-accounts
npm run dev
```
✅ Backend ready at `http://localhost:3001`

### Step 3: Frontend Setup
```bash
cd mms-frontend
npm install
npm run dev
```
✅ Frontend ready at `http://localhost:5173`

### Step 4: Login
- Open http://localhost:5173
- Login with: `superuser` / `superuser123`

---

## 🔐 Authentication Flow

```
User enters credentials
        ↓
Frontend sends POST /api/auth/login
        ↓
Backend verifies password hash
        ↓
Backend generates JWT token
        ↓
Frontend stores token in localStorage
        ↓
Frontend includes token in all API requests
        ↓
Backend middleware validates token
        ↓
Request processed or rejected
```

---

## 📚 API Quick Reference

### Authentication
```bash
# Login
POST /api/auth/login
Body: { account_name, password }
Response: { token, account }

# Set Password (authenticated)
POST /api/auth/set-password
Headers: Authorization: Bearer <token>
Body: { password, current_password }
```

### Accounts
```bash
# Get current user
GET /api/accounts/me

# List all accounts
GET /api/accounts?limit=50&offset=0

# Get specific account
GET /api/accounts/:id

# Create account
POST /api/accounts
Body: { accountName, fullName, password?, addresses, phones, emails }

# Update account
PUT /api/accounts/:id
Body: { fullName?, isActive? }

# Delete account
DELETE /api/accounts/:id
```

### Contacts (Addresses, Phones, Emails)
```bash
# Create address/phone/email
POST /api/accounts/:id/addresses   # or /phones, /emails
Body: { address, label, is_primary }

# Update
PUT /api/accounts/:id/addresses/:addressId   # or /phones/:phoneId, /emails/:emailId
Body: { address, label, is_primary }

# Delete
DELETE /api/accounts/:id/addresses/:addressId
```

**Note:** All endpoints except `/api/auth/login` require `Authorization: Bearer <token>` header

---

## 🧪 Testing the API

### Using cURL
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account_name":"superuser","password":"superuser123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Get current user (requires token)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/accounts/me
```

### Using Postman
1. Import collection or manually create requests
2. Create POST request to `http://localhost:3001/api/auth/login`
3. Set body: `{"account_name":"superuser","password":"superuser123"}`
4. Copy `token` from response
5. Set Authorization header: `Bearer <token>` for other requests

---

## 🐛 Troubleshooting

### Backend won't start
- Ensure PostgreSQL is running
- Check `.env` file has correct credentials
- Verify port 3001 is available
- Check console for detailed error message

### Login fails
- Verify backend is running
- Ensure test accounts have passwords (run `npm run setup-test-accounts`)
- Check `.env` in frontend has correct API URL
- Look for errors in browser DevTools (F12)

### Frontend can't connect
- Verify backend is running on port 3001
- Check VITE_API_BASE_URL in `.env`
- Verify CORS is not being blocked
- Check browser console for error details

See **[QUICKSTART.md](./QUICKSTART.md)** for more troubleshooting.

---

## 🎯 Next Steps

### After Phase 3 Verification
When all verification checks pass, you're ready for **Phase 4: Product Management**

Phase 4 will implement:
- Material (product) CRUD
- Category management
- Brand management
- Material options
- Search, filtering, pagination

### Before Phase 4
- Keep backend and frontend running
- Database is already set up with material tables
- Reuse existing code patterns from Phase 3

---

## 📖 Key Files to Understand

### Understanding Authentication
- `mms-backend/src/utils/auth.ts` - Password hashing and JWT
- `mms-backend/src/middleware/auth.ts` - Token validation
- `mms-frontend/src/shared/contexts/auth.tsx` - Auth state management

### Understanding Error Handling
- `mms-backend/src/utils/errors.ts` - Error definitions
- `mms-backend/src/middleware/errorHandler.ts` - Error responses

### Understanding Database Access
- `mms-backend/src/repositories/account.ts` - SQL query patterns
- `mms-backend/src/services/account.ts` - Business logic layer

### Understanding API Communication
- `mms-frontend/src/shared/api/client.ts` - HTTP client
- `mms-frontend/src/pages/Login.tsx` - Login implementation

---

## 💡 Tips & Tricks

### Dev Tips
- Frontend hot reloads on file save (Vite)
- Backend reloads on file save (ts-node ESM)
- Use `console.log()` for debugging
- Use browser DevTools (F12) for frontend debugging

### Database Tips
- Use PostgreSQL client (psql) to inspect data
- Check `account` table for users
- Check `account_role` for role assignments
- Use `is_deleted=false` in WHERE clauses (soft deletes)

### API Tips
- All timestamps are in UTC (TIMESTAMPTZ)
- Token expires in 24 hours (configurable in .env)
- Use limit/offset for pagination
- Always include Authentication header for protected endpoints

---

## 📞 Support

### Error Messages
- Check terminal/console output first
- Look at API response in browser Network tab
- Review error type and message for hints

### Common Issues
- **401 Unauthorized** - Missing or invalid token
- **404 Not Found** - Endpoint or resource doesn't exist
- **500 Internal Server** - Server error, check backend console

### Getting Help
1. Check error message carefully
2. Review relevant section in QUICKSTART.md
3. Check PHASE3_VERIFICATION.md for step-by-step
4. Review relevant source code
5. Check browser/terminal console for detailed errors

---

## ✅ Verification Checklist

Quick check that everything is working:
- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Can access http://localhost:5173 in browser
- [ ] Login page displays
- [ ] Can login with superuser/superuser123
- [ ] Dashboard displays after login
- [ ] Can see username in top right
- [ ] Can navigate between menu items
- [ ] Logout works
- [ ] Token persists on page refresh

See **[PHASE3_VERIFICATION.md](./PHASE3_VERIFICATION.md)** for complete checklist.

---

## 📝 Documentation Files Summary

| File | Purpose | When to Read |
|------|---------|--------------|
| QUICKSTART.md | Complete setup guide | First time setup |
| PHASE3_IMPLEMENTATION.md | What was built | Understand architecture |
| PHASE3_VERIFICATION.md | Verify it works | After setup |
| mms-backend/SETUP.md | Backend details | Backend development |
| mms-frontend/SETUP.md | Frontend details | Frontend development |
| docs/ERD.md | Database schema | Database understanding |
| docs/MMS_workflow.md | Process flows | Business logic understanding |

---

**🎉 You're all set! Start with [QUICKSTART.md](./QUICKSTART.md)**
