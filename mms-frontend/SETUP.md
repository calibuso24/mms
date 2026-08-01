# MMS Frontend Setup

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install and Run](#install-and-run)
3. [Environment](#environment)
4. [Implemented Pages](#implemented-pages)
5. [Routing and Navigation Behavior](#routing-and-navigation-behavior)
6. [State and API Layers](#state-and-api-layers)
7. [Seeded Accounts for Testing](#seeded-accounts-for-testing)
8. [Revision History](#revision-history)

## Prerequisites

- Node.js 16+
- npm
- Backend API running

## Install and Run

```bash
cp .env.example .env
npm install
npm run dev
```

Default URL: http://localhost:5173

Production build:

```bash
npm run build
npm run preview
```

## Environment

Required variable:

- VITE_API_BASE_URL=http://localhost:3001/api

## Implemented Pages

Current pages under src/pages:

- Login
- Dashboard (placeholder KPIs)
- Materials (product management)
- MaterialControl
- MaterialRequest
- PurchaseOrder
- DeliveryAdvice
- SupplierDelivery
- StockTransfer
- MaterialAdjustment
- ManageUsers
- ManageRoles
- PartyManagement (Project + Supplier modes)
- SystemSettings
- Profile
- ReportRunner

## Routing and Navigation Behavior

Core route behavior is centralized in App.tsx:

- Public route: /login
- Protected shell: /app/*
- /app/dashboard -> Dashboard placeholder
- /app/profile -> Profile page
- /app/product-management -> Materials page
- /app/material-control -> MaterialControl page
- /app/material-request -> MaterialRequest page
- /app/purchase-order -> PurchaseOrder page
- /app/delivery-advice -> DeliveryAdvice page
- /app/supplier-delivery -> SupplierDelivery page
- /app/stock-transfer -> StockTransfer page
- /app/material-adjustment -> MaterialAdjustment page
- /app/manage-users -> ManageUsers page
- /app/manage-roles -> ManageRoles page
- /app/project-management -> ProjectManagement page
- /app/supplier-management -> SupplierManagement page
- /app/system-settings -> SystemSettings page
- /reports/<code> -> ReportRunner page

If a navigation route is present but not mapped to a dedicated page component, frontend shows "This page is under development."

## State and API Layers

Key frontend layers:

- shared/api/client.ts
  - ApiClient (GET/POST/PUT/DELETE)
  - domain APIs for auth, account, product, party, roles, navigation, reports, system settings
- shared/contexts/auth.tsx
  - token persistence in localStorage
  - account restore through /accounts/me
- shared/contexts/navigation.tsx
  - loads MAIN navigation tree
  - loads report groups from report catalog sidebar endpoint
  - tracks current context and expanded group state

## Seeded Accounts for Testing

Database seed includes:

- superuser
- auditor

If login fails due to password state, run backend helper:

```bash
cd ../mms-backend
npm run setup-test-accounts
```

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Updated frontend setup, route behavior, implemented page list, and account testing notes to match current code. |
