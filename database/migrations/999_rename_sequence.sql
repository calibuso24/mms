DO $$
DECLARE
    r RECORD;
    new_name text;
BEGIN
    FOR r IN
        SELECT
            n.nspname AS schema_name,
            c.relname AS sequence_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'S'
          AND c.relname ~ '^(.*)_\1_id_seq$'
    LOOP
        new_name := regexp_replace(
            r.sequence_name,
            '^(.*)_\1_id_seq$',
            '\1_id_seq'
        );

        EXECUTE format(
            'ALTER SEQUENCE %I.%I RENAME TO %I',
            r.schema_name,
            r.sequence_name,
            new_name
        );

        -- RAISE NOTICE 'Renamed %.% -> %',
        --     r.schema_name,
        --     r.sequence_name,
        --     new_name;
    END LOOP;
END $$;