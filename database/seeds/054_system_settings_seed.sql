-- Seed initial system setting categories and baseline settings

INSERT INTO system_setting_category (
    category_code,
    category_name,
    description,
    display_order,
    is_visible,
    is_deleted,
    log_module_created
)
VALUES
    ('general', 'General', 'Organization and application identity settings.', 1, TRUE, FALSE, 'system_settings'),
    ('security', 'Security', 'Authentication, session, and access controls.', 2, TRUE, FALSE, 'system_settings'),
    ('numbering', 'Numbering', 'Sequence prefixes and numbering patterns.', 3, TRUE, FALSE, 'system_settings'),
    ('inventory', 'Inventory', 'Inventory behavior and stock control options.', 4, TRUE, FALSE, 'system_settings'),
    ('warehouse', 'Warehouse', 'Warehouse defaults and operational controls.', 5, TRUE, FALSE, 'system_settings'),
    ('purchasing', 'Purchasing', 'Purchasing defaults and procurement preferences.', 6, TRUE, FALSE, 'system_settings'),
    ('material_request', 'Material Request', 'Material request workflow configuration.', 7, TRUE, FALSE, 'system_settings'),
    ('stock_transfer', 'Stock Transfer', 'Stock transfer workflow configuration.', 8, TRUE, FALSE, 'system_settings'),
    ('projects', 'Projects', 'Project defaults and project-related settings.', 9, TRUE, FALSE, 'system_settings'),
    ('suppliers', 'Suppliers', 'Supplier onboarding and communication settings.', 10, TRUE, FALSE, 'system_settings'),
    ('notifications', 'Notifications', 'Notification delivery and alert settings.', 11, TRUE, FALSE, 'system_settings'),
    ('approval_workflow', 'Approval Workflow', 'Approver routing and approval thresholds.', 12, TRUE, FALSE, 'system_settings'),
    ('email_templates', 'Email Templates', 'Email template defaults and branding.', 13, TRUE, FALSE, 'system_settings'),
    ('reports', 'Reports', 'Report output preferences and defaults.', 14, TRUE, FALSE, 'system_settings'),
    ('dashboard', 'Dashboard', 'Home page widgets and refresh behavior.', 15, TRUE, FALSE, 'system_settings'),
    ('lookups', 'Lookups', 'Lookup cache and lookup administration settings.', 16, TRUE, FALSE, 'system_settings'),
    ('file_storage', 'File Storage', 'Storage provider and upload restrictions.', 17, TRUE, FALSE, 'system_settings'),
    ('logging', 'Logging', 'Audit and application log retention settings.', 18, TRUE, FALSE, 'system_settings'),
    ('backup_maintenance', 'Backup & Maintenance', 'Backup windows and maintenance windows.', 19, TRUE, FALSE, 'system_settings'),
    ('integrations', 'Integrations', 'Third-party integration and webhook settings.', 20, TRUE, FALSE, 'system_settings'),
    ('system', 'System', 'Environment and support contact settings.', 21, TRUE, FALSE, 'system_settings'),
    ('developer', 'Developer', 'Debug and development convenience settings.', 22, TRUE, FALSE, 'system_settings'),
    ('license', 'License', 'License details and expiry tracking.', 23, TRUE, FALSE, 'system_settings'),
    ('data_management', 'Data Management', 'Export, purge, and data lifecycle settings.', 24, TRUE, FALSE, 'system_settings')
ON CONFLICT (category_code) DO NOTHING;

WITH category_lookup AS (
    SELECT system_setting_category_id, category_code
    FROM system_setting_category
    WHERE is_deleted = FALSE
), settings_seed AS (
    SELECT * FROM (VALUES
        ('general', 'company_name', 'Company Name', 'text', 'MMS Construction Services', 'MMS Construction Services', TRUE, FALSE, 1, TRUE, TRUE, '{"placeholder":"Enter company name"}'::jsonb, '{}'::jsonb),
        ('general', 'company_logo_url', 'Company Logo', 'file', NULL, NULL, FALSE, FALSE, 2, TRUE, TRUE, '{"accept":"image/*"}'::jsonb, '{}'::jsonb),
        ('general', 'timezone', 'Timezone', 'select', 'Asia/Manila', 'Asia/Manila', TRUE, FALSE, 3, TRUE, TRUE, '[{"label":"Asia/Manila","value":"Asia/Manila"},{"label":"UTC","value":"UTC"}]'::jsonb, '{}'::jsonb),
        ('security', 'password_min_length', 'Password Minimum Length', 'number', '8', '8', TRUE, FALSE, 1, TRUE, TRUE, '{"min":6,"max":32}'::jsonb, '{"min":6,"max":32}'::jsonb),
        ('security', 'session_timeout_minutes', 'Session Timeout (Minutes)', 'number', '60', '60', TRUE, FALSE, 2, TRUE, TRUE, '{"min":15,"max":1440}'::jsonb, '{"min":15,"max":1440}'::jsonb),
        ('security', 'require_2fa', 'Require Two-Factor Authentication', 'boolean', 'false', 'false', FALSE, FALSE, 3, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('numbering', 'po_prefix', 'Purchase Order Prefix', 'text', 'PO', 'PO', TRUE, FALSE, 1, TRUE, TRUE, '{"placeholder":"PO"}'::jsonb, '{}'::jsonb),
        ('numbering', 'next_po_number', 'Next Purchase Order Number', 'number', '1001', '1001', TRUE, FALSE, 2, TRUE, TRUE, '{"min":1}'::jsonb, '{"min":1}'::jsonb),
        ('inventory', 'auto_reserve_stock', 'Auto Reserve Stock', 'boolean', 'true', 'true', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('inventory', 'default_issue_uom', 'Default Issue UOM', 'text', 'piece', 'piece', TRUE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('warehouse', 'allow_negative_stock', 'Allow Negative Stock', 'boolean', 'false', 'false', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('warehouse', 'default_warehouse_code', 'Default Warehouse Code', 'text', 'MAIN', 'MAIN', TRUE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('purchasing', 'default_currency', 'Default Currency', 'select', 'PHP', 'PHP', TRUE, FALSE, 1, TRUE, TRUE, '[{"label":"Philippine Peso","value":"PHP"},{"label":"US Dollar","value":"USD"}]'::jsonb, '{}'::jsonb),
        ('purchasing', 'default_payment_terms', 'Default Payment Terms', 'select', 'net30', 'net30', TRUE, FALSE, 2, TRUE, TRUE, '[{"label":"Cash on Delivery","value":"cod"},{"label":"Net 15","value":"net15"},{"label":"Net 30","value":"net30"}]'::jsonb, '{}'::jsonb),
        ('material_request', 'auto_approve_threshold', 'Auto Approve Threshold', 'number', '0', '0', TRUE, FALSE, 1, TRUE, TRUE, '{"min":0}'::jsonb, '{"min":0}'::jsonb),
        ('material_request', 'require_project_code', 'Require Project Code', 'boolean', 'true', 'true', FALSE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('stock_transfer', 'post_on_save', 'Post Transfer on Save', 'boolean', 'false', 'false', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('stock_transfer', 'default_transfer_type', 'Default Transfer Type', 'select', 'warehouse_transfer', 'warehouse_transfer', TRUE, FALSE, 2, TRUE, TRUE, '[{"label":"Warehouse Transfer","value":"warehouse_transfer"},{"label":"RTS Supplier","value":"rts_supplier"},{"label":"RTS Warehouse","value":"rts_warehouse"}]'::jsonb, '{}'::jsonb),
        ('projects', 'enable_project_codes', 'Enable Project Codes', 'boolean', 'true', 'true', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('projects', 'default_project_type', 'Default Project Type', 'select', 'project', 'project', TRUE, FALSE, 2, TRUE, TRUE, '[{"label":"Project","value":"project"},{"label":"Warehouse","value":"warehouse"},{"label":"Services","value":"services"}]'::jsonb, '{}'::jsonb),
        ('suppliers', 'default_supplier_terms', 'Default Supplier Terms', 'select', 'net30', 'net30', TRUE, FALSE, 1, TRUE, TRUE, '[{"label":"Cash on Delivery","value":"cod"},{"label":"Net 15","value":"net15"},{"label":"Net 30","value":"net30"}]'::jsonb, '{}'::jsonb),
        ('suppliers', 'supplier_rating_threshold', 'Supplier Rating Threshold', 'number', '3', '3', TRUE, FALSE, 2, TRUE, TRUE, '{"min":1,"max":5}'::jsonb, '{"min":1,"max":5}'::jsonb),
        ('notifications', 'enable_email_notifications', 'Enable Email Notifications', 'boolean', 'true', 'true', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('notifications', 'from_email', 'From Email', 'email', 'notifications@mms.local', 'notifications@mms.local', TRUE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('approval_workflow', 'require_two_step', 'Require Two-Step Approval', 'boolean', 'false', 'false', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('approval_workflow', 'approver_roles', 'Approver Roles', 'multi_select', '["ADMIN","SUPER_ADMIN"]', '["ADMIN","SUPER_ADMIN"]', TRUE, FALSE, 2, TRUE, TRUE, '[{"label":"ADMIN","value":"ADMIN"},{"label":"SUPER_ADMIN","value":"SUPER_ADMIN"}]'::jsonb, '{}'::jsonb),
        ('email_templates', 'email_signature', 'Email Signature', 'textarea', 'Regards,\nMMS Team', 'Regards,\nMMS Team', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('email_templates', 'template_language', 'Template Language', 'select', 'en', 'en', TRUE, FALSE, 2, TRUE, TRUE, '[{"label":"English","value":"en"},{"label":"Filipino","value":"fil"}]'::jsonb, '{}'::jsonb),
        ('reports', 'default_report_format', 'Default Report Format', 'select', 'pdf', 'pdf', TRUE, FALSE, 1, TRUE, TRUE, '[{"label":"PDF","value":"pdf"},{"label":"Excel","value":"xlsx"}]'::jsonb, '{}'::jsonb),
        ('reports', 'include_company_logo', 'Include Company Logo', 'boolean', 'true', 'true', FALSE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('dashboard', 'default_dashboard_view', 'Default Dashboard View', 'text', 'operations', 'operations', TRUE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('dashboard', 'refresh_interval_minutes', 'Refresh Interval (Minutes)', 'number', '5', '5', TRUE, FALSE, 2, TRUE, TRUE, '{"min":1,"max":60}'::jsonb, '{"min":1,"max":60}'::jsonb),
        ('lookups', 'allow_custom_lookups', 'Allow Custom Lookups', 'boolean', 'false', 'false', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('lookups', 'sync_lookup_cache', 'Sync Lookup Cache', 'boolean', 'true', 'true', FALSE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('file_storage', 'storage_provider', 'Storage Provider', 'select', 'local', 'local', TRUE, FALSE, 1, TRUE, TRUE, '[{"label":"Local","value":"local"},{"label":"S3","value":"s3"}]'::jsonb, '{}'::jsonb),
        ('file_storage', 'max_upload_mb', 'Maximum Upload Size (MB)', 'number', '10', '10', TRUE, FALSE, 2, TRUE, TRUE, '{"min":1,"max":100}'::jsonb, '{"min":1,"max":100}'::jsonb),
        ('logging', 'log_retention_days', 'Log Retention (Days)', 'number', '90', '90', TRUE, FALSE, 1, TRUE, TRUE, '{"min":7,"max":3650}'::jsonb, '{"min":7,"max":3650}'::jsonb),
        ('logging', 'audit_log_enabled', 'Audit Log Enabled', 'boolean', 'true', 'true', FALSE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('backup_maintenance', 'backup_schedule', 'Backup Schedule', 'text', '0 2 * * *', '0 2 * * *', TRUE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('backup_maintenance', 'maintenance_window', 'Maintenance Window', 'text', 'Sunday 01:00-03:00', 'Sunday 01:00-03:00', TRUE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('integrations', 'webhook_url', 'Webhook URL', 'url', NULL, NULL, FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('integrations', 'api_enabled', 'API Enabled', 'boolean', 'true', 'true', FALSE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('system', 'environment_name', 'Environment Name', 'text', 'Development', 'Development', TRUE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('system', 'support_contact_email', 'Support Contact Email', 'email', 'support@mms.local', 'support@mms.local', TRUE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('developer', 'debug_mode', 'Debug Mode', 'boolean', 'true', 'true', FALSE, FALSE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('developer', 'seed_data_enabled', 'Seed Data Enabled', 'boolean', 'true', 'true', FALSE, FALSE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('license', 'license_key', 'License Key', 'text', NULL, NULL, FALSE, TRUE, 1, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('license', 'license_expiry_date', 'License Expiry Date', 'date', NULL, NULL, FALSE, TRUE, 2, TRUE, TRUE, '[]'::jsonb, '{}'::jsonb),
        ('data_management', 'export_format', 'Default Export Format', 'select', 'csv', 'csv', TRUE, FALSE, 1, TRUE, TRUE, '[{"label":"CSV","value":"csv"},{"label":"JSON","value":"json"}]'::jsonb, '{}'::jsonb),
        ('data_management', 'purge_soft_deleted_after_days', 'Purge Soft Deleted After (Days)', 'number', '365', '365', TRUE, FALSE, 2, TRUE, TRUE, '{"min":30,"max":3650}'::jsonb, '{"min":30,"max":3650}'::jsonb)
    ) AS s(category_code, setting_key, setting_name, setting_type, setting_value, default_value, is_required, is_sensitive, display_order, is_editable, is_resettable, options_json, validation_rules)
)
INSERT INTO system_setting (
    system_setting_category_id,
    setting_key,
    setting_name,
    description,
    setting_type,
    setting_value,
    default_value,
    options_json,
    validation_rules,
    is_required,
    is_sensitive,
    display_order,
    is_editable,
    is_resettable,
    is_deleted,
    log_module_created
)
SELECT
    c.system_setting_category_id,
    s.setting_key,
    s.setting_name,
    NULL,
    s.setting_type,
    s.setting_value,
    s.default_value,
    s.options_json,
    s.validation_rules,
    s.is_required,
    s.is_sensitive,
    s.display_order,
    s.is_editable,
    s.is_resettable,
    FALSE,
    'system_settings'
FROM settings_seed s
JOIN category_lookup c ON c.category_code = s.category_code
ON CONFLICT (system_setting_category_id, setting_key) DO NOTHING;
