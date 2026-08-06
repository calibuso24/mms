-- Seed: 055_branding_seed.sql
-- Purpose: Add Branding & Appearance system settings category and default branding payload

INSERT INTO system_setting_category (
    category_code,
    category_name,
    description,
    display_order,
    is_visible,
    is_deleted,
    log_module_created
)
VALUES ('branding', 'Branding & Appearance', 'Application branding and appearance options.', 25, TRUE, FALSE, 'system_settings')
ON CONFLICT (category_code) DO NOTHING;

WITH category_lookup AS (
    SELECT system_setting_category_id
    FROM system_setting_category
    WHERE category_code = 'branding'
), branding AS (
    SELECT (
      jsonb_build_object(
        'companyName', 'Material Management System',
        'systemTitle', 'Material Management System',
        'browserTitle', 'Material Management System',
        'companyLogo', null,
        'favicon', null,
        'login', jsonb_build_object(
          'backgroundImage', null,
          'bannerImage', null,
          'loginTitle', 'Welcome to MMS',
          'loginSubtitle', 'Sign in to continue',
          'footerText', '© MMS 2026',
          'showLogo', true,
          'showBanner', true
        ),
        'theme', jsonb_build_object(
          'preset', 'Office Colorful',
          'custom', jsonb_build_object(
            'primary', '#0078D4',
            'secondary', '#005A9E',
            'background', '#F5F7FA',
            'header', '#FFFFFF',
            'sidebar', '#0F3B68',
            'success', '#107C10',
            'warning', '#FFB900',
            'error', '#D13438'
          )
        ),
        'sidebar', jsonb_build_object(
          'display', 'logo-and-text',
          'compact', false,
          'mode', 'dark',
          'headerLogoVisible', true
        ),
        'header', jsonb_build_object(
          'companyLogo', null,
          'systemTitle', 'MMS Operations',
          'headerHeight', 56,
          'headerColor', '#FFFFFF'
        ),
        'loginLayout', 'centered',
        'dashboard', jsonb_build_object(
          'welcomeMessage', 'Welcome back',
          'dashboardTitle', 'Operations Dashboard'
        )
      )::text
    ) AS value
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
    'branding',
    'Branding and Appearance',
    'Structured JSON payload containing branding and appearance configuration',
    'textarea',
    b.value,
    b.value,
    '[]'::jsonb,
    '{}'::jsonb,
    FALSE,
    FALSE,
    1,
    TRUE,
    TRUE,
    FALSE,
    'system_settings'
FROM category_lookup c, branding b
ON CONFLICT (system_setting_category_id, setting_key) DO NOTHING;
