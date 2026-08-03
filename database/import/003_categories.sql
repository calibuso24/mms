BEGIN;

-- =========================================================
-- Product Migration: source -> public
-- - Includes schema revision support for material_type linkage.
-- - Preserves legacy PKs when safe and possible.
-- - Uses idempotent insert/update patterns.
-- =========================================================

TRUNCATE category CASCADE;
TRUNCATE sub_category CASCADE;



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

COMMIT;