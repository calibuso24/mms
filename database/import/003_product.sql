BEGIN;

TRUNCATE material CASCADE;
TRUNCATE material_type CASCADE;
TRUNCATE material_brand CASCADE;
TRUNCATE material_option CASCADE;
TRUNCATE material_specification CASCADE;
TRUNCATE unit_of_measure CASCADE;

ALTER TABLE source.tblproduct
ADD COLUMN IF NOT EXISTS brand_id BIGINT,
ADD COLUMN IF NOT EXISTS material_type_id BIGINT,
ADD COLUMN IF NOT EXISTS category_id BIGINT,
ADD COLUMN IF NOT EXISTS sub_category_id BIGINT,
ADD COLUMN IF NOT EXISTS uom_id BIGINT
;

-- ALTER TABLE source.tblcategory ADD COLUMN IF NOT EXISTS category_id BIGINT;
-- UPDATE source.tblcategory SET category_id = nextval(pg_get_serial_sequence('public.category', 'category_id'))
-- -- WHERE category_id IS NULL
-- ;  

-- INSERT INTO public.category (
--     category_id,
--     category_code,
--     category_name,
--     is_active,
--     is_deleted,
--     log_date_created,
--     log_module_created,
--     log_module_updated
-- )
-- SELECT
--     category_id,
--     categoryid AS category_code,
--     category AS category_name,
--     TRUE AS is_active,
--     FALSE AS is_deleted,
--     NOW() AS log_date_created,
--     'import_product' AS log_module_created,
--     'import_product' AS log_module_updated
-- FROM source.tblcategory
-- WHERE category_id IS NOT NULL
-- ;


UPDATE source.tblproduct a
SET category_id = b.category_id
FROM source.tblcategory b
WHERE a.category = b.categoryid
;

-- ALTER TABLE source.tblsubcategory ADD COLUMN IF NOT EXISTS sub_category_id BIGINT;
-- ALTER TABLE source.tblsubcategory ADD COLUMN IF NOT EXISTS category_id BIGINT;

-- UPDATE source.tblsubcategory a
-- SET category_id = b.category_id
-- FROM source.tblcategory b
-- WHERE a.categoryid = b.categoryid
-- ;

-- UPDATE source.tblsubcategory SET sub_category_id = nextval(pg_get_serial_sequence('public.sub_category', 'sub_category_id'))
-- -- WHERE sub_category_id IS NULL
-- ;

-- INSERT INTO public.sub_category (
--     sub_category_id,
--     sub_category_code,
--     sub_category_name,
--     category_id,
--     is_active,
--     is_deleted,
--     log_date_created,
--     log_module_created,
--     log_module_updated
-- )
-- SELECT
--     sub_category_id,
--     subcatid AS sub_category_code,
--     subcategory AS sub_category_name,
--     category_id,
--     TRUE AS is_active,
--     FALSE AS is_deleted,
--     NOW() AS log_date_created,
--     'import_product' AS log_module_created,
--     'import_product' AS log_module_updated
-- FROM source.tblsubcategory
-- WHERE sub_category_id IS NOT NULL
-- ;

UPDATE source.tblproduct a
SET sub_category_id = b.sub_category_id,
category_id = b.category_id
FROM source.tblsubcategory b
WHERE a.subcategory = b.subcatid
AND a.category = b.categoryid
;

DROP TABLE IF EXISTS source.tblbrand;
CREATE TABLE source.tblbrand AS 
SELECT DISTINCT brand FROM source.tblproduct
WHERE brand IS NOT NULL AND BTRIM(brand) <> '';

ALTER TABLE source.tblbrand ADD COLUMN IF NOT EXISTS brand_id BIGINT;

UPDATE source.tblbrand SET brand_id = nextval(pg_get_serial_sequence('public.brand', 'brand_id'))
-- WHERE brand_id IS NULL
; 

UPDATE source.tblproduct a 
SET brand_id = b.brand_id
FROM source.tblbrand b
WHERE a.brand = b.brand
AND a.brand IS NOT NULL 
AND BTRIM(b.brand) <> ''
;

INSERT INTO public.brand (
    brand_id,
    brand_name,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT
    b.brand_id,
    INITCAP(BTRIM(b.brand)) AS brand_name,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'    
FROM source.tblbrand b
WHERE b.brand_id IS NOT NULL    
;

DROP TABLE IF EXISTS source.tblmaterial_type;
CREATE TABLE source.tblmaterial_type AS 
SELECT DISTINCT INITCAP(BTRIM(type)) as material_type FROM source.tblproduct
WHERE type IS NOT NULL AND BTRIM(type) <> ''
;

ALTER TABLE source.tblmaterial_type ADD COLUMN IF NOT EXISTS material_type_id BIGINT;

UPDATE source.tblmaterial_type SET material_type_id = nextval(pg_get_serial_sequence('public.material_type', 'material_type_id'))
-- WHERE material_type_id IS NULL
;

UPDATE source.tblproduct a 
SET material_type_id = b.material_type_id
FROM source.tblmaterial_type b
WHERE trim(lower(a.type)) = trim(lower(b.material_type))
AND a.type IS NOT NULL 
AND BTRIM(a.type) <> ''
AND BTRIM(b.material_type) <> ''
;

INSERT INTO public.material_type (
    material_type_id,
    material_type_name,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT
    b.material_type_id,
    INITCAP(BTRIM(b.material_type)) AS material_type_name,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'    
FROM source.tblmaterial_type b
WHERE b.material_type_id IS NOT NULL  
;

ALTER TABLE source.tblunit ADD COLUMN IF NOT EXISTS uom_id BIGINT;

UPDATE source.tblunit SET uom_id = nextval(pg_get_serial_sequence('public.unit_of_measure', 'uom_id'))
-- WHERE uom_id IS NULL
;   

UPDATE source.tblproduct a
SET uom_id = b.uom_id
FROM source.tblunit b
WHERE a.unit = b.unitid
;

INSERT INTO public.unit_of_measure (
    uom_id,
    uom_name,
    abbreviation,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT
    u.uom_id,
    INITCAP(BTRIM(u.unit)) AS uom_name,
    INITCAP(BTRIM(u.unit)) AS abbreviation,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'
FROM source.tblunit u
WHERE u.uom_id IS NOT NULL; 

ALTER TABLE source.tblproduct ADD COLUMN IF NOT EXISTS material_id BIGINT;

UPDATE source.tblproduct SET material_id = prodid
-- WHERE material_id IS NULL
;

INSERT INTO public.material (
    material_id,
    product_code,
    product_name,
    source_description,
    status_id,
    category_id,
    sub_category_id,
    stock_uom_id,
    material_type_id,
    -- brand_id,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT DISTINCT 
    a.material_id,
    a.productcode AS product_code,
    a.description AS product_name,
    NULLIF(BTRIM(a.description), '') AS source_description,
    CASE WHEN a.status = 1 THEN (SELECT look_up_id FROM look_up WHERE look_up_type = 'material_status' AND code = 'active') ELSE 
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'material_status' AND code = 'inactive') END  AS status_id,
    a.category_id,
    a.sub_category_id,
    a.uom_id AS stock_uom_id,
    a.material_type_id,
    -- a.brand_id,
    FALSE AS is_deleted,
    NOW() AS log_date_created,
    'import_product' AS log_module_created,
    'import_product' AS log_module_updated
FROM source.tblproduct a
WHERE a.material_id IS NOT NULL 
;

INSERT INTO public.material_brand (
    material_id,
    brand_id,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT DISTINCT 
    a.material_id,
    a.brand_id,
    FALSE AS is_deleted,
    NOW() AS log_date_created,
    'import_product' AS log_module_created,
    'import_product' AS log_module_updated 
FROM source.tblproduct a 
WHERE a.material_id IS NOT NULL   
AND a.brand_id IS NOT NULL
;


COMMIT;