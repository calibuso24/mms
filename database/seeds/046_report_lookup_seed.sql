-- ============================================================================
-- MMS Report Catalog - Lookup Seed Script
-- Generated for PostgreSQL
-- Purpose: Populate look_up table with report-related lookup values
--
-- This script is idempotent - it can be run multiple times safely using 
-- ON CONFLICT (look_up_type, name) DO NOTHING pattern
-- ============================================================================

-- ============================================================================
-- SECTION 1: REPORT_CATEGORY LOOKUP TYPE
-- ============================================================================
-- Insert report categories
INSERT INTO look_up (
    look_up_type,
    code,
    name,
    description,
    display_order,
    is_active,
    log_module_created
)
VALUES
    ('REPORT_CATEGORY', 'INVENTORY', 'Inventory', 'Reports related to inventory management and stock levels', 1, TRUE, 'report_catalog'),
    ('REPORT_CATEGORY', 'PURCHASING', 'Purchasing', 'Reports related to purchasing and procurement', 2, TRUE, 'report_catalog'),
    ('REPORT_CATEGORY', 'WAREHOUSE', 'Warehouse', 'Reports related to warehouse operations', 3, TRUE, 'report_catalog'),
    ('REPORT_CATEGORY', 'PROJECTS', 'Projects', 'Reports related to project material management', 4, TRUE, 'report_catalog'),
    ('REPORT_CATEGORY', 'ACCOUNTING', 'Accounting', 'Reports related to accounting and financial data', 5, TRUE, 'report_catalog'),
    ('REPORT_CATEGORY', 'ADMINISTRATION', 'Administration', 'Reports related to system administration and audit', 6, TRUE, 'report_catalog')
ON CONFLICT (look_up_type, name) DO NOTHING;

-- ============================================================================
-- SECTION 2: REPORT_TYPE LOOKUP TYPE
-- ============================================================================
-- Insert report types
INSERT INTO look_up (
    look_up_type,
    code,
    name,
    description,
    display_order,
    is_active,
    log_module_created
)
VALUES
    ('REPORT_TYPE', 'SQL', 'SQL', 'Direct SQL query-based report', 1, TRUE, 'report_catalog'),
    ('REPORT_TYPE', 'JASPER', 'Jasper Report', 'Report generated using JasperReports framework', 2, TRUE, 'report_catalog'),
    ('REPORT_TYPE', 'CRYSTAL', 'Crystal Report', 'Report generated using Crystal Reports', 3, TRUE, 'report_catalog'),
    ('REPORT_TYPE', 'SPROC', 'Stored Procedure', 'Report generated from database stored procedure', 4, TRUE, 'report_catalog'),
    ('REPORT_TYPE', 'PDF', 'PDF', 'PDF format report', 5, TRUE, 'report_catalog'),
    ('REPORT_TYPE', 'EXCEL', 'Excel', 'Excel spreadsheet report', 6, TRUE, 'report_catalog'),
    ('REPORT_TYPE', 'CSV', 'CSV', 'Comma-separated values report', 7, TRUE, 'report_catalog')
ON CONFLICT (look_up_type, name) DO NOTHING;

-- ============================================================================
-- SECTION 3: REPORT_PARAMETER_DATA_TYPE LOOKUP TYPE
-- ============================================================================
-- Insert parameter data types
INSERT INTO look_up (
    look_up_type,
    code,
    name,
    description,
    display_order,
    is_active,
    log_module_created
)
VALUES
    ('REPORT_PARAMETER_DATA_TYPE', 'STRING', 'String', 'Text parameter', 1, TRUE, 'report_catalog'),
    ('REPORT_PARAMETER_DATA_TYPE', 'INTEGER', 'Integer', 'Whole number parameter', 2, TRUE, 'report_catalog'),
    ('REPORT_PARAMETER_DATA_TYPE', 'DECIMAL', 'Decimal', 'Decimal number parameter', 3, TRUE, 'report_catalog'),
    ('REPORT_PARAMETER_DATA_TYPE', 'BOOLEAN', 'Boolean', 'True/False boolean parameter', 4, TRUE, 'report_catalog'),
    ('REPORT_PARAMETER_DATA_TYPE', 'DATE', 'Date', 'Date parameter (YYYY-MM-DD)', 5, TRUE, 'report_catalog'),
    ('REPORT_PARAMETER_DATA_TYPE', 'DATETIME', 'DateTime', 'Date and time parameter (YYYY-MM-DD HH:MM:SS)', 6, TRUE, 'report_catalog')
ON CONFLICT (look_up_type, name) DO NOTHING;

-- ============================================================================
-- SECTION 4: REPORT_CONTROL_TYPE LOOKUP TYPE
-- ============================================================================
-- Insert parameter control types
INSERT INTO look_up (
    look_up_type,
    code,
    name,
    description,
    display_order,
    is_active,
    log_module_created
)
VALUES
    ('REPORT_CONTROL_TYPE', 'TEXTBOX', 'Textbox', 'Single-line text input', 1, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'TEXTAREA', 'Textarea', 'Multi-line text input', 2, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'DROPDOWN', 'Dropdown', 'Single-select dropdown list', 3, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'MULTISELECT', 'Multi Select', 'Multi-select dropdown list', 4, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'CHECKBOX', 'Checkbox', 'Boolean checkbox control', 5, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'RADIO', 'Radio Button', 'Radio button group control', 6, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'DATEPICKER', 'Date Picker', 'Date picker control', 7, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'DATERANGE', 'Date Range', 'Date range picker control', 8, TRUE, 'report_catalog'),
    ('REPORT_CONTROL_TYPE', 'NUMBER', 'Number', 'Numeric input control', 9, TRUE, 'report_catalog')
ON CONFLICT (look_up_type, name) DO NOTHING;

-- ============================================================================
-- SECTION 5: REPORT_STATUS LOOKUP TYPE
-- ============================================================================
-- Insert report execution status values
INSERT INTO look_up (
    look_up_type,
    code,
    name,
    description,
    display_order,
    is_active,
    log_module_created
)
VALUES
    ('REPORT_STATUS', 'SUCCESS', 'Success', 'Report generated successfully', 1, TRUE, 'report_catalog'),
    ('REPORT_STATUS', 'FAILED', 'Failed', 'Report generation failed', 2, TRUE, 'report_catalog'),
    ('REPORT_STATUS', 'RUNNING', 'Running', 'Report generation is in progress', 3, TRUE, 'report_catalog')
ON CONFLICT (look_up_type, name) DO NOTHING;
