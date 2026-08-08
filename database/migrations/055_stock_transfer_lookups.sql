-- Migration: 055_stock_transfer_lookups.sql
-- Adds stock transfer statuses and missing transfer type for workflow support

INSERT INTO look_up (
    look_up_type,
    code,
    name,
    description,
    display_order,
    log_module_created,
    log_module_updated
)
VALUES
    ('stock_transfer_status', 'draft', 'Draft', 'Stock transfer is prepared and editable.', 1, NULL, NULL),
    ('stock_transfer_status', 'submitted', 'Submitted', 'Stock transfer is submitted for approval.', 2, NULL, NULL),
    ('stock_transfer_status', 'approved', 'Approved', 'Stock transfer has been approved.', 3, NULL, NULL),
    ('stock_transfer_status', 'cancelled', 'Cancelled', 'Stock transfer was cancelled.', 4, NULL, NULL),
    -- ('stock_transfer_type', 'warehouse_transfer', 'Warehouse Transfer', 'Standard warehouse transfer movement.', 5, NULL, NULL)
ON CONFLICT (look_up_type, name) DO NOTHING;
