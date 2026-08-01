BEGIN;

-- =========================================================
-- Product Migration: source -> public
-- - Includes schema revision support for material_type linkage.
-- - Preserves legacy PKs when safe and possible.
-- - Uses idempotent insert/update patterns.
-- =========================================================

TRUNCATE category CASCADE;
TRUNCATE sub_category CASCADE;
TRUNCATE material CASCADE;


-- =========================================================
-- Step 0: Required object validation
-- =========================================================


-- ==========================================================
-- Migration : tblcategory -> category
-- Description:
--     Migrate source.tblcategory to public.category
--     Preserve source mapping using category_id
-- ==========================================================

-- ------------------------------------------------------------------
-- STEP 1 : Add mapping column if it does not exist
-- ------------------------------------------------------------------

ALTER TABLE source.tblcategory
ADD COLUMN IF NOT EXISTS category_id BIGINT;

-- ------------------------------------------------------------------
-- STEP 2 : Assign new IDs only to unmapped records
-- ------------------------------------------------------------------

UPDATE source.tblcategory
SET category_id = nextval(
    pg_get_serial_sequence('public.category', 'category_id')
)
WHERE category_id IS NULL;

-- ------------------------------------------------------------------
-- STEP 3 : Insert records
-- ------------------------------------------------------------------

INSERT INTO public.category
(
    category_id,
    category_code,
    category_name,
    description,
    is_active,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    s.category_id,
    s.categoryid,
    s.category,
    NULL,
    TRUE,
    FALSE,
    s.datecreated,
    s.datemodified,
    s.createdby,
    s.modifiedby,
    'Migration',
    'Migration'
FROM source.tblcategory s
WHERE NOT EXISTS
(
    SELECT 1
    FROM public.category c
    WHERE c.category_id = s.category_id
);

-- ------------------------------------------------------------------
-- STEP 4 : Synchronize identity sequence
-- ------------------------------------------------------------------

SELECT setval
(
    pg_get_serial_sequence('public.category','category_id'),
    COALESCE(
        (SELECT MAX(category_id) FROM public.category),
        1
    ),
    TRUE
);

-- ------------------------------------------------------------------
-- STEP 5 : Validation
-- ------------------------------------------------------------------

DO
$$
DECLARE
    v_source_count INTEGER;
    v_destination_count INTEGER;
BEGIN

    SELECT COUNT(*)
    INTO v_source_count
    FROM source.tblcategory;

    SELECT COUNT(*)
    INTO v_destination_count
    FROM public.category;

    RAISE NOTICE 'Source Count      : %', v_source_count;
    RAISE NOTICE 'Destination Count : %', v_destination_count;

    IF v_source_count <> v_destination_count THEN
        RAISE WARNING 'Record count mismatch.';
    ELSE
        RAISE NOTICE 'Migration completed successfully.';
    END IF;

END
$$;


-- ------------------------------------------------------------------
-- STEP 1 : Add mapping column if it does not exist
-- ------------------------------------------------------------------

ALTER TABLE source.tblsubcategory
ADD COLUMN IF NOT EXISTS sub_category_id BIGINT;

-- ------------------------------------------------------------------
-- STEP 2 : Assign new IDs only to unmapped records
-- ------------------------------------------------------------------

UPDATE source.tblsubcategory
SET sub_category_id = nextval(
    pg_get_serial_sequence('public.sub_category', 'sub_category_id')
)
WHERE sub_category_id IS NULL;

-- ------------------------------------------------------------------
-- STEP 3 : Insert records
-- ------------------------------------------------------------------

INSERT INTO public.sub_category
(
    sub_category_id,
    category_id,
    sub_category_code,
    sub_category_name,
    is_active,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    s.sub_category_id,
    c.category_id,
    TRIM(s.subcatid),
    s.subcategory,
    CASE
        WHEN s.include = 1 THEN TRUE
        ELSE FALSE
    END,
    FALSE,
    s.datecreated,
    s.datemodified,
    s.createdby,
    s.modifiedby,
    'Migration',
    'Migration'
FROM source.tblsubcategory s
INNER JOIN source.tblcategory c
    ON c.categoryid = s.categoryid
WHERE NOT EXISTS
(
    SELECT 1
    FROM public.sub_category d
    WHERE d.sub_category_id = s.sub_category_id
);

-- ------------------------------------------------------------------
-- STEP 4 : Synchronize identity sequence
-- ------------------------------------------------------------------

SELECT setval
(
    pg_get_serial_sequence('public.sub_category','sub_category_id'),
    COALESCE
    (
        (SELECT MAX(sub_category_id) FROM public.sub_category),
        1
    ),
    TRUE
);

-- ------------------------------------------------------------------
-- STEP 5 : Validation
-- ------------------------------------------------------------------

DO
$$
DECLARE
    v_source_count INTEGER;
    v_destination_count INTEGER;
BEGIN

    SELECT COUNT(*)
      INTO v_source_count
    FROM source.tblsubcategory;

    SELECT COUNT(*)
      INTO v_destination_count
    FROM public.sub_category;

    RAISE NOTICE 'Source Count      : %', v_source_count;
    RAISE NOTICE 'Destination Count : %', v_destination_count;

    IF v_source_count <> v_destination_count THEN
        RAISE WARNING 'Record count mismatch.';
    ELSE
        RAISE NOTICE 'Migration completed successfully.';
    END IF;

END
$$;



-- =========================================================
-- Step 0: Required object validation
-- =========================================================
DO $$
BEGIN
    IF to_regclass('source.tblproduct') IS NULL THEN
        RAISE EXCEPTION 'Missing source table: source.tblproduct';
    END IF;

    IF to_regclass('public.category') IS NULL
       OR to_regclass('public.sub_category') IS NULL
       OR to_regclass('public.unit_of_measure') IS NULL
       OR to_regclass('public.brand') IS NULL
       OR to_regclass('public.material') IS NULL
       OR to_regclass('public.material_specification') IS NULL
       OR to_regclass('public.material_brand') IS NULL
       OR to_regclass('public.look_up') IS NULL THEN
        RAISE EXCEPTION 'Missing one or more required public target tables.';
    END IF;

    IF to_regclass('public.material_type') IS NULL THEN
        RAISE EXCEPTION 'Missing public.material_type. Run migration database/migrations/052_material_type.sql first.';
    END IF;
END $$;

-- Validation (before migration)
SELECT COUNT(*) AS source_product_rows FROM source.tblproduct;
SELECT COUNT(*) AS target_category_rows_before FROM public.category;
SELECT COUNT(*) AS target_sub_category_rows_before FROM public.sub_category;
SELECT COUNT(*) AS target_uom_rows_before FROM public.unit_of_measure;
SELECT COUNT(*) AS target_brand_rows_before FROM public.brand;
SELECT COUNT(*) AS target_material_type_rows_before FROM public.material_type;
SELECT COUNT(*) AS target_material_rows_before FROM public.material;
SELECT COUNT(*) AS target_material_spec_rows_before FROM public.material_specification;
SELECT COUNT(*) AS target_material_brand_rows_before FROM public.material_brand;

-- Validate lookup dependencies
DO $$
DECLARE
    v_material_active BIGINT;
    v_material_inactive BIGINT;
    v_brand_active BIGINT;
    v_brand_inactive BIGINT;
BEGIN
    SELECT look_up_id INTO v_material_active
    FROM public.look_up
    WHERE look_up_type = 'material_status' AND lower(code) = 'active';

    SELECT look_up_id INTO v_material_inactive
    FROM public.look_up
    WHERE look_up_type = 'material_status' AND lower(code) = 'inactive';

    SELECT look_up_id INTO v_brand_active
    FROM public.look_up
    WHERE look_up_type = 'material_brand_status' AND lower(code) = 'active';

    SELECT look_up_id INTO v_brand_inactive
    FROM public.look_up
    WHERE look_up_type = 'material_brand_status' AND lower(code) = 'inactive';

    IF v_material_active IS NULL OR v_material_inactive IS NULL OR v_brand_active IS NULL OR v_brand_inactive IS NULL THEN
        RAISE EXCEPTION 'Missing required lookups: material_status(active/inactive), material_brand_status(active/inactive).';
    END IF;
END $$;

-- =========================================================
-- Stage source product rows using JSON extraction so legacy
-- column naming variations do not break the migration.
-- =========================================================
CREATE TEMP TABLE tmp_source_product AS
SELECT
    j AS raw_json,
    NULLIF(BTRIM(COALESCE(j->>'prodid', j->>'productid', j->>'product_id', j->>'id')), '') AS legacy_product_id_text,
    NULLIF(BTRIM(COALESCE(j->>'productcode', j->>'product_code', j->>'code')), '') AS product_code_text,
    NULLIF(BTRIM(COALESCE(j->>'productname', j->>'product_name', j->>'name')), '') AS product_name_text,
    NULLIF(BTRIM(COALESCE(j->>'description', j->>'productdescription', j->>'product_description')), '') AS source_description_text,
    NULLIF(BTRIM(COALESCE(j->>'brand', j->>'brandname', j->>'brand_name')), '') AS brand_text,
    NULLIF(BTRIM(COALESCE(j->>'type', j->>'materialtype', j->>'material_type')), '') AS material_type_text,
    NULLIF(BTRIM(COALESCE(j->>'unit', j->>'uom', j->>'unitname', j->>'unit_name')), '') AS unit_text,
    NULLIF(BTRIM(COALESCE(j->>'category', j->>'categoryname', j->>'category_name', j->>'categoryid', j->>'category_id')), '') AS category_text,
    NULLIF(BTRIM(COALESCE(j->>'subcategory', j->>'sub_category', j->>'sub_category_name', j->>'subcategoryid', j->>'sub_category_id')), '') AS sub_category_text,
    NULLIF(BTRIM(COALESCE(j->>'status', j->>'isactive', j->>'active')), '') AS status_text,
    NULLIF(BTRIM(COALESCE(j->>'datecreated', j->>'createdat', j->>'created_at')), '') AS created_at_text,
    NULLIF(BTRIM(COALESCE(j->>'datemodified', j->>'updatedat', j->>'updated_at')), '') AS updated_at_text
FROM (
    SELECT to_jsonb(p) AS j
    FROM source.tblproduct p
) src;

-- =========================================================
-- Step 1: Category import
-- =========================================================
SELECT COUNT(*) AS source_category_rows_before
FROM source.tblcategory;

CREATE TEMP TABLE tmp_category_source AS
SELECT DISTINCT
    NULLIF(BTRIM(COALESCE(j->>'categoryid', j->>'category_id', j->>'id')), '') AS legacy_category_key,
    NULLIF(BTRIM(COALESCE(j->>'categorycode', j->>'category_code', j->>'code')), '') AS raw_category_code,
    NULLIF(BTRIM(COALESCE(j->>'categoryname', j->>'category_name', j->>'category', j->>'name')), '') AS raw_category_name
FROM (
    SELECT to_jsonb(c) AS j
    FROM source.tblcategory c
) s
;

INSERT INTO public.category (
    category_code,
    category_name,
    description,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT DISTINCT
    src.raw_category_code AS category_code,
    src.raw_category_name,
    NULL,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'
FROM tmp_category_source src
WHERE src.raw_category_name IS NOT NULL
ON CONFLICT (category_code) DO NOTHING
;

CREATE TEMP TABLE tmp_category_map AS
SELECT
    c.category_id,
    c.category_code,
    c.category_name,
    UPPER(REGEXP_REPLACE(COALESCE(c.category_name, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_name,
    UPPER(REGEXP_REPLACE(COALESCE(c.category_code, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_code
FROM public.category c
WHERE c.is_deleted = FALSE;

SELECT COUNT(*) AS target_category_rows_after FROM public.category;

-- =========================================================
-- Step 2: Sub Category import
-- =========================================================
SELECT COUNT(*) AS source_sub_category_rows_before
FROM source.tblsubcategory;

CREATE TEMP TABLE tmp_sub_category_source AS
SELECT DISTINCT
    NULLIF(BTRIM(COALESCE(j->>'subcategoryid', j->>'sub_category_id', j->>'id')), '') AS legacy_sub_category_key,
    NULLIF(BTRIM(COALESCE(j->>'categoryid', j->>'category_id', j->>'category', j->>'categoryname', j->>'category_name')), '') AS legacy_category_key,
    NULLIF(BTRIM(COALESCE(j->>'subcategorycode', j->>'sub_category_code', j->>'code')), '') AS raw_sub_category_code,
    NULLIF(BTRIM(COALESCE(j->>'subcategoryname', j->>'sub_category_name', j->>'subcategory', j->>'name')), '') AS raw_sub_category_name
FROM (
    SELECT to_jsonb(sc) AS j
    FROM source.tblsubcategory sc
) s
UNION
SELECT DISTINCT
    NULL,
    sp.category_text,
    NULL,
    sp.sub_category_text
FROM tmp_source_product sp
WHERE sp.sub_category_text IS NOT NULL;

INSERT INTO public.sub_category (
    category_id,
    sub_category_code,
    sub_category_name,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT DISTINCT
    cm.category_id,
    COALESCE(
        UPPER(REGEXP_REPLACE(src.raw_sub_category_code, '[^A-Za-z0-9]+', '_', 'g')),
        CONCAT(
            cm.category_code,
            '_',
            UPPER(REGEXP_REPLACE(src.raw_sub_category_name, '[^A-Za-z0-9]+', '_', 'g'))
        )
    ) AS sub_category_code,
    src.raw_sub_category_name,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'
FROM tmp_sub_category_source src
JOIN tmp_category_map cm
  ON cm.norm_code = UPPER(REGEXP_REPLACE(COALESCE(src.legacy_category_key, ''), '[^A-Za-z0-9]+', '', 'g'))
   OR cm.norm_name = UPPER(REGEXP_REPLACE(COALESCE(src.legacy_category_key, ''), '[^A-Za-z0-9]+', '', 'g'))
WHERE src.raw_sub_category_name IS NOT NULL
ON CONFLICT (category_id, sub_category_name) DO NOTHING;

CREATE TEMP TABLE tmp_sub_category_map AS
SELECT
    sc.sub_category_id,
    sc.category_id,
    sc.sub_category_code,
    sc.sub_category_name,
    UPPER(REGEXP_REPLACE(COALESCE(sc.sub_category_name, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_sub_name,
    UPPER(REGEXP_REPLACE(COALESCE(sc.sub_category_code, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_sub_code
FROM public.sub_category sc
WHERE sc.is_deleted = FALSE;

SELECT COUNT(*) AS target_sub_category_rows_after FROM public.sub_category;

-- =========================================================
-- Step 3: Unit of Measure import
-- =========================================================
SELECT COUNT(*) AS source_uom_rows_before
FROM source.tblunit;

CREATE TEMP TABLE tmp_uom_source AS
SELECT DISTINCT
    NULLIF(BTRIM(COALESCE(j->>'unitid', j->>'uom_id', j->>'id')), '') AS legacy_uom_key,
    NULLIF(BTRIM(COALESCE(j->>'unit', j->>'unitname', j->>'unit_name', j->>'uom', j->>'name')), '') AS raw_uom_name,
    NULLIF(BTRIM(COALESCE(j->>'abbreviation', j->>'abbr', j->>'symbol')), '') AS raw_uom_abbreviation
FROM (
    SELECT to_jsonb(u) AS j
    FROM source.tblunit u
) s
;

INSERT INTO public.unit_of_measure (
    uom_name,
    abbreviation,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT DISTINCT
    src.raw_uom_name,
    COALESCE(
        NULLIF(LOWER(REGEXP_REPLACE(src.raw_uom_abbreviation, '[^A-Za-z0-9]+', '', 'g')), ''),
        LOWER(SUBSTRING(REGEXP_REPLACE(src.raw_uom_name, '[^A-Za-z0-9]+', '', 'g') FROM 1 FOR 8))
    ) AS abbreviation,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'
FROM tmp_uom_source src
WHERE src.raw_uom_name IS NOT NULL
ON CONFLICT (uom_name) DO NOTHING;

CREATE TEMP TABLE tmp_uom_map AS
SELECT
    u.uom_id,
    u.uom_name,
    u.abbreviation,
    UPPER(REGEXP_REPLACE(COALESCE(u.uom_name, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_uom_name,
    UPPER(REGEXP_REPLACE(COALESCE(u.abbreviation, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_uom_abbreviation
FROM public.unit_of_measure u
WHERE u.is_deleted = FALSE;

SELECT COUNT(*) AS target_uom_rows_after FROM public.unit_of_measure;

-- =========================================================
-- Step 4: Material Brand import (master brand list)
-- =========================================================
SELECT COUNT(*) AS source_distinct_brand_tokens_before
FROM (
    SELECT DISTINCT NULLIF(BTRIM(token), '') AS token
    FROM tmp_source_product sp,
         LATERAL regexp_split_to_table(COALESCE(sp.brand_text, ''), '[,;/|]') AS token
    WHERE sp.brand_text IS NOT NULL
) b;

INSERT INTO public.brand (
    brand_name,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT DISTINCT
    INITCAP(BTRIM(token)) AS brand_name,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'
FROM tmp_source_product sp,
     LATERAL regexp_split_to_table(COALESCE(sp.brand_text, ''), '[,;/|]') AS token
WHERE NULLIF(BTRIM(token), '') IS NOT NULL
ON CONFLICT (brand_name) DO NOTHING;

CREATE TEMP TABLE tmp_brand_map AS
SELECT
    b.brand_id,
    b.brand_name,
    UPPER(REGEXP_REPLACE(COALESCE(b.brand_name, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_brand_name
FROM public.brand b
WHERE b.is_deleted = FALSE;

SELECT COUNT(*) AS target_brand_rows_after FROM public.brand;

-- =========================================================
-- Step 5: Material Type import
-- =========================================================
SELECT COUNT(*) AS source_distinct_material_type_tokens_before
FROM (
    SELECT DISTINCT NULLIF(BTRIM(sp.material_type_text), '') AS material_type_text
    FROM tmp_source_product sp
    WHERE sp.material_type_text IS NOT NULL
) t;

INSERT INTO public.material_type (
    material_type_code,
    material_type_name,
    description,
    is_active,
    is_deleted,
    log_date_created,
    log_module_created,
    log_module_updated
)
SELECT DISTINCT
    UPPER(REGEXP_REPLACE(sp.material_type_text, '[^A-Za-z0-9]+', '_', 'g')) AS material_type_code,
    INITCAP(BTRIM(sp.material_type_text)) AS material_type_name,
    NULL,
    TRUE,
    FALSE,
    NOW(),
    'import_product',
    'import_product'
FROM tmp_source_product sp
WHERE NULLIF(BTRIM(sp.material_type_text), '') IS NOT NULL
ON CONFLICT (material_type_code) DO NOTHING;

CREATE TEMP TABLE tmp_material_type_map AS
SELECT
    mt.material_type_id,
    mt.material_type_code,
    mt.material_type_name,
    UPPER(REGEXP_REPLACE(COALESCE(mt.material_type_name, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_material_type_name,
    UPPER(REGEXP_REPLACE(COALESCE(mt.material_type_code, ''), '[^A-Za-z0-9]+', '', 'g')) AS norm_material_type_code
FROM public.material_type mt
WHERE mt.is_deleted = FALSE;

SELECT COUNT(*) AS target_material_type_rows_after FROM public.material_type;

-- =========================================================
-- Step 6: Material import (linked to material_type)
-- =========================================================
CREATE TEMP TABLE tmp_material_stage AS
WITH base AS (
    SELECT
        sp.*,
        CASE
            WHEN sp.legacy_product_id_text ~ '^[0-9]+$' THEN sp.legacy_product_id_text::BIGINT
            ELSE NULL
        END AS legacy_product_id,
        COALESCE(
            NULLIF(sp.product_code_text, ''),
            'LEGACY-' || COALESCE(sp.legacy_product_id_text, UPPER(SUBSTRING(md5(COALESCE(sp.source_description_text, '')) FROM 1 FOR 12)))
        ) AS generated_product_code
    FROM tmp_source_product sp
), dedup AS (
    SELECT
        b.*,
        ROW_NUMBER() OVER (
            PARTITION BY UPPER(REGEXP_REPLACE(b.generated_product_code, '[^A-Za-z0-9]+', '', 'g'))
            ORDER BY COALESCE(b.legacy_product_id, 9223372036854775807), b.generated_product_code
        ) AS product_code_rank
    FROM base b
)
SELECT
    d.legacy_product_id,
    CASE
        WHEN d.product_code_rank = 1 THEN d.generated_product_code
        ELSE d.generated_product_code || '-' || d.product_code_rank::TEXT
    END AS product_code,
    COALESCE(
        NULLIF(d.product_name_text, ''),
        NULLIF(BTRIM(REGEXP_REPLACE(
            COALESCE(d.source_description_text, ''),
            '\\s+(\\d+(?:[./-]\\d+)?|\\d+\\s*(?:mm|cm|m|in|ft|"|''|ga#?\\d+|awg|psi|v|w|a|hp|l|kg|lbs?)).*$',
            '',
            'i'
        )), ''),
        NULLIF(d.source_description_text, ''),
        d.generated_product_code
    ) AS product_name,
    d.source_description_text AS source_description,
    cm.category_id,
    scm.sub_category_id,
    um.uom_id AS stock_uom_id,
    mtm.material_type_id,
    CASE
        WHEN LOWER(COALESCE(d.status_text, '')) IN ('0', 'false', 'f', 'inactive', 'disabled')
            THEN (
                SELECT look_up_id
                FROM public.look_up
                WHERE look_up_type = 'material_status' AND lower(code) = 'inactive'
                LIMIT 1
            )
        ELSE (
            SELECT look_up_id
            FROM public.look_up
            WHERE look_up_type = 'material_status' AND lower(code) = 'active'
            LIMIT 1
        )
    END AS status_id,
    NULL::TEXT AS notes,
    d.created_at_text,
    d.updated_at_text,
    d.status_text,
    d.brand_text
FROM dedup d
LEFT JOIN tmp_category_map cm
  ON cm.norm_code = UPPER(REGEXP_REPLACE(COALESCE(d.category_text, ''), '[^A-Za-z0-9]+', '', 'g'))
   OR cm.norm_name = UPPER(REGEXP_REPLACE(COALESCE(d.category_text, ''), '[^A-Za-z0-9]+', '', 'g'))
LEFT JOIN tmp_sub_category_map scm
  ON scm.category_id = cm.category_id
 AND (
        scm.norm_sub_code = UPPER(REGEXP_REPLACE(COALESCE(d.sub_category_text, ''), '[^A-Za-z0-9]+', '', 'g'))
     OR scm.norm_sub_name = UPPER(REGEXP_REPLACE(COALESCE(d.sub_category_text, ''), '[^A-Za-z0-9]+', '', 'g'))
 )
LEFT JOIN tmp_uom_map um
  ON um.norm_uom_name = UPPER(REGEXP_REPLACE(COALESCE(d.unit_text, ''), '[^A-Za-z0-9]+', '', 'g'))
   OR um.norm_uom_abbreviation = UPPER(REGEXP_REPLACE(COALESCE(d.unit_text, ''), '[^A-Za-z0-9]+', '', 'g'))
LEFT JOIN tmp_material_type_map mtm
  ON mtm.norm_material_type_code = UPPER(REGEXP_REPLACE(COALESCE(d.material_type_text, ''), '[^A-Za-z0-9]+', '', 'g'))
   OR mtm.norm_material_type_name = UPPER(REGEXP_REPLACE(COALESCE(d.material_type_text, ''), '[^A-Za-z0-9]+', '', 'g'));

-- Validation for unresolved mandatory relationships prior to insert
SELECT COUNT(*) AS unresolved_material_rows
FROM tmp_material_stage ms
WHERE ms.category_id IS NULL
   OR ms.stock_uom_id IS NULL;

-- Insert material rows preserving legacy PK where safe
INSERT INTO public.material (
    material_id,
    product_code,
    product_name,
    source_description,
    category_id,
    sub_category_id,
    stock_uom_id,
    material_type_id,
    status_id,
    is_deleted,
    notes,
    log_date_created,
    log_date_updated,
    log_module_created,
    log_module_updated
)
SELECT
    ms.legacy_product_id,
    ms.product_code,
    ms.product_name,
    ms.source_description,
    ms.category_id,
    ms.sub_category_id,
    ms.stock_uom_id,
    ms.material_type_id,
    ms.status_id,
    FALSE,
    ms.notes,
    COALESCE(NULLIF(ms.created_at_text, '')::timestamptz, NOW()),
    COALESCE(NULLIF(ms.updated_at_text, '')::timestamptz, NOW()),
    'import_product',
    'import_product'
FROM tmp_material_stage ms
LEFT JOIN public.material existing_id
  ON existing_id.material_id = ms.legacy_product_id
WHERE ms.legacy_product_id IS NOT NULL
  AND ms.category_id IS NOT NULL
  AND ms.stock_uom_id IS NOT NULL
  AND (existing_id.material_id IS NULL OR existing_id.product_code = ms.product_code)
ON CONFLICT (product_code) DO UPDATE
SET
    product_name = EXCLUDED.product_name,
    source_description = EXCLUDED.source_description,
    category_id = EXCLUDED.category_id,
    sub_category_id = EXCLUDED.sub_category_id,
    stock_uom_id = EXCLUDED.stock_uom_id,
    material_type_id = EXCLUDED.material_type_id,
    status_id = EXCLUDED.status_id,
    notes = EXCLUDED.notes,
    log_date_updated = NOW(),
    log_module_updated = 'import_product';

-- Insert remaining material rows without forcing PK
INSERT INTO public.material (
    product_code,
    product_name,
    source_description,
    category_id,
    sub_category_id,
    stock_uom_id,
    material_type_id,
    status_id,
    is_deleted,
    notes,
    log_date_created,
    log_date_updated,
    log_module_created,
    log_module_updated
)
SELECT
    ms.product_code,
    ms.product_name,
    ms.source_description,
    ms.category_id,
    ms.sub_category_id,
    ms.stock_uom_id,
    ms.material_type_id,
    ms.status_id,
    FALSE,
    ms.notes,
    COALESCE(NULLIF(ms.created_at_text, '')::timestamptz, NOW()),
    COALESCE(NULLIF(ms.updated_at_text, '')::timestamptz, NOW()),
    'import_product',
    'import_product'
FROM tmp_material_stage ms
LEFT JOIN public.material existing_code
  ON existing_code.product_code = ms.product_code
WHERE ms.category_id IS NOT NULL
  AND ms.stock_uom_id IS NOT NULL
  AND (ms.legacy_product_id IS NULL OR existing_code.product_code IS NULL)
ON CONFLICT (product_code) DO UPDATE
SET
    product_name = EXCLUDED.product_name,
    source_description = EXCLUDED.source_description,
    category_id = EXCLUDED.category_id,
    sub_category_id = EXCLUDED.sub_category_id,
    stock_uom_id = EXCLUDED.stock_uom_id,
    material_type_id = EXCLUDED.material_type_id,
    status_id = EXCLUDED.status_id,
    notes = EXCLUDED.notes,
    log_date_updated = NOW(),
    log_module_updated = 'import_product';

SELECT COUNT(*) AS target_material_rows_after FROM public.material;

-- =========================================================
-- Step 7: Material specification extraction/import
-- =========================================================
CREATE TEMP TABLE tmp_material_spec_stage AS
SELECT
    m.material_id,
    m.product_code,
    ms.source_description,
    substring(ms.source_description FROM '(?i)(sch(?:edule)?\\.?\\s*[0-9A-Za-z]+)') AS schedule_text,
    substring(ms.source_description FROM '(?i)([0-9]+(?:\\.[0-9]+)?\\s*(?:psi|lbs?))') AS pressure_text,
    substring(ms.source_description FROM '(?i)(ga(?:uge)?#?\\s*[0-9]+|awg\\s*[0-9]+)') AS gauge_text,
    substring(ms.source_description FROM '(?i)((?:\\d+(?:\\.\\d+)?(?:/\\d+)?(?:-\\d+/\\d+)?\\s*(?:mm|cm|m|in|ft|"|''))(?:\\s*[xX]\\s*(?:\\d+(?:\\.\\d+)?(?:/\\d+)?(?:-\\d+/\\d+)?\\s*(?:mm|cm|m|in|ft|"|''))){0,3})') AS dimension_text
FROM tmp_material_stage ms
JOIN public.material m
  ON m.product_code = ms.product_code;

INSERT INTO public.material_specification (
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
    pack_size,
    additional_specification,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_module_created,
    log_module_updated
)
SELECT
    stage.material_id,
    NULLIF(BTRIM((regexp_split_to_array(COALESCE(stage.dimension_text, ''), '\\s*[xX]\\s*'))[1]), '') AS primary_size,
    NULLIF(BTRIM((regexp_split_to_array(COALESCE(stage.dimension_text, ''), '\\s*[xX]\\s*'))[2]), '') AS secondary_size,
    NULLIF(BTRIM((regexp_split_to_array(COALESCE(stage.dimension_text, ''), '\\s*[xX]\\s*'))[3]), '') AS alternate_size,
    stage.gauge_text,
    NULL,
    NULLIF(BTRIM((regexp_split_to_array(COALESCE(stage.dimension_text, ''), '\\s*[xX]\\s*'))[4]), '') AS length,
    stage.schedule_text,
    stage.pressure_text,
    NULL,
    NULL,
    CASE
        WHEN stage.dimension_text IS NULL
         AND stage.schedule_text IS NULL
         AND stage.pressure_text IS NULL
         AND stage.gauge_text IS NULL THEN NULL
        ELSE BTRIM(CONCAT_WS(' | ', stage.dimension_text, stage.schedule_text, stage.pressure_text, stage.gauge_text))
    END AS additional_specification,
    FALSE,
    NOW(),
    NOW(),
    'import_product',
    'import_product'
FROM tmp_material_spec_stage stage
WHERE stage.dimension_text IS NOT NULL
   OR stage.schedule_text IS NOT NULL
   OR stage.pressure_text IS NOT NULL
   OR stage.gauge_text IS NOT NULL
ON CONFLICT (material_id) DO UPDATE
SET
    primary_size = EXCLUDED.primary_size,
    secondary_size = EXCLUDED.secondary_size,
    alternate_size = EXCLUDED.alternate_size,
    thickness_or_gauge = EXCLUDED.thickness_or_gauge,
    width = EXCLUDED.width,
    length = EXCLUDED.length,
    schedule = EXCLUDED.schedule,
    pressure_or_load_rating = EXCLUDED.pressure_or_load_rating,
    standard = EXCLUDED.standard,
    pack_size = EXCLUDED.pack_size,
    additional_specification = EXCLUDED.additional_specification,
    log_date_updated = NOW(),
    log_module_updated = 'import_product';

SELECT COUNT(*) AS target_material_spec_rows_after FROM public.material_specification;

-- =========================================================
-- Step 8: Material brand link import
-- =========================================================
CREATE TEMP TABLE tmp_material_brand_stage AS
SELECT DISTINCT
    m.material_id,
    bm.brand_id,
    CASE
        WHEN LOWER(COALESCE(ms.status_text, '')) IN ('0', 'false', 'f', 'inactive', 'disabled')
            THEN (
                SELECT look_up_id
                FROM public.look_up
                WHERE look_up_type = 'material_brand_status' AND lower(code) = 'inactive'
                LIMIT 1
            )
        ELSE (
            SELECT look_up_id
            FROM public.look_up
            WHERE look_up_type = 'material_brand_status' AND lower(code) = 'active'
            LIMIT 1
        )
    END AS status_id
FROM tmp_material_stage ms
JOIN public.material m
  ON m.product_code = ms.product_code
JOIN LATERAL regexp_split_to_table(COALESCE(ms.brand_text, ''), '[,;/|]') AS token ON TRUE
JOIN tmp_brand_map bm
  ON bm.norm_brand_name = UPPER(REGEXP_REPLACE(BTRIM(token), '[^A-Za-z0-9]+', '', 'g'))
WHERE NULLIF(BTRIM(token), '') IS NOT NULL;

INSERT INTO public.material_brand (
    material_id,
    brand_id,
    brand_product_code,
    brand_product_name,
    status_id,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_module_created,
    log_module_updated
)
SELECT
    stage.material_id,
    stage.brand_id,
    NULL,
    NULL,
    stage.status_id,
    FALSE,
    NOW(),
    NOW(),
    'import_product',
    'import_product'
FROM tmp_material_brand_stage stage
ON CONFLICT (material_id, brand_id) DO UPDATE
SET
    status_id = EXCLUDED.status_id,
    log_date_updated = NOW(),
    log_module_updated = 'import_product';

SELECT COUNT(*) AS target_material_brand_rows_after FROM public.material_brand;

-- =========================================================
-- Referential integrity validation after migration
-- =========================================================
SELECT COUNT(*) AS orphan_material_category
FROM public.material m
LEFT JOIN public.category c ON c.category_id = m.category_id
WHERE c.category_id IS NULL;

SELECT COUNT(*) AS orphan_material_uom
FROM public.material m
LEFT JOIN public.unit_of_measure u ON u.uom_id = m.stock_uom_id
WHERE u.uom_id IS NULL;

SELECT COUNT(*) AS orphan_material_type
FROM public.material m
LEFT JOIN public.material_type mt ON mt.material_type_id = m.material_type_id
WHERE m.material_type_id IS NOT NULL
  AND mt.material_type_id IS NULL;

SELECT COUNT(*) AS orphan_material_subcategory
FROM public.material m
LEFT JOIN public.sub_category sc ON sc.sub_category_id = m.sub_category_id
WHERE m.sub_category_id IS NOT NULL
  AND sc.sub_category_id IS NULL;

SELECT COUNT(*) AS orphan_material_brand
FROM public.material_brand mb
LEFT JOIN public.material m ON m.material_id = mb.material_id
LEFT JOIN public.brand b ON b.brand_id = mb.brand_id
WHERE m.material_id IS NULL OR b.brand_id IS NULL;

-- =========================================================
-- Sequence reset statements
-- =========================================================
SELECT setval(
    pg_get_serial_sequence('public.category', 'category_id'),
    COALESCE((SELECT MAX(category_id) FROM public.category), 1),
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('public.sub_category', 'sub_category_id'),
    COALESCE((SELECT MAX(sub_category_id) FROM public.sub_category), 1),
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('public.unit_of_measure', 'uom_id'),
    COALESCE((SELECT MAX(uom_id) FROM public.unit_of_measure), 1),
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('public.brand', 'brand_id'),
    COALESCE((SELECT MAX(brand_id) FROM public.brand), 1),
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('public.material_type', 'material_type_id'),
    COALESCE((SELECT MAX(material_type_id) FROM public.material_type), 1),
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('public.material', 'material_id'),
    COALESCE((SELECT MAX(material_id) FROM public.material), 1),
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('public.material_specification', 'material_specification_id'),
    COALESCE((SELECT MAX(material_specification_id) FROM public.material_specification), 1),
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('public.material_brand', 'material_brand_id'),
    COALESCE((SELECT MAX(material_brand_id) FROM public.material_brand), 1),
    TRUE
);

COMMIT;
