BEGIN;

-- =========================================================
-- Validation (before migration)
-- =========================================================
SELECT COUNT(*) AS source_supplier_rows
FROM source.tblsupplier;

SELECT COUNT(*) AS source_project_rows
FROM source.tblprojectsite;

SELECT lu.code AS party_type_code, COUNT(*) AS existing_party_rows
FROM public.party p
JOIN public.look_up lu
  ON lu.look_up_id = p.party_type_id
WHERE lu.look_up_type = 'party_type'
  AND lu.code IN ('supplier', 'project')
GROUP BY lu.code
ORDER BY lu.code;

-- =========================================================
-- Step 1: Validate required lookup values exist
-- =========================================================
DO $$
DECLARE
    v_party_type_supplier BIGINT;
    v_party_type_project BIGINT;
    v_party_status_active BIGINT;
    v_party_status_inactive BIGINT;
    v_entity_company BIGINT;
    v_entity_project BIGINT;
    v_phone_type_main BIGINT;
    v_phone_type_fax BIGINT;
    v_address_type_office BIGINT;
    v_address_type_project_site BIGINT;
    v_payment_terms_cod BIGINT;
    v_payment_terms_net15 BIGINT;
    v_payment_terms_net30 BIGINT;
    v_payment_terms_net60 BIGINT;
    v_project_type_project BIGINT;
    v_project_type_warehouse BIGINT;
    v_project_type_services BIGINT;
    v_project_type_external BIGINT;
BEGIN
    SELECT look_up_id INTO v_party_type_supplier
    FROM public.look_up
    WHERE look_up_type = 'party_type' AND code = 'supplier';

    SELECT look_up_id INTO v_party_type_project
    FROM public.look_up
    WHERE look_up_type = 'party_type' AND code = 'project';

    SELECT look_up_id INTO v_party_status_active
    FROM public.look_up
    WHERE look_up_type = 'party_status' AND code = 'active';

    SELECT look_up_id INTO v_party_status_inactive
    FROM public.look_up
    WHERE look_up_type = 'party_status' AND code = 'inactive';

    SELECT look_up_id INTO v_entity_company
    FROM public.look_up
    WHERE look_up_type = 'ENTITY_TYPE' AND code = 'company';

    SELECT look_up_id INTO v_entity_project
    FROM public.look_up
    WHERE look_up_type = 'ENTITY_TYPE' AND code = 'project';

    -- Main phone is mapped to OFFICE in the new PHONE_TYPE lookup.
    SELECT look_up_id INTO v_phone_type_main
    FROM public.look_up
    WHERE look_up_type = 'PHONE_TYPE' AND code = 'office';

    SELECT look_up_id INTO v_phone_type_fax
    FROM public.look_up
    WHERE look_up_type = 'PHONE_TYPE' AND code = 'fax';

    SELECT look_up_id INTO v_address_type_office
    FROM public.look_up
    WHERE look_up_type = 'address_type' AND code = 'office';

    SELECT look_up_id INTO v_address_type_project_site
    FROM public.look_up
    WHERE look_up_type = 'address_type' AND code = 'project_site';

    SELECT look_up_id INTO v_payment_terms_cod
    FROM public.look_up
    WHERE look_up_type = 'payment_terms' AND code = 'cod';

    SELECT look_up_id INTO v_payment_terms_net15
    FROM public.look_up
    WHERE look_up_type = 'payment_terms' AND code = 'net15';

    SELECT look_up_id INTO v_payment_terms_net30
    FROM public.look_up
    WHERE look_up_type = 'payment_terms' AND code = 'net30';

    SELECT look_up_id INTO v_payment_terms_net60
    FROM public.look_up
    WHERE look_up_type = 'payment_terms' AND code = 'net60';

    SELECT look_up_id INTO v_project_type_project
    FROM public.look_up
    WHERE look_up_type = 'project_type' AND code = 'project';

    SELECT look_up_id INTO v_project_type_warehouse
    FROM public.look_up
    WHERE look_up_type = 'project_type' AND code = 'warehouse';

    SELECT look_up_id INTO v_project_type_services
    FROM public.look_up
    WHERE look_up_type = 'project_type' AND code = 'services';

    SELECT look_up_id INTO v_project_type_external
    FROM public.look_up
    WHERE look_up_type = 'project_type' AND code = 'external';

    IF v_party_type_supplier IS NULL
       OR v_party_type_project IS NULL
       OR v_party_status_active IS NULL
       OR v_party_status_inactive IS NULL
       OR v_entity_company IS NULL
       OR v_entity_project IS NULL
       OR v_phone_type_main IS NULL
       OR v_phone_type_fax IS NULL
       OR v_address_type_office IS NULL
       OR v_address_type_project_site IS NULL
       OR v_payment_terms_cod IS NULL
       OR v_payment_terms_net15 IS NULL
       OR v_payment_terms_net30 IS NULL
       OR v_payment_terms_net60 IS NULL
       OR v_project_type_project IS NULL
       OR v_project_type_warehouse IS NULL
       OR v_project_type_services IS NULL
       OR v_project_type_external IS NULL THEN
        RAISE EXCEPTION 'Missing one or more required lookups for party/contact import.';
    END IF;
END $$;

-- =========================================================
-- Step 2: Build unified staging rows from legacy supplier/project
-- Mapping:
--   source.tblsupplier    -> public.party (party_type = supplier)
--   source.tblprojectsite -> public.party (party_type = project)
-- =========================================================
CREATE TEMP TABLE tmp_legacy_party_stage (
    source_type TEXT NOT NULL,
    source_pk BIGINT NOT NULL,
    source_priority INT NOT NULL,
    desired_party_id BIGINT NOT NULL,
    raw_party_code TEXT,
    party_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    resolved_party_type_id BIGINT NOT NULL,
    resolved_project_type_id BIGINT,
    resolved_payment_terms_id BIGINT,
    status_code TEXT NOT NULL,
    entity_type_code TEXT NOT NULL,
    party_type_code TEXT,
    raw_location TEXT,
    raw_supplier_address1 TEXT,
    raw_supplier_address2 TEXT,
    raw_supplier_city TEXT,
    raw_main_phone TEXT,
    raw_fax_phone TEXT,
    raw_storehour TEXT,
    raw_terms_id BIGINT,
    raw_terms_name TEXT,
    raw_project_type_id BIGINT,
    raw_project_type_name TEXT,
    description TEXT,
    is_deleted BOOLEAN NOT NULL,
    log_date_created TIMESTAMPTZ,
    log_date_updated TIMESTAMPTZ,
    log_created_by_account_id BIGINT,
    log_updated_by_account_id BIGINT,
    log_module_created TEXT,
    log_module_updated TEXT
) ON COMMIT DROP;

-- Import Supplier stage rows
INSERT INTO tmp_legacy_party_stage (
    source_type,
    source_pk,
    source_priority,
    desired_party_id,
    raw_party_code,
    party_name,
    contact_name,
    resolved_party_type_id,
    resolved_project_type_id,
    resolved_payment_terms_id,
    status_code,
    entity_type_code,
    party_type_code,
    raw_location,
    raw_supplier_address1,
    raw_supplier_address2,
    raw_supplier_city,
    raw_main_phone,
    raw_fax_phone,
    raw_storehour,
    raw_terms_id,
    raw_terms_name,
    raw_project_type_id,
    raw_project_type_name,
    description,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    'SUPPLIER' AS source_type,
    s.supplierid::BIGINT AS source_pk,
    1 AS source_priority,
    s.supplierid::BIGINT AS desired_party_id,
    NULLIF(BTRIM(s.suppliercode), '') AS raw_party_code,
    COALESCE(NULLIF(BTRIM(s.suppliername), ''), 'SUPPLIER-' || s.supplierid::TEXT) AS party_name,
    COALESCE(NULLIF(BTRIM(s.contactperson), ''), COALESCE(NULLIF(BTRIM(s.suppliername), ''), 'SUPPLIER-' || s.supplierid::TEXT)) AS contact_name,
    (
        SELECT lu.look_up_id
        FROM public.look_up lu
        WHERE lu.look_up_type = 'party_type' AND lu.code = 'supplier'
    ) AS resolved_party_type_id,
    NULL::BIGINT AS resolved_project_type_id,
    CASE
        WHEN t.termid = 1 THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'payment_terms' AND lu.code = 'cod'
        )
        WHEN t.termid = 9 THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'payment_terms' AND lu.code = 'net15'
        )
        WHEN t.termid = 3 THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'payment_terms' AND lu.code = 'net30'
        )
        WHEN t.termid = 4 THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'payment_terms' AND lu.code = 'net60'
        )
        WHEN t.termid IN (8, 10) THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'payment_terms' AND lu.code = 'net60'
        )
        WHEN t.termid IN (2, 5, 6, 7, 11, 12) THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'payment_terms' AND lu.code = 'cod'
        )
        ELSE NULL
    END AS resolved_payment_terms_id,
    'active' AS status_code,
    'company' AS entity_type_code,
    'supplier' AS party_type_code,
    NULL::TEXT AS raw_location,
    NULLIF(BTRIM(s.address1), '') AS raw_supplier_address1,
    NULLIF(BTRIM(s.address2), '') AS raw_supplier_address2,
    NULLIF(BTRIM(s.city), '') AS raw_supplier_city,
    NULLIF(BTRIM(s.telephoneno), '') AS raw_main_phone,
    NULLIF(BTRIM(s.faxno), '') AS raw_fax_phone,
    NULLIF(BTRIM(s.storehour), '') AS raw_storehour,
    s.terms::BIGINT AS raw_terms_id,
    NULLIF(BTRIM(t.terms), '') AS raw_terms_name,
    NULL::BIGINT AS raw_project_type_id,
    NULL::TEXT AS raw_project_type_name,
    NULLIF(BTRIM(CONCAT_WS(
        ' | ',
        CASE
            WHEN COALESCE(NULLIF(BTRIM(s.address1), ''), NULLIF(BTRIM(s.address2), ''), NULLIF(BTRIM(s.city), '')) IS NOT NULL
                THEN 'Address: ' || CONCAT_WS(', ', NULLIF(BTRIM(s.address1), ''), NULLIF(BTRIM(s.address2), ''), NULLIF(BTRIM(s.city), ''))
            ELSE NULL
        END,
        CASE WHEN NULLIF(BTRIM(s.contactperson), '') IS NOT NULL THEN 'Contact: ' || BTRIM(s.contactperson) ELSE NULL END,
        CASE WHEN NULLIF(BTRIM(s.telephoneno), '') IS NOT NULL THEN 'Phone: ' || BTRIM(s.telephoneno) ELSE NULL END,
        CASE WHEN NULLIF(BTRIM(s.faxno), '') IS NOT NULL THEN 'Fax: ' || BTRIM(s.faxno) ELSE NULL END,
        CASE WHEN NULLIF(BTRIM(s.storehour), '') IS NOT NULL THEN 'Store hours: ' || BTRIM(s.storehour) ELSE NULL END,
        CASE
            WHEN s.externalservice IS NOT NULL
                THEN 'External service: ' || CASE WHEN s.externalservice = 1 THEN 'Yes' ELSE 'No' END
            ELSE NULL
        END,
        CASE WHEN s.terms IS NOT NULL THEN 'Legacy terms id: ' || s.terms::TEXT ELSE NULL END
        ,CASE WHEN NULLIF(BTRIM(t.terms), '') IS NOT NULL THEN 'Legacy terms: ' || BTRIM(t.terms) ELSE NULL END
    )), '') AS description,
    FALSE AS is_deleted,
    s.datecreated::TIMESTAMPTZ AS log_date_created,
    s.datemodified::TIMESTAMPTZ AS log_date_updated,
    uc.account_id AS log_created_by_account_id,
    um.account_id AS log_updated_by_account_id,
    'import_legacy_supplier' AS log_module_created,
    'import_legacy_supplier' AS log_module_updated
FROM source.tblsupplier s
LEFT JOIN source.tblterms t
    ON t.termid = s.terms
LEFT JOIN source.tbluser uc
  ON uc.id = s.createdby
LEFT JOIN source.tbluser um
  ON um.id = s.modifiedby;

-- Import Project stage rows
INSERT INTO tmp_legacy_party_stage (
    source_type,
    source_pk,
    source_priority,
    desired_party_id,
    raw_party_code,
    party_name,
    contact_name,
    resolved_party_type_id,
    resolved_project_type_id,
    resolved_payment_terms_id,
    status_code,
    entity_type_code,
    party_type_code,
    raw_location,
    raw_supplier_address1,
    raw_supplier_address2,
    raw_supplier_city,
    raw_main_phone,
    raw_fax_phone,
    raw_storehour,
    raw_terms_id,
    raw_terms_name,
    raw_project_type_id,
    raw_project_type_name,
    description,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    'PROJECT' AS source_type,
    p.projid::BIGINT AS source_pk,
    2 AS source_priority,
    p.projid::BIGINT AS desired_party_id,
    NULLIF(BTRIM(p.projectcode), '') AS raw_party_code,
    COALESCE(NULLIF(BTRIM(p.projectname), ''), 'PROJECT-' || p.projid::TEXT) AS party_name,
    COALESCE(NULLIF(BTRIM(p.projectname), ''), 'PROJECT-' || p.projid::TEXT) AS contact_name,
    (
        SELECT lu.look_up_id
        FROM public.look_up lu
        WHERE lu.look_up_type = 'party_type' AND lu.code = 'project'
    ) AS resolved_party_type_id,
    CASE LOWER(COALESCE(BTRIM(pt."project type"), ''))
        WHEN 'project' THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'project_type' AND lu.code = 'project'
        )
        WHEN 'warehouse' THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'project_type' AND lu.code = 'warehouse'
        )
        WHEN 'services' THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'project_type' AND lu.code = 'services'
        )
        WHEN 'external' THEN (
            SELECT lu.look_up_id
            FROM public.look_up lu
            WHERE lu.look_up_type = 'project_type' AND lu.code = 'external'
        )
        ELSE NULL
    END AS resolved_project_type_id,
    NULL::BIGINT AS resolved_payment_terms_id,
    CASE WHEN COALESCE(p.status, 1) = 1 THEN 'active' ELSE 'inactive' END AS status_code,
    'project' AS entity_type_code,
    NULL::TEXT AS party_type_code,
    NULLIF(BTRIM(p.location), '') AS raw_location,
    NULL::TEXT AS raw_supplier_address1,
    NULL::TEXT AS raw_supplier_address2,
    NULL::TEXT AS raw_supplier_city,
    NULLIF(BTRIM(p.telephoneno), '') AS raw_main_phone,
    NULL::TEXT AS raw_fax_phone,
    NULL::TEXT AS raw_storehour,
    NULL::BIGINT AS raw_terms_id,
    NULL::TEXT AS raw_terms_name,
    p.type::BIGINT AS raw_project_type_id,
    NULLIF(BTRIM(pt."project type"), '') AS raw_project_type_name,
    NULLIF(BTRIM(CONCAT_WS(
        ' | ',
        CASE WHEN NULLIF(BTRIM(p.location), '') IS NOT NULL THEN 'Location: ' || BTRIM(p.location) ELSE NULL END,
        CASE WHEN NULLIF(BTRIM(p.telephoneno), '') IS NOT NULL THEN 'Phone: ' || BTRIM(p.telephoneno) ELSE NULL END,
        CASE WHEN p.type IS NOT NULL THEN 'Legacy project type id: ' || p.type::TEXT ELSE NULL END,
        CASE WHEN pt."project type" IS NOT NULL THEN 'Legacy project type: ' || BTRIM(pt."project type") ELSE NULL END,
        CASE WHEN NULLIF(BTRIM(pt.description), '') IS NOT NULL THEN 'Project type description: ' || BTRIM(pt.description) ELSE NULL END
    )), '') AS description,
    CASE WHEN COALESCE(p.status, 1) = 1 THEN FALSE ELSE TRUE END AS is_deleted,
    p.datecreated::TIMESTAMPTZ AS log_date_created,
    p.datemodified::TIMESTAMPTZ AS log_date_updated,
    uc.account_id AS log_created_by_account_id,
    um.account_id AS log_updated_by_account_id,
    'import_legacy_projectsite' AS log_module_created,
    'import_legacy_projectsite' AS log_module_updated
FROM source.tblprojectsite p
LEFT JOIN source.tblproject_type pt
  ON pt.prjtype = p.type
LEFT JOIN source.tbluser uc
  ON uc.id = p.createdby
LEFT JOIN source.tbluser um
  ON um.id = p.modifiedby;

-- =========================================================
-- Step 2.5: Pre-align identity sequences before fallback ID allocation
-- This avoids collisions where nextval() returns a value still used by
-- preserved legacy IDs from source tables.
-- =========================================================
SELECT setval(
        pg_get_serial_sequence('public.party', 'party_id'),
        GREATEST(
                COALESCE((SELECT MAX(party_id) FROM public.party), 0),
                COALESCE((SELECT MAX(desired_party_id) FROM tmp_legacy_party_stage), 0)
        ),
        TRUE
) AS party_seq_pre_aligned;

SELECT setval(
        pg_get_serial_sequence('public.contact', 'contact_id'),
        GREATEST(
                COALESCE((SELECT MAX(contact_id) FROM public.contact), 0),
                COALESCE((SELECT MAX(desired_party_id) FROM tmp_legacy_party_stage), 0)
        ),
        TRUE
) AS contact_seq_pre_aligned;

-- =========================================================
-- Step 3: Normalize and resolve final keys/codes for idempotent import
--   - keep source PK as party_id whenever not already used
--   - if PK collision exists in public.party, allocate from identity sequence
--   - dedupe party_code values by suffixing source type and source PK when needed
-- =========================================================
CREATE TEMP TABLE tmp_legacy_party_map (
    source_type TEXT NOT NULL,
    source_pk BIGINT NOT NULL,
    final_party_id BIGINT NOT NULL,
    final_contact_id BIGINT NOT NULL,
    party_code TEXT NOT NULL,
    party_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    resolved_party_type_id BIGINT NOT NULL,
    resolved_project_type_id BIGINT,
    resolved_payment_terms_id BIGINT,
    status_code TEXT NOT NULL,
    entity_type_code TEXT NOT NULL,
    party_type_code TEXT,
    raw_location TEXT,
    raw_supplier_address1 TEXT,
    raw_supplier_address2 TEXT,
    raw_supplier_city TEXT,
    raw_main_phone TEXT,
    raw_fax_phone TEXT,
    raw_storehour TEXT,
    raw_terms_id BIGINT,
    raw_terms_name TEXT,
    raw_project_type_id BIGINT,
    raw_project_type_name TEXT,
    description TEXT,
    is_deleted BOOLEAN NOT NULL,
    log_date_created TIMESTAMPTZ,
    log_date_updated TIMESTAMPTZ,
    log_created_by_account_id BIGINT,
    log_updated_by_account_id BIGINT,
    log_module_created TEXT,
    log_module_updated TEXT
) ON COMMIT DROP;

WITH base AS (
    SELECT
        s.*,
        COALESCE(s.raw_party_code, s.party_type_code || '-' || s.source_pk::TEXT) AS base_party_code
    FROM tmp_legacy_party_stage s
),
ranked AS (
    SELECT
        b.*,
        ROW_NUMBER() OVER (
            PARTITION BY b.base_party_code
            ORDER BY b.source_priority, b.source_pk
        ) AS code_rank
    FROM base b
),
normalized AS (
    SELECT
        r.*,
        CASE
            WHEN r.code_rank = 1 THEN r.base_party_code
            ELSE r.base_party_code || '-' || LOWER(r.source_type) || '-' || r.source_pk::TEXT
        END AS final_party_code
    FROM ranked r
),
id_ranked AS (
    SELECT
        n.*,
        ROW_NUMBER() OVER (
            PARTITION BY n.desired_party_id
            ORDER BY n.source_priority, n.source_pk
        ) AS id_rank
    FROM normalized n
),
candidate_rows AS (
    SELECT n.*
    FROM id_ranked n
)
INSERT INTO tmp_legacy_party_map (
    source_type,
    source_pk,
    final_party_id,
    final_contact_id,
    party_code,
    party_name,
    contact_name,
    resolved_party_type_id,
    resolved_project_type_id,
    resolved_payment_terms_id,
    status_code,
    entity_type_code,
    party_type_code,
    raw_location,
    raw_supplier_address1,
    raw_supplier_address2,
    raw_supplier_city,
    raw_main_phone,
    raw_fax_phone,
    raw_storehour,
    raw_terms_id,
    raw_terms_name,
    raw_project_type_id,
    raw_project_type_name,
    description,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    n.source_type,
    n.source_pk,
    pid.final_party_id,
    cid.final_contact_id,
    n.final_party_code,
    n.party_name,
    n.contact_name,
    n.resolved_party_type_id,
    n.resolved_project_type_id,
    n.resolved_payment_terms_id,
    n.status_code,
    n.entity_type_code,
    n.party_type_code,
    n.raw_location,
    n.raw_supplier_address1,
    n.raw_supplier_address2,
    n.raw_supplier_city,
    n.raw_main_phone,
    n.raw_fax_phone,
    n.raw_storehour,
    n.raw_terms_id,
    n.raw_terms_name,
    n.raw_project_type_id,
    n.raw_project_type_name,
    n.description,
    n.is_deleted,
    n.log_date_created,
    n.log_date_updated,
    n.log_created_by_account_id,
    n.log_updated_by_account_id,
    n.log_module_created,
    n.log_module_updated
FROM candidate_rows n
LEFT JOIN LATERAL (
    SELECT p.party_id, p.contact_id
    FROM public.party p
    WHERE p.party_code = n.final_party_code
) existing_party ON TRUE
CROSS JOIN LATERAL (
    SELECT
        CASE
            WHEN existing_party.party_id IS NOT NULL THEN existing_party.party_id
            WHEN n.id_rank > 1 THEN nextval(pg_get_serial_sequence('public.party', 'party_id'))::BIGINT
            WHEN EXISTS (
                SELECT 1
                FROM public.party p
                WHERE p.party_id = n.desired_party_id
            ) THEN nextval(pg_get_serial_sequence('public.party', 'party_id'))::BIGINT
            ELSE n.desired_party_id
        END AS final_party_id
) pid
CROSS JOIN LATERAL (
    SELECT
        CASE
            WHEN existing_party.contact_id IS NOT NULL THEN existing_party.contact_id
            WHEN EXISTS (
                SELECT 1
                FROM public.contact c
                WHERE c.contact_id = pid.final_party_id
            ) THEN nextval(pg_get_serial_sequence('public.contact', 'contact_id'))::BIGINT
            ELSE pid.final_party_id
        END AS final_contact_id
) cid;

-- Ensure final_party_id values are unique inside this run.
WITH duplicated_party_ids AS (
    SELECT final_party_id
    FROM tmp_legacy_party_map
    GROUP BY final_party_id
    HAVING COUNT(*) > 1
),
ranked_duplicates AS (
    SELECT
        m.source_type,
        m.source_pk,
        m.final_party_id,
        ROW_NUMBER() OVER (
            PARTITION BY m.final_party_id
            ORDER BY m.source_type, m.source_pk
        ) AS rn
    FROM tmp_legacy_party_map m
    JOIN duplicated_party_ids d
      ON d.final_party_id = m.final_party_id
)
UPDATE tmp_legacy_party_map t
SET
    final_party_id = nextval(pg_get_serial_sequence('public.party', 'party_id'))::BIGINT,
    final_contact_id = nextval(pg_get_serial_sequence('public.contact', 'contact_id'))::BIGINT
FROM ranked_duplicates r
WHERE t.source_type = r.source_type
  AND t.source_pk = r.source_pk
  AND r.rn > 1;

-- =========================================================
-- Step 4: Insert contact rows first (for party FK)
-- =========================================================
INSERT INTO public.contact (
    contact_id,
    entity_type_id,
    contact_name,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    m.final_contact_id,
    CASE
        WHEN m.entity_type_code = 'company' THEN lu_entity_company.look_up_id
        WHEN m.entity_type_code = 'project' THEN lu_entity_project.look_up_id
    END AS entity_type_id,
    m.contact_name,
    m.is_deleted,
    m.log_date_created,
    m.log_date_updated,
    m.log_created_by_account_id,
    m.log_updated_by_account_id,
    m.log_module_created,
    m.log_module_updated
FROM tmp_legacy_party_map m
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'ENTITY_TYPE' AND code = 'company'
) lu_entity_company
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'ENTITY_TYPE' AND code = 'project'
) lu_entity_project
ON CONFLICT (contact_id) DO NOTHING;

-- =========================================================
-- Step 5: Insert party rows from staged legacy rows
-- =========================================================
INSERT INTO public.party (
    party_id,
    contact_id,
    party_code,
    party_name,
    party_type_id,
    project_type_id,
    payment_terms_id,
    status_id,
    description,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    m.final_party_id,
    m.final_contact_id,
    m.party_code,
    m.party_name,
    m.resolved_party_type_id AS party_type_id,
    m.resolved_project_type_id AS project_type_id,
    m.resolved_payment_terms_id AS payment_terms_id,
    CASE
        WHEN m.status_code = 'inactive' THEN lu_party_status_inactive.look_up_id
        ELSE lu_party_status_active.look_up_id
    END AS status_id,
    m.description,
    m.is_deleted,
    m.log_date_created,
    m.log_date_updated,
    m.log_created_by_account_id,
    m.log_updated_by_account_id,
    m.log_module_created,
    m.log_module_updated
FROM tmp_legacy_party_map m
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'party_status' AND code = 'active'
) lu_party_status_active
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'party_status' AND code = 'inactive'
) lu_party_status_inactive
ON CONFLICT (party_code) DO NOTHING;

-- =========================================================
-- Step 5.5: Import related addresses, phones, and supplier business hours
-- =========================================================

-- Project location -> address (project_site)
INSERT INTO public.address (
    contact_id,
    address_type_id,
    address_label,
    street,
    is_primary,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    m.final_contact_id,
    lu_address_project_site.look_up_id,
    m.raw_location,
    m.raw_location,
    TRUE,
    m.is_deleted,
    m.log_date_created,
    m.log_date_updated,
    m.log_created_by_account_id,
    m.log_updated_by_account_id,
    m.log_module_created,
    m.log_module_updated
FROM tmp_legacy_party_map m
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'address_type' AND code = 'project_site'
) lu_address_project_site
WHERE m.source_type = 'PROJECT'
  AND m.raw_location IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.address a
      WHERE a.contact_id = m.final_contact_id
        AND a.is_primary = TRUE
        AND a.is_deleted = FALSE
  );

-- Supplier address1/address2/city -> address (office)
INSERT INTO public.address (
    contact_id,
    address_type_id,
    address_label,
    street,
    city,
    is_primary,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    m.final_contact_id,
    lu_address_office.look_up_id,
    CONCAT_WS(', ', m.raw_supplier_address1, m.raw_supplier_address2, m.raw_supplier_city),
    CONCAT_WS(', ', m.raw_supplier_address1, m.raw_supplier_address2),
    m.raw_supplier_city,
    TRUE,
    m.is_deleted,
    m.log_date_created,
    m.log_date_updated,
    m.log_created_by_account_id,
    m.log_updated_by_account_id,
    m.log_module_created,
    m.log_module_updated
FROM tmp_legacy_party_map m
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'address_type' AND code = 'office'
) lu_address_office
WHERE m.source_type = 'SUPPLIER'
  AND (m.raw_supplier_address1 IS NOT NULL OR m.raw_supplier_address2 IS NOT NULL OR m.raw_supplier_city IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1
      FROM public.address a
      WHERE a.contact_id = m.final_contact_id
        AND a.is_primary = TRUE
        AND a.is_deleted = FALSE
  );

-- Main phone (project.telephoneno or supplier.telephoneno) -> phone type OFFICE (Main)
INSERT INTO public.phone (
    contact_id,
    phone_type_id,
    phone_number,
    is_primary,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    m.final_contact_id,
    lu_phone_main.look_up_id,
    m.raw_main_phone,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM public.phone p
            WHERE p.contact_id = m.final_contact_id
              AND p.is_primary = TRUE
              AND p.is_deleted = FALSE
        ) THEN FALSE
        ELSE TRUE
    END,
    m.is_deleted,
    m.log_date_created,
    m.log_date_updated,
    m.log_created_by_account_id,
    m.log_updated_by_account_id,
    m.log_module_created,
    m.log_module_updated
FROM tmp_legacy_party_map m
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'PHONE_TYPE' AND code = 'office'
) lu_phone_main
WHERE m.raw_main_phone IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.phone p
      WHERE p.contact_id = m.final_contact_id
        AND p.phone_type_id = lu_phone_main.look_up_id
        AND p.phone_number = m.raw_main_phone
        AND p.is_deleted = FALSE
  );

-- Supplier fax -> phone type FAX
INSERT INTO public.phone (
    contact_id,
    phone_type_id,
    phone_number,
    is_primary,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    m.final_contact_id,
    lu_phone_fax.look_up_id,
    m.raw_fax_phone,
    FALSE,
    m.is_deleted,
    m.log_date_created,
    m.log_date_updated,
    m.log_created_by_account_id,
    m.log_updated_by_account_id,
    m.log_module_created,
    m.log_module_updated
FROM tmp_legacy_party_map m
CROSS JOIN LATERAL (
    SELECT look_up_id
    FROM public.look_up
    WHERE look_up_type = 'PHONE_TYPE' AND code = 'fax'
) lu_phone_fax
WHERE m.source_type = 'SUPPLIER'
  AND m.raw_fax_phone IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.phone p
      WHERE p.contact_id = m.final_contact_id
        AND p.phone_type_id = lu_phone_fax.look_up_id
        AND p.phone_number = m.raw_fax_phone
        AND p.is_deleted = FALSE
  );

-- Supplier storehour -> supplier_business_hours (applies same schedule to all days)
-- Supported parse example: "8:00 AM - 5:00 PM"; otherwise marks all days closed.
INSERT INTO public.supplier_business_hours (
    supplier_id,
    day_of_week,
    opening_time,
    closing_time,
    is_closed,
    is_deleted,
    log_date_created,
    log_date_updated,
    log_created_by_account_id,
    log_updated_by_account_id,
    log_module_created,
    log_module_updated
)
SELECT
    m.final_party_id,
    d.day_of_week,
    CASE
        WHEN h.opening_raw IS NOT NULL
            THEN to_timestamp(
                regexp_replace(upper(BTRIM(h.opening_raw)), '\\s*(AM|PM)$', ' \\1'),
                'HH12:MI AM'
            )::TIME
        ELSE NULL
    END AS opening_time,
    CASE
        WHEN h.closing_raw IS NOT NULL
            THEN to_timestamp(
                regexp_replace(upper(BTRIM(h.closing_raw)), '\\s*(AM|PM)$', ' \\1'),
                'HH12:MI AM'
            )::TIME
        ELSE NULL
    END AS closing_time,
    CASE WHEN h.opening_raw IS NULL OR h.closing_raw IS NULL THEN TRUE ELSE FALSE END AS is_closed,
    m.is_deleted,
    m.log_date_created,
    m.log_date_updated,
    m.log_created_by_account_id,
    m.log_updated_by_account_id,
    m.log_module_created,
    m.log_module_updated
FROM tmp_legacy_party_map m
CROSS JOIN LATERAL (SELECT generate_series(1, 7)::SMALLINT AS day_of_week) d
LEFT JOIN LATERAL (
    SELECT
        (regexp_match(m.raw_storehour, '([0-9]{1,2}:[0-9]{2}\s*[AaPp][Mm])\s*(?:-|to)\s*([0-9]{1,2}:[0-9]{2}\s*[AaPp][Mm])'))[1] AS opening_raw,
        (regexp_match(m.raw_storehour, '([0-9]{1,2}:[0-9]{2}\s*[AaPp][Mm])\s*(?:-|to)\s*([0-9]{1,2}:[0-9]{2}\s*[AaPp][Mm])'))[2] AS closing_raw
) h ON TRUE
WHERE m.source_type = 'SUPPLIER'
  AND m.raw_storehour IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.supplier_business_hours sbh
      WHERE sbh.supplier_id = m.final_party_id
        AND sbh.day_of_week = d.day_of_week
        AND sbh.is_deleted = FALSE
  );

-- =========================================================
-- Step 6: Reset identity sequences after explicit ID inserts
-- =========================================================
SELECT setval(
    pg_get_serial_sequence('public.contact', 'contact_id'),
    COALESCE((SELECT MAX(contact_id) FROM public.contact), 1),
    EXISTS (SELECT 1 FROM public.contact)
) AS contact_id_seq_reset;

SELECT setval(
    pg_get_serial_sequence('public.party', 'party_id'),
    COALESCE((SELECT MAX(party_id) FROM public.party), 1),
    EXISTS (SELECT 1 FROM public.party)
) AS party_id_seq_reset;

-- =========================================================
-- Validation (after migration)
-- =========================================================
SELECT COUNT(*) AS imported_supplier_rows
FROM public.party p
JOIN public.look_up lu
  ON lu.look_up_id = p.party_type_id
WHERE lu.look_up_type = 'party_type'
  AND lu.code = 'supplier'
  AND p.log_module_created = 'import_legacy_supplier';

SELECT COUNT(*) AS imported_project_rows
FROM public.party p
JOIN public.look_up lu
  ON lu.look_up_id = p.party_type_id
WHERE lu.look_up_type = 'party_type'
  AND lu.code = 'project'
  AND p.log_module_created = 'import_legacy_projectsite';

SELECT lu.code AS party_type_code, COUNT(*) AS total_party_rows
FROM public.party p
JOIN public.look_up lu
  ON lu.look_up_id = p.party_type_id
WHERE lu.look_up_type = 'party_type'
  AND lu.code IN ('supplier', 'project')
GROUP BY lu.code
ORDER BY lu.code;

COMMIT;
