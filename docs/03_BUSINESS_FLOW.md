# MMS — Business Workflow

## Overview

MMS covers five major operational flows:

1. **Material Request** — Site/project raises a request for materials
2. **Purchasing** — Office creates a PO when materials are not in stock
3. **Inventory Movement** — Physical movement is logged in stock transfer and stock movement receipts
4. **Job Order** — Materials sent to a service shop for fabrication or work
5. **Audit & Adjustment** — Quarterly physical count and stock correction

---

## 1. Material Request Flow

### 1.1 Request Creation
- A project/site raises a `material_request` record.
- Line items are added in `material_request_item` with `requested_quantity`, `approved_quantity`, and `estimated_quantity`.
- The request is linked to a `project_id` (party).

### 1.2 Decision Path

**If material is available in warehouse:**
- No PO is created.
- Issue from warehouse → create `delivery_receipt` (with `purchase_order_id = NULL`).
- Log movement → create `stock_transfer` record.
- Update `stock_balance` and `stock_layer` via `stock_movement_consume()`.

**If material is NOT available:**
- Create a `purchase_order` linked to the `material_request_id`.
- Supplier issues one or more `delivery_advice` documents.
- Warehouse creates `supplier_delivery` linked to the approved purchase order and delivery advice references.
- Posting `supplier_delivery` updates stock and purchase order received quantities.

---

## 2. Purchasing & Supplier Logistics Flow

### 2.1 Purchase Order Creation
- `purchase_order` records the PO header (po_number, supplier, project, status, total_amount).
- `purchase_order_item` records line items (material, quantity, unit_price).
- `order_type_id` distinguishes: regular purchase, site purchase, or other PO types.
- `purchase_order_adj` and `purchase_order_item_adj` record discounts/surcharges.

### 2.2 Supplier Delivery Advice
- Supplier issues a delivery advice → recorded in `delivery_advice` + `delivery_advice_item`.
- Supports partial deliveries over multiple advice documents.

### 2.3 Goods Receipt
- Supplier receipt is recorded in `supplier_delivery` + `supplier_delivery_item`.
- One supplier delivery can include multiple `delivery_advice` references via `supplier_delivery_advice`.
- Supplier delivery must reference an approved purchase order.
- Stock is increased only when supplier delivery is posted.

### 2.4 Delivery Receipt (Project/Warehouse Issue)
- Physical issue/receipt to project remains recorded in `delivery_receipt` + `delivery_receipt_item`.
- If internal warehouse issue: `purchase_order_id` is NULL.
- This document is separate from supplier-to-warehouse receiving.

### 2.5 Site Purchase
- `site_purchase` handles direct purchasing at site level without a formal PO.

---

## 3. Inventory Movement & Stock Transfer

### 3.1 Stock Transfer Types
`stock_transfer` records all physical inventory movements with a `transfer_type_id`:
- **Warehouse Transfer** — movement between warehouses
- **RTS Warehouse** — return to warehouse
- **RTS Supplier** — return to supplier
- **Job Order Delivery** — materials sent to service shop
- **Site Receipt** — materials received at site

### 3.2 Inventory State Tables
| Table | Purpose |
|---|---|
| `stock_movement` | Detailed movement record per transaction |
| `stock_balance` | Current on-hand quantity per party + material |
| `stock_layer` | FIFO/LIFO costing layers per party + material |

### 3.3 `stock_movement_consume()` Function
All inventory consumption goes through this PostgreSQL function:
- Atomically deducts from `stock_layer` (FIFO or LIFO)
- Writes a `stock_movement` record
- Maintains data integrity via database-level transaction

---

## 4. Job Order & Service Workflow

### 4.1 Job Order Document
- `job_order` represents an internal or external service job (fabrication, installation, etc.).
- `job_order_item` lists the materials needed for the job.

### 4.2 Job Order Delivery
- Materials sent to the service shop are logged in `stock_transfer` with `transfer_type_id = 'Job Order Delivery'`.
- `stock_transfer.job_order_id` links the inventory movement to the job order.
- The service document (`job_order`) stays separate from the inventory flow.
- `stock_transfer_job_order` is the junction table for many-to-many relationships.

---

## 5. Inventory Audit & Correction

### 5.1 Physical Count
- `physical_count` is the quarterly site inventory audit document.
- `physical_count_item` records per-material: **expected quantity**, **counted quantity**, **variance**.
- This is an **audit document only** — it does NOT automatically adjust stock.

### 5.2 Material Adjustment
- After reviewing physical count variance, an authorized user creates a `material_adjustment`.
- `material_adjustment_item` records the approved adjustment quantity per material.
- This triggers the actual stock balance correction.

---

## 6. Material Control & Coordination

### 6.1 Material Control
- `material_control` tracks how much of each material is allocated to a project.
- Stores `control_quantity`, `issued_quantity`, and `balance_quantity` per project/material pair.
- Updated whenever stock is issued to a project.

### 6.2 Additional Control
- `additional_control` provides supplementary control entries linked to `material_control`.
- Used for tracking extra allocations or adjustments outside the main control record.

---

## Data Integrity Rules

| Rule | Enforcement |
|---|---|
| All stock consumption uses `stock_movement_consume()` | Database function |
| Soft deletes only — records are never physically removed | `is_deleted` column |
| All changes require audit trail | Audit fields on every table |
| Status and type values come from `look_up` | FK to `look_up_id` |
| Username must be unique among non-deleted accounts | Partial unique index |
| Physical count does not auto-adjust stock | Application logic |
| Supplier delivery posts inventory only on post action | `post_supplier_delivery()` database function |


# MMS — Navigation System

## Overview

MMS uses a **fully database-driven navigation system**. All menu items are stored in the `navigation` table. No menu structure is hardcoded.

**Features:**
- Hierarchical menus (unlimited parent-child nesting)
- Two contexts: `MAIN` (operations) and `REPORTS` (analytics)
- Permission-aware: SQL-level filtering — users only see items they have access to
- Soft delete with audit trail
- Icon support (SVG)
- Expand/collapse state persisted in `localStorage` on the frontend

---

## `navigation` Table Schema

```sql
navigation_id            BIGINT PRIMARY KEY
parent_navigation_id     BIGINT → navigation(navigation_id)  -- self-referencing
context                  VARCHAR(50)   -- 'MAIN' or 'REPORTS'
navigation_type          VARCHAR(50)   -- GROUP, MENU, REPORT, HEADER
title                    VARCHAR(255)
route                    VARCHAR(255)  -- frontend route path (nullable for GROUPs)
icon                     VARCHAR(100)  -- icon identifier
permission_code          VARCHAR(100)  -- NULL = visible to all authenticated users
display_order            INTEGER
is_visible               BOOLEAN
is_deleted               BOOLEAN
reference_type           VARCHAR(50)   -- 'NONE' or 'REPORT'
reference_id             BIGINT        -- FK to report_catalog when reference_type = 'REPORT'
log_created_by_account_id BIGINT
log_date_created         TIMESTAMPTZ
log_updated_by_account_id BIGINT
log_date_updated         TIMESTAMPTZ
```

---

## Key Column Values

### `context`
| Value | Meaning |
|---|---|
| `MAIN` | Operations menus (materials, purchasing, inventory, etc.) |
| `REPORTS` | Analytics and reporting menus |

### `navigation_type`
| Value | Meaning |
|---|---|
| `GROUP` | A collapsible section header — has children, no direct route |
| `MENU` | A clickable menu item with a route |
| `REPORT` | A report link — links to a `report_catalog` entry |
| `HEADER` | A static non-clickable section label |

### `permission_code`
- If `NULL` → visible to all authenticated users
- If set → must match a `permission_code` value in the `permission` table
- The SQL query filters navigation items where the user has the required permission

### `reference_type` + `reference_id`
- `reference_type = 'REPORT'` + `reference_id = <report_catalog_id>` → links the nav item to a specific report

---

## Database Indexes (8 total)

| Index | Purpose |
|---|---|
| `idx_navigation_parent_navigation_id` | Parent lookups |
| `idx_navigation_context` | Context-based queries |
| `idx_navigation_context_parent` | Combined context + parent queries |
| `idx_navigation_route` | Route-based lookups |
| `idx_navigation_permission_code` | Permission filtering |
| `idx_navigation_is_visible` | Visibility filtering |
| `idx_navigation_is_deleted` | Soft delete filtering |
| `idx_navigation_reference_type_id` | Reference lookups |

---

## Backend

### Routes (`src/routes/navigation.ts`)
```
GET /api/navigation/main                   → getMainNavigation()
GET /api/navigation/reports                → getReportsNavigation()
GET /api/navigation/context/:context       → getNavigationByContext()
GET /api/navigation/report-catalog-sidebar → getReportCatalogSidebar()
```
All require `authMiddleware`.

### NavigationService (`src/services/navigation.ts`)
```typescript
getMainNavigation(accountId?)
getReportsNavigation(accountId?)
getNavigationByContext(context, accountId?)
getReportCatalogSidebar(accountId?)
```

### NavigationRepository (`src/repositories/navigation.ts`)
```typescript
findByContext(context, accountId?)               // Flat list, permission-filtered
findByContextAndParent(context, parentId?, accountId?)
findChildren(navigationId, context, accountId?)
getReportCatalogByCategory(accountId?)
buildHierarchy(rows)                             // Converts flat list → tree
```

The repository filters items at the SQL level:
- `WHERE is_deleted = FALSE AND is_visible = TRUE`
- `AND (permission_code IS NULL OR permission_code IN (SELECT ... FROM account permissions))`

`buildHierarchy()` takes the flat SQL result and assembles the tree structure using `parent_navigation_id`.

---

## Frontend Navigation Context (`src/shared/contexts/navigation.tsx`)

```typescript
interface NavigationContextType {
  mainNavigation: NavigationItem[]     // MAIN context tree
  reportsNavigation: NavigationItem[]  // REPORTS context tree
  reportGroups: ReportGroup[]          // Reports grouped by category (for sidebar)
  currentContext: 'MAIN' | 'REPORTS'   // Active context
  expandedItems: Set<number>           // IDs of expanded GROUP items
  loading: boolean
  error: string | null
  setCurrentContext(context): void
  toggleExpandedItem(id): void
  setExpandedItems(ids): void
  refreshNavigation(): Promise<void>
  pageTitle: string
  setPageTitle(title): void
}
```

- Expand/collapse state stored in `localStorage`
- Context switches between MAIN and REPORTS sidebar views
- `pageTitle` allows pages to set the header title dynamically

---

## Adding New Navigation Items

1. Insert a row into the `navigation` table with the correct `context`, `navigation_type`, `parent_navigation_id`, and `display_order`.
2. Set `permission_code` if the item should be restricted to users with a specific permission.
3. Set `is_visible = TRUE`, `is_deleted = FALSE`.
4. For report links: set `reference_type = 'REPORT'` and `reference_id = <report_catalog_id>`.
5. No code changes are needed — the frontend reads navigation from the API automatically.
