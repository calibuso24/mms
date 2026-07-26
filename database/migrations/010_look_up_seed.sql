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
    ('material_status', 'active', 'Active', 'Material is available for use.', 1, NULL, NULL),
    ('material_status', 'inactive', 'Inactive', 'Material is retained for history but cannot be selected for new transactions.', 2, NULL, NULL),
    ('material_brand_status', 'active', 'Active', 'Brand-specific material is available for purchasing and inventory transactions.', 1, NULL, NULL),
    ('material_brand_status', 'inactive', 'Inactive', 'Brand-specific material is retained for history but cannot be selected for new transactions.', 2, NULL, NULL),
    ('stock_movement_type', 'transfer', 'Transfer', 'Move material from one party to another.', 1, NULL, NULL),
    ('stock_movement_type', 'issue', 'Issue', 'Issue material from stock to a project or internal use.', 2, NULL, NULL),
    ('stock_movement_type', 'receipt', 'Receipt', 'Receive material into stock from a supplier or return.', 3, NULL, NULL),
    ('stock_movement_type', 'adjustment', 'Adjustment', 'Inventory adjustment for corrections.', 4, NULL, NULL),
    ('stock_movement_type', 'return', 'Return', 'Return material back to source.', 5, NULL, NULL),
    ('stock_movement_status', 'pending', 'Pending', 'Movement is created but not yet completed.', 1, NULL, NULL),
    ('stock_movement_status', 'completed', 'Completed', 'Movement has been completed.', 2, NULL, NULL),
    ('stock_movement_status', 'cancelled', 'Cancelled', 'Movement was cancelled.', 3, NULL, NULL),
    ('stock_movement_status', 'failed', 'Failed', 'Movement failed and may require correction.', 4, NULL, NULL),
    ('material_option_type', 'substitute', 'Substitute', 'Material substitute option.', 1, NULL, NULL),
    ('material_option_type', 'assembly', 'Assembly', 'Material assembly option.', 2, NULL, NULL),
    ('purchase_order_adjustment_kind', 'discount', 'Discount', 'Order-level or item-level discount.', 1, NULL, NULL),
    ('purchase_order_adjustment_kind', 'charge', 'Charge', 'Order-level or item-level additional charge.', 2, NULL, NULL)
ON CONFLICT (look_up_type, name) DO NOTHING;
