-- Migration: 052_report_catalog_rendering_metadata.sql
-- Purpose: Add rendering metadata columns to report_catalog for Java Jasper report service integration
-- Author: MMS
-- Created: 2026-07-30

ALTER TABLE report_catalog
    ADD COLUMN IF NOT EXISTS jrxml_report_path VARCHAR(500),
    ADD COLUMN IF NOT EXISTS paper_size VARCHAR(50),
    ADD COLUMN IF NOT EXISTS page_orientation VARCHAR(20),
    ADD COLUMN IF NOT EXISTS default_export_format VARCHAR(20),
    ADD COLUMN IF NOT EXISTS report_service_endpoint VARCHAR(255);

UPDATE report_catalog
SET
    jrxml_report_path = null
WHERE is_deleted = FALSE;

UPDATE report_catalog
SET
    jrxml_report_path = COALESCE(jrxml_report_path, 'reports/' || TRIM(REPLACE(report_name, ' ', '')) || '/' || TRIM(REPLACE(report_name, ' ', '')) || '.jrxml'),
    paper_size = COALESCE(paper_size, 'A4'),
    page_orientation = COALESCE(page_orientation, 'PORTRAIT'),
    default_export_format = COALESCE(default_export_format, 'pdf')
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_report_catalog_jrxml_report_path ON report_catalog (jrxml_report_path);

COMMENT ON COLUMN report_catalog.jrxml_report_path IS 'Relative path of JRXML file consumed by the Java reporting service';
COMMENT ON COLUMN report_catalog.paper_size IS 'Default paper size for rendering (A4, Letter, Legal, custom)';
COMMENT ON COLUMN report_catalog.page_orientation IS 'Default orientation (PORTRAIT or LANDSCAPE)';
COMMENT ON COLUMN report_catalog.default_export_format IS 'Default export format (pdf, xlsx, docx)';
COMMENT ON COLUMN report_catalog.report_service_endpoint IS 'Optional report-specific render endpoint override';