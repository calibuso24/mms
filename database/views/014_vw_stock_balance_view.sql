CREATE OR REPLACE VIEW vw_stock_balance AS
SELECT
    sb.stock_balance_id,

    p.party_id,
    p.party_code,
    p.party_name,

    m.material_id,
    m.product_code,
    m.product_name,

    mb.material_brand_id,
    b.brand_name,

    sb.quantity_on_hand,

    u.uom_id,
    u.uom_name

FROM stock_balance sb
INNER JOIN party p ON p.party_id = sb.party_id
INNER JOIN material m ON m.material_id = sb.material_id
LEFT JOIN material_brand mb ON mb.material_brand_id = sb.material_brand_id
LEFT JOIN brand b ON b.brand_id = mb.brand_id
INNER JOIN unit_of_measure u ON u.uom_id = sb.uom_id
WHERE sb.is_deleted = FALSE
AND sb.quantity_on_hand <> 0
;