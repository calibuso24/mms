CREATE OR REPLACE VIEW vw_stock_card AS
SELECT

    sm.stock_movement_id,

    sm.movement_date,

    sm.reference_code,

    p.party_id,
    p.party_name,

    m.material_id,
    m.product_code,
    m.product_name,
    
    mb.material_brand_id,
    b.brand_name,

    u.uom_name,

    mt.description AS movement_type,

    CASE
        WHEN sm.destination_id = p.party_id
        THEN sm.quantity
        ELSE 0
    END AS qty_in,

    CASE
        WHEN sm.source_id = p.party_id
        THEN sm.quantity
        ELSE 0
    END AS qty_out,

    CASE
        WHEN sm.destination_id = p.party_id
        THEN sm.quantity
        ELSE -sm.quantity
    END AS quantity_change,

    sm.notes

FROM stock_movement sm
JOIN party p ON p.party_id IN (sm.source_id, sm.destination_id)
JOIN material m ON m.material_id = sm.material_id
LEFT JOIN material_brand mb ON mb.material_brand_id = sm.material_brand_id
LEFT JOIN brand b ON b.brand_id = mb.brand_id
JOIN unit_of_measure u ON u.uom_id = sm.uom_id
JOIN look_up mt ON mt.look_up_id = sm.movement_type_id
WHERE sm.is_deleted = FALSE
;