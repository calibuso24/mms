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
- Material Control
- Material Request
- Purchase Order
- Delivery Advice
- Supplier Delivery
- Stock Transfer
- Material Adjustment

Dashboard support now uses role-aware, database-driven widgets for Coordinating, Purchasing, Inventory, and Administrator perspectives.

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
  - material option master/detail definitions (option header + component materials)
3. Material option workflows support:
  - create/update/delete option headers
  - create/update/delete component rows under each option
  - validation for duplicate components, positive quantities, and parent-as-component prevention
4. List filtering uses search + lookup-based filters.

### 4. Project and supplier management flow

1. Project and Supplier pages use party records keyed by party_type lookup.
2. Shared contact information is handled through nested addresses, phones, emails, and related contacts.
3. Supplier flow includes normalized weekly business hours in supplier_business_hours.

### 5. Material control flow

1. Material Control records are created per project with a control code, budget, estimated cost, and workflow status.
2. Status transitions use lookup-driven values from material_control_status.
3. Line items are persisted through item-level endpoints and can be edited or removed independently without replacing the full item set.
4. Review metadata is recorded when the record reaches a terminal status.

### 6. Material request flow

1. Material requests are created per project and include one or more material_request_item rows.
2. Request numbers are generated automatically in MR-YYYY-000001 format.
3. Status transitions use lookup-driven values from material_request_status.
4. Approval metadata is recorded when the request reaches a terminal status.
5. Line items can now be persisted immediately through item-level endpoints (`POST/PUT/DELETE /api/material-requests/:id/items...`) to support draft autosave and collaborative editing.

### 7. Purchase order flow

1. Purchase orders are created per project and supplier with one or more purchase_order_item rows.
2. PO numbers are generated automatically in PO-YYYY-000001 format.
3. Orders can optionally be linked back to a material request for procurement traceability.
4. Status transitions use lookup-driven values from purchase_order_status.
5. Approval and cancellation are tracked as workflow actions on the order header.
6. Line items can now be persisted immediately through item-level endpoints (`POST/PUT/DELETE /api/purchase-orders/:id/items...`) to support draft autosave and concurrent editing.

### 8. Supplier delivery flow

1. Supplier deliveries can be created from any combination of source documents: purchase orders, delivery advices, and material requests, or as a direct receipt with no source.
2. Source-document links are stored in dedicated reference tables and line-level traceability is stored in `supplier_delivery_item_reference`.
3. Draft records can be edited, cancelled, or posted.
4. Posting is executed through `post_supplier_delivery(...)`, which:
  - writes stock movements for accepted quantities,
  - updates stock balance and stock layers,
  - updates source line received quantities (PO and Delivery Advice references),
  - updates source document workflow status when fully received,
  - marks supplier delivery as Posted.
5. Source documents remain the origin of planning/procurement intent while inventory movements are driven only by supplier delivery posting.
6. Audit logs record create, update, delete, post, and cancel operations.
7. Line items can now be persisted immediately through item-level endpoints (`POST/PUT/DELETE /api/supplier-deliveries/:id/items...`) to support draft autosave and concurrent editing.

### 9. Delivery advice flow

1. Delivery advice records are created for a purchase order with one or more delivery_advice_item rows.
2. DA numbers are generated in DA-YYYY-000001 format.
3. reference_code is required and must be unique.
4. Line items can now be persisted immediately through item-level endpoints (`POST/PUT/DELETE /api/delivery-advices/:id/items...`) to support draft autosave and concurrent editing.
4. Workflow transitions are draft -> submitted -> completed, with cancel supported from draft/submitted.
5. Audit logs record create, update, delete, submit, complete, and cancel actions.

### 10. Stock transfer flow

1. Stock transfers are created between source and destination parties with one or more stock_transfer_item rows.
2. ST numbers are generated in ST-YYYY-000001 format.
3. Optional purchase_order links are validated when provided.
4. Line items can now be persisted immediately through item-level endpoints (`POST/PUT/DELETE /api/stock-transfers/:id/items...`) to support draft autosave and concurrent editing.
5. Workflow transitions are draft -> submitted -> approved, with cancel supported from draft/submitted.
6. Audit logs record create, update, delete, submit, approve, and cancel actions.

### 11. Material adjustment flow

1. Material adjustments are created per project with one or more material_adjustment_item rows.
2. MA numbers are generated in MA-YYYY-000001 format.
3. Line items can now be persisted immediately through item-level endpoints (`POST/PUT/DELETE /api/material-adjustments/:id/items...`) to support draft-style autosave and concurrent editing.
4. Workflow statuses use material_adjustment_status lookups: pending, approved, rejected, completed.
5. Transitions enforce pending -> approved/rejected and approved -> completed.
6. Audit logs record create, update, delete, approve, reject, and complete actions.

### 12. System settings flow

1. Settings categories are loaded from system_setting_category.
2. Category settings are lazy-loaded from system_setting.
3. Permission split:
  - VIEW: read categories/settings
  - EDIT: create/delete definitions
  - SAVE: persist value updates
  - RESET: reset category to defaults

### 13. Report generation flow

1. Sidebar and report pages read report definitions and parameters.
2. User chooses an enabled format and enters required parameters.
3. Backend validates required parameters and format support.
4. Backend calls reporting-service for rendering.
5. Generated file is downloaded and report_history is updated (RUNNING to SUCCESS/FAILED).

### 14. Dashboard flow

1. Frontend requests available dashboard types from GET /api/dashboard/types.
2. Backend resolves dashboard visibility from role-derived permissions and returns only permitted department dashboards.
3. Dashboard widgets load independently from GET /api/dashboard/:dashboardType/widgets/:widgetKey.
4. Widget endpoints support pagination (limit/offset) for list-like data and optional date filtering (from/to) for trend-style data.
5. Slow widgets do not block faster widgets because each widget request executes separately.

## Seeded Data Flows Not Yet Fully Exposed in UI/API

Navigation and schema include additional business areas that currently route to the generic "under development" page in frontend:

- Coordinating transactions (material request/control variants)
- Material Control
- Material Request
- Purchase Order
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
| Optimistic concurrency on transaction updates/actions | `expected_updated_at` request token validated against latest persisted `updated_at`, returns `409` on mismatch |
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
| 2026-08-07 | Copilot | Added supplier-delivery immediate line-item persistence behavior and item-level endpoint workflow notes. |
| 2026-08-07 | Copilot | Added delivery-advice immediate line-item persistence behavior and item-level endpoint workflow notes. |
| 2026-08-07 | Copilot | Added purchase-order immediate line-item persistence behavior and item-level endpoint workflow notes. |
| 2026-08-01 | Copilot | Reworked workflow documentation to distinguish implemented modules from seeded placeholders, and aligned navigation/report flow details with actual frontend and backend behavior. |
| 2026-08-01 | Copilot | Added purchase order as an implemented workflow and documented its procurement lifecycle. |
