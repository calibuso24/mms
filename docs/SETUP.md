# MMS — Setup Guide

## Prerequisites

- Node.js 16+
- PostgreSQL (running locally)
- npm

---

## 1. Database Setup

```bash
cd database

# Linux/Mac
./deploy.sh

# Windows
deploy.bat
```

`deploy.sh` will:
1. Create the `mms` database
2. Run all migration files in order (`000_` → `999_`)
3. Run all seed files

**Default connection:** `localhost:5432`, user `postgres`, password `postgres`

---

## 2. Backend Setup

```bash
cd mms-backend

# Copy environment template
cp .env.example .env

# Edit .env if your DB credentials differ from defaults

# Install dependencies
npm install

# (Optional) Hash and insert test account passwords
npm run setup-test-accounts

# Start development server (hot reload)
npm run dev
```

Backend runs on `http://localhost:3001`.

### Backend `.env` defaults
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=mms
JWT_SECRET=your_jwt_secret_key_change_this
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

> **Production:** Change `JWT_SECRET` to a strong random string.

---

## 3. Frontend Setup

```bash
cd mms-frontend

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## 4. Test Credentials

| Username | Password |
|---|---|
| `superuser` | `superuser123` |
| `auditor` | *(run `npm run setup-test-accounts` to set)* |

---

## 5. Build for Production

### Backend
```bash
cd mms-backend
npm run build       # Compiles TypeScript → dist/
npm start           # Runs dist/index.js
```

### Frontend
```bash
cd mms-frontend
npm run build       # Outputs to dist/
npm run preview     # Preview the production build
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED` on backend start | PostgreSQL is not running — start it first |
| Login returns 401 | Run `npm run setup-test-accounts` to set test passwords |
| CORS error in browser | Check `CORS_ORIGIN` in backend `.env` matches frontend URL |
| `relation "xxx" does not exist` | Re-run `deploy.sh` — migrations may not have run fully |
| Frontend shows blank page | Check browser console; ensure backend is running on port 3001 |
