# MMS — Project Overview

## Purpose

**MMS (Materials Management System)** is a full-stack web application for managing material requests, purchasing, inventory movement, job orders, site purchases, and inventory audits for construction or project-based organizations.

---

## Technology Stack

### Backend
| Item | Detail |
|---|---|
| Runtime | Node.js 16+ |
| Framework | Express.js 4.x |
| Language | TypeScript (ESM, `"type": "module"`) |
| Database client | `pg` (node-postgres) 8.x |
| Authentication | JWT (`jsonwebtoken` 9.x) + bcrypt (`bcryptjs` 2.x) |
| Validation | `joi` 17.x |
| Dev server | `tsx watch` |
| Build | `tsc` → `dist/` |

### Frontend
| Item | Detail |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| UI library | Material-UI (MUI) v5 + MUI X DataGrid v6 |
| Routing | React Router v6 |
| HTTP client | Custom `ApiClient` wrapper |

### Database
| Item | Detail |
|---|---|
| Engine | PostgreSQL |
| Name | `mms` |
| Default user | `postgres` / `postgres` |
| Schema | 50+ tables across 8 functional modules |

---

## Ports

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:3001` |
| Database | `localhost:5432` |
| Health check | `http://localhost:3001/health` |

---

## Project Folder Structure

```
mms/
├── database/
│   ├── migrations/        # 50+ ordered SQL migration files (000_ to 999_)
│   ├── seeds/             # Seed data files (010_ to 051_)
│   ├── views/             # SQL view definitions
│   ├── functions/         # PostgreSQL stored functions
│   ├── rollback/          # Rollback scripts for specific migrations
│   ├── import/            # One-time import scripts
│   ├── deploy.sh          # Linux deployment script (creates DB, runs migrations + seeds)
│   └── deploy.bat         # Windows deployment script
│
├── mms-backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry point
│   │   ├── config/               # env.ts, database.ts
│   │   ├── controllers/          # HTTP request handlers
│   │   ├── services/             # Business logic
│   │   ├── repositories/         # All direct DB queries (pg pool)
│   │   ├── routes/               # Express router definitions
│   │   ├── middleware/           # auth.ts, errorHandler.ts
│   │   ├── utils/                # auth.ts (JWT/bcrypt), errors.ts
│   │   ├── shared/               # Shared types/interfaces
│   │   └── modules/
│   │       ├── manage_users/     # DTOs, ViewModels, Entities, Repository interfaces
│   │       └── product_management/
│   ├── package.json
│   └── tsconfig.json
│
├── mms-frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Root component + routing
│   │   ├── pages/
│   │   │   ├── Login.tsx         # Login page
│   │   │   ├── Materials.tsx     # Material management page
│   │   │   └── ManageUsers.tsx   # User management page
│   │   └── shared/
│   │       ├── contexts/         # auth.tsx, navigation.tsx
│   │       └── api/              # client.ts (ApiClient + domain API objects)
│   ├── package.json
│   └── vite.config.ts
│
└── docs/                  # This folder — project documentation
```

---

## NPM Scripts

### Backend (`mms-backend/`)
| Script | Command | Purpose |
|---|---|---|
| `dev` | `tsx watch src/index.ts` | Hot-reload dev server |
| `build` | `tsc` | Compile TS → `dist/` |
| `start` | `node dist/index.js` | Production start |
| `lint` | `eslint src --ext .ts` | Lint source |
| `setup-test-accounts` | `npm run build && node setup-test-accounts.js` | Hash & insert test account passwords |

### Frontend (`mms-frontend/`)
| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Hot-reload dev server |
| `build` | `vite build` | Production build |
| `preview` | `vite preview` | Preview production build |

---

## Environment Variables

### Backend (`.env` in `mms-backend/`)
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

---

## Naming Conventions

| Context | Convention |
|---|---|
| Database tables & columns | `snake_case` |
| TypeScript files | `camelCase.ts` |
| Migration files | `NNN_table_name.sql` (zero-padded number prefix) |
| Seed files | `NNN_description_seed.sql` |
| All tables | Have audit fields: `log_date_created`, `log_date_updated`, `log_created_by_account_id`, `log_updated_by_account_id` |
| Soft deletes | `is_deleted BOOLEAN DEFAULT FALSE` column where applicable |
| Status/type enums | Stored in `look_up` table, referenced by `look_up_id` FK |
| Permission module names | Match navigation `permission_code` labels exactly |
