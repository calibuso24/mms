-- Manage Users permission seed
-- Adds RBAC permissions for user administration and grants access to SUPER_ADMIN/ADMIN.

INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('User Management', 'VIEW', 'View Users', 'View user list and user details', TRUE),
    ('User Management', 'CREATE', 'Create Users', 'Create user accounts and related contacts', TRUE),
    ('User Management', 'UPDATE', 'Update Users', 'Update users, roles, and communication records', TRUE),
    ('User Management', 'DELETE', 'Delete Users', 'Soft delete users and related records', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT r.role_id, p.permission_id, TRUE
FROM role r
JOIN permission p ON p.module_name = 'User Management'
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
    log_module_updated = 'manage_users',
    log_date_updated = NOW()
WHERE route = '/admin/manage-users'
  AND context = 'MAIN'
  AND is_deleted = FALSE;
