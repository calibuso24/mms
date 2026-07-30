-- ============================================================================
-- MMS Role Permission Seed Script
-- Generated for PostgreSQL
-- Purpose: Populate role_permission table with permission mappings for all roles
--
-- This script is idempotent - it can be run multiple times safely using 
-- INSERT ... WHERE NOT EXISTS pattern
-- ============================================================================

-- ============================================================================
-- SECTION 1: SEED ROLES
-- ============================================================================
-- Insert all required roles
INSERT INTO role (role_code, role_name, description, is_active)
VALUES
    ('SUPER_ADMIN', 'Super Administrator', 'Has all permissions on all modules', TRUE),
    ('ADMIN', 'Administrator', 'Has all permissions on all modules except critical settings', TRUE),
    ('AUDITOR', 'Auditor', 'View-only access with export and print capabilities', TRUE),
    ('COORD_STAFF', 'Coordinating Staff', 'Staff for coordination and project management', TRUE),
    ('COORD_SUPERVISOR', 'Coordinating Supervisor', 'Supervisor for coordination department', TRUE),
    ('PURCH_STAFF', 'Purchasing Staff', 'Staff for purchasing and procurement', TRUE),
    ('PURCH_SUPERVISOR', 'Purchasing Supervisor', 'Supervisor for purchasing department', TRUE),
    ('INV_STAFF', 'Inventory Staff', 'Staff for inventory management', TRUE),
    ('INV_SUPERVISOR', 'Inventory Supervisor', 'Supervisor for inventory department', TRUE),
    ('WAREHOUSE_STAFF', 'Warehouse Staff', 'Staff for warehouse operations', TRUE),
    ('WAREHOUSE_SUPERVISOR', 'Warehouse Supervisor', 'Supervisor for warehouse department', TRUE),
    ('ACCOUNTING_STAFF', 'Accounting Staff', 'Staff for accounting and finance', TRUE),
    ('ACCOUNTING_SUPERVISOR', 'Accounting Supervisor', 'Supervisor for accounting department', TRUE),
    ('SITE_STAFF', 'Site Staff', 'Staff for site operations', TRUE),
    ('SITE_SUPERVISOR', 'Site Supervisor', 'Supervisor for site operations', TRUE)
ON CONFLICT (role_code) DO NOTHING;

-- ============================================================================
-- SECTION 2: SEED PERMISSIONS
-- ============================================================================
-- Insert permission codes for common modules (accessible to all authenticated users)
-- Common modules: Dashboard, Profile, Notifications

INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Dashboard', 'VIEW', 'View Dashboard', 'View the main dashboard', TRUE),
    ('Dashboard', 'CREATE', 'Create Dashboard', 'Create dashboard widgets', TRUE),
    ('Dashboard', 'UPDATE', 'Update Dashboard', 'Update dashboard configuration', TRUE),
    ('Dashboard', 'DELETE', 'Delete Dashboard', 'Delete dashboard items', TRUE),
    ('Dashboard', 'EXPORT', 'Export Dashboard', 'Export dashboard data', TRUE),
    ('Dashboard', 'PRINT', 'Print Dashboard', 'Print dashboard', TRUE),
    ('Profile', 'VIEW', 'View Profile', 'View user profile', TRUE),
    ('Profile', 'UPDATE', 'Update Profile', 'Update user profile', TRUE),
    ('Profile', 'PRINT', 'Print Profile', 'Print profile information', TRUE),
    ('Notifications', 'VIEW', 'View Notifications', 'View notifications', TRUE),
    ('Notifications', 'CREATE', 'Create Notifications', 'Create notifications', TRUE),
    ('Notifications', 'DELETE', 'Delete Notifications', 'Delete notifications', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Insert permission codes for Coordinating modules
INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Material Request', 'VIEW', 'View Material Requests', 'View material requests', TRUE),
    ('Material Request', 'CREATE', 'Create Material Requests', 'Create new material requests', TRUE),
    ('Material Request', 'UPDATE', 'Update Material Requests', 'Update material requests', TRUE),
    ('Material Request', 'DELETE', 'Delete Material Requests', 'Delete material requests', TRUE),
    ('Material Request', 'APPROVE', 'Approve Material Requests', 'Approve material requests', TRUE),
    ('Material Request', 'EXPORT', 'Export Material Requests', 'Export material request data', TRUE),
    ('Material Request', 'PRINT', 'Print Material Requests', 'Print material requests', TRUE),
    ('Job Order', 'VIEW', 'View Job Orders', 'View job orders', TRUE),
    ('Job Order', 'CREATE', 'Create Job Orders', 'Create new job orders', TRUE),
    ('Job Order', 'UPDATE', 'Update Job Orders', 'Update job orders', TRUE),
    ('Job Order', 'DELETE', 'Delete Job Orders', 'Delete job orders', TRUE),
    ('Job Order', 'APPROVE', 'Approve Job Orders', 'Approve job orders', TRUE),
    ('Job Order', 'EXPORT', 'Export Job Orders', 'Export job order data', TRUE),
    ('Job Order', 'PRINT', 'Print Job Orders', 'Print job orders', TRUE),
    ('Site', 'VIEW', 'View Sites', 'View site information', TRUE),
    ('Site', 'CREATE', 'Create Sites', 'Create new sites', TRUE),
    ('Site', 'UPDATE', 'Update Sites', 'Update site information', TRUE),
    ('Site', 'DELETE', 'Delete Sites', 'Delete sites', TRUE),
    ('Site', 'APPROVE', 'Approve Sites', 'Approve site operations', TRUE),
    ('Site', 'PRINT', 'Print Sites', 'Print site information', TRUE),
    ('Project Management', 'VIEW', 'View Projects', 'View project information', TRUE),
    ('Project Management', 'CREATE', 'Create Projects', 'Create new projects', TRUE),
    ('Project Management', 'UPDATE', 'Update Projects', 'Update project information', TRUE),
    ('Project Management', 'DELETE', 'Delete Projects', 'Delete projects', TRUE),
    ('Project Management', 'EXPORT', 'Export Projects', 'Export project data', TRUE),
    ('Project Management', 'PRINT', 'Print Projects', 'Print project information', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Insert permission codes for Purchasing modules
INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Purchase Order', 'VIEW', 'View Purchase Orders', 'View purchase orders', TRUE),
    ('Purchase Order', 'CREATE', 'Create Purchase Orders', 'Create new purchase orders', TRUE),
    ('Purchase Order', 'UPDATE', 'Update Purchase Orders', 'Update purchase orders', TRUE),
    ('Purchase Order', 'DELETE', 'Delete Purchase Orders', 'Delete purchase orders', TRUE),
    ('Purchase Order', 'APPROVE', 'Approve Purchase Orders', 'Approve purchase orders', TRUE),
    ('Purchase Order', 'EXPORT', 'Export Purchase Orders', 'Export purchase order data', TRUE),
    ('Purchase Order', 'PRINT', 'Print Purchase Orders', 'Print purchase orders', TRUE),
    ('Purchase Request', 'VIEW', 'View Purchase Requests', 'View purchase requests', TRUE),
    ('Purchase Request', 'CREATE', 'Create Purchase Requests', 'Create new purchase requests', TRUE),
    ('Purchase Request', 'UPDATE', 'Update Purchase Requests', 'Update purchase requests', TRUE),
    ('Purchase Request', 'DELETE', 'Delete Purchase Requests', 'Delete purchase requests', TRUE),
    ('Purchase Request', 'APPROVE', 'Approve Purchase Requests', 'Approve purchase requests', TRUE),
    ('Purchase Request', 'EXPORT', 'Export Purchase Requests', 'Export purchase request data', TRUE),
    ('Purchase Request', 'PRINT', 'Print Purchase Requests', 'Print purchase requests', TRUE),
    ('Supplier', 'VIEW', 'View Suppliers', 'View supplier information', TRUE),
    ('Supplier', 'CREATE', 'Create Suppliers', 'Create new suppliers', TRUE),
    ('Supplier', 'UPDATE', 'Update Suppliers', 'Update supplier information', TRUE),
    ('Supplier', 'DELETE', 'Delete Suppliers', 'Delete suppliers', TRUE),
    ('Supplier', 'PRINT', 'Print Suppliers', 'Print supplier information', TRUE),
    ('Vendor', 'VIEW', 'View Vendors', 'View vendor information', TRUE),
    ('Vendor', 'CREATE', 'Create Vendors', 'Create new vendors', TRUE),
    ('Vendor', 'UPDATE', 'Update Vendors', 'Update vendor information', TRUE),
    ('Vendor', 'DELETE', 'Delete Vendors', 'Delete vendors', TRUE),
    ('Vendor', 'PRINT', 'Print Vendors', 'Print vendor information', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Insert permission codes for Inventory modules
INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Product', 'VIEW', 'View Products', 'View product catalog', TRUE),
    ('Product', 'CREATE', 'Create Products', 'Create new products', TRUE),
    ('Product', 'UPDATE', 'Update Products', 'Update product information', TRUE),
    ('Product', 'DELETE', 'Delete Products', 'Delete products', TRUE),
    ('Product', 'EXPORT', 'Export Products', 'Export product data', TRUE),
    ('Product', 'PRINT', 'Print Products', 'Print product information', TRUE),
    ('Category', 'VIEW', 'View Categories', 'View product categories', TRUE),
    ('Category', 'CREATE', 'Create Categories', 'Create new categories', TRUE),
    ('Category', 'UPDATE', 'Update Categories', 'Update category information', TRUE),
    ('Category', 'DELETE', 'Delete Categories', 'Delete categories', TRUE),
    ('Category', 'PRINT', 'Print Categories', 'Print category information', TRUE),
    ('Unit', 'VIEW', 'View Units', 'View units of measure', TRUE),
    ('Unit', 'CREATE', 'Create Units', 'Create new units of measure', TRUE),
    ('Unit', 'UPDATE', 'Update Units', 'Update units of measure', TRUE),
    ('Unit', 'DELETE', 'Delete Units', 'Delete units of measure', TRUE),
    ('Brand', 'VIEW', 'View Brands', 'View brands', TRUE),
    ('Brand', 'CREATE', 'Create Brands', 'Create new brands', TRUE),
    ('Brand', 'UPDATE', 'Update Brands', 'Update brand information', TRUE),
    ('Brand', 'DELETE', 'Delete Brands', 'Delete brands', TRUE),
    ('Stock', 'VIEW', 'View Stock', 'View stock information', TRUE),
    ('Stock', 'CREATE', 'Create Stock Entries', 'Create new stock entries', TRUE),
    ('Stock', 'UPDATE', 'Update Stock', 'Update stock information', TRUE),
    ('Stock', 'DELETE', 'Delete Stock', 'Delete stock entries', TRUE),
    ('Stock', 'EXPORT', 'Export Stock', 'Export stock data', TRUE),
    ('Stock', 'PRINT', 'Print Stock', 'Print stock information', TRUE),
    ('Inventory Adjustment', 'VIEW', 'View Inventory Adjustments', 'View inventory adjustments', TRUE),
    ('Inventory Adjustment', 'CREATE', 'Create Inventory Adjustments', 'Create new inventory adjustments', TRUE),
    ('Inventory Adjustment', 'UPDATE', 'Update Inventory Adjustments', 'Update inventory adjustments', TRUE),
    ('Inventory Adjustment', 'DELETE', 'Delete Inventory Adjustments', 'Delete inventory adjustments', TRUE),
    ('Inventory Adjustment', 'APPROVE', 'Approve Inventory Adjustments', 'Approve inventory adjustments', TRUE),
    ('Inventory Adjustment', 'EXPORT', 'Export Inventory Adjustments', 'Export inventory adjustment data', TRUE),
    ('Inventory Adjustment', 'PRINT', 'Print Inventory Adjustments', 'Print inventory adjustments', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Insert permission codes for Warehouse modules
INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Stock Transfer', 'VIEW', 'View Stock Transfers', 'View stock transfer records', TRUE),
    ('Stock Transfer', 'CREATE', 'Create Stock Transfers', 'Create new stock transfers', TRUE),
    ('Stock Transfer', 'UPDATE', 'Update Stock Transfers', 'Update stock transfer records', TRUE),
    ('Stock Transfer', 'DELETE', 'Delete Stock Transfers', 'Delete stock transfers', TRUE),
    ('Stock Transfer', 'APPROVE', 'Approve Stock Transfers', 'Approve stock transfers', TRUE),
    ('Stock Transfer', 'EXPORT', 'Export Stock Transfers', 'Export stock transfer data', TRUE),
    ('Stock Transfer', 'PRINT', 'Print Stock Transfers', 'Print stock transfer records', TRUE),
    ('Physical Count', 'VIEW', 'View Physical Counts', 'View physical count records', TRUE),
    ('Physical Count', 'CREATE', 'Create Physical Counts', 'Create new physical counts', TRUE),
    ('Physical Count', 'UPDATE', 'Update Physical Counts', 'Update physical count records', TRUE),
    ('Physical Count', 'DELETE', 'Delete Physical Counts', 'Delete physical counts', TRUE),
    ('Physical Count', 'APPROVE', 'Approve Physical Counts', 'Approve physical counts', TRUE),
    ('Physical Count', 'EXPORT', 'Export Physical Counts', 'Export physical count data', TRUE),
    ('Physical Count', 'PRINT', 'Print Physical Counts', 'Print physical count records', TRUE),
    ('Delivery Receipt', 'VIEW', 'View Delivery Receipts', 'View delivery receipt records', TRUE),
    ('Delivery Receipt', 'CREATE', 'Create Delivery Receipts', 'Create new delivery receipts', TRUE),
    ('Delivery Receipt', 'UPDATE', 'Update Delivery Receipts', 'Update delivery receipt records', TRUE),
    ('Delivery Receipt', 'DELETE', 'Delete Delivery Receipts', 'Delete delivery receipts', TRUE),
    ('Delivery Receipt', 'APPROVE', 'Approve Delivery Receipts', 'Approve delivery receipts', TRUE),
    ('Delivery Receipt', 'EXPORT', 'Export Delivery Receipts', 'Export delivery receipt data', TRUE),
    ('Delivery Receipt', 'PRINT', 'Print Delivery Receipts', 'Print delivery receipts', TRUE),
    ('Delivery Advice', 'VIEW', 'View Delivery Advice', 'View delivery advice records', TRUE),
    ('Delivery Advice', 'CREATE', 'Create Delivery Advice', 'Create new delivery advice', TRUE),
    ('Delivery Advice', 'UPDATE', 'Update Delivery Advice', 'Update delivery advice records', TRUE),
    ('Delivery Advice', 'DELETE', 'Delete Delivery Advice', 'Delete delivery advice', TRUE),
    ('Delivery Advice', 'EXPORT', 'Export Delivery Advice', 'Export delivery advice data', TRUE),
    ('Delivery Advice', 'PRINT', 'Print Delivery Advice', 'Print delivery advice', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Insert permission codes for Accounting modules
INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Invoice', 'VIEW', 'View Invoices', 'View invoices', TRUE),
    ('Invoice', 'CREATE', 'Create Invoices', 'Create new invoices', TRUE),
    ('Invoice', 'UPDATE', 'Update Invoices', 'Update invoice information', TRUE),
    ('Invoice', 'DELETE', 'Delete Invoices', 'Delete invoices', TRUE),
    ('Invoice', 'APPROVE', 'Approve Invoices', 'Approve invoices', TRUE),
    ('Invoice', 'EXPORT', 'Export Invoices', 'Export invoice data', TRUE),
    ('Invoice', 'PRINT', 'Print Invoices', 'Print invoices', TRUE),
    ('Payment', 'VIEW', 'View Payments', 'View payment records', TRUE),
    ('Payment', 'CREATE', 'Create Payments', 'Create new payment records', TRUE),
    ('Payment', 'UPDATE', 'Update Payments', 'Update payment records', TRUE),
    ('Payment', 'DELETE', 'Delete Payments', 'Delete payment records', TRUE),
    ('Payment', 'APPROVE', 'Approve Payments', 'Approve payments', TRUE),
    ('Payment', 'EXPORT', 'Export Payments', 'Export payment data', TRUE),
    ('Payment', 'PRINT', 'Print Payments', 'Print payment records', TRUE),
    ('Budget', 'VIEW', 'View Budget', 'View budget information', TRUE),
    ('Budget', 'CREATE', 'Create Budget', 'Create new budget', TRUE),
    ('Budget', 'UPDATE', 'Update Budget', 'Update budget information', TRUE),
    ('Budget', 'APPROVE', 'Approve Budget', 'Approve budget', TRUE),
    ('Budget', 'PRINT', 'Print Budget', 'Print budget information', TRUE),
    ('Financial Reports', 'VIEW', 'View Financial Reports', 'View financial reports', TRUE),
    ('Financial Reports', 'EXPORT', 'Export Financial Reports', 'Export financial report data', TRUE),
    ('Financial Reports', 'PRINT', 'Print Financial Reports', 'Print financial reports', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Insert permission codes for Site modules
INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Material Control', 'VIEW', 'View Material Control', 'View material control records', TRUE),
    ('Material Control', 'CREATE', 'Create Material Control', 'Create new material control records', TRUE),
    ('Material Control', 'UPDATE', 'Update Material Control', 'Update material control records', TRUE),
    ('Material Control', 'DELETE', 'Delete Material Control', 'Delete material control records', TRUE),
    ('Material Control', 'APPROVE', 'Approve Material Control', 'Approve material control', TRUE),
    ('Material Control', 'EXPORT', 'Export Material Control', 'Export material control data', TRUE),
    ('Material Control', 'PRINT', 'Print Material Control', 'Print material control records', TRUE),
    ('Site Inventory', 'VIEW', 'View Site Inventory', 'View site inventory', TRUE),
    ('Site Inventory', 'CREATE', 'Create Site Inventory', 'Create site inventory entries', TRUE),
    ('Site Inventory', 'UPDATE', 'Update Site Inventory', 'Update site inventory', TRUE),
    ('Site Inventory', 'EXPORT', 'Export Site Inventory', 'Export site inventory data', TRUE),
    ('Site Inventory', 'PRINT', 'Print Site Inventory', 'Print site inventory', TRUE),
    ('Site Purchase', 'VIEW', 'View Site Purchase', 'View site purchase records', TRUE),
    ('Site Purchase', 'CREATE', 'Create Site Purchase', 'Create new site purchase', TRUE),
    ('Site Purchase', 'UPDATE', 'Update Site Purchase', 'Update site purchase records', TRUE),
    ('Site Purchase', 'APPROVE', 'Approve Site Purchase', 'Approve site purchase', TRUE),
    ('Site Purchase', 'EXPORT', 'Export Site Purchase', 'Export site purchase data', TRUE),
    ('Site Purchase', 'PRINT', 'Print Site Purchase', 'Print site purchase records', TRUE),
    ('Site Return', 'VIEW', 'View Site Return', 'View site return records', TRUE),
    ('Site Return', 'CREATE', 'Create Site Return', 'Create new site return', TRUE),
    ('Site Return', 'UPDATE', 'Update Site Return', 'Update site return records', TRUE),
    ('Site Return', 'APPROVE', 'Approve Site Return', 'Approve site return', TRUE),
    ('Site Return', 'PRINT', 'Print Site Return', 'Print site return records', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- Insert permission codes for Audit module
INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Audit Log', 'VIEW', 'View Audit Logs', 'View audit logs', TRUE),
    ('Audit Log', 'EXPORT', 'Export Audit Logs', 'Export audit log data', TRUE),
    ('Audit Log', 'PRINT', 'Print Audit Logs', 'Print audit logs', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

-- ============================================================================
-- SECTION 3: SEED ROLE_PERMISSION MAPPINGS
-- ============================================================================

-- ============================================================================
-- 3.1 SUPER ADMINISTRATOR
-- All permissions on all modules
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
CROSS JOIN permission p
WHERE r.role_name = 'Super Administrator'
  AND p.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.2 ADMINISTRATOR
-- All permissions on all modules except critical system settings
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
CROSS JOIN permission p
WHERE r.role_name = 'Administrator'
  AND p.is_active = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.3 AUDITOR
-- VIEW, PRINT, EXPORT permissions on all modules except critical system access
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Auditor'
  AND p.permission_code IN ('VIEW', 'PRINT', 'EXPORT')
  AND p.module_name NOT IN ('Audit Log')  -- Auditor gets VIEW on Audit Log separately
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- Add Audit Log permissions for Auditor (VIEW, EXPORT, PRINT)
INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Auditor'
  AND p.module_name = 'Audit Log'
  AND p.permission_code IN ('VIEW', 'EXPORT', 'PRINT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.4 COORDINATING STAFF
-- Material Request, Job Order, Site, Dashboard
-- Permissions: VIEW, CREATE, UPDATE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Coordinating Staff'
  AND p.module_name IN ('Material Request', 'Job Order', 'Site', 'Project Management', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.5 COORDINATING SUPERVISOR
-- Material Request, Job Order, Site, Dashboard
-- Permissions: VIEW, CREATE, UPDATE, DELETE, APPROVE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Coordinating Supervisor'
  AND p.module_name IN ('Material Request', 'Job Order', 'Site', 'Project Management', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.6 PURCHASING STAFF
-- Purchase Order, Purchase Request, Supplier, Vendor
-- Permissions: VIEW, CREATE, UPDATE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Purchasing Staff'
  AND p.module_name IN ('Purchase Order', 'Purchase Request', 'Supplier', 'Vendor', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.7 PURCHASING SUPERVISOR
-- Purchase Order, Purchase Request, Supplier, Vendor
-- Permissions: VIEW, CREATE, UPDATE, DELETE, APPROVE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Purchasing Supervisor'
  AND p.module_name IN ('Purchase Order', 'Purchase Request', 'Supplier', 'Vendor', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.8 INVENTORY STAFF
-- Product, Category, Unit, Brand, Stock, Inventory Adjustment
-- Permissions: VIEW, CREATE, UPDATE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Inventory Staff'
  AND p.module_name IN ('Product', 'Category', 'Unit', 'Brand', 'Stock', 'Inventory Adjustment', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.9 INVENTORY SUPERVISOR
-- Product, Category, Unit, Brand, Stock, Inventory Adjustment
-- Permissions: VIEW, CREATE, UPDATE, DELETE, APPROVE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Inventory Supervisor'
  AND p.module_name IN ('Product', 'Category', 'Unit', 'Brand', 'Stock', 'Inventory Adjustment', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.10 WAREHOUSE STAFF
-- Stock Transfer, Job Order, Delivery Receipt, Delivery Advice, Physical Count
-- Permissions: VIEW, CREATE, UPDATE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Warehouse Staff'
  AND p.module_name IN ('Stock Transfer', 'Job Order', 'Delivery Receipt', 'Delivery Advice', 'Physical Count', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.11 WAREHOUSE SUPERVISOR
-- Stock Transfer, Job Order, Delivery Receipt, Delivery Advice, Physical Count
-- Permissions: VIEW, CREATE, UPDATE, DELETE, APPROVE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Warehouse Supervisor'
  AND p.module_name IN ('Stock Transfer', 'Job Order', 'Delivery Receipt', 'Delivery Advice', 'Physical Count', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.12 ACCOUNTING STAFF
-- Invoice, Payment, Budget, Financial Reports
-- Permissions: VIEW, CREATE, UPDATE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Accounting Staff'
  AND p.module_name IN ('Invoice', 'Payment', 'Budget', 'Financial Reports', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.13 ACCOUNTING SUPERVISOR
-- Invoice, Payment, Budget, Financial Reports
-- Permissions: VIEW, CREATE, UPDATE, DELETE, APPROVE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Accounting Supervisor'
  AND p.module_name IN ('Invoice', 'Payment', 'Budget', 'Financial Reports', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.14 SITE STAFF
-- Material Control, Site Inventory, Site Purchase, Site Return
-- Permissions: VIEW, CREATE, UPDATE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Site Staff'
  AND p.module_name IN ('Material Control', 'Site Inventory', 'Site Purchase', 'Site Return', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- 3.15 SITE SUPERVISOR
-- Material Control, Site Inventory, Site Purchase, Site Return
-- Permissions: VIEW, CREATE, UPDATE, DELETE, APPROVE, PRINT, EXPORT
-- ============================================================================

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT
    r.role_id,
    p.permission_id,
    TRUE
FROM role r
JOIN permission p ON p.is_active = TRUE
WHERE r.role_name = 'Site Supervisor'
  AND p.module_name IN ('Material Control', 'Site Inventory', 'Site Purchase', 'Site Return', 'Dashboard', 'Profile', 'Notifications')
  AND p.permission_code IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT')
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

-- ============================================================================
-- COMPLETION SUMMARY
-- ============================================================================
-- Script completed successfully.
-- All roles, permissions, and role_permission mappings have been seeded.
-- This script is fully idempotent and can be safely re-run multiple times.
