# MMS - Development Guide

## Table of Contents

1. [Backend API Base and Security](#backend-api-base-and-security)
2. [Current API Surface](#current-api-surface)
3. [Authentication and RBAC](#authentication-and-rbac)
4. [Reporting Integration](#reporting-integration)
5. [Frontend Architecture Notes](#frontend-architecture-notes)
6. [Backend Architecture Notes](#backend-architecture-notes)
7. [Error Handling Contract](#error-handling-contract)
8. [Development Workflow](#development-workflow)
9. [Cross References](#cross-references)
10. [Revision History](#revision-history)

## Backend API Base and Security

- API base URL: http://localhost:3001/api
- Health endpoint: GET /health

Security model:

- All routes except POST /api/auth/login require Bearer token.
- Additional permission checks use requirePermission(moduleName, permissionCode).

## Current API Surface

### Auth routes

| Method | Path | Notes |
|---|---|---|
| POST | /api/auth/login | Public login |
| POST | /api/auth/set-password | Auth required; accepts password or new_password payload |

### Account and profile routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/accounts/me | Authenticated |
| PUT | /api/accounts/me | Authenticated |
| GET | /api/accounts/meta/roles | User Management VIEW |
| GET | /api/accounts | User Management VIEW |
| GET | /api/accounts/:id | User Management VIEW |
| GET | /api/accounts/:id/permissions | User Management VIEW |
| POST | /api/accounts | User Management CREATE |
| PUT | /api/accounts/:id | User Management UPDATE |
| DELETE | /api/accounts/:id | User Management DELETE |
| POST | /api/accounts/:id/roles | User Management UPDATE |
| DELETE | /api/accounts/:id/roles/:roleCode | User Management UPDATE |
| POST | /api/accounts/:id/addresses | User Management UPDATE |
| PUT | /api/accounts/:id/addresses/:addressId | User Management UPDATE |
| DELETE | /api/accounts/:id/addresses/:addressId | User Management UPDATE |
| POST | /api/accounts/:id/phones | User Management UPDATE |
| PUT | /api/accounts/:id/phones/:phoneId | User Management UPDATE |
| DELETE | /api/accounts/:id/phones/:phoneId | User Management UPDATE |
| POST | /api/accounts/:id/emails | User Management UPDATE |
| PUT | /api/accounts/:id/emails/:emailId | User Management UPDATE |
| DELETE | /api/accounts/:id/emails/:emailId | User Management UPDATE |

### Role management routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/roles/meta/permissions | Manage Roles VIEW |
| GET | /api/roles | Manage Roles VIEW |
| GET | /api/roles/:id | Manage Roles VIEW |
| POST | /api/roles | Manage Roles CREATE |
| PUT | /api/roles/:id | Manage Roles UPDATE |
| DELETE | /api/roles/:id | Manage Roles DELETE |

### Product routes

| Method | Path |
|---|---|
| GET/POST/PUT/DELETE | /api/categories and /api/categories/:id |
| GET/POST/PUT/DELETE | /api/brands and /api/brands/:id |
| GET/POST/PUT/DELETE | /api/uom and /api/uom/:id |
| GET/POST/PUT/DELETE | /api/subcategories and /api/subcategories/:id |
| GET | /api/lookups/:type |
| GET | /api/lookups/:type/:id |
| GET/POST/PUT/DELETE | /api/materials and /api/materials/:id |

### Material Control routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/material-controls | Material Control VIEW |
| GET | /api/material-controls/:id | Material Control VIEW |
| POST | /api/material-controls | Material Control CREATE |
| PUT | /api/material-controls/:id | Material Control UPDATE |
| DELETE | /api/material-controls/:id | Material Control DELETE |

### Material Control Item routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/material-control-items | Material Control VIEW |
| GET | /api/material-control-items/:id | Material Control VIEW |
| POST | /api/material-control-items | Material Control CREATE |
| PUT | /api/material-control-items/:id | Material Control UPDATE |
| DELETE | /api/material-control-items/:id | Material Control DELETE |
| GET | /api/material-control-items/import/template | Material Control VIEW |
| POST | /api/material-control-items/import/preview | Material Control CREATE |
| POST | /api/material-control-items/import/import | Material Control CREATE |

Material control item import workflow:

- Upload an XLSX or CSV file from the Material Control page.
- The preview step validates required columns, positive quantities, and duplicate rows.
- Existing materials are matched by code, description, brand, or unit of measure.
- Missing materials are flagged for review before import, and only valid rows are inserted transactionally.

### Material Request routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/material-requests | Material Request VIEW |
| GET | /api/material-requests/:id | Material Request VIEW |
| POST | /api/material-requests | Material Request CREATE |
| PUT | /api/material-requests/:id | Material Request UPDATE |
| DELETE | /api/material-requests/:id | Material Request DELETE |
| POST | /api/material-requests/:id/submit | Material Request UPDATE |
| POST | /api/material-requests/:id/approve | Material Request APPROVE |
| POST | /api/material-requests/:id/reject | Material Request APPROVE |
| POST | /api/material-requests/:id/cancel | Material Request UPDATE |
| POST | /api/material-requests/:id/close | Material Request UPDATE |

### Purchase Order routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/purchase-orders | Purchase Order VIEW |
| GET | /api/purchase-orders/:id | Purchase Order VIEW |
| POST | /api/purchase-orders | Purchase Order CREATE |
| PUT | /api/purchase-orders/:id | Purchase Order UPDATE |
| DELETE | /api/purchase-orders/:id | Purchase Order DELETE |
| POST | /api/purchase-orders/:id/approve | Purchase Order APPROVE |
| POST | /api/purchase-orders/:id/cancel | Purchase Order APPROVE |

### Supplier Delivery routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/supplier-deliveries | Supplier Delivery VIEW |
| GET | /api/supplier-deliveries/:id | Supplier Delivery VIEW |
| POST | /api/supplier-deliveries | Supplier Delivery CREATE |
| PUT | /api/supplier-deliveries/:id | Supplier Delivery UPDATE |
| DELETE | /api/supplier-deliveries/:id | Supplier Delivery DELETE |
| POST | /api/supplier-deliveries/:id/post | Supplier Delivery APPROVE |
| POST | /api/supplier-deliveries/:id/cancel | Supplier Delivery APPROVE |

### Delivery Advice routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/delivery-advices | Delivery Advice VIEW |
| GET | /api/delivery-advices/:id | Delivery Advice VIEW |
| POST | /api/delivery-advices | Delivery Advice CREATE |
| PUT | /api/delivery-advices/:id | Delivery Advice UPDATE |
| DELETE | /api/delivery-advices/:id | Delivery Advice DELETE |
| POST | /api/delivery-advices/:id/submit | Delivery Advice UPDATE |
| POST | /api/delivery-advices/:id/complete | Delivery Advice APPROVE |
| POST | /api/delivery-advices/:id/cancel | Delivery Advice UPDATE |

### Stock Transfer routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/stock-transfers | Stock Transfer VIEW |
| GET | /api/stock-transfers/:id | Stock Transfer VIEW |
| POST | /api/stock-transfers | Stock Transfer CREATE |
| PUT | /api/stock-transfers/:id | Stock Transfer UPDATE |
| DELETE | /api/stock-transfers/:id | Stock Transfer DELETE |
| POST | /api/stock-transfers/:id/submit | Stock Transfer UPDATE |
| POST | /api/stock-transfers/:id/approve | Stock Transfer APPROVE |
| POST | /api/stock-transfers/:id/cancel | Stock Transfer APPROVE |

### Material Adjustment routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/material-adjustments | Inventory Adjustment VIEW |
| GET | /api/material-adjustments/:id | Inventory Adjustment VIEW |
| POST | /api/material-adjustments | Inventory Adjustment CREATE |
| PUT | /api/material-adjustments/:id | Inventory Adjustment UPDATE |
| DELETE | /api/material-adjustments/:id | Inventory Adjustment DELETE |
| POST | /api/material-adjustments/:id/approve | Inventory Adjustment APPROVE |
| POST | /api/material-adjustments/:id/reject | Inventory Adjustment APPROVE |
| POST | /api/material-adjustments/:id/complete | Inventory Adjustment APPROVE |

Material list filters:

- search
- category_id
- sub_category_id
- status_id
- uom_id
- brand_id
- limit
- offset

### Party routes

| Method | Path | Permission |
|---|---|---|
| GET/POST | /api/projects | Project Management VIEW/CREATE |
| GET/PUT/DELETE | /api/projects/:id | Project Management VIEW/UPDATE/DELETE |
| GET/POST | /api/suppliers | Supplier VIEW/CREATE |
| GET/PUT/DELETE | /api/suppliers/:id | Supplier VIEW/UPDATE/DELETE |

### Navigation routes

| Method | Path |
|---|---|
| GET | /api/navigation/main |
| GET | /api/navigation/reports |
| GET | /api/navigation/context/:context |
| GET | /api/navigation/report-catalog-sidebar |

### Dashboard routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/dashboard/types | Dashboard VIEW |
| GET | /api/dashboard/:dashboardType/widgets | Dashboard VIEW |
| GET | /api/dashboard/:dashboardType/widgets/:widgetKey | Dashboard VIEW |

### System settings routes

| Method | Path | Permission |
|---|---|---|
| GET | /api/system-settings/categories | System Settings VIEW |
| GET | /api/system-settings/categories/:categoryCode | System Settings VIEW |
| GET | /api/system-settings/categories/:categoryCode/settings | System Settings VIEW |
| POST | /api/system-settings/categories | System Settings EDIT |
| PUT | /api/system-settings/categories/:id | System Settings SAVE |
| DELETE | /api/system-settings/categories/:id | System Settings EDIT |
| POST | /api/system-settings/categories/:categoryCode/settings | System Settings EDIT |
| PUT | /api/system-settings/settings/:id | System Settings SAVE |
| DELETE | /api/system-settings/settings/:id | System Settings EDIT |
| PUT | /api/system-settings/categories/:categoryCode/settings | System Settings SAVE |
| POST | /api/system-settings/categories/:categoryCode/reset | System Settings RESET |

### Report routes

| Method | Path |
|---|---|
| GET | /api/reports |
| GET | /api/reports/:reportCode/parameters |
| POST | /api/reports/:reportCode/generate |

POST /generate response headers include report history metadata:

- X-Report-History-Id
- X-Report-Execution-Time-Ms

## Authentication and RBAC

Auth lifecycle:

1. Login issues JWT containing accountId.
2. authMiddleware validates token and sets req.accountId.
3. requirePermission checks module_name + permission_code through role joins.

Main permission modules currently enforced in code:

- User Management
- Manage Roles
- Project Management
- Supplier
- System Settings
- Report Catalog (REPORT_<report_code>)
- Supplier Delivery
- Delivery Advice
- Stock Transfer
- Inventory Adjustment

## Reporting Integration

Backend report service behavior:

- Reads report metadata from report_catalog.
- Validates required parameters from report_parameter.
- Validates requested export format against report row flags (pdf/xlsx/csv/docx).
- Resolves render endpoint from:
  - report_catalog.report_service_endpoint
  - REPORT_SERVICE_URL
  - REPORT_SERVICE_BASE_URL + REPORT_SERVICE_RENDER_PATH

Reporting-service behavior:

- Endpoint: POST /reports/render
- Health: GET /health
- Supports pdf, xlsx, docx export in Java service
- Uses inline data source only when request.data is populated; otherwise opens DB connection and lets JRXML SQL run

## Frontend Architecture Notes

Core layers in mms-frontend/src:

- shared/api/client.ts: HTTP client and domain APIs
- shared/contexts/auth.tsx: auth state and account restoration
- shared/contexts/navigation.tsx: menu/report navigation state
- pages/: functional page implementations

Current page routing behavior:

- /app/profile -> Profile page
- /app/... route matching via DynamicPage string matching
- /app/reports/<reportCode> -> ReportRunner
- /app/dashboard -> Department-aware, database-driven dashboard widgets
- Unknown menu routes show "under development"

## Backend Architecture Notes

Service chain:

Request -> Route -> Controller -> Service -> Repository -> PostgreSQL

Design principles observed in current code:

- Controllers parse request and enforce ID/body basics
- Services handle business rules and transactions
- Repositories keep SQL centralized
- Middleware centralizes auth and errors

## Error Handling Contract

Error response shape:

```json
{ "error": "<message>", "code": "<ERROR_CODE>" }
```

Common status classes:

- 400 validation errors
- 401 unauthorized
- 403 forbidden
- 404 not found
- 409 conflict
- 500 server/application errors

## Development Workflow

Recommended local workflow:

1. Deploy DB using database/deploy script.
2. Run npm install at root and per service as needed.
3. Start all services with npm run dev from repository root.
4. Validate backend with /health and reporting-service with /health.
5. Test auth flow and page permission gates with seeded accounts.

Backend test command:

```bash
cd mms-backend
npm run test
```

Dashboard seed note:

- `npm run seed:mms` also inserts synthetic dashboard telemetry in `audit_log` to populate activity, failed login, and system error widgets for local validation.

When changing RBAC/navigation:

1. Update SQL seed/migration for permissions and/or navigation rows.
2. Ensure module_name and permission_code exactly match requirePermission usage.
3. Validate sidebar visibility with different role accounts.

## Cross References

- [docs/01_PROJECT_CONTEXT.md](01_PROJECT_CONTEXT.md)
- [docs/02_DATABASE_GUIDE.md](02_DATABASE_GUIDE.md)
- [docs/03_BUSINESS_FLOW.md](03_BUSINESS_FLOW.md)
- [mms-backend/src/index.ts](../mms-backend/src/index.ts)

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Replaced outdated API/auth content with current route map, RBAC modules, reporting integration behavior, and implementation-accurate frontend/backend workflow notes. |
