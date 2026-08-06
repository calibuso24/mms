CREATE OR REPLACE VIEW vw_material_catalog AS
SELECT
    m.material_id,
    m.product_code,
    m.product_name,
    m.full_description,
    c.category_code,
    c.category_name,
    sc.sub_category_code,
    sc.sub_category_name,
    u.uom_name AS stock_uom_name,
    u.abbreviation AS stock_uom_abbreviation,
    status_lookup.name AS material_status,
    specification.primary_size,
    specification.secondary_size,
    specification.alternate_size,
    specification.thickness_or_gauge,
    specification.width,
    specification.length,
    specification.schedule,
    specification.pressure_or_load_rating,
    specification.standard,
    specification.pack_size,
    specification.additional_specification,
    brand_summary.brands,
    fulfillment_summary.fulfillment_options,
    m.notes
FROM material m
JOIN category c ON c.category_id = m.category_id
LEFT JOIN sub_category sc ON sc.sub_category_id = m.sub_category_id
JOIN unit_of_measure u ON u.uom_id = m.stock_uom_id
JOIN look_up status_lookup ON status_lookup.look_up_id = m.status_id
LEFT JOIN material_specification specification
    ON specification.material_id = m.material_id
   AND specification.is_deleted = FALSE
LEFT JOIN LATERAL (
    SELECT STRING_AGG(b.brand_name, ', ' ORDER BY b.brand_name) AS brands
    FROM material_brand mb
    JOIN brand b ON b.brand_id = mb.brand_id
    WHERE mb.material_id = m.material_id
      AND mb.is_deleted = FALSE
      AND b.is_deleted = FALSE
) AS brand_summary ON TRUE
LEFT JOIN LATERAL (
    SELECT STRING_AGG(option_record.option_name, ', ' ORDER BY option_record.option_name) AS fulfillment_options
    FROM material_option option_record
    WHERE option_record.material_id = m.material_id
      AND option_record.is_deleted = FALSE
      AND option_record.is_active = TRUE
) AS fulfillment_summary ON TRUE
WHERE m.is_deleted = FALSE;

-- Review the seeded material catalog with:
-- SELECT * FROM vw_material_catalog ORDER BY product_code;
