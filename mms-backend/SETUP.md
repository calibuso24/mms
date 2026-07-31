# MMS Backend Setup

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install and Run](#install-and-run)
3. [Environment Variables](#environment-variables)
4. [Mounted Route Groups](#mounted-route-groups)
5. [Permission Modules in Use](#permission-modules-in-use)
6. [Reporting Integration Settings](#reporting-integration-settings)
7. [Seeded Test Accounts](#seeded-test-accounts)
8. [Revision History](#revision-history)

## Prerequisites

- Node.js 16+
- npm
- PostgreSQL 12+

## Install and Run

1. Copy environment file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Deploy database from repository root:

```bash
cd ../database
./deploy.sh
# or on Windows
deploy.bat
```

4. Start backend in watch mode:

```bash
cd ../mms-backend
npm run dev
```

Backend default URL: http://localhost:3001

Health check:

```bash
curl http://localhost:3001/health
```

## Environment Variables

Variables from .env.example:

- PORT
- NODE_ENV
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- SESSION_SECRET
- JWT_EXPIRES_IN
- CORS_ORIGIN

Additional backend variables supported by config/env.ts:

- REPORT_SERVICE_URL
- REPORT_SERVICE_BASE_URL
- REPORT_SERVICE_RENDER_PATH
- REPORT_SERVICE_TIMEOUT_MS

## Mounted Route Groups

Routes mounted in src/index.ts:

- /api/auth
- /api/accounts
- /api/roles
- /api/navigation
- /api/reports
- /api/system-settings
- /api (product routes)
- /api (party routes)

## Permission Modules in Use

Current requirePermission checks rely on these module names:

- User Management
- Manage Roles
- Project Management
- Supplier
- System Settings
- Report Catalog (REPORT_<code>)

These names must match permission.module_name values in the database.

## Reporting Integration Settings

Backend report service builds render endpoint in this order:

1. report_catalog.report_service_endpoint
2. REPORT_SERVICE_URL
3. REPORT_SERVICE_BASE_URL + REPORT_SERVICE_RENDER_PATH

Default computed endpoint if none overridden: http://localhost:8085/reports/render

## Seeded Test Accounts

Seed file 050_account_seed.sql inserts:

- superuser
- auditor

To ensure passwords are set for login testing:

```bash
npm run setup-test-accounts
```

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Corrected route inventory, permission modules, report integration config, and seeded test account details. |
