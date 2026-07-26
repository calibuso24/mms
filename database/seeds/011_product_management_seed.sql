-- Sample Product Management data based on the current MMS planning examples.
-- Statements are idempotent and can be run again safely.

INSERT INTO category (category_code, category_name, description)
VALUES
    ('CI_HUB', 'CI Hubtype Pipes & Fittings', NULL),
    ('CCI', 'CCI Pipes & Fittings', NULL),
    ('GI', 'GI Pipes & Fittings', NULL),
    ('BI', 'BI Pipes & Fittings', NULL),
    ('COPPER', 'Copper Pipes & Fittings', NULL),
    ('PVC', 'PVC Pipes & Fittings', NULL),
    ('UPVC', 'uPVC Pipes & Fittings', NULL),
    ('CPVC', 'CPVC Pipes & Fittings', NULL),
    ('FLANGE', 'Flanges', NULL),
    ('BAR', 'Bar', NULL),
    ('NUT', 'Nuts', NULL),
    ('BOLT', 'Bolts', NULL),
    ('ANCHOR', 'Anchors', NULL),
    ('CONCRETE', 'Conc.pipes,fittings,h.block&cement', NULL),
    ('VALVE', 'Valve', NULL),
    ('PLATE', 'Plates', NULL),
    ('SHEET', 'Sheets', NULL),
    ('INSULATION', 'Insulation Pipe', NULL)
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO sub_category (category_id, sub_category_code, sub_category_name)
SELECT c.category_id, source.sub_category_code, source.sub_category_name
FROM (
    VALUES
        ('GI', 'GI_PIPE', 'Pipes'),
        ('GI', 'GI_FITTING', 'Fittings'),
        ('PVC', 'PVC_PIPE', 'Pipes'),
        ('PVC', 'PVC_FITTING', 'Fittings'),
        ('FLANGE', 'STEEL_FLANGE', 'Steel Flanges'),
        ('BAR', 'PLAIN_ROUND_BAR', 'Plain Round Bars'),
        ('BAR', 'SS_ROUND_BAR', 'S/S Plain Round Bars'),
        ('NUT', 'WASHER', 'Washers'),
        ('SHEET', 'PLAIN_SHEET', 'Plain Sheets'),
        ('SHEET', 'SS_SHEET', 'S/S Plain Sheets'),
        ('INSULATION', 'RUBBER_INSULATION', 'Rubber Insulation')
) AS source(category_code, sub_category_code, sub_category_name)
JOIN category c ON c.category_code = source.category_code
ON CONFLICT (category_id, sub_category_name) DO NOTHING;

INSERT INTO unit_of_measure (uom_name, abbreviation)
VALUES
    ('Piece', 'pc'),
    ('Length', 'lgth'),
    ('Sheet', 'sheet'),
    ('Set', 'set'),
    ('Roll', 'roll'),
    ('Bag', 'bag'),
    ('Kilo', 'kg')
ON CONFLICT (uom_name) DO NOTHING;

INSERT INTO brand (brand_name)
VALUES
    ('Armaflex'),
    ('Rionfuse')
ON CONFLICT (brand_name) DO NOTHING;

INSERT INTO material (
    product_code,
    product_name,
    source_description,
    category_id,
    sub_category_id,
    stock_uom_id,
    status_id,
    notes
)
SELECT
    source.product_code,
    source.product_name,
    source.source_description,
    c.category_id,
    sc.sub_category_id,
    u.uom_id,
    status_lookup.look_up_id,
    source.notes
FROM (
    VALUES
        ('MAT-000001', 'GI Pipe', 'GI Pipe Sch.40 150mm (6") X 6m', 'GI', 'Pipes', 'Length', '150 mm (6 in) x 6 m, Sch. 40', NULL),
        ('MAT-000002', 'PVC Tee Red', 'PVC Tee Red 200mm X 150mm', 'PVC', 'Fittings', 'Piece', '200 mm x 150 mm', NULL),
        ('MAT-000003', 'PVC Tee Red', 'PVC Tee Red 150mm X 100mm', 'PVC', 'Fittings', 'Piece', '150 mm x 100 mm', NULL),
        ('MAT-000004', 'PVC Tee Red', 'PVC Tee Red 200mm X 100mm', 'PVC', 'Fittings', 'Piece', '200 mm x 100 mm', 'May be fulfilled through an approved assembly.'),
        ('MAT-000005', 'GI Steel Flange', 'GI Steel Flange Sch.40 100mm (4") X 300lbs', 'FLANGE', 'Steel Flanges', 'Piece', '100 mm (4 in), Sch. 40, 300 lbs', NULL),
        ('MAT-000006', 'Plain Round Bar', 'Plain Round Bar 25mm (1") X 6m', 'BAR', 'Plain Round Bars', 'Length', '25 mm (1 in) x 6 m', NULL),
        ('MAT-000007', 'S/S Plain Round Bar', 'S/S Plain Round Bar 12mm (1/2") X 1.81m', 'BAR', 'S/S Plain Round Bars', 'Length', '12 mm (1/2 in) x 1.81 m', NULL),
        ('MAT-000008', 'GI Plain Washer', 'GI Plain Washer 5/8" - F436', 'NUT', 'Washers', 'Piece', '5/8 in, F436', NULL),
        ('MAT-000009', 'Plain Sheet', 'Plain Sheet Ga#26 4'' X 8''', 'SHEET', 'Plain Sheets', 'Sheet', 'Gauge 26, 4 ft x 8 ft', NULL),
        ('MAT-000010', 'Armaflex Rubber Insulation', 'Armaflex Rubber Ins. 3-1/2" X 3/4" X 2m', 'INSULATION', 'Rubber Insulation', 'Length', '3-1/2 in x 3/4 in x 2 m', NULL)
) AS source(product_code, product_name, source_description, category_code, sub_category_name, uom_name, size_summary, notes)
JOIN category c ON c.category_code = source.category_code
JOIN sub_category sc ON sc.category_id = c.category_id AND sc.sub_category_name = source.sub_category_name
JOIN unit_of_measure u ON u.uom_name = source.uom_name
JOIN look_up status_lookup ON status_lookup.look_up_type = 'material_status' AND status_lookup.name = 'Active'
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO material_specification (
    material_id,
    primary_size,
    secondary_size,
    alternate_size,
    thickness_or_gauge,
    width,
    length,
    schedule,
    pressure_or_load_rating,
    standard,
    additional_specification
)
SELECT
    m.material_id,
    source.primary_size,
    source.secondary_size,
    source.alternate_size,
    source.thickness_or_gauge,
    source.width,
    source.length,
    source.schedule,
    source.pressure_or_load_rating,
    source.standard,
    source.additional_specification
FROM (
    VALUES
        ('MAT-000001', '150 mm', NULL, '6 in', NULL, NULL, '6 m', 'Sch. 40', NULL, NULL, NULL),
        ('MAT-000002', '200 mm', '150 mm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Red tee'),
        ('MAT-000003', '150 mm', '100 mm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Red tee'),
        ('MAT-000004', '200 mm', '100 mm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Red tee'),
        ('MAT-000005', '100 mm', NULL, '4 in', NULL, NULL, NULL, 'Sch. 40', '300 lbs', NULL, NULL),
        ('MAT-000006', '25 mm', NULL, '1 in', NULL, NULL, '6 m', NULL, NULL, NULL, NULL),
        ('MAT-000007', '12 mm', NULL, '1/2 in', NULL, NULL, '1.81 m', NULL, NULL, NULL, 'Stainless steel'),
        ('MAT-000008', '5/8 in', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'F436', 'GI plain washer'),
        ('MAT-000009', NULL, NULL, NULL, 'Gauge 26', '4 ft', '8 ft', NULL, NULL, NULL, NULL),
        ('MAT-000010', '3-1/2 in', NULL, NULL, '3/4 in', NULL, '2 m', NULL, NULL, NULL, 'Rubber insulation')
) AS source(product_code, primary_size, secondary_size, alternate_size, thickness_or_gauge, width, length, schedule, pressure_or_load_rating, standard, additional_specification)
JOIN material m ON m.product_code = source.product_code
ON CONFLICT (material_id) DO NOTHING;

INSERT INTO material_brand (
    material_id,
    brand_id,
    brand_product_code,
    brand_product_name,
    status_id
)
SELECT
    m.material_id,
    b.brand_id,
    source.brand_product_code,
    source.brand_product_name,
    status_lookup.look_up_id
FROM (
    VALUES
        ('MAT-000010', 'Armaflex', 'ARMAFLEX-INS-3.5-0.75-2M', 'Armaflex Rubber Insulation 3-1/2 in x 3/4 in x 2 m')
) AS source(product_code, brand_name, brand_product_code, brand_product_name)
JOIN material m ON m.product_code = source.product_code
JOIN brand b ON b.brand_name = source.brand_name
JOIN look_up status_lookup ON status_lookup.look_up_type = 'material_brand_status' AND status_lookup.name = 'Active'
ON CONFLICT (material_id, brand_id) DO NOTHING;

INSERT INTO material_option (
    material_id,
    option_code,
    option_name,
    option_type,
    requires_approval,
    notes
)
SELECT
    m.material_id,
    'MFO-000001',
    'PVC Tee Red 200 mm x 100 mm assembly',
    'assembly',
    TRUE,
    'Use only when approved by the authorized project representative.'
FROM material m
WHERE m.product_code = 'MAT-000004'
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO material_option_detail (
    material_fulfillment_option_id,
    component_material_id,
    required_quantity,
    uom_id,
    notes
)
SELECT
    option_record.material_fulfillment_option_id,
    component_material.material_id,
    1,
    u.uom_id,
    'One component required for this approved assembly.'
FROM (
    VALUES ('MAT-000002'), ('MAT-000003')
) AS source(component_product_code)
JOIN material_option option_record ON option_record.option_code = 'MFO-000001'
JOIN material component_material ON component_material.product_code = source.component_product_code
JOIN unit_of_measure u ON u.uom_name = 'Piece'
ON CONFLICT (material_fulfillment_option_id, component_material_id) DO NOTHING;
