
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE source.tbluser ADD COLUMN IF NOT EXISTS account_id BIGINT;
ALTER TABLE source.tbluser ADD COLUMN IF NOT EXISTS contact_id BIGINT;

UPDATE source.tbluser
SET account_id = nextval('account_id_seq'),
contact_id = nextval('contact_id_seq')
;

--CONTACT
INSERT INTO contact(contact_id, contact_name, entity_type_id)
SELECT contact_id, name, 
(SELECT look_up_id FROM look_up WHERE look_up_type = 'contact_entity_type' AND name = 'Person') AS entity_type_id
FROM source.tbluser
;

INSERT INTO account(account_id, user_name, password, log_date_created, log_date_updated, is_active, contact_id)
SELECT account_id,userid,crypt(password, gen_salt('bf')),datecreated,datemodified,
CASE WHEN status = 1 THEN true ELSE false END as status,
contact_id
FROM source.tbluser
;

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
FROM source.tbluser a, role r
WHERE a.logtype = 1
AND r.role_code = 'ADMIN'
;

INSERT INTO account_role(account_id,role_id)
SELECT DISTINCT a.account_id, r.role_id
FROM source.tbluser a, role r
WHERE a.logtype = 2
AND r.role_code = 'INV_STAFF'
;

INSERT INTO account_role(account_id,role_id)
SELECT DISTINCT a.account_id, r.role_id
FROM source.tbluser a, role r
WHERE a.logtype = 3
AND r.role_code = 'PURCH_STAFF'
;

INSERT INTO account_role(account_id,role_id)
SELECT DISTINCT a.account_id, r.role_id
FROM source.tbluser a, role r
WHERE a.logtype = 4
AND r.role_code = 'COORD_STAFF'
;

INSERT INTO account_role(account_id,role_id)
SELECT DISTINCT a.account_id, r.role_id
FROM source.tbluser a, role r
WHERE a.logtype = 5
AND r.role_code = 'SITE_STAFF'
;