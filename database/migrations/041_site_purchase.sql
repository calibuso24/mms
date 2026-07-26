-- Migration: 041_site_purchase.sql
-- Add site purchase and direct site receipt support for material requested and bought at site
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
    ('purchase_order_type', 'site_purchase', 'Site Purchase', 'Purchase order created for material bought directly at the site.', 3, NULL, NULL),
    ('stock_transfer_type', 'site_receipt', 'Site Receipt', 'Inventory movement for material received directly at the site from a supplier.', 4, NULL, NULL)
ON CONFLICT (look_up_type, name) DO NOTHING;

-- Optional: create a separate site receipt lookup for stock_transfer if not already present.

-- Ensure stock_transfer has a reference back to material_request for direct site buy traceability.
ALTER TABLE stock_transfer
ADD COLUMN material_request_id BIGINT REFERENCES material_request(material_request_id);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_material_request_id ON stock_transfer(material_request_id);
