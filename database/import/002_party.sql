BEGIN;

INSERT INTO look_up (look_up_type, code, name, description, display_order, log_module_created, log_module_updated)
VALUES
  ('status','active','Active','User account is active',1,NULL,NULL),
  ('status','inactive','Inactive','User account is inactive',2,NULL,NULL)
ON CONFLICT (look_up_type, name) DO NOTHING
;

-- ------------------------------------------------------------------
-- STEP 1 : Add mapping column if it does not exist
-- ------------------------------------------------------------------

ALTER TABLE source.tblproject_type
ADD COLUMN IF NOT EXISTS look_up_id BIGINT;

-- ------------------------------------------------------------------
-- STEP 2 : Assign new IDs only to unmapped records
-- ------------------------------------------------------------------

UPDATE source.tblproject_type
SET look_up_id = nextval(
    pg_get_serial_sequence('public.look_up', 'look_up_id')
)
WHERE look_up_id IS NULL;

-- ------------------------------------------------------------------
-- STEP 3 : Insert records
-- ------------------------------------------------------------------

DELETE FROM look_up WHERE look_up_type = 'project_type';

INSERT INTO public.look_up
(
    look_up_id,
    look_up_type,
    code,
    name,
    description,
    display_order,
    is_active,
    is_deleted,
    log_module_created,
    log_module_updated
)
SELECT
    s.look_up_id,
    'project_type',
    s.prjtype::TEXT,
    s."project type",
    s.description,
    s.prjtype,
    TRUE,
    FALSE,
    'Migration',
    'Migration'
FROM source.tblproject_type s
WHERE NOT EXISTS
(
    SELECT 1
    FROM public.look_up l
    WHERE l.look_up_id = s.look_up_id
);

-- ------------------------------------------------------------------
-- STEP 4 : Synchronize identity sequence
-- ------------------------------------------------------------------

SELECT setval
(
    pg_get_serial_sequence('public.look_up', 'look_up_id'),
    COALESCE
    (
        (SELECT MAX(look_up_id) FROM public.look_up),
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
    FROM source.tblproject_type;

    SELECT COUNT(*)
      INTO v_destination_count
    FROM public.look_up
    WHERE look_up_type = 'project_type';

    RAISE NOTICE 'Source Count      : %', v_source_count;
    RAISE NOTICE 'Destination Count : %', v_destination_count;

    IF v_source_count <> v_destination_count THEN
        RAISE WARNING 'Record count mismatch.';
    ELSE
        RAISE NOTICE 'Migration completed successfully.';
    END IF;

END
$$;


-- ==========================================================
-- Migration : tblprojectsite -> party
-- Description:
--     Migrate Projects into Party table
-- ==========================================================

TRUNCATE party CASCADE;

-- ------------------------------------------------------------------
-- STEP 1 : Add mapping column
-- ------------------------------------------------------------------

ALTER TABLE source.tblprojectsite
ADD COLUMN IF NOT EXISTS party_id BIGINT,
ADD COLUMN IF NOT EXISTS contact_id BIGINT;

-- ------------------------------------------------------------------
-- STEP 2 : Assign Party IDs
-- ------------------------------------------------------------------

UPDATE source.tblprojectsite
SET party_id = nextval(
    pg_get_serial_sequence('public.party', 'party_id')
)
WHERE party_id IS NULL;

UPDATE source.tblprojectsite
SET contact_id = nextval(
    pg_get_serial_sequence('public.contact', 'contact_id')
)
WHERE contact_id IS NULL;


-- ------------------------------------------------------------------
-- STEP 3 : Insert Projects
-- ------------------------------------------------------------------
INSERT INTO contact(contact_id,entity_type_id,contact_name)

SELECT DISTINCT contact_id,
       (SELECT look_up_id FROM public.look_up WHERE look_up_type = 'entity_type' AND code = 'project') AS entity_type_id,
       s.projectname
FROM source.tblprojectsite s
WHERE NOT EXISTS
(
    SELECT 1
    FROM public.contact c
    WHERE c.contact_id = s.contact_id
)
;

INSERT INTO public.party
(
    party_id,
    contact_id,
    party_code,
    party_name,
    party_type_id,
    status_id,
    description,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated,
    project_type_id
)
SELECT
    s.party_id,
    s.contact_id,
    s.projectcode,
    s.projectname,

    CASE 
WHEN type = 1 THEN (SELECT look_up_id FROM look_up WHERE look_up_type = 'party_type' AND name = 'Project')
WHEN type = 2 THEN (SELECT look_up_id FROM look_up WHERE look_up_type = 'party_type' AND name = 'Warehouse')
WHEN type = 3 THEN (SELECT look_up_id FROM look_up WHERE look_up_type = 'party_type' AND name = 'External')
WHEN type = 4 THEN (SELECT look_up_id FROM look_up WHERE look_up_type = 'party_type' AND name = 'Services')
END as party_type_id,

    st.look_up_id,

    s.location,

    FALSE AS is_deleted,

    s.datecreated,
    s.datemodified,
    s.createdby,
    s.modifiedby,

    'Migration',
    'Migration',

    prj.look_up_id as project_type_id

FROM source.tblprojectsite s

LEFT JOIN public.look_up prj
    ON prj.look_up_type = 'project_type'
   AND prj.code = s.type::text

INNER JOIN public.look_up st
    ON st.look_up_type = 'status'
   AND st.code =
        CASE
            WHEN s.status = 1 THEN 'active'
            ELSE 'inactive'
        END

WHERE NOT EXISTS
(
    SELECT 1
    FROM public.party p
    WHERE p.party_id = s.party_id
);


INSERT INTO phone (contact_id, phone_type_id, phone_number, is_primary)
SELECT
    u.contact_id,
    phone_type_lookup.look_up_id,
    coalesce(telephoneno,''),
    TRUE
FROM source.tblprojectsite u
JOIN look_up phone_type_lookup
    ON phone_type_lookup.look_up_type = 'PHONE_TYPE'
   AND phone_type_lookup.name = 'MOBILE'
WHERE u.contact_id IS NOT NULL
--AND nullif(telephoneno,'') IS NOT NULL 
  AND NOT EXISTS (
      SELECT 1
      FROM phone p
      WHERE p.contact_id = u.contact_id
  );


INSERT INTO address (contact_id, address_type_id, address_label, is_primary)
SELECT
    u.contact_id,
    address_type_lookup.look_up_id,
    u.location AS address_label,
    TRUE
FROM source.tblprojectsite u
JOIN look_up address_type_lookup
    ON address_type_lookup.look_up_type = 'address_type'
   AND address_type_lookup.name = 'HOME'
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM address a
      WHERE a.contact_id = u.contact_id
  );


INSERT INTO email (contact_id, email_type_id, email_address, is_primary)
SELECT
    u.contact_id,
    email_type_lookup.look_up_id,
    '',
    TRUE
FROM source.tblprojectsite u
JOIN look_up email_type_lookup
    ON email_type_lookup.look_up_type = 'EMAIL_TYPE'
   AND email_type_lookup.name = 'PERSONAL'
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM email e
      WHERE e.contact_id = u.contact_id
  );
-- ------------------------------------------------------------------
-- STEP 4 : Synchronize Identity
-- ------------------------------------------------------------------

SELECT setval
(
    pg_get_serial_sequence('public.party','party_id'),
    COALESCE
    (
        (SELECT MAX(party_id) FROM public.party),
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
    FROM source.tblprojectsite;

    SELECT COUNT(*)
      INTO v_destination_count
    FROM public.party
    WHERE party_type_id IN
    (
        SELECT look_up_id
        FROM public.look_up
        WHERE look_up_type = 'party_type'
          AND LOWER(code) <> 'supplier'
    );

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
-- STEP 1 : Add mapping column
-- ------------------------------------------------------------------

ALTER TABLE source.tblsupplier
ADD COLUMN IF NOT EXISTS party_id BIGINT,
ADD COLUMN IF NOT EXISTS contact_id BIGINT;

-- ------------------------------------------------------------------
-- STEP 2 : Assign Party IDs
-- ------------------------------------------------------------------

UPDATE source.tblsupplier
SET party_id = nextval(
    pg_get_serial_sequence('public.party', 'party_id')
)
WHERE party_id IS NULL;

UPDATE source.tblsupplier
SET contact_id = nextval(
    pg_get_serial_sequence('public.contact', 'contact_id')
)
WHERE contact_id IS NULL;

-- ------------------------------------------------------------------
-- STEP 3 : Insert Projects
-- ------------------------------------------------------------------
INSERT INTO contact(contact_id,entity_type_id,contact_name)

SELECT DISTINCT contact_id,
       (SELECT look_up_id FROM public.look_up WHERE look_up_type = 'entity_type' AND code = 'company') AS entity_type_id,
       s.suppliername
FROM source.tblsupplier s
WHERE NOT EXISTS
(
    SELECT 1
    FROM public.contact c
    WHERE c.contact_id = s.contact_id
)
;


INSERT INTO public.party
(
    party_id,
    contact_id,
    party_code,
    party_name,
    party_type_id,
    status_id,
    -- description,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    s.party_id,
    s.contact_id,
    s.suppliercode,
    s.suppliername,

    (SELECT look_up_id FROM look_up WHERE look_up_type = 'party_type' AND code = 'supplier') as party_type_id,

    (SELECT look_up_id FROM look_up WHERE look_up_type = 'status' AND code = 'active') as status_id,


    FALSE AS is_deleted,

    s.datecreated,
    s.datemodified,
    s.createdby,
    s.modifiedby,

    'Migration',
    'Migration'

FROM source.tblsupplier s

WHERE NOT EXISTS
(
    SELECT 1
    FROM public.party p
    WHERE p.party_id = s.party_id
);


INSERT INTO phone (contact_id, phone_type_id, phone_number, is_primary)
SELECT * FROM (
SELECT
    u.contact_id,
    phone_type_lookup.look_up_id,
    coalesce(telephoneno,''),
    TRUE
FROM source.tblsupplier u
JOIN look_up phone_type_lookup
    ON phone_type_lookup.look_up_type = 'PHONE_TYPE'
   AND phone_type_lookup.name = 'MOBILE'
WHERE u.contact_id IS NOT NULL
AND nullif(telephoneno,'') IS NOT NULL 
UNION
SELECT
    u.contact_id,
    phone_type_lookup.look_up_id,
    coalesce(faxno,''),
    FALSE
FROM source.tblsupplier u
JOIN look_up phone_type_lookup
    ON phone_type_lookup.look_up_type = 'PHONE_TYPE'
   AND phone_type_lookup.name = 'MOBILE'
WHERE u.contact_id IS NOT NULL
AND nullif(faxno,'') IS NOT NULL 
) u
  WHERE NOT EXISTS (
      SELECT 1
      FROM phone p
      WHERE p.contact_id = u.contact_id
  );

INSERT INTO phone (contact_id, phone_type_id, phone_number, is_primary)
SELECT
    u.contact_id,
    phone_type_lookup.look_up_id,
    faxno,
    TRUE
FROM source.tblsupplier u
JOIN look_up phone_type_lookup
    ON phone_type_lookup.look_up_type = 'PHONE_TYPE'
   AND phone_type_lookup.name = 'MOBILE'
WHERE u.contact_id IS NOT NULL
AND nullif(faxno,'') IS NOT NULL 
  AND NOT EXISTS (
      SELECT 1
      FROM phone p
      WHERE p.contact_id = u.contact_id
  );

INSERT INTO address (contact_id, address_type_id, address_label, is_primary)
SELECT
    u.contact_id,
    address_type_lookup.look_up_id,
    concat(u.address1,'\n',
     u.address2,'\n',
     u.city) AS address_label,
    TRUE
FROM source.tblsupplier u
JOIN look_up address_type_lookup
    ON address_type_lookup.look_up_type = 'address_type'
   AND address_type_lookup.name = 'HOME'
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM address a
      WHERE a.contact_id = u.contact_id
  );


INSERT INTO email (contact_id, email_type_id, email_address, is_primary)
SELECT
    u.contact_id,
    email_type_lookup.look_up_id,
    '',
    TRUE
FROM source.tblsupplier u
JOIN look_up email_type_lookup
    ON email_type_lookup.look_up_type = 'EMAIL_TYPE'
   AND email_type_lookup.name = 'PERSONAL'
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM email e
      WHERE e.contact_id = u.contact_id
  );
-- ------------------------------------------------------------------
-- STEP 4 : Synchronize Identity
-- ------------------------------------------------------------------

SELECT setval
(
    pg_get_serial_sequence('public.party','party_id'),
    COALESCE
    (
        (SELECT MAX(party_id) FROM public.party),
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
    FROM source.tblsupplier;

    SELECT COUNT(*)
      INTO v_destination_count
    FROM public.party
    WHERE party_type_id IN
    (
        SELECT look_up_id
        FROM public.look_up
        WHERE look_up_type = 'party_type'
          AND LOWER(code) = 'supplier'
    );

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
