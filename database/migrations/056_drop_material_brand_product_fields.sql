-- Migration: 056_drop_material_brand_product_fields.sql
-- Remove unused columns from material_brand.

ALTER TABLE material_brand
    DROP COLUMN IF EXISTS brand_product_code,
    DROP COLUMN IF EXISTS brand_product_name;
