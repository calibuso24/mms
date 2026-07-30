# MMS — Database Reference

## Migration File Index

All migrations run in numeric order from `database/migrations/`.

| File | Table(s) Created |
|---|---|
| `000_look_up.sql` | `look_up` |
| `001_category.sql` | `category` |
| `002_sub_category.sql` | `sub_category` |
| `003_brand.sql` | `brand` |
| `004_unit_of_measure.sql` | `unit_of_measure` |
| `005_material.sql` | `material` |
| `006_material_specification.sql` | `material_specification` |
| `007_material_brand.sql` | `material_brand` |
| `008_material_option.sql` | `material_option` |
| `009_material_option_detail.sql` | `material_option_detail` |
| `012_contact.sql` | `contact` |
| `013_account.sql` | `account` |
| `013_party.sql` | `party` |
| `013_stock_movement.sql` | `stock_movement` |
| `014_address.sql` | `address` |
| `014_stock_balance.sql` | `stock_balance` |
| `015_phone.sql` | `phone` |
| `015_stock_layer.sql` | `stock_layer` |
| `016_email.sql` | `email` |
| `018_role.sql` | `role` |
| `019_permission.sql` | `permission` |
| `020_role_permission.sql` | `role_permission` |
| `021_account_role.sql` | `account_role` |
| `022_audit_log.sql` | `audit_log` |
| `024_material_control.sql` | `material_control` |
| `026_material_request.sql` | `material_request` |
| `027_material_request_item.sql` | `material_request_item` |
| `028_additional_control.sql` | `additional_control` |
| `030_purchase_order.sql` | `purchase_order` |
| `031_purchase_order_item.sql` | `purchase_order_item` |
| `032_delivery_receipt.sql` | `delivery_receipt` |
| `033_delivery_receipt_item.sql` | `delivery_receipt_item` |
| `034_delivery_advice.sql` | `delivery_advice` |
| `035_delivery_advice_item.sql` | `delivery_advice_item` |
| `036_purchase_order_adj.sql` | `purchase_order_adj` |
| `037_purchase_order_item_adj.sql` | `purchase_order_item_adj` |
| `038_stock_transfer.sql` | `stock_transfer` |
| `039_job_order.sql` | `job_order` |
| `040_stock_transfer_job_order.sql` | `stock_transfer_job_order` |
| `041_site_purchase.sql` | `site_purchase` |
| `042_physical_count.sql` | `physical_count` |
| `043_material_adjustment.sql` | `material_adjustment` |
| `046_report_catalog.sql` | `report_catalog` |
| `047_report_parameter.sql` | `report_parameter` |
| `048_report_history.sql` | `report_history` |
| `049_navigation.sql` | `navigation` |
| `999_rename_sequence.sql` | (renames sequences) |

---

## Shared Patterns

### Audit Fields (on every table)
```sql
log_date_created          TIMESTAMPTZ
log_created_by_account_id BIGINT
log_date_updated          TIMESTAMPTZ
log_updated_by_account_id BIGINT
```

### Soft Delete
Tables with `is_deleted BOOLEAN DEFAULT FALSE` support soft deletes. Queries always filter `WHERE is_deleted = FALSE`.

### Status / Type Enumerations
All status and type values are stored in the `look_up` table and referenced by `look_up_id` FK. Do not hardcode status strings — always look them up by `look_up_type` + `code`.

---

## Module 1 — Core Lookup & Master Data

### `look_up`
| Column | Type | Notes |
|---|---|---|
| `look_up_id` | BIGINT PK | |
| `look_up_type` | VARCHAR | Groups values (e.g. `material_status`, `PHONE_TYPE`) |
| `code` | VARCHAR | Short code (e.g. `active`, `mobile`) |
| `name` | VARCHAR | Display name |
| `description` | TEXT | |
| `display_order` | INT | Sort order within type |
| `log_module_created` | VARCHAR | Which module created the record |
| `log_module_updated` | VARCHAR | |

### `category`
| Column | Type |
|---|---|
| `category_id` | BIGINT PK |
| `name` | VARCHAR |
| `description` | TEXT |
| `status_id` | BIGINT → `look_up` |
| audit fields | |

### `sub_category`
| Column | Type |
|---|---|
| `sub_category_id` | BIGINT PK |
| `category_id` | BIGINT → `category` |
| `name` | VARCHAR |
| `description` | TEXT |
| audit fields | |

### `brand`
| Column | Type |
|---|---|
| `brand_id` | BIGINT PK |
| `name` | VARCHAR |
| `description` | TEXT |
| audit fields | |

### `unit_of_measure`
| Column | Type |
|---|---|
| `uom_id` | BIGINT PK |
| `name` | VARCHAR |
| `abbreviation` | VARCHAR |
| `description` | TEXT |
| audit fields | |

### `material`
| Column | Type |
|---|---|
| `material_id` | BIGINT PK |
| `product_code` | VARCHAR UNIQUE |
| `product_name` | VARCHAR |
| `source_description` | TEXT |
| `category_id` | BIGINT → `category` |
| `sub_category_id` | BIGINT → `sub_category` |
| `stock_uom_id` | BIGINT → `unit_of_measure` |
| `status_id` | BIGINT → `look_up` |
| `notes` | TEXT |
| `is_deleted` | BOOLEAN |
| audit fields | |

### `material_specification`
| Column | Type |
|---|---|
| `material_specification_id` | BIGINT PK |
| `material_id` | BIGINT → `material` |
| `specification` | TEXT |
| audit fields | |

### `material_brand`
| Column | Type |
|---|---|
| `material_brand_id` | BIGINT PK |
| `material_id` | BIGINT → `material` |
| `brand_id` | BIGINT → `brand` |
| `status_id` | BIGINT → `look_up` |
| audit fields | |

### `material_option`
| Column | Type |
|---|---|
| `material_option_id` | BIGINT PK |
| `material_id` | BIGINT → `material` |
| `option_type_id` | BIGINT → `look_up` |
| `name` | VARCHAR |
| `description` | TEXT |
| audit fields | |

### `material_option_detail`
| Column | Type |
|---|---|
| `material_option_detail_id` | BIGINT PK |
| `material_option_id` | BIGINT → `material_option` |
| `component_material_id` | BIGINT → `material` |
| `quantity` | NUMERIC |
| `uom_id` | BIGINT → `unit_of_measure` |
| audit fields | |

---

## Module 2 — Contact, Party & Security

### `contact`
| Column | Type |
|---|---|
| `contact_id` | BIGINT PK |
| `parent_contact_id` | BIGINT → `contact` (self-ref) |
| `entity_type_id` | BIGINT → `look_up` (`ENTITY_TYPE`: person, company, department, project) |
| `name` | VARCHAR |
| `email` | VARCHAR |
| `phone` | VARCHAR |
| audit fields | |

### `address`
| Column | Type |
|---|---|
| `address_id` | BIGINT PK |
| `contact_id` | BIGINT → `contact` |
| `address_type_id` | BIGINT → `look_up` (`address_type`) |
| `house_no` | VARCHAR |
| `street` | VARCHAR |
| `barangay` | VARCHAR |
| `city` | VARCHAR |
| `province` | VARCHAR |
| `region` | VARCHAR |
| `postal_code` | VARCHAR |
| `is_primary` | BOOLEAN |
| audit fields | |

### `phone`
| Column | Type |
|---|---|
| `phone_id` | BIGINT PK |
| `contact_id` | BIGINT → `contact` |
| `phone_type_id` | BIGINT → `look_up` (`PHONE_TYPE`) |
| `phone_number` | VARCHAR |
| `is_primary` | BOOLEAN |
| audit fields | |

### `email`
| Column | Type |
|---|---|
| `email_id` | BIGINT PK |
| `contact_id` | BIGINT → `contact` |
| `email_type_id` | BIGINT → `look_up` (`EMAIL_TYPE`) |
| `email_address` | VARCHAR |
| `is_primary` | BOOLEAN |
| audit fields | |

### `party`
Represents suppliers, projects, warehouses, and departments.
| Column | Type |
|---|---|
| `party_id` | BIGINT PK |
| `party_type_id` | BIGINT → `look_up` |
| `contact_id` | BIGINT → `contact` |
| `name` | VARCHAR |
| `code` | VARCHAR UNIQUE |
| `status_id` | BIGINT → `look_up` |
| audit fields | |

### `account`
| Column | Type |
|---|---|
| `account_id` | BIGINT PK |
| `user_name` | VARCHAR UNIQUE (among non-deleted) |
| `password` | VARCHAR (bcrypt hash) |
| `full_name` | VARCHAR |
| `contact_id` | BIGINT → `contact` |
| `is_active` | BOOLEAN DEFAULT TRUE |
| `is_deleted` | BOOLEAN DEFAULT FALSE |
| audit fields | |

### `role`
| Column | Type |
|---|---|
| `role_id` | BIGINT PK |
| `role_code` | VARCHAR UNIQUE |
| `role_name` | VARCHAR |
| `description` | TEXT |
| audit fields | |

### `permission`
| Column | Type |
|---|---|
| `permission_id` | BIGINT PK |
| `module_name` | VARCHAR |
| `permission_code` | VARCHAR (e.g. `VIEW`, `CREATE`, `UPDATE`, `DELETE`) |
| `permission_name` | VARCHAR |
| `description` | TEXT |
| audit fields | |

### `role_permission`
| Column | Type |
|---|---|
| `role_permission_id` | BIGINT PK |
| `role_id` | BIGINT → `role` |
| `permission_id` | BIGINT → `permission` |
| audit fields | |

### `account_role`
| Column | Type |
|---|---|
| `account_role_id` | BIGINT PK |
| `account_id` | BIGINT → `account` |
| `role_id` | BIGINT → `role` |
| audit fields | |

### `audit_log`
| Column | Type |
|---|---|
| `audit_log_id` | BIGINT PK |
| `account_id` | BIGINT → `account` |
| `action` | VARCHAR |
| `table_name` | VARCHAR |
| `record_id` | BIGINT |
| `old_values` | JSONB |
| `new_values` | JSONB |
| `log_date_created` | TIMESTAMPTZ |

---

## Module 3 — Inventory

### `stock_movement`
| Column | Type |
|---|---|
| `stock_movement_id` | BIGINT PK |
| `source_id` | BIGINT → `party` |
| `destination_id` | BIGINT → `party` |
| `material_id` | BIGINT → `material` |
| `material_brand_id` | BIGINT → `material_brand` (nullable) |
| `quantity` | NUMERIC |
| `uom_id` | BIGINT → `unit_of_measure` |
| `movement_type_id` | BIGINT → `look_up` (`stock_movement_type`) |
| `status_id` | BIGINT → `look_up` (`stock_movement_status`) |
| `movement_date` | TIMESTAMPTZ |
| `reference_code` | VARCHAR |
| `notes` | TEXT |
| audit fields | |

### `stock_balance`
Tracks current stock quantity per material per party.
| Column | Type |
|---|---|
| `stock_balance_id` | BIGINT PK |
| `party_id` | BIGINT → `party` |
| `material_id` | BIGINT → `material` |
| `material_brand_id` | BIGINT → `material_brand` (nullable) |
| `quantity` | NUMERIC |
| `uom_id` | BIGINT → `unit_of_measure` |
| audit fields | |

### `stock_layer`
Tracks FIFO/LIFO costing layers per material per location.
| Column | Type |
|---|---|
| `stock_layer_id` | BIGINT PK |
| `party_id` | BIGINT → `party` |
| `material_id` | BIGINT → `material` |
| `material_brand_id` | BIGINT (nullable) |
| `quantity` | NUMERIC |
| `unit_cost` | NUMERIC |
| `layer_date` | TIMESTAMPTZ |
| audit fields | |

### `stock_transfer`
Inventory movement log — the main journal for all physical transfers.
| Column | Type |
|---|---|
| `stock_transfer_id` | BIGINT PK |
| `transfer_type_id` | BIGINT → `look_up` (e.g. `RTS Warehouse`, `RTS Supplier`, `Job Order Delivery`, `Site Receipt`) |
| `source_party_id` | BIGINT → `party` |
| `destination_party_id` | BIGINT → `party` |
| `job_order_id` | BIGINT → `job_order` (nullable) |
| `status_id` | BIGINT → `look_up` |
| `transfer_date` | TIMESTAMPTZ |
| `notes` | TEXT |
| audit fields | |

### `material_control`
Tracks material control per project.
| Column | Type |
|---|---|
| `material_control_id` | BIGINT PK |
| `project_id` | BIGINT → `party` |
| `material_id` | BIGINT → `material` |
| `control_quantity` | NUMERIC |
| `issued_quantity` | NUMERIC |
| `balance_quantity` | NUMERIC |
| audit fields | |

### `additional_control`
Additional control entries linked to material control.

---

## Module 4 — Request & Procurement

### `material_request`
| Column | Type |
|---|---|
| `material_request_id` | BIGINT PK |
| `project_id` | BIGINT → `party` |
| `requested_by_account_id` | BIGINT → `account` |
| `status_id` | BIGINT → `look_up` |
| `request_date` | TIMESTAMPTZ |
| `notes` | TEXT |
| audit fields | |

### `material_request_item`
| Column | Type |
|---|---|
| `material_request_item_id` | BIGINT PK |
| `material_request_id` | BIGINT → `material_request` |
| `material_id` | BIGINT → `material` |
| `requested_quantity` | NUMERIC |
| `approved_quantity` | NUMERIC |
| `estimated_quantity` | NUMERIC |
| `uom_id` | BIGINT → `unit_of_measure` |
| audit fields | |

### `purchase_order`
| Column | Type |
|---|---|
| `purchase_order_id` | BIGINT PK |
| `po_number` | VARCHAR UNIQUE |
| `project_id` | BIGINT → `party` |
| `material_request_id` | BIGINT → `material_request` (nullable) |
| `supplier_party_id` | BIGINT → `party` |
| `requested_by_account_id` | BIGINT → `account` |
| `order_type_id` | BIGINT → `look_up` |
| `status_id` | BIGINT → `look_up` |
| `total_amount` | NUMERIC |
| `expected_delivery_date` | DATE |
| audit fields | |

### `purchase_order_item`
| Column | Type |
|---|---|
| `purchase_order_item_id` | BIGINT PK |
| `purchase_order_id` | BIGINT → `purchase_order` |
| `material_id` | BIGINT → `material` |
| `quantity` | NUMERIC |
| `unit_price` | NUMERIC |
| `total_price` | NUMERIC |
| `uom_id` | BIGINT → `unit_of_measure` |
| audit fields | |

### `purchase_order_adj`
PO-level adjustments (discounts, surcharges).

### `purchase_order_item_adj`
Line-level PO adjustments.

---

## Module 5 — Receipt & Supplier Logistics

### `delivery_advice`
Supplier delivery advice document.
| Column | Type |
|---|---|
| `delivery_advice_id` | BIGINT PK |
| `purchase_order_id` | BIGINT → `purchase_order` |
| `supplier_party_id` | BIGINT → `party` |
| `delivery_date` | DATE |
| `status_id` | BIGINT → `look_up` |
| audit fields | |

### `delivery_advice_item`
Line items for `delivery_advice`.

### `delivery_receipt`
Records goods received (from supplier or internal warehouse).
| Column | Type |
|---|---|
| `delivery_receipt_id` | BIGINT PK |
| `purchase_order_id` | BIGINT → `purchase_order` (nullable if internal) |
| `received_by_account_id` | BIGINT → `account` |
| `receipt_date` | DATE |
| `status_id` | BIGINT → `look_up` |
| audit fields | |

### `delivery_receipt_item`
Line items for `delivery_receipt`.

---

## Module 6 — Job Order & Service

### `job_order`
| Column | Type |
|---|---|
| `job_order_id` | BIGINT PK |
| `project_id` | BIGINT → `party` |
| `service_party_id` | BIGINT → `party` |
| `status_id` | BIGINT → `look_up` |
| `order_date` | DATE |
| `notes` | TEXT |
| audit fields | |

### `stock_transfer_job_order`
Links `stock_transfer` to `job_order`.

### `site_purchase`
Site-level direct purchasing records.

---

## Module 7 — Audit & Adjustment

### `physical_count`
Quarterly site inventory audit document.
| Column | Type |
|---|---|
| `physical_count_id` | BIGINT PK |
| `party_id` | BIGINT → `party` |
| `count_date` | DATE |
| `status_id` | BIGINT → `look_up` |
| audit fields | |

`physical_count_item` stores per-material: expected quantity, counted quantity, variance. This is an audit document only — it does **not** automatically adjust stock.

### `material_adjustment`
Stock correction request (approved by authorized user).

`material_adjustment_item` stores per-material adjustment amounts.

---

## Module 8 — Reporting & Navigation

### `report_catalog`
27 pre-configured reports across 6 categories.
| Column | Type |
|---|---|
| `report_catalog_id` | BIGINT PK |
| `report_category_id` | BIGINT → `look_up` (`REPORT_CATEGORY`) |
| `report_type_id` | BIGINT → `look_up` (`REPORT_TYPE`) |
| `report_code` | VARCHAR UNIQUE |
| `title` | VARCHAR |
| `description` | TEXT |
| `permission_code` | VARCHAR |
| `is_active` | BOOLEAN |
| audit fields | |

Report categories: Inventory, Purchasing, Warehouse, Projects, Accounting, Administration.

### `report_parameter`
Parameters for each report.
| Column | Type |
|---|---|
| `report_parameter_id` | BIGINT PK |
| `report_catalog_id` | BIGINT → `report_catalog` |
| `parameter_name` | VARCHAR |
| `data_type_id` | BIGINT → `look_up` (`REPORT_PARAMETER_DATA_TYPE`) |
| `control_type_id` | BIGINT → `look_up` (`REPORT_CONTROL_TYPE`) |
| `is_required` | BOOLEAN |
| `display_order` | INT |
| audit fields | |

### `report_history`
Log of report executions.

### `navigation`
Database-driven navigation menu (see [NAVIGATION.md](./NAVIGATION.md) for full details).

---

## Views

| File | View |
|---|---|
| `views/012_material_catalog_view.sql` | `material_catalog_view` — material with category, sub_category, UOM, brand details joined |

---

## Functions

### `stock_movement_consume()` (`functions/016_stock_movement_functions.sql`)
```sql
FUNCTION stock_movement_consume(
  p_source_id          BIGINT,
  p_destination_id     BIGINT,
  p_material_id        BIGINT,
  p_uom_id             BIGINT,
  p_quantity           NUMERIC,
  p_movement_type_code TEXT,
  p_status_code        TEXT DEFAULT 'completed',
  p_method             TEXT DEFAULT 'fifo',   -- 'fifo' or 'lifo'
  p_reference_code     TEXT,
  p_notes              TEXT,
  p_material_brand_id  BIGINT
) RETURNS BIGINT  -- Returns stock_movement_id
```
Atomically consumes inventory using FIFO or LIFO, updates `stock_layer`, and writes to `stock_movement`.

---

## Seed Data

| File | Contents |
|---|---|
| `010_look_up_seed.sql` | 60+ lookup values for all system enumerations |
| `011_product_management_seed.sql` | Sample categories, brands, materials |
| `023_look_up_user_status_seed.sql` | User status lookups |
| `045_role_permission_seed.sql` | Role-permission assignments |
| `046_report_lookup_seed.sql` | Report category/type lookups |
| `047_report_seed.sql` | 27 report definitions |
| `049_navigation_seed.sql` | Full MAIN and REPORTS navigation menus |
| `050_account_seed.sql` | Two test accounts: `superuser`, `auditor` (bcrypt-hashed passwords) |
| `051_manage_users_permission_seed.sql` | User Management module permissions |

### Key Lookup Types
| `look_up_type` | Values |
|---|---|
| `material_status` | `active`, `inactive` |
| `stock_movement_type` | `transfer`, `issue`, `receipt`, `adjustment`, `return` |
| `stock_movement_status` | `pending`, `completed`, `cancelled`, `failed` |
| `address_type` | `home`, `office`, `warehouse`, `billing`, `shipping`, `project_site` |
| `PHONE_TYPE` | `mobile`, `home`, `office`, `fax`, `whatsapp`, `emergency` |
| `EMAIL_TYPE` | `personal`, `work`, `billing`, `support`, `notification` |
| `ENTITY_TYPE` | `person`, `company`, `department`, `project` |
| `NAME_PREFIX` | `Mr`, `Mrs`, `Ms`, `Dr` |
| `NAME_SUFFIX` | `Jr`, `Sr` |
| `REPORT_CATEGORY` | Inventory, Purchasing, Warehouse, Projects, Accounting, Administration |
