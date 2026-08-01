# MMS - Database Guide

## Table of Contents

1. [Deployment Model](#deployment-model)
2. [Migration Inventory](#migration-inventory)
3. [Core Schema Notes](#core-schema-notes)
4. [Domain Modules and Tables](#domain-modules-and-tables)
5. [Views and Functions](#views-and-functions)
6. [Seed Data Inventory](#seed-data-inventory)
7. [Lookup and Permission Highlights](#lookup-and-permission-highlights)
8. [Cross References](#cross-references)
9. [Revision History](#revision-history)

## Deployment Model

Database deployment is file-based and ordered.

Execution order used by deploy scripts:

1. database/migrations
2. database/seeds
3. database/views
4. database/functions

Scripts:

- Windows: database/deploy.bat
- Linux/macOS: database/deploy.sh

## Migration Inventory

Current migration files in database/migrations:

| File | Primary objects |
|---|---|
| 000_look_up.sql | look_up |
| 001_category.sql | category |
| 002_sub_category.sql | sub_category |
| 003_brand.sql | brand |
| 004_unit_of_measure.sql | unit_of_measure |
| 005_material.sql | material |
| 006_material_specification.sql | material_specification |
| 007_material_brand.sql | material_brand |
| 008_material_option.sql | material_option |
| 009_material_option_detail.sql | material_option_detail |
| 012_contact.sql | contact |
| 013_account.sql | account |
| 013_party.sql | party |
| 013_stock_movement.sql | stock_movement |
| 014_address.sql | address |
| 014_stock_balance.sql | stock_balance |
| 015_phone.sql | phone |
| 015_stock_layer.sql | stock_layer |
| 016_email.sql | email |
| 018_role.sql | role |
| 019_permission.sql | permission |
| 020_role_permission.sql | role_permission |
| 021_account_role.sql | account_role |
| 022_audit_log.sql | audit_log |
| 024_material_control.sql | material_control |
| 026_material_request.sql | material_request |
| 027_material_request_item.sql | material_request_item |
| 028_additional_control.sql | additional_control |
| 030_purchase_order.sql | purchase_order |
| 031_purchase_order_item.sql | purchase_order_item |
| 032_delivery_receipt.sql | delivery_receipt |
| 033_delivery_receipt_item.sql | delivery_receipt_item |
| 034_delivery_advice.sql | delivery_advice |
| 035_delivery_advice_item.sql | delivery_advice_item |
| 036_purchase_order_adj.sql | purchase_order_adj |
| 037_purchase_order_item_adj.sql | purchase_order_item_adj |
| 038_stock_transfer.sql | stock_transfer, stock_transfer_item |
| 039_job_order.sql | job_order, job_order_item |
| 040_stock_transfer_job_order.sql | stock_transfer_job_order |
| 041_site_purchase.sql | site_purchase |
| 042_physical_count.sql | physical_count, physical_count_item |
| 043_material_adjustment.sql | material_adjustment, material_adjustment_item |
| 044_supplier_delivery.sql | supplier_delivery, supplier_delivery_item, supplier_delivery_advice, posting/validation functions |
| 046_report_catalog.sql | report_catalog |
| 047_report_parameter.sql | report_parameter |
| 048_report_history.sql | report_history |
| 049_navigation.sql | navigation |
| 050_party_management_fields.sql | Adds party.project_type_id, party.payment_terms_id, party.business_hours |
| 051_supplier_business_hours.sql | supplier_business_hours |
| 052_material_type.sql | material_type table and material.material_type_id FK |
| 053_system_settings.sql | system_setting_category, system_setting |
| 054_delivery_advice_status.sql | delivery_advice_status lookups |
| 055_stock_transfer_lookups.sql | stock_transfer_status lookups, stock_transfer_type alignment |
| 999_rename_sequence.sql | sequence naming maintenance |

## Core Schema Notes

Common patterns used across tables:

- Audit fields: log_date_created, log_date_updated, log_created_by_account_id, log_updated_by_account_id
- Soft delete fields where applicable: is_deleted, log_date_deleted, log_deleted_by_account_id
- Lookup-driven enums via look_up_id FKs

Important convention:

- Use look_up table and look_up_id naming for lookup references.

## Domain Modules and Tables

### Product and master data

- category, sub_category, brand, unit_of_measure
- material, material_specification, material_brand, material_option, material_option_detail
- material_type exists in schema and is linked from material.material_type_id

### Coordinating transactions

- material_request stores project-level request headers with generated MR numbers and line items in material_request_item
- material_request_status seeds Draft, Submitted, Approved, Rejected, Cancelled, Completed, and Closed
- material_control stores project-level control codes, budgets, estimated costs, and status history
- material_control_status seeds Draft, Submitted, Approved, Rejected, Cancelled, and Closed

### Contacts, parties, and security

- contact, address, phone, email
- party (extended with project_type_id and payment_terms_id)
- supplier_business_hours for normalized weekly schedule
- account, role, permission, role_permission, account_role
- audit_log

### Inventory and transactions

- stock_movement, stock_balance, stock_layer
- stock_transfer and stock_transfer_item
- material_control, additional_control
- material_request and material_request_item
- purchase_order, purchase_order_item, purchase_order_adj, purchase_order_item_adj
- purchase_order_status lookup drives PO workflow states (Draft, Approved, Partially Delivered, Delivered, Cancelled)
- delivery_advice and delivery_advice_item
- delivery_receipt and delivery_receipt_item
- supplier_delivery, supplier_delivery_item, supplier_delivery_advice
- job_order, job_order_item, stock_transfer_job_order
- site_purchase
- physical_count, physical_count_item
- material_adjustment, material_adjustment_item

### Reporting and navigation

- report_catalog
- report_parameter
- report_history
- navigation

### System settings

- system_setting_category
- system_setting

## Views and Functions

### Views

| File | View |
|---|---|
| database/views/012_material_catalog_view.sql | material_catalog_view |

### Functions

| File | Function |
|---|---|
| database/functions/016_stock_movement_functions.sql | stock_movement_consume(...) |
| database/migrations/044_supplier_delivery.sql | post_supplier_delivery(...), validation trigger functions |

stock_movement_consume handles FIFO/LIFO consumption and stock movement writes atomically.

## Seed Data Inventory

Current seed files in database/seeds:

- 010_look_up_seed.sql
- 011_product_management_seed.sql
- 023_look_up_user_status_seed.sql
- 045_role_permission_seed.sql
- 046_report_lookup_seed.sql
- 047_report_seed.sql
- 049_navigation_seed.sql
- 050_account_seed.sql
- 051_manage_users_permission_seed.sql
- 052_manage_roles_permission_seed.sql
- 052_report_catalog_rendering_metadata.sql
- 053_system_settings_permission_seed.sql
- 054_system_settings_seed.sql

Additional programmatic seeding tool:

- mms-backend/src/scripts/seed_mms/index.ts
	- Deterministic, idempotent workflow seeding with configurable per-module record counts.
	- Generates linked construction-industry data across Product, Party, Material Control, Material Request, Purchase Order, Delivery Advice, Supplier Delivery, Stock Transfer, and Material Adjustment modules.

Report-related seed notes:

- report_seed defines 34 report catalog entries (INV, PUR, WAR, WH, PRO, PRJ, ACC, ADM, MLS code groups).
- report_catalog rendering metadata seed adds jrxml_file, jrxml_file_xls, format flags, paper settings, and optional endpoint override columns.

## Lookup and Permission Highlights

Lookup types used by newer features:

- project_type
- payment_terms
- REPORT_CATEGORY
- REPORT_TYPE
- REPORT_PARAMETER_DATA_TYPE
- REPORT_CONTROL_TYPE
- REPORT_STATUS

Permission modules added/used by current backend routes:

- User Management
- Manage Roles
- Project Management
- Supplier
- Delivery Advice
- Supplier Delivery
- Stock Transfer
- Inventory Adjustment
- System Settings
- Report Catalog (per-report permission codes: REPORT_<REPORT_CODE>)

## Cross References

- [docs/01_PROJECT_CONTEXT.md](01_PROJECT_CONTEXT.md)
- [docs/03_BUSINESS_FLOW.md](03_BUSINESS_FLOW.md)
- [docs/04_DEVELOPMENT_GUIDE.md](04_DEVELOPMENT_GUIDE.md)
- [database/migrations/053_system_settings.sql](../database/migrations/053_system_settings.sql)
- [database/seeds/054_system_settings_seed.sql](../database/seeds/054_system_settings_seed.sql)

## Revision History

| Date | Author | Summary |
|---|---|---|
| 2026-08-01 | Copilot | Added missing migrations 050-053, documented new tables and seed files, corrected reporting schema notes, and aligned permission and lookup sections with current implementation. |
| `REPORT_CATEGORY` | Inventory, Purchasing, Warehouse, Projects, Accounting, Administration |
