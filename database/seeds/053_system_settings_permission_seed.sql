-- System Settings permission seed

INSERT INTO permission (module_name, permission_code, permission_name, description, is_active)
VALUES
    ('System Settings', 'VIEW', 'View System Settings', 'View system settings categories and values', TRUE),
    ('System Settings', 'EDIT', 'Edit System Settings', 'Create, edit, and remove system settings definitions', TRUE),
    ('System Settings', 'SAVE', 'Save System Settings', 'Persist system setting value changes', TRUE),
    ('System Settings', 'RESET', 'Reset System Settings', 'Reset a settings category to default values', TRUE)
ON CONFLICT (module_name, permission_code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id, is_active)
SELECT r.role_id, p.permission_id, TRUE
FROM role r
JOIN permission p ON p.module_name = 'System Settings'
WHERE r.role_code IN ('SUPER_ADMIN', 'ADMIN')
  AND r.is_deleted = FALSE
  AND p.is_deleted = FALSE
  AND NOT EXISTS (
      SELECT 1
      FROM role_permission rp
      WHERE rp.role_id = r.role_id
        AND rp.permission_id = p.permission_id
  );
