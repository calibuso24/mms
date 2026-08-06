CREATE OR REPLACE VIEW vw_stock_movement_ledger AS
SELECT
    sm.stock_movement_id,

    sm.movement_date,

    sm.reference_code,

    mt.code                     AS movement_type_code,
    mt.description              AS movement_type,

    st.code                     AS status_code,
    st.description              AS status,

    src.party_id                AS source_id,
    src.party_code              AS source_code,
    src.party_name              AS source_name,

    dst.party_id                AS destination_id,
    dst.party_code              AS destination_code,
    dst.party_name              AS destination_name,

    m.material_id,
    m.product_code,
    m.product_name,

    mb.material_brand_id,
    b.brand_name,

    sm.quantity,

    u.uom_id,
    u.uom_name,

    sm.notes,

    sm.log_date_created,
    sm.log_created_by_account_id

FROM stock_movement sm

INNER JOIN party src
    ON src.party_id = sm.source_id

INNER JOIN party dst
    ON dst.party_id = sm.destination_id

INNER JOIN material m
    ON m.material_id = sm.material_id

LEFT JOIN material_brand mb
    ON mb.material_brand_id = sm.material_brand_id
LEFT JOIN brand b ON b.brand_id = mb.brand_id
INNER JOIN unit_of_measure u
    ON u.uom_id = sm.uom_id

INNER JOIN look_up mt
    ON mt.look_up_id = sm.movement_type_id

INNER JOIN look_up st
    ON st.look_up_id = sm.status_id

WHERE sm.is_deleted = FALSE;