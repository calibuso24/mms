-- Migration: 049_navigation_seed.sql
-- Purpose: Seed navigation data for MAIN and REPORTS contexts
-- Author: MMS
-- Created: 2026-07-28

-- MAIN Context Navigation
INSERT INTO navigation (context, navigation_type, title, route, icon, display_order, is_visible, is_deleted)
VALUES
    ('MAIN', 'MENU', 'Dashboard', '/dashboard', 'dashboard', 0, true, false),
    ('MAIN', 'GROUP', 'Coordinating Transactions', NULL, 'clipboard', 1, true, false),
    ('MAIN', 'GROUP', 'Purchasing Transactions', NULL, 'shopping-cart', 2, true, false),
    ('MAIN', 'GROUP', 'Inventory Transactions', NULL, 'boxes', 3, true, false),
    ('MAIN', 'MENU', 'Reports', '/reports', 'file-chart', 4, true, false),
    ('MAIN', 'GROUP', 'Masterlist', NULL, 'database', 5, true, false),
    ('MAIN', 'GROUP', 'Administrator', NULL, 'settings', 6, true, false);

-- Coordinating Transactions submenu
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, icon, display_order, is_visible, is_deleted)
VALUES
    (2, 'MAIN', 'MENU', 'Material Request', '/coordinating/material-request', 'file', 0, true, false),
    (2, 'MAIN', 'MENU', 'Material Control', '/coordinating/material-control', 'file', 1, true, false),
    (2, 'MAIN', 'MENU', 'Approved Previous Request', '/coordinating/approved-request', 'check', 2, true, false),
    (2, 'MAIN', 'MENU', 'Additional Control (VO)', '/coordinating/additional-control', 'file', 3, true, false);

-- Purchasing Transactions submenu
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, icon, display_order, is_visible, is_deleted)
VALUES
    (3, 'MAIN', 'MENU', 'Material Requisition', '/purchasing/requisition', 'file', 0, true, false),
    (3, 'MAIN', 'MENU', 'Excess Deliveries', '/purchasing/excess-deliveries', 'truck', 1, true, false),
    (3, 'MAIN', 'MENU', 'Purchase Order', '/purchasing/purchase-order', 'clipboard', 2, true, false),
    (3, 'MAIN', 'MENU', 'Delivery Advice', '/purchasing/delivery-advice', 'file', 3, true, false),
    (3, 'MAIN', 'MENU', 'Delivery Receipt', '/purchasing/delivery-receipt', 'check', 4, true, false),
    (3, 'MAIN', 'MENU', 'Job Order', '/purchasing/job-order', 'briefcase', 5, true, false),
    (3, 'MAIN', 'MENU', 'RTS Supplier', '/purchasing/rts-supplier', 'box', 6, true, false),
    (3, 'MAIN', 'MENU', 'RTS Warehouse', '/purchasing/rts-warehouse', 'package', 7, true, false);

-- Inventory Transactions submenu
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, icon, display_order, is_visible, is_deleted)
VALUES
    (4, 'MAIN', 'MENU', 'Supplier Delivery', '/inventory/supplier-delivery', 'truck', 0, true, false),
    (4, 'MAIN', 'MENU', 'Stock Transfer', '/inventory/stock-transfer', 'arrow-right', 1, true, false),
    (4, 'MAIN', 'MENU', 'Job Order Delivery', '/inventory/job-order-delivery', 'briefcase', 2, true, false),
    (4, 'MAIN', 'MENU', 'Return to Supplier', '/inventory/return-supplier', 'arrow-left', 3, true, false),
    (4, 'MAIN', 'MENU', 'Physical Count', '/inventory/physical-count', 'list', 4, true, false),
    (4, 'MAIN', 'MENU', 'Material Adjustment', '/inventory/material-adjustment', 'edit', 5, true, false);

-- Masterlist submenu
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, icon, display_order, is_visible, is_deleted)
VALUES
    (6, 'MAIN', 'MENU', 'Product Management', '/masterlist/product-management', 'box', 0, true, false),
    (6, 'MAIN', 'MENU', 'Project Management', '/masterlist/project-management', 'folder', 1, true, false),
    (6, 'MAIN', 'MENU', 'Supplier Management', '/masterlist/supplier-management', 'users', 2, true, false);

-- Administrator submenu
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, icon, display_order, is_visible, is_deleted)
VALUES
    (7, 'MAIN', 'MENU', 'Manage Users', '/admin/manage-users', 'users', 0, true, false),
    (7, 'MAIN', 'MENU', 'Manage Roles', '/admin/manage-roles', 'admin-panel-settings', 1, true, false),
    (7, 'MAIN', 'MENU', 'Audit Logs', '/admin/audit-logs', 'history', 2, true, false),
    (7, 'MAIN', 'MENU', 'System Settings', '/admin/system-settings', 'settings', 3, true, false);

UPDATE navigation
SET permission_code = 'VIEW',
    log_module_updated = 'system_settings',
    log_date_updated = NOW()
WHERE route = '/admin/system-settings'
  AND context = 'MAIN'
  AND is_deleted = FALSE;

-- REPORTS Context Navigation
-- Reports main categories
INSERT INTO navigation (context, navigation_type, title, icon, display_order, is_visible, is_deleted)
VALUES
    ('REPORTS', 'HEADER', 'Back', 'arrow-left', -1, true, false),
    ('REPORTS', 'GROUP', 'Inventory', 'boxes', 0, true, false),
    ('REPORTS', 'GROUP', 'Purchasing', 'shopping-cart', 1, true, false),
    ('REPORTS', 'GROUP', 'Warehouse', 'warehouse', 2, true, false),
    ('REPORTS', 'GROUP', 'Projects', 'folder', 3, true, false),
    ('REPORTS', 'GROUP', 'Accounting', 'calculator', 4, true, false),
    ('REPORTS', 'GROUP', 'Administration', 'settings', 5, true, false);

-- Inventory reports
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, reference_type, display_order, is_visible, is_deleted)
VALUES
    (9, 'REPORTS', 'REPORT', 'Inventory Summary', '/reports/inventory-summary', 'REPORT', 0, true, false),
    (9, 'REPORTS', 'REPORT', 'Inventory Ledger', '/reports/inventory-ledger', 'REPORT', 1, true, false),
    (9, 'REPORTS', 'REPORT', 'Stock Card', '/reports/stock-card', 'REPORT', 2, true, false);

-- Purchasing reports
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, reference_type, display_order, is_visible, is_deleted)
VALUES
    (10, 'REPORTS', 'REPORT', 'Purchase Requests', '/reports/purchase-requests', 'REPORT', 0, true, false),
    (10, 'REPORTS', 'REPORT', 'Purchase Orders', '/reports/purchase-orders', 'REPORT', 1, true, false),
    (10, 'REPORTS', 'REPORT', 'Delivery Advice', '/reports/delivery-advice', 'REPORT', 2, true, false);

-- Warehouse reports
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, reference_type, display_order, is_visible, is_deleted)
VALUES
    (11, 'REPORTS', 'REPORT', 'Stock Movement', '/reports/stock-movement', 'REPORT', 0, true, false),
    (11, 'REPORTS', 'REPORT', 'Stock Transfer', '/reports/stock-transfer', 'REPORT', 1, true, false);

-- Projects reports
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, reference_type, display_order, is_visible, is_deleted)
VALUES
    (12, 'REPORTS', 'REPORT', 'Project Summary', '/reports/project-summary', 'REPORT', 0, true, false),
    (12, 'REPORTS', 'REPORT', 'Job Order Status', '/reports/job-order-status', 'REPORT', 1, true, false);

-- Accounting reports
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, reference_type, display_order, is_visible, is_deleted)
VALUES
    (13, 'REPORTS', 'REPORT', 'Cost Analysis', '/reports/cost-analysis', 'REPORT', 0, true, false),
    (13, 'REPORTS', 'REPORT', 'Expense Report', '/reports/expense-report', 'REPORT', 1, true, false);

-- Administration reports
INSERT INTO navigation (parent_navigation_id, context, navigation_type, title, route, reference_type, display_order, is_visible, is_deleted)
VALUES
    (14, 'REPORTS', 'REPORT', 'User Activity Log', '/reports/user-activity', 'REPORT', 0, true, false),
    (14, 'REPORTS', 'REPORT', 'System Audit', '/reports/system-audit', 'REPORT', 1, true, false);
