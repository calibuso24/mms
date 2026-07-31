# MMS - Business Flow and Navigation

## Table of Contents

1. [Current Workflow Coverage](#current-workflow-coverage)
2. [Implemented End-to-End Flows](#implemented-end-to-end-flows)
3. [Seeded Data Flows Not Yet Fully Exposed in UI/API](#seeded-data-flows-not-yet-fully-exposed-in-uiapi)
4. [Navigation System](#navigation-system)
5. [Report Navigation and Report Catalog](#report-navigation-and-report-catalog)
6. [Data Integrity Rules](#data-integrity-rules)
7. [Cross References](#cross-references)
8. [Revision History](#revision-history)

## Current Workflow Coverage

The repository contains broad procurement and inventory schema support, but current frontend/backend implementation focuses on these active operational areas:

- Product Management
- Project Management
- Supplier Management
- Manage Users
- Manage Roles
- System Settings
- Report generation through Report Runner

## Implemented End-to-End Flows

### 1. Authentication and session flow

1. User submits credentials to /api/auth/login.
2. Backend validates account and returns JWT + current account details.
3. Frontend stores authToken in localStorage.
4. AuthProvider restores account state using /api/accounts/me on refresh.

### 2. User and role administration flow

1. Admin opens Manage Users or Manage Roles.
2. Backend enforces permission checks:
  - User Management (VIEW/CREATE/UPDATE/DELETE)
  - Manage Roles (VIEW/CREATE/UPDATE/DELETE)
3. CRUD operations update account, role, role_permission, and related contact tables.

### 3. Product management flow

1. User manages categories, brands, UOM, sub-categories, and materials.
2. Material form supports:
  - base material fields
  - optional material specification payload
  - optional material option payload
3. List filtering uses search + lookup-based filters.

### 4. Project and supplier management flow

1. Project and Supplier pages use party records keyed by party_type lookup.
2. Shared contact information is handled through nested addresses, phones, emails, and related contacts.
3. Supplier flow includes normalized weekly business hours in supplier_business_hours.

### 5. System settings flow

1. Settings categories are loaded from system_setting_category.
2. Category settings are lazy-loaded from system_setting.
3. Permission split:
  - VIEW: read categories/settings
  - EDIT: create/delete definitions
  - SAVE: persist value updates
  - RESET: reset category to defaults

### 6. Report generation flow

1. Sidebar and report pages read report definitions and parameters.
2. User chooses an enabled format and enters required parameters.
3. Backend validates required parameters and format support.
4. Backend calls reporting-service for rendering.
5. Generated file is downloaded and report_history is updated (RUNNING to SUCCESS/FAILED).

## Seeded Data Flows Not Yet Fully Exposed in UI/API

Navigation and schema include additional business areas that currently route to the generic "under development" page in frontend:

- Coordinating transactions (material request/control variants)
- Purchasing transactions (requisition, PO, delivery advice/receipt, RTS)
- Inventory transactions (supplier delivery, stock transfer, job order delivery, physical count, material adjustment)
- Audit Logs page route

These are treated as planned/seeded flows in this revision, not as completed interactive modules.

## Navigation System

Navigation is database-driven through table navigation and loaded by backend endpoints:

- GET /api/navigation/main
- GET /api/navigation/reports
- GET /api/navigation/context/:context
- GET /api/navigation/report-catalog-sidebar

Key characteristics:

- Contexts: MAIN and REPORTS
- Tree hierarchy through parent_navigation_id
- SQL-level permission filtering by permission_code
- Visibility filtering through is_visible and is_deleted

Frontend behavior:

- MAIN sidebar uses navigation tree from /navigation/main
- REPORTS sidebar uses grouped report catalog from /navigation/report-catalog-sidebar
- Expanded menu state is persisted in localStorage

## Report Navigation and Report Catalog

There are two report navigation sources:

1. REPORTS rows seeded in navigation table (legacy slug routes)
2. Report catalog grouping endpoint that builds /reports/<report_code> routes from report_catalog

Current report runner behavior in App:

- Any route starting with /reports/ is treated as report code route.
- The segment after /reports/ is passed to backend report endpoints.

Practical implication:

- report-catalog-driven routes such as /reports/inv001 align with backend report code lookups.

## Data Integrity Rules

| Rule | Current enforcement |
|---|---|
| Auth required on business routes | authMiddleware |
| Permission checks by module/code | requirePermission middleware |
| Lookup-backed status/type values | FK to look_up |
| Soft deletes for mutable records | is_deleted flags |
| Supplier schedule day/time validation | supplier_business_hours constraints |
| Report access by per-report permission | Report Catalog + REPORT_<code> |
| Report execution state tracking | report_history + REPORT_STATUS lookups |

## Cross References

- [docs/01_PROJECT_CONTEXT.md](01_PROJECT_CONTEXT.md)
- [docs/02_DATABASE_GUIDE.md](02_DATABASE_GUIDE.md)
- [docs/04_DEVELOPMENT_GUIDE.md](04_DEVELOPMENT_GUIDE.md)
- [database/seeds/049_navigation_seed.sql](../database/seeds/049_navigation_seed.sql)

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Reworked workflow documentation to distinguish implemented modules from seeded placeholders, and aligned navigation/report flow details with actual frontend and backend behavior. |
