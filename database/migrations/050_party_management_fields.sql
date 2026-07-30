-- Migration: 050_party_management_fields.sql
-- Purpose: Extend party master data for Project and Supplier management modules
-- Author: MMS
-- Created: 2026-07-30

ALTER TABLE party
    ADD COLUMN IF NOT EXISTS project_type_id BIGINT REFERENCES look_up(look_up_id),
    ADD COLUMN IF NOT EXISTS payment_terms_id BIGINT REFERENCES look_up(look_up_id),
    ADD COLUMN IF NOT EXISTS business_hours TEXT;

CREATE INDEX IF NOT EXISTS idx_party_project_type_id ON party(project_type_id);
CREATE INDEX IF NOT EXISTS idx_party_payment_terms_id ON party(payment_terms_id);
