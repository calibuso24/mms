-- Migration: 044_user_seed.sql
-- Seed initial users: SuperUser and Admin
INSERT INTO "user" (user_name, password_hash, full_name, profile, is_active, log_date_created)
VALUES
  ('superuser', NULL, 'SuperUser', '{"notes": "initial seed - set password on first login"}'::jsonb, TRUE, now()),
  ('admin', NULL, 'Admin', '{"notes": "initial seed - set password on first login"}'::jsonb, TRUE, now())
ON CONFLICT (user_name) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      profile = EXCLUDED.profile,
      is_active = EXCLUDED.is_active;
