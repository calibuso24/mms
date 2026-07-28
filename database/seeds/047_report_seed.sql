-- ============================================================================
-- MMS Report Catalog - Report and Permission Seed Script
-- Generated for PostgreSQL
-- Purpose: Populate report_catalog, report_parameter, and report_permission tables
--
-- This script is idempotent - it can be run multiple times safely using 
-- ON CONFLICT ... DO NOTHING pattern
-- ============================================================================

-- ============================================================================
-- SECTION 0: SEED REPORT CATEGORY LOOKUPS
-- ============================================================================

-- Insert report category lookups if they don't exist
INSERT INTO look_up (look_up_type, code, name, description, display_order, is_active, log_date_created)
VALUES
    ('REPORT_CATEGORY', 'INV', 'Inventory', 'Inventory reports', 0, true, CURRENT_TIMESTAMP),
    ('REPORT_CATEGORY', 'PUR', 'Purchasing', 'Purchasing reports', 1, true, CURRENT_TIMESTAMP),
    ('REPORT_CATEGORY', 'WH', 'Warehouse', 'Warehouse reports', 2, true, CURRENT_TIMESTAMP),
    ('REPORT_CATEGORY', 'PRJ', 'Projects', 'Project reports', 3, true, CURRENT_TIMESTAMP),
    ('REPORT_CATEGORY', 'ACC', 'Accounting', 'Accounting reports', 4, true, CURRENT_TIMESTAMP),
    ('REPORT_CATEGORY', 'ADM', 'Administration', 'Administration reports', 5, true, CURRENT_TIMESTAMP)
ON CONFLICT (look_up_type, name) DO NOTHING;

-- Create index for report category lookups
CREATE INDEX IF NOT EXISTS idx_look_up_type_code 
ON look_up(look_up_type, code);

-- ============================================================================
-- SECTION 1: SEED REPORT CATALOG DATA
-- ============================================================================

-- Function to get lookup ID by type and name (used in report creation)
-- Note: Using CTE to fetch lookup IDs for cleaner inserts

WITH lookup_ids AS (
    SELECT 
        look_up_id,
        look_up_type,
        name
    FROM look_up
    WHERE look_up_type IN ('REPORT_CATEGORY', 'REPORT_TYPE')
)

-- INVENTORY REPORTS (Category: Inventory)
INSERT INTO report_catalog (
    report_code,
    report_name,
    report_category_lookup_id,
    report_type_lookup_id,
    description,
    report_url,
    display_order,
    requires_parameter,
    is_active,
    log_module_created
)
SELECT
    'INV001',
    'Inventory Summary',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Provides a comprehensive summary of current inventory levels by product, warehouse, and status',
    '/reports/inv001',
    1,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'INV001')

UNION ALL

SELECT
    'INV002',
    'Inventory Ledger',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Detailed transaction-level inventory ledger for auditing and reconciliation',
    '/reports/inv002',
    2,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'INV002')

UNION ALL

SELECT
    'INV003',
    'Stock Card',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Individual stock card report showing in/out movements for a specific material',
    '/reports/inv003',
    3,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'INV003')

UNION ALL

SELECT
    'INV004',
    'Stock Movement',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Report of all stock movements within a specified date range',
    '/reports/inv004',
    4,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'INV004')

UNION ALL

SELECT
    'INV005',
    'Reorder Level',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Materials that have fallen below their reorder levels',
    '/reports/inv005',
    5,
    FALSE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'INV005')

UNION ALL

SELECT
    'INV006',
    'Expiring Materials',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Materials approaching expiration or already expired',
    '/reports/inv006',
    6,
    FALSE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'INV006')

UNION ALL

SELECT
    'INV007',
    'Inventory Adjustment',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Report of inventory adjustments made during physical counts',
    '/reports/inv007',
    7,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'INV007')

-- PURCHASING REPORTS (Category: Purchasing)
UNION ALL

SELECT
    'PUR001',
    'Purchase Requests',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Purchasing'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'List of all material purchase requests within a date range',
    '/reports/pur001',
    1,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PUR001')

UNION ALL

SELECT
    'PUR002',
    'Purchase Orders',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Purchasing'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Detailed purchase orders with item-level breakdown',
    '/reports/pur002',
    2,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PUR002')

UNION ALL

SELECT
    'PUR003',
    'Supplier Performance',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Purchasing'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Supplier performance metrics including delivery timeliness and quality',
    '/reports/pur003',
    3,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PUR003')

UNION ALL

SELECT
    'PUR004',
    'Purchase Order Status',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Purchasing'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Status tracking of purchase orders and delivery receipts',
    '/reports/pur004',
    4,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PUR004')

UNION ALL

SELECT
    'PUR005',
    'Pending Deliveries',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Purchasing'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Purchase orders with pending or delayed deliveries',
    '/reports/pur005',
    5,
    FALSE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PUR005')

-- WAREHOUSE REPORTS (Category: Warehouse)
UNION ALL

SELECT
    'WAR001',
    'Receiving Report',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Warehouse'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Report of goods received from suppliers',
    '/reports/war001',
    1,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'WAR001')

UNION ALL

SELECT
    'WAR002',
    'Material Issuance',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Warehouse'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Report of materials issued from warehouse to projects',
    '/reports/war002',
    2,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'WAR002')

UNION ALL

SELECT
    'WAR003',
    'Warehouse Transfer',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Warehouse'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Inter-warehouse material transfers',
    '/reports/war003',
    3,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'WAR003')

UNION ALL

SELECT
    'WAR004',
    'Returned Materials',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Warehouse'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Materials returned from projects back to warehouse',
    '/reports/war004',
    4,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'WAR004')

UNION ALL

SELECT
    'WH001',
    'Warehouse Stock Movement',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Warehouse'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Warehouse stock movement report',
    '/reports/wh001',
    5,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'WH001')

UNION ALL

SELECT
    'WH002',
    'Stock Transfer',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Warehouse'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Inter-warehouse stock transfers',
    '/reports/wh002',
    6,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'WH002')

-- PROJECTS REPORTS (Category: Projects)
UNION ALL

SELECT
    'PRO001',
    'Material Requests',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Projects'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Material requests submitted by projects',
    '/reports/pro001',
    1,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PRO001')

UNION ALL

SELECT
    'PRO002',
    'Project Material Consumption',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Projects'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Material consumption and usage by project',
    '/reports/pro002',
    2,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PRO002')

UNION ALL

SELECT
    'PRO003',
    'Material Budget vs Actual',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Projects'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Comparison of budgeted versus actual material consumption',
    '/reports/pro003',
    3,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PRO003')

UNION ALL

SELECT
    'PRJ001',
    'Project Summary',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Projects'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Project status summary',
    '/reports/prj001',
    4,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PRJ001')

UNION ALL

SELECT
    'PRJ002',
    'Job Order Status',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Projects'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Job order status and tracking',
    '/reports/prj002',
    5,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'PRJ002')

-- ACCOUNTING REPORTS (Category: Accounting)
UNION ALL

SELECT
    'ACC001',
    'Inventory Valuation',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Accounting'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Inventory value summary using various valuation methods',
    '/reports/acc001',
    1,
    FALSE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ACC001')

UNION ALL

SELECT
    'ACC002',
    'Inventory Cost Analysis',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Accounting'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Detailed cost analysis of inventory movements',
    '/reports/acc002',
    2,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ACC002')

UNION ALL

SELECT
    'ACC003',
    'Quarterly Audit',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Accounting'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Quarterly inventory audit and reconciliation report',
    '/reports/acc003',
    3,
    FALSE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ACC003')

UNION ALL

SELECT
    'ACC004',
    'Material Expense Summary',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Accounting'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Summary of material expenses by category and period',
    '/reports/acc004',
    4,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ACC004')

-- ADMINISTRATION REPORTS (Category: Administration)
UNION ALL

SELECT
    'ADM001',
    'User Activity',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Administration'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'User activity log and system usage statistics',
    '/reports/adm001',
    1,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ADM001')

UNION ALL

SELECT
    'ADM002',
    'Audit Trail',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Administration'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Comprehensive audit trail of all system changes',
    '/reports/adm002',
    2,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ADM002')

UNION ALL

SELECT
    'ADM003',
    'Login History',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Administration'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'User login and session history',
    '/reports/adm003',
    3,
    TRUE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ADM003')

UNION ALL

SELECT
    'ADM004',
    'Permission Matrix',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Administration'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Permission matrix showing roles and their report access',
    '/reports/adm004',
    4,
    FALSE,
    TRUE,
    'report_catalog'
WHERE NOT EXISTS (SELECT 1 FROM report_catalog WHERE report_code = 'ADM004');

-- ============================================================================
-- SECTION 2: SEED REPORT PARAMETERS
-- ============================================================================

-- Inventory Summary Parameters
INSERT INTO report_parameter (
    report_id,
    parameter_name,
    display_name,
    data_type_lookup_id,
    control_type_lookup_id,
    is_required,
    display_order,
    log_module_created
)
SELECT
    r.report_id,
    'date_from',
    'Date From',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Date'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Date Picker'),
    TRUE,
    1,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'INV001'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'date_from'
    )

UNION ALL

SELECT
    r.report_id,
    'date_to',
    'Date To',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Date'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Date Picker'),
    TRUE,
    2,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'INV001'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'date_to'
    )

UNION ALL

SELECT
    r.report_id,
    'warehouse_id',
    'Warehouse',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Integer'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Dropdown'),
    TRUE,
    3,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'INV001'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'warehouse_id'
    )

-- Purchase Order Parameters
UNION ALL

SELECT
    r.report_id,
    'date_from',
    'Date From',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Date'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Date Picker'),
    TRUE,
    1,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'PUR002'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'date_from'
    )

UNION ALL

SELECT
    r.report_id,
    'date_to',
    'Date To',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Date'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Date Picker'),
    TRUE,
    2,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'PUR002'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'date_to'
    )

UNION ALL

SELECT
    r.report_id,
    'supplier_id',
    'Supplier',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Integer'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Dropdown'),
    TRUE,
    3,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'PUR002'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'supplier_id'
    )

UNION ALL

SELECT
    r.report_id,
    'status_id',
    'Status',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Integer'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Dropdown'),
    FALSE,
    4,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'PUR002'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'status_id'
    )

-- Stock Card Parameters
UNION ALL

SELECT
    r.report_id,
    'product_id',
    'Product',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Integer'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Dropdown'),
    TRUE,
    1,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'INV003'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'product_id'
    )

UNION ALL

SELECT
    r.report_id,
    'warehouse_id',
    'Warehouse',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Integer'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Dropdown'),
    TRUE,
    2,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'INV003'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'warehouse_id'
    )

-- Project Material Consumption Parameters
UNION ALL

SELECT
    r.report_id,
    'project_id',
    'Project',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Integer'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Dropdown'),
    TRUE,
    1,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'PRO002'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'project_id'
    )

UNION ALL

SELECT
    r.report_id,
    'date_from',
    'Date From',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Date'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Date Picker'),
    TRUE,
    2,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'PRO002'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'date_from'
    )

UNION ALL

SELECT
    r.report_id,
    'date_to',
    'Date To',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_PARAMETER_DATA_TYPE' AND name = 'Date'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CONTROL_TYPE' AND name = 'Date Picker'),
    TRUE,
    3,
    'report_catalog'
FROM report_catalog r
WHERE r.report_code = 'PRO002'
    AND NOT EXISTS (
        SELECT 1 FROM report_parameter rp
        WHERE rp.report_id = r.report_id AND rp.parameter_name = 'date_to'
    );

-- ============================================================================
-- SECTION 3: SEED REPORT PERMISSIONS (using existing permission system)
-- ============================================================================

-- Insert report permissions into the centralized permission table
INSERT INTO permission (
    module_name,
    permission_code,
    permission_name,
    description,
    is_active,
    log_module_created
)
SELECT
    'Report Catalog' as module_name,
    'REPORT_' || rc.report_code,
    'View ' || rc.report_name,
    'Access to report: ' || rc.report_name,
    TRUE,
    'report_catalog'
FROM report_catalog rc
WHERE rc.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM permission p
        WHERE p.module_name = 'Report Catalog' AND p.permission_code = 'REPORT_' || rc.report_code
    )
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Grant permissions to roles using the existing role_permission table
-- Super Administrator and Administrator: ALL reports
INSERT INTO role_permission (
    role_id,
    permission_id,
    is_active,
    log_module_created
)
SELECT
    r.role_id,
    p.permission_id,
    TRUE,
    'report_catalog'
FROM role r
CROSS JOIN permission p
WHERE r.role_code IN ('SUPER_ADMIN', 'ADMIN')
    AND r.is_deleted = FALSE
    AND p.module_name = 'Report Catalog'
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM role_permission rp
        WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Inventory reports: Inventory Staff and Supervisor
INSERT INTO role_permission (
    role_id,
    permission_id,
    is_active,
    log_module_created
)
SELECT
    r.role_id,
    p.permission_id,
    TRUE,
    'report_catalog'
FROM role r
CROSS JOIN permission p
WHERE r.role_code IN ('INV_STAFF', 'INV_SUPERVISOR')
    AND r.is_deleted = FALSE
    AND p.module_name = 'Report Catalog'
    AND p.permission_code IN ('REPORT_INV001', 'REPORT_INV002', 'REPORT_INV003', 'REPORT_INV004', 'REPORT_INV005', 'REPORT_INV006', 'REPORT_INV007')
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM role_permission rp
        WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Purchasing reports: Purchasing Staff and Supervisor
INSERT INTO role_permission (
    role_id,
    permission_id,
    is_active,
    log_module_created
)
SELECT
    r.role_id,
    p.permission_id,
    TRUE,
    'report_catalog'
FROM role r
CROSS JOIN permission p
WHERE r.role_code IN ('PURCH_STAFF', 'PURCH_SUPERVISOR')
    AND r.is_deleted = FALSE
    AND p.module_name = 'Report Catalog'
    AND p.permission_code IN ('REPORT_PUR001', 'REPORT_PUR002', 'REPORT_PUR003', 'REPORT_PUR004', 'REPORT_PUR005')
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM role_permission rp
        WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Warehouse reports: Warehouse Staff and Supervisor
INSERT INTO role_permission (
    role_id,
    permission_id,
    is_active,
    log_module_created
)
SELECT
    r.role_id,
    p.permission_id,
    TRUE,
    'report_catalog'
FROM role r
CROSS JOIN permission p
WHERE r.role_code IN ('WAREHOUSE_STAFF', 'WAREHOUSE_SUPERVISOR')
    AND r.is_deleted = FALSE
    AND p.module_name = 'Report Catalog'
    AND p.permission_code IN ('REPORT_WAR001', 'REPORT_WAR002', 'REPORT_WAR003', 'REPORT_WAR004', 'REPORT_WH001', 'REPORT_WH002')
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM role_permission rp
        WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Project reports: Coordinating Staff and Supervisor
INSERT INTO role_permission (
    role_id,
    permission_id,
    is_active,
    log_module_created
)
SELECT
    r.role_id,
    p.permission_id,
    TRUE,
    'report_catalog'
FROM role r
CROSS JOIN permission p
WHERE r.role_code IN ('COORD_STAFF', 'COORD_SUPERVISOR')
    AND r.is_deleted = FALSE
    AND p.module_name = 'Report Catalog'
    AND p.permission_code IN ('REPORT_PRO001', 'REPORT_PRO002', 'REPORT_PRO003', 'REPORT_PRJ001', 'REPORT_PRJ002')
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM role_permission rp
        WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Accounting reports: Accounting Staff and Supervisor
INSERT INTO role_permission (
    role_id,
    permission_id,
    is_active,
    log_module_created
)
SELECT
    r.role_id,
    p.permission_id,
    TRUE,
    'report_catalog'
FROM role r
CROSS JOIN permission p
WHERE r.role_code IN ('ACCOUNTING_STAFF', 'ACCOUNTING_SUPERVISOR')
    AND r.is_deleted = FALSE
    AND p.module_name = 'Report Catalog'
    AND p.permission_code IN ('REPORT_ACC001', 'REPORT_ACC002', 'REPORT_ACC003', 'REPORT_ACC004')
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM role_permission rp
        WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Administration reports: Auditor, Admin, Super Admin
INSERT INTO role_permission (
    role_id,
    permission_id,
    is_active,
    log_module_created
)
SELECT
    r.role_id,
    p.permission_id,
    TRUE,
    'report_catalog'
FROM role r
CROSS JOIN permission p
WHERE r.role_code IN ('AUDITOR', 'ADMIN', 'SUPER_ADMIN')
    AND r.is_deleted = FALSE
    AND p.module_name = 'Report Catalog'
    AND p.permission_code IN ('REPORT_ADM001', 'REPORT_ADM002', 'REPORT_ADM003', 'REPORT_ADM004')
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        SELECT 1 FROM role_permission rp
        WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;
