# MMS (Materials Management System)

MMS is an enterprise materials management platform for product master data, party management, user and role administration, database-driven navigation, reporting, and system settings.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Repository Structure](#repository-structure)
3. [Implemented Modules](#implemented-modules)
4. [Quick Start](#quick-start)
5. [Documentation Index](#documentation-index)
6. [Revision History](#revision-history)

## Current Architecture

MMS currently runs as three services:

- Frontend: React + TypeScript + Vite + Material UI
- Backend API: Express + TypeScript + PostgreSQL
- Reporting Service: Java 17 + Javalin + JasperReports

High-level request flow:

1. User authenticates in frontend using JWT.
2. Frontend calls backend APIs under /api.
3. Backend enforces auth and permission checks.
4. Backend reads/writes PostgreSQL data.
5. For report generation, backend calls reporting-service /reports/render.

## Repository Structure

```text
mms/
|- database/             # SQL migrations, seeds, views, functions, import scripts
|- docs/                 # Project, database, workflow, dev, and setup documentation
|- mms-backend/          # Express TypeScript backend
|- mms-frontend/         # React TypeScript frontend
|- reporting-service/    # Java Jasper rendering service
|- tests/                # Test assets and scenarios
```

## Implemented Modules

Backend API modules currently exposed:

- Authentication
- Account and profile management
- User management (accounts, roles assignment, contact info)
- Role management
- Product management (categories, sub-categories, brands, UOM, materials, lookups)
- Project management
- Supplier management
- Navigation (MAIN and REPORTS contexts)
- Report catalog and generation
- System settings

Frontend pages currently implemented:

- Dashboard (KPI placeholders)
- Product Management
- Manage Users
- Manage Roles
- Project Management
- Supplier Management
- System Settings
- Profile
- Report Runner (/reports/:reportCode)

Navigation entries seeded but still showing "under development" in frontend are not documented as complete features in this revision.

## Quick Start

1. Read [docs/SETUP.md](docs/SETUP.md).
2. Deploy database using [database/deploy.bat](database/deploy.bat) or [database/deploy.sh](database/deploy.sh).
3. Install dependencies:
	- Root: npm install
	- Backend: npm --prefix mms-backend install
	- Frontend: npm --prefix mms-frontend install
4. Run all services from root:
	- npm run dev
	- or, on Unix-like systems, ./dev.sh

Default local endpoints:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Reporting service: http://localhost:8085

## Documentation Index

- [docs/01_PROJECT_CONTEXT.md](docs/01_PROJECT_CONTEXT.md)
- [docs/02_DATABASE_GUIDE.md](docs/02_DATABASE_GUIDE.md)
- [docs/03_BUSINESS_FLOW.md](docs/03_BUSINESS_FLOW.md)
- [docs/04_DEVELOPMENT_GUIDE.md](docs/04_DEVELOPMENT_GUIDE.md)
- [docs/SETUP.md](docs/SETUP.md)
- [mms-backend/SETUP.md](mms-backend/SETUP.md)
- [mms-frontend/SETUP.md](mms-frontend/SETUP.md)

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Replaced placeholder README with current architecture, implemented module scope, quick start, and documentation index. |