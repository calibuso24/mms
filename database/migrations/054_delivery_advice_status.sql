-- Migration: 054_delivery_advice_status.sql
-- Adds lookup values for delivery advice workflow statuses

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
    ('delivery_advice_status', 'draft', 'Draft', 'Delivery advice is prepared and editable.', 1, NULL, NULL),
    ('delivery_advice_status', 'submitted', 'Submitted', 'Delivery advice has been submitted for completion.', 2, NULL, NULL),
    ('delivery_advice_status', 'completed', 'Completed', 'Delivery advice has been completed/received.', 3, NULL, NULL),
    ('delivery_advice_status', 'cancelled', 'Cancelled', 'Delivery advice was cancelled.', 4, NULL, NULL)
ON CONFLICT (look_up_type, name) DO NOTHING;
