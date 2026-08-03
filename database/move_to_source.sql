CREATE SCHEMA IF NOT EXISTS source;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.%I SET SCHEMA source;',
            r.tablename
        );
    END LOOP;
END $$;