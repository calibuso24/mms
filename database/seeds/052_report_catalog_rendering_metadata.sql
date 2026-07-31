-- Migration: 052_report_catalog_rendering_metadata.sql
-- Purpose: Add rendering metadata columns to report_catalog for Java Jasper report service integration
-- Author: MMS
-- Created: 2026-07-30

ALTER TABLE report_catalog
    ADD COLUMN IF NOT EXISTS jrxml_file VARCHAR(500),
    ADD COLUMN IF NOT EXISTS jrxml_file_xls VARCHAR(500),
    ADD COLUMN IF NOT EXISTS pdf BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS xlsx BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS csv BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS docx BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS paper_size VARCHAR(50),
    ADD COLUMN IF NOT EXISTS page_orientation VARCHAR(20),
    ADD COLUMN IF NOT EXISTS default_export_format VARCHAR(20),
    ADD COLUMN IF NOT EXISTS report_service_endpoint VARCHAR(255);

UPDATE report_catalog
SET
    jrxml_file = null,
    jrxml_file_xls = null
WHERE is_deleted = FALSE;

UPDATE report_catalog
SET
    jrxml_file = COALESCE(jrxml_file, 'reports/' || TRIM(REPLACE(report_name, ' ', '')) || '/' || TRIM(REPLACE(report_name, ' ', '')) || '.jrxml'),
    paper_size = COALESCE(paper_size, 'A4'),
    page_orientation = COALESCE(page_orientation, 'PORTRAIT'),
    default_export_format = COALESCE(default_export_format, 'pdf')
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_report_catalog_jrxml_file ON report_catalog (jrxml_file);

COMMENT ON COLUMN report_catalog.jrxml_file IS 'Relative path of JRXML file for PDF/DOCX rendering';
COMMENT ON COLUMN report_catalog.jrxml_file_xls IS 'Relative path of JRXML file for XLS/CSV rendering';
COMMENT ON COLUMN report_catalog.pdf IS 'Whether PDF export is enabled for this report';
COMMENT ON COLUMN report_catalog.xlsx IS 'Whether XLSX export is enabled for this report';
COMMENT ON COLUMN report_catalog.csv IS 'Whether CSV export is enabled for this report';
COMMENT ON COLUMN report_catalog.docx IS 'Whether DOCX export is enabled for this report';
COMMENT ON COLUMN report_catalog.paper_size IS 'Default paper size for rendering (A4, Letter, Legal, custom)';
COMMENT ON COLUMN report_catalog.page_orientation IS 'Default orientation (PORTRAIT or LANDSCAPE)';
COMMENT ON COLUMN report_catalog.default_export_format IS 'Default export format (pdf, xlsx, docx)';
COMMENT ON COLUMN report_catalog.report_service_endpoint IS 'Optional report-specific render endpoint override';