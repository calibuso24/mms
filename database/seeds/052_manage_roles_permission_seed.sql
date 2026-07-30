-- Manage Roles permission seed
-- Adds RBAC permissions for role administration and grants access to SUPER_ADMIN/ADMIN.

INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('Manage Roles', 'VIEW',   'View Roles',   'View role list and role details',             TRUE),
    ('Manage Roles', 'CREATE', 'Create Roles', 'Create new roles and assign permissions',     TRUE),
    ('Manage Roles', 'UPDATE', 'Update Roles', 'Update role name, description, and permissions', TRUE),
    ('Manage Roles', 'DELETE', 'Delete Roles', 'Soft delete roles that are not system roles', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT r.role_id, p.permission_id, TRUE
FROM role r
JOIN permission p ON p.module_name = 'Manage Roles'
WHERE r.role_code IN ('SUPER_ADMIN', 'ADMIN')
  AND p.is_deleted = FALSE
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );

UPDATE navigation
SET permission_code = 'VIEW',
    log_module_updated = 'manage_roles',
    log_date_updated = NOW()
WHERE route = '/admin/manage-roles'
  AND context = 'MAIN'
  AND is_deleted = FALSE;
