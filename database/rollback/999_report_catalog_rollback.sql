-- ============================================================================
-- MMS Report Catalog - Rollback Script
-- Purpose: Safely rollback the Report Catalog module to previous state
-- Author: MMS
-- Created: 2026-07-28
--
-- This script removes all tables and seed data created for the Report Catalog
-- module. It performs the operations in reverse order to respect foreign key
-- constraints.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: DROP REPORT HISTORY
-- ============================================================================
-- Drop the report_history table
DROP TABLE IF EXISTS report_history CASCADE;

-- ============================================================================
-- SECTION 2: DROP REPORT PARAMETERS
-- ============================================================================
-- Drop the report_parameter table
DROP TABLE IF EXISTS report_parameter CASCADE;

-- ============================================================================
-- SECTION 3: DROP REPORT CATALOG
-- ============================================================================
-- Drop the report_catalog table
DROP TABLE IF EXISTS report_catalog CASCADE;

-- ============================================================================
-- SECTION 4: CLEAN UP PERMISSIONS AND LOOKUPS
-- ============================================================================
-- Remove report permissions from the centralized permission/role_permission tables
DELETE FROM role_permission
WHERE permission_id IN (
    SELECT permission_id FROM permission
    WHERE module_name = 'Report Catalog' AND is_deleted = FALSE
);

DELETE FROM permission
WHERE module_name = 'Report Catalog';

-- Remove report-related lookup entries
DELETE FROM look_up
WHERE look_up_type IN (
    'REPORT_CATEGORY',
    'REPORT_TYPE',
    'REPORT_PARAMETER_DATA_TYPE',
    'REPORT_CONTROL_TYPE',
    'REPORT_STATUS'
);

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================
COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If you see this message, the rollback was successful
SELECT 'Report Catalog Module successfully rolled back' AS status;
