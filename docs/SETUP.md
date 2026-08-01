# MMS - Setup Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Deployment](#database-deployment)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Reporting Service Setup](#reporting-service-setup)
6. [Run All Services Together](#run-all-services-together)
7. [Environment Variables](#environment-variables)
8. [Verification Checklist](#verification-checklist)
9. [Troubleshooting](#troubleshooting)
10. [Revision History](#revision-history)

## Prerequisites

- Node.js 16+
- npm
- PostgreSQL server and psql client
- Java 17+
- Maven 3.9+

## Database Deployment

From repository root:

```bash
cd database

# Linux/macOS
./deploy.sh

# Windows
deploy.bat
```

What deployment scripts do:

1. Validate PostgreSQL connectivity.
2. Create database if missing.
3. Apply migrations in sorted order.
4. Apply seeds in sorted order.
5. Apply views and functions.

Default DB values used by backend and scripts:

- host: localhost
- port: 5432
- database: mms
- user: postgres

## Backend Setup

```bash
cd mms-backend
cp .env.example .env
npm install
```

The current backend implementation includes authentication, role-based access, product master data, project/supplier management, and the procurement/inventory workflow modules for material control, material requests, purchase orders, delivery advice, supplier delivery, stock transfer, and material adjustment.

Optional helper for test account passwords:

```bash
npm run setup-test-accounts
```

Run backend:

```bash
npm run dev
```

Backend default URL: http://localhost:3001

## Comprehensive Workflow Seeding

After base database deployment, you can generate large, deterministic, construction-focused seed data for product, party, procurement, and inventory workflows:

```bash
# From repository root
npm run seed:mms
```

This seeding command:

1. Uses a fixed default random seed for deterministic output.
2. Supports configurable record counts per module.
3. Preserves schema constraints and workflow links across:
	Product -> Material Control -> Material Request -> (Stock Transfer or Purchase Order) -> Delivery Advice -> Supplier Delivery -> Material Adjustment.
4. Is idempotent for generated seed records (safe to rerun).

Configuration can be provided as environment variables or CLI flags.

Examples:

```bash
# Environment variable configuration
MMS_SEED_VALUE=20260801 MMS_SEED_PRODUCTS=300 MMS_SEED_MATERIAL_REQUESTS=400 npm run seed:mms

# CLI override configuration
npm run seed:mms -- --seed=20260801 --projects=50 --suppliers=40 --purchaseOrders=220

# Dry run (executes then rolls back)
npm run seed:mms -- --dry-run
```

## Frontend Setup

```bash
cd mms-frontend
cp .env.example .env
npm install
npm run dev
```

Frontend default URL: http://localhost:5173

## Reporting Service Setup

```bash
cd reporting-service
mvn clean package
mvn exec:java
```

Reporting service default URL: http://localhost:8085

Important directories:

- JRXML templates root: reporting-service/reports
- Current committed template path: reporting-service/reports/ProductList/ProductList.jrxml

## Run All Services Together

From repository root:

```bash
npm install
npm run dev
```

On Unix-like systems, the same workflow is also available via:

```bash
./dev.sh
```

This runs:

- backend dev server
- frontend dev server
- reporting-service

## Environment Variables

### Backend (.env)

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
- REPORT_SERVICE_URL (optional)
- REPORT_SERVICE_BASE_URL (optional)
- REPORT_SERVICE_RENDER_PATH (optional)
- REPORT_SERVICE_TIMEOUT_MS (optional)

### Frontend (.env)

- VITE_API_BASE_URL

### Reporting-service (environment)

- REPORT_SERVICE_PORT
- REPORTS_BASE_DIR
- REPORT_DB_URL or DB_URL
- REPORT_DB_HOST / REPORT_DB_PORT / REPORT_DB_NAME
- REPORT_DB_USER / REPORT_DB_PASSWORD

## Verification Checklist

1. GET http://localhost:3001/health returns status ok.
2. GET http://localhost:8085/health returns status ok.
3. Login page loads in frontend.
4. Login works with seeded account after setting passwords.
5. Sidebar loads MAIN navigation and report groups.
6. Procurement and inventory pages such as Material Request, Purchase Order, Supplier Delivery, and Stock Transfer are reachable from the main navigation.

## Troubleshooting

| Problem | Fix |
|---|---|
| Backend cannot connect to DB | Verify DB credentials in mms-backend/.env and ensure PostgreSQL service is running |
| Reporting endpoint errors during report generation | Ensure reporting-service is running and backend REPORT_SERVICE_* values point to it |
| Report generation says template not configured/not found | Verify report_catalog jrxml_file values and presence of JRXML files under reporting-service/reports |
| Permission denied on pages | Confirm role assignments and required permissions in role_permission |
| Empty navigation for user | Confirm account has roles and corresponding VIEW permissions |

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Updated setup to include reporting-service requirements, root dev workflow, current environment variables, and implementation-specific troubleshooting. |
