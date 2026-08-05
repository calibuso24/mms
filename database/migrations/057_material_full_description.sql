-- Migration: 057_material_full_description.sql
-- Adds persisted calculated full_description to material and keeps it in sync with material_specification.

ALTER TABLE material
    ADD COLUMN IF NOT EXISTS full_description TEXT;

CREATE OR REPLACE FUNCTION refresh_material_full_description(p_material_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE material m
    SET full_description = calc.full_description
    FROM (
        SELECT
            m2.material_id,
            NULLIF(
                TRIM(BOTH ' -' FROM CONCAT_WS(' - ',
                    NULLIF(m2.product_name, ''),
                    NULLIF(ms.primary_size, ''),
                    NULLIF(ms.secondary_size, ''),
                    NULLIF(ms.alternate_size, ''),
                    NULLIF(ms.thickness_or_gauge, ''),
                    NULLIF(ms.width, ''),
                    NULLIF(ms.length, ''),
                    NULLIF(ms.schedule, ''),
                    NULLIF(ms.pressure_or_load_rating, ''),
                    NULLIF(ms.standard, ''),
                    NULLIF(ms.pack_size, ''),
                    NULLIF(ms.additional_specification, '')
                )),
                ''
            ) AS full_description
        FROM material m2
        LEFT JOIN material_specification ms
            ON ms.material_id = m2.material_id
           AND ms.is_deleted = FALSE
        WHERE m2.material_id = p_material_id
    ) calc
    WHERE m.material_id = calc.material_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_refresh_material_full_description()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_TABLE_NAME = 'material' THEN
        PERFORM refresh_material_full_description(NEW.material_id);
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'material_specification' THEN
        PERFORM refresh_material_full_description(COALESCE(NEW.material_id, OLD.material_id));
        RETURN COALESCE(NEW, OLD);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS material_refresh_full_description_trg ON material;
CREATE TRIGGER material_refresh_full_description_trg
AFTER INSERT OR UPDATE OF product_name
ON material
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_material_full_description();

DROP TRIGGER IF EXISTS material_spec_refresh_full_description_trg ON material_specification;
CREATE TRIGGER material_spec_refresh_full_description_trg
AFTER INSERT OR UPDATE OF
    primary_size,
    secondary_size,
    alternate_size,
    thickness_or_gauge,
    width,
    length,
    schedule,
    pressure_or_load_rating,
    standard,
    pack_size,
    additional_specification,
    is_deleted
OR DELETE
ON material_specification
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_material_full_description();

-- Backfill persisted descriptions for existing records.
UPDATE material m
SET full_description = calc.full_description
FROM (
    SELECT
        m2.material_id,
        NULLIF(
            TRIM(BOTH ' -' FROM CONCAT_WS(' - ',
                NULLIF(m2.product_name, ''),
                NULLIF(ms.primary_size, ''),
                NULLIF(ms.secondary_size, ''),
                NULLIF(ms.alternate_size, ''),
                NULLIF(ms.thickness_or_gauge, ''),
                NULLIF(ms.width, ''),
                NULLIF(ms.length, ''),
                NULLIF(ms.schedule, ''),
                NULLIF(ms.pressure_or_load_rating, ''),
                NULLIF(ms.standard, ''),
                NULLIF(ms.pack_size, ''),
                NULLIF(ms.additional_specification, '')
            )),
            ''
        ) AS full_description
    FROM material m2
    LEFT JOIN material_specification ms
        ON ms.material_id = m2.material_id
       AND ms.is_deleted = FALSE
) calc
WHERE m.material_id = calc.material_id;
