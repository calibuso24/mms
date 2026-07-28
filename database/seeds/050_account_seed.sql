-- Migration: 044_user_seed.sql
-- Seed initial users: SuperUser and Admin

CREATE EXTENSION IF NOT EXISTS pgcrypto;


INSERT INTO account (account_name, password_hash, full_name, profile, is_active, log_date_created)
VALUES
  ('superuser', crypt('superuser123', gen_salt('bf')), 'SuperUser', '{"notes": "initial seed - set password on first login"}'::jsonb, TRUE, now()),
  ('admin', crypt('admin123', gen_salt('bf')), 'Admin', '{"notes": "initial seed - set password on first login"}'::jsonb, TRUE, now())
ON CONFLICT (account_name) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      profile = EXCLUDED.profile,
      is_active = EXCLUDED.is_active;

INSERT INTO look_up (look_up_type, code, name, description, display_order)
VALUES ('contact_entity_type', 'person', 'Person', 'Individual contact entity.', 1)
ON CONFLICT (look_up_type, name) DO NOTHING;

INSERT INTO contact (entity_type_id, contact_name)
SELECT
    entity_lookup.look_up_id,
    u.full_name
FROM account u
JOIN look_up entity_lookup
    ON entity_lookup.look_up_type = 'contact_entity_type'
   AND entity_lookup.name = 'Person'
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
      WHERE look_up_type = 'contact_entity_type'
        AND name = 'Person'
  );

INSERT INTO address (contact_id, address_label, address, is_primary)
SELECT u.contact_id, 'Primary', '', TRUE
FROM account u
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM address a
      WHERE a.contact_id = u.contact_id
  );

INSERT INTO phone (contact_id, phone_label, phone_number, is_primary)
SELECT u.contact_id, 'Primary', '', TRUE
FROM account u
WHERE u.contact_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM phone p
      WHERE p.contact_id = u.contact_id
  );

INSERT INTO email (contact_id, email_label, email_address, is_primary)
SELECT u.contact_id, 'Primary', '', TRUE
FROM account u
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