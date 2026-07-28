-- ============================================================================
-- MMS Report Catalog Module - Comprehensive Deployment Guide
-- ============================================================================
-- Generated: 2026-07-28
-- Purpose: Complete documentation for deploying the Report Catalog module
-- ============================================================================

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- The Report Catalog module provides a comprehensive framework for managing,
-- configuring, and controlling access to system reports. It includes:
--
-- 1. Report Definitions (report_catalog)
-- 2. Report Parameters (report_parameter)
-- 3. Role-Based Access Control (report_permission)
-- 4. Execution History & Audit Trail (report_history)
--
-- All tables follow MMS naming conventions and include complete audit trails.

-- ============================================================================
-- SECTION 1: DEPLOY TABLES
-- ============================================================================
-- Execute the following scripts in order to deploy the complete module:
--
-- 1. 046_report_catalog.sql
--    - Creates report_catalog table with indexes and foreign keys
--    - Manages report definitions, metadata, and file locations
--
-- 2. 047_report_parameter.sql
--    - Creates report_parameter table for parameter configuration
--    - Links parameters to reports with data and control types
--
-- 3. 048_report_history.sql
--    - Creates report_history table for audit trail
--    - Tracks report execution, parameters, and results
--
-- 4. 046_report_lookup_seed.sql (in seeds/)
--    - Populates look_up table with report categories, types, etc.
--    - MUST be executed after table creation
--    - Idempotent - safe to run multiple times
--
-- 5. 047_report_seed.sql (in seeds/)
--    - Populates report_catalog with initial report definitions
--    - Creates sample parameters for various reports
--    - Sets up role-based permissions using existing permission/role_permission tables
--    - MUST be executed after 046_report_lookup_seed.sql
--    - Idempotent - safe to run multiple times

-- ============================================================================
-- DEPLOYMENT SCRIPT TEMPLATE (Linux/macOS)
-- ============================================================================
-- #!/bin/bash
-- 
-- PGHOST=${DB_HOST:-localhost}
-- PGPORT=${DB_PORT:-5432}
-- PGDATABASE=${DB_NAME:-mms}
-- PGUSER=${DB_USER:-postgres}
-- PGPASSWORD=${DB_PASSWORD}
-- export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD
-- 
-- echo "Deploying Report Catalog Module..."
-- 
-- psql -f migrations/046_report_catalog.sql
-- psql -f migrations/047_report_parameter.sql
-- psql -f migrations/048_report_history.sql
-- psql -f seeds/046_report_lookup_seed.sql
-- psql -f seeds/047_report_seed.sql
-- 
-- echo "Report Catalog Module deployed successfully!"

-- ============================================================================
-- DEPLOYMENT SCRIPT TEMPLATE (Windows)
-- ============================================================================
-- @echo off
-- setlocal enabledelayedexpansion
-- 
-- set "PGHOST=%DB_HOST:localhost=%"
-- set "PGPORT=%DB_PORT:5432=%"
-- set "PGDATABASE=%DB_NAME:mms=%"
-- set "PGUSER=%DB_USER:postgres=%"
-- set "PGPASSWORD=%DB_PASSWORD%"
-- 
-- echo Deploying Report Catalog Module...
-- 
-- psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f migrations\046_report_catalog.sql
-- psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f migrations\047_report_parameter.sql
-- psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f migrations\048_report_history.sql
-- psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f seeds\046_report_lookup_seed.sql
-- psql -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -f seeds\047_report_seed.sql
-- 
-- echo Report Catalog Module deployed successfully!

-- ============================================================================
-- SCHEMA SUMMARY
-- ============================================================================

-- TABLE: report_catalog (Master report definitions)
-- ┌─────────────────────────────────────────────────────────────┐
-- │ COLUMN NAME                 │ TYPE        │ CONSTRAINTS     │
-- ├─────────────────────────────────────────────────────────────┤
-- │ report_id                   │ BIGINT      │ PRIMARY KEY     │
-- │ report_category_lookup_id   │ BIGINT      │ FOREIGN KEY     │
-- │ report_type_lookup_id       │ BIGINT      │ FOREIGN KEY     │
-- │ report_code                 │ VARCHAR(20) │ UNIQUE NOT NULL │
-- │ report_name                 │ VARCHAR(150)│ UNIQUE NOT NULL │
-- │ description                 │ TEXT        │                 │
-- │ report_url                  │ VARCHAR(255)│                 │
-- │ report_file                 │ VARCHAR(255)│                 │
-- │ display_order               │ INTEGER     │ NOT NULL        │
-- │ requires_parameter          │ BOOLEAN     │ DEFAULT FALSE   │
-- │ is_active                   │ BOOLEAN     │ DEFAULT TRUE    │
-- │ is_deleted                  │ BOOLEAN     │ DEFAULT FALSE   │
-- │ log_date_created            │ TIMESTAMPTZ │ DEFAULT NOW()   │
-- │ log_created_by_account_id   │ BIGINT      │                 │
-- │ log_date_updated            │ TIMESTAMPTZ │                 │
-- │ log_updated_by_account_id   │ BIGINT      │                 │
-- │ log_date_deleted            │ TIMESTAMPTZ │                 │
-- │ log_deleted_by_account_id   │ BIGINT      │                 │
-- │ log_module_created          │ TEXT        │                 │
-- │ log_module_updated          │ TEXT        │                 │
-- └─────────────────────────────────────────────────────────────┘

-- TABLE: report_parameter (Report parameter configuration)
-- ┌─────────────────────────────────────────────────────────────┐
-- │ COLUMN NAME                 │ TYPE        │ CONSTRAINTS     │
-- ├─────────────────────────────────────────────────────────────┤
-- │ report_parameter_id         │ BIGINT      │ PRIMARY KEY     │
-- │ report_id                   │ BIGINT      │ FOREIGN KEY     │
-- │ parameter_name              │ VARCHAR(100)│ NOT NULL        │
-- │ display_name                │ VARCHAR(100)│ NOT NULL        │
-- │ data_type_lookup_id         │ BIGINT      │ FOREIGN KEY     │
-- │ control_type_lookup_id      │ BIGINT      │ FOREIGN KEY     │
-- │ lookup_table                │ VARCHAR(100)│                 │
-- │ default_value               │ VARCHAR(255)│                 │
-- │ is_required                 │ BOOLEAN     │ DEFAULT FALSE   │
-- │ display_order               │ INTEGER     │ DEFAULT 0       │
-- │ is_deleted                  │ BOOLEAN     │ DEFAULT FALSE   │
-- │ log_date_created            │ TIMESTAMPTZ │ DEFAULT NOW()   │
-- │ log_created_by_account_id   │ BIGINT      │                 │
-- │ log_date_updated            │ TIMESTAMPTZ │                 │
-- │ log_updated_by_account_id   │ BIGINT      │                 │
-- │ log_date_deleted            │ TIMESTAMPTZ │                 │
-- │ log_deleted_by_account_id   │ BIGINT      │                 │
-- │ log_module_created          │ TEXT        │                 │
-- │ log_module_updated          │ TEXT        │                 │
-- └─────────────────────────────────────────────────────────────┘

-- TABLE: report_history (Execution audit trail)
-- ┌─────────────────────────────────────────────────────────────┐
-- │ COLUMN NAME                 │ TYPE        │ CONSTRAINTS     │
-- ├─────────────────────────────────────────────────────────────┤
-- │ report_history_id           │ BIGINT      │ PRIMARY KEY     │
-- │ report_id                   │ BIGINT      │ FOREIGN KEY     │
-- │ account_id                  │ BIGINT      │ FOREIGN KEY     │
-- │ parameters                  │ JSONB       │                 │
-- │ generated_file              │ VARCHAR(255)│                 │
-- │ execution_time_ms           │ INTEGER     │                 │
-- │ status_lookup_id            │ BIGINT      │ FOREIGN KEY     │
-- │ log_date_created            │ TIMESTAMPTZ │ DEFAULT NOW()   │
-- └─────────────────────────────────────────────────────────────┘

-- PERMISSIONS are managed through existing system tables:
-- - permission table: Report Catalog module permissions
-- - role_permission table: Role-to-permission mappings

-- ============================================================================
-- LOOKUP VALUES CREATED
-- ============================================================================

-- REPORT_CATEGORY: Inventory, Purchasing, Warehouse, Projects, Accounting, Administration
-- REPORT_TYPE: SQL, Jasper Report, Crystal Report, Stored Procedure, PDF, Excel, CSV
-- REPORT_PARAMETER_DATA_TYPE: String, Integer, Decimal, Boolean, Date, DateTime
-- REPORT_CONTROL_TYPE: Textbox, Textarea, Dropdown, Multi Select, Checkbox, Radio Button, Date Picker, Date Range, Number
-- REPORT_STATUS: Success, Failed, Running

-- ============================================================================
-- INITIAL REPORT DATA CREATED
-- ============================================================================

-- Inventory Reports (7):
--   INV001 - Inventory Summary
--   INV002 - Inventory Ledger
--   INV003 - Stock Card
--   INV004 - Stock Movement
--   INV005 - Reorder Level
--   INV006 - Expiring Materials
--   INV007 - Inventory Adjustment

-- Purchasing Reports (5):
--   PUR001 - Purchase Requests
--   PUR002 - Purchase Orders
--   PUR003 - Supplier Performance
--   PUR004 - Purchase Order Status
--   PUR005 - Pending Deliveries

-- Warehouse Reports (4):
--   WAR001 - Receiving Report
--   WAR002 - Material Issuance
--   WAR003 - Warehouse Transfer
--   WAR004 - Returned Materials

-- Project Reports (3):
--   PRO001 - Material Requests
--   PRO002 - Project Material Consumption
--   PRO003 - Material Budget vs Actual

-- Accounting Reports (4):
--   ACC001 - Inventory Valuation
--   ACC002 - Inventory Cost Analysis
--   ACC003 - Quarterly Audit
--   ACC004 - Material Expense Summary

-- Administration Reports (4):
--   ADM001 - User Activity
--   ADM002 - Audit Trail
--   ADM003 - Login History
--   ADM004 - Permission Matrix

-- Total: 27 Reports

-- ============================================================================
-- SAMPLE REPORT PARAMETERS CREATED
-- ============================================================================

-- Inventory Summary: date_from, date_to, warehouse_id
-- Purchase Orders: date_from, date_to, supplier_id, status_id
-- Stock Card: product_id, warehouse_id
-- Project Material Consumption: project_id, date_from, date_to

-- ============================================================================
-- ROLE-BASED PERMISSIONS CREATED
-- ============================================================================

-- Super Administrator & Administrator: ALL REPORTS
-- Inventory Staff & Supervisor: Inventory Reports (7)
-- Purchasing Staff & Supervisor: Purchasing Reports (5)
-- Warehouse Staff & Supervisor: Warehouse Reports (4)
-- Coordinating Staff & Supervisor: Project Reports (3)
-- Accounting Staff & Supervisor: Accounting Reports (4)
-- Auditor: Administration Reports (4)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Use these queries to verify the deployment was successful:

-- Check report catalog count:
-- SELECT COUNT(*) as total_reports FROM report_catalog WHERE is_deleted = FALSE;
-- Expected: 27

-- Check parameters count:
-- SELECT COUNT(*) as total_parameters FROM report_parameter WHERE is_deleted = FALSE;
-- Expected: 13

-- Check permissions count:
-- SELECT COUNT(*) as total_permissions FROM report_permission WHERE is_deleted = FALSE;
-- Expected: Multiple entries based on role-report combinations

-- Check lookup records:
-- SELECT look_up_type, COUNT(*) as count
-- FROM look_up
-- WHERE look_up_type LIKE 'REPORT%'
-- GROUP BY look_up_type;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback the entire module, execute:
-- psql -f migrations/999_report_catalog_rollback.sql
--
-- This will:
-- 1. Drop all report permissions
-- 2. Drop report_history table
-- 3. Drop report_parameter table
-- 4. Drop report_catalog table
-- 5. Remove all report-related lookup entries
--
-- WARNING: This operation is irreversible. Ensure you have backups before executing.

-- ============================================================================
-- ADDITIONAL QUERIES
-- ============================================================================

-- Get all reports by category:
-- SELECT rc.report_code, rc.report_name, lu.name as category
-- FROM report_catalog rc
-- JOIN look_up lu ON rc.report_category_lookup_id = lu.look_up_id
-- WHERE rc.is_deleted = FALSE
-- ORDER BY lu.display_order, rc.display_order;

-- Get permissions for a specific role:
-- SELECT rc.report_code, rc.report_name, rp.can_view
-- FROM report_permission rp
-- JOIN role r ON rp.role_id = r.role_id
-- JOIN report_catalog rc ON rp.report_id = rc.report_id
-- WHERE r.role_code = 'INV_STAFF'
--   AND rp.is_deleted = FALSE
--   AND rc.is_deleted = FALSE
-- ORDER BY rc.report_code;

-- Get report execution history:
-- SELECT rh.report_history_id, rc.report_name, a.account_name,
--        rh.execution_time_ms, lu.name as status, rh.log_date_created
-- FROM report_history rh
-- JOIN report_catalog rc ON rh.report_id = rc.report_id
-- JOIN account a ON rh.account_id = a.account_id
-- LEFT JOIN look_up lu ON rh.status_lookup_id = lu.look_up_id
-- ORDER BY rh.log_date_created DESC
-- LIMIT 10;

-- ============================================================================
-- END OF DEPLOYMENT GUIDE
-- ============================================================================
