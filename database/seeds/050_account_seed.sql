-- Migration: 044_user_seed.sql
-- Seed initial users: SuperUser and Admin

CREATE EXTENSION IF NOT EXISTS pgcrypto;


INSERT INTO account (user_name, password, full_name, profile, is_active, log_date_created)
VALUES
  ('superuser', crypt('superuser', gen_salt('bf')), 'SuperUser', '{"notes": "initial seed - set password on first login"}'::jsonb, TRUE, now()),
  --('admin', crypt('admin', gen_salt('bf')), 'Admin', '{"notes": "initial seed - set password on first login"}'::jsonb, TRUE, now()),
  ('auditor', crypt('auditor', gen_salt('bf')), 'Auditor', '{"notes": "initial seed - set password on first login"}'::jsonb, TRUE, now())
ON CONFLICT DO NOTHING;

INSERT INTO contact (entity_type_id, contact_name)
SELECT
    entity_lookup.look_up_id,
    u.full_name
FROM account u
JOIN look_up entity_lookup
    ON entity_lookup.look_up_type = 'ENTITY_TYPE'
   AND entity_lookup.name = 'PERSON'
WHERE u.contact_id IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM contact c
      WHERE c.contact_name = u.full_name
        AND c.entity_type_id = entity_lookup.look_up_id
  );

UPDATE account u
SET contact_id = c.contact_id
FROM contact c
WHERE u.contact_id IS NULL
  AND c.contact_name = u.full_name
  AND c.entity_type_id = (
      SELECT look_up_id
      FROM look_up
      WHERE look_up_type = 'ENTITY_TYPE'
        AND name = 'PERSON'
  );

INSERT INTO address (contact_id, address_type_id, is_primary)
SELECT
    u.contact_id,
    address_type_lookup.look_up_id,
    TRUE
FROM account u
JOIN look_up address_type_lookup
    ON address_type_lookup.look_up_type = 'address_type'
   AND address_type_lookup.name = 'HOME'
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM address a
      WHERE a.contact_id = u.contact_id
  );

INSERT INTO phone (contact_id, phone_type_id, phone_number, is_primary)
SELECT
    u.contact_id,
    phone_type_lookup.look_up_id,
    '',
    TRUE
FROM account u
JOIN look_up phone_type_lookup
    ON phone_type_lookup.look_up_type = 'PHONE_TYPE'
   AND phone_type_lookup.name = 'MOBILE'
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM phone p
      WHERE p.contact_id = u.contact_id
  );

INSERT INTO email (contact_id, email_type_id, email_address, is_primary)
SELECT
    u.contact_id,
    email_type_lookup.look_up_id,
    '',
    TRUE
FROM account u
JOIN look_up email_type_lookup
    ON email_type_lookup.look_up_type = 'EMAIL_TYPE'
   AND email_type_lookup.name = 'PERSONAL'
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM email e
      WHERE e.contact_id = u.contact_id
  );


/*=================================================
SELECT r.role_code, r.role_name, p.module_name, p.permission_name
FROM role r 
JOIN role_permission rp ON rp.role_id = r.role_id
JOIN permission p ON p.permission_id = rp.permission_id

SELECT DISTINCT r.role_code, r.role_name
FROM role r 
JOIN role_permission rp ON rp.role_id = r.role_id
JOIN permission p ON p.permission_id = rp.permission_id
==================================================*/

INSERT INTO account_role(account_id,role_id)
SELECT DISTINCT a.account_id, r.role_id
FROM account a, role r
WHERE full_name ilike 'SuperUser'
AND r.role_code = 'SUPER_ADMIN'
;

INSERT INTO account_role(account_id,role_id)
SELECT DISTINCT a.account_id, r.role_id
FROM account a, role r
WHERE full_name ilike 'Admin'
AND r.role_code = 'ADMIN'
;

INSERT INTO account_role(account_id,role_id)
SELECT DISTINCT a.account_id, r.role_id
FROM account a, role r
WHERE full_name ilike 'auditor'
AND r.role_code = 'AUDITOR'
;