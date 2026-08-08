-- Migration: 040_stock_transfer_job_order.sql
-- Add job order lookup values and link stock transfer logs to job orders
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
    ('stock_transfer_type', 'delivery_receipt', 'Delivery Receipt', 'Delivery receipt recorded as stock transfer.', 1, NULL, NULL),
    ('stock_transfer_type', 'rts_warehouse', 'RTS Warehouse', 'Warehouse return transfer slip recorded as stock transfer.', 1, NULL, NULL),
    -- ('stock_transfer_type', 'rts_supplier', 'RTS Supplier', 'Supplier return transfer slip recorded as return to supplier.', 2, NULL, NULL),
    -- ('stock_transfer_type', 'job_order_delivery', 'Job Order Delivery', 'Job order delivery recorded as inventory movement for service work.', 3, NULL, NULL),
    ('job_order_service_type', 'internal_service', 'Internal Service', 'Job order service performed by an internal shop.', 1, NULL, NULL),
    ('job_order_service_type', 'external_service', 'External Service', 'Job order service performed by an external service provider.', 2, NULL, NULL),
    ('job_order_status', 'pending', 'Pending', 'Job order is created and pending processing.', 1, NULL, NULL),
    ('job_order_status', 'in_progress', 'In Progress', 'Job order is currently being worked on.', 2, NULL, NULL),
    ('job_order_status', 'completed', 'Completed', 'Job order work has been finished.', 3, NULL, NULL),
    ('job_order_status', 'cancelled', 'Cancelled', 'Job order has been cancelled.', 4, NULL, NULL)
ON CONFLICT (look_up_type, name) DO NOTHING;

ALTER TABLE stock_transfer
ADD COLUMN job_order_id BIGINT REFERENCES job_order(job_order_id);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_job_order_id ON stock_transfer(job_order_id);
