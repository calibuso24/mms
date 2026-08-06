# MMS - Project Context

## Table of Contents

1. [Purpose and Scope](#purpose-and-scope)
2. [Current System Architecture](#current-system-architecture)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Implemented Functional Scope](#implemented-functional-scope)
6. [Runtime Endpoints](#runtime-endpoints)
7. [Build and Run Scripts](#build-and-run-scripts)
8. [Environment Configuration](#environment-configuration)
9. [Naming and Design Conventions](#naming-and-design-conventions)
10. [Related Documents](#related-documents)
11. [Revision History](#revision-history)

## Purpose and Scope

MMS (Materials Management System) is a multi-service application for enterprise operations. The current implementation prioritizes:

- Product master data management
- Party management for projects and suppliers
- User and role administration with RBAC
- Database-driven navigation
- Report catalog and report file generation
- Database-driven system settings management

Operational menu entries for procurement and inventory workflows are seeded in navigation, but several are still frontend placeholders.

## Current System Architecture

MMS runs as three cooperating services:

1. mms-frontend
2. mms-backend
3. reporting-service

Data flow:

1. Frontend authenticates with backend and stores JWT.
2. Backend enforces auth and permission checks on protected routes.
3. Backend persists business data in PostgreSQL.
4. Report requests from backend are proxied to reporting-service for Jasper rendering.

## Technology Stack

### Backend

| Item | Detail |
|---|---|
| Runtime | Node.js 16+ |
| Framework | Express 4 |
| Language | TypeScript (ESM) |
| Database | pg (node-postgres) |
| Auth | JWT + bcryptjs |
| Validation | joi |
| Dev runner | tsx watch |

### Frontend

| Item | Detail |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| UI | Material UI v5 + MUI X Data Grid |
| Router | React Router v6 |
| API layer | Custom ApiClient |

### Reporting Service

| Item | Detail |
|---|---|
| Runtime | Java 17 |
| HTTP Framework | Javalin |
| Reporting engine | JasperReports |
| DB driver | PostgreSQL JDBC |
| Build/run | Maven |

### Database

| Item | Detail |
|---|---|
| Engine | PostgreSQL |
| Default database | mms |
| Migration model | Ordered SQL files in database/migrations |

## Repository Structure

```text
mms/
|- database/
|  |- migrations/
|  |- seeds/
|  |- views/
|  |- functions/
|  |- import/
|  |- rollback/
|  |- deploy.bat
|  |- deploy.sh
|  \- drop_db.bat
|- docs/
|- mms-backend/
|  \- src/
|     |- config/
|     |- controllers/
|     |- middleware/
|     |- modules/
|     |- repositories/
|     |- routes/
|     |- services/
|     |- shared/
|     \- utils/
|- mms-frontend/
|  \- src/
|     |- modules/
|     |- pages/
|     \- shared/
|- reporting-service/
|  |- reports/
|  \- src/main/java/
\- tests/
```

## Implemented Functional Scope

### Backend route groups currently mounted

- /api/auth
- /api/accounts
- /api/roles
- /api/navigation
- /api/dashboard
- /api/reports
- /api/system-settings
- /api/categories, /api/brands, /api/uom, /api/subcategories, /api/lookups, /api/materials
- /api/materials/:materialId/options and /api/materials/:materialId/options/:optionId
- /api/material-controls
- /api/material-requests
- /api/purchase-orders
- /api/delivery-advices
- /api/supplier-deliveries
- /api/stock-transfers
- /api/material-adjustments
- /api/projects, /api/suppliers

### Frontend pages currently implemented

- Login
- Dashboard (database-driven departmental widgets)
- Product Management
- Manage Users
- Manage Roles
- Project Management
- Supplier Management
- System Settings
- My Profile
- Report Runner
- Material Control
- Material Request
- Purchase Order
- Delivery Advice
- Supplier Delivery
- Stock Transfer
- Material Adjustment

### Reporting integration

- Backend reads report metadata and parameters from report_catalog and report_parameter.
- Backend calls reporting-service endpoint (default /reports/render).
- reporting-service supports pdf, xlsx, and docx rendering.

## Runtime Endpoints

| Service | Default URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| Backend health | http://localhost:3001/health |
| Reporting service | http://localhost:8085 |
| Reporting health | http://localhost:8085/health |

## Build and Run Scripts

### Root scripts

| Script | Purpose |
|---|---|
| npm run dev | Starts backend, frontend, and reporting-service concurrently |
| npm run reporting | Runs reporting-service using Maven |
| npm run rebuild | Reinstalls Node dependencies and builds reporting-service |
| npm run build | Reinstalls backend/frontend dependencies |

### Backend scripts

| Script | Purpose |
|---|---|
| npm run dev | Start backend in watch mode |
| npm run build | Compile to dist |
| npm start | Run compiled backend |
| npm run setup-test-accounts | Build backend and set seed account passwords |

### Frontend scripts

| Script | Purpose |
|---|---|
| npm run dev | Start Vite dev server |
| npm run build | Build production assets |
| npm run preview | Preview production build |

## Environment Configuration

### Backend core variables

- PORT
- NODE_ENV
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- JWT_EXPIRES_IN
- CORS_ORIGIN

### Backend reporting variables (optional)

- REPORT_SERVICE_URL
- REPORT_SERVICE_BASE_URL (default http://localhost:8085)
- REPORT_SERVICE_RENDER_PATH (default /reports/render)
- REPORT_SERVICE_TIMEOUT_MS (default 120000)

### Frontend

- VITE_API_BASE_URL

### Reporting-service variables

- REPORT_SERVICE_PORT (default 8085)
- REPORTS_BASE_DIR (default current directory)
- REPORT_DB_URL or DB_URL
- REPORT_DB_HOST / REPORT_DB_PORT / REPORT_DB_NAME
- REPORT_DB_USER / REPORT_DB_PASSWORD

## Naming and Design Conventions

| Context | Convention |
|---|---|
| SQL object names | snake_case |
| TypeScript files | camelCase.ts |
| Migration files | NNN_description.sql |
| Seed files | NNN_description.sql |
| Soft delete | is_deleted flag where applicable |
| Lookup FKs | look_up_id naming pattern |
| Permission checks | module_name + permission_code pair |

## Related Documents

- [README.md](../README.md)
- [docs/02_DATABASE_GUIDE.md](02_DATABASE_GUIDE.md)
- [docs/03_BUSINESS_FLOW.md](03_BUSINESS_FLOW.md)
- [docs/04_DEVELOPMENT_GUIDE.md](04_DEVELOPMENT_GUIDE.md)
- [docs/SETUP.md](SETUP.md)

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Updated architecture, module scope, scripts, environment settings, and frontend/backend implementation coverage to match current codebase. |
