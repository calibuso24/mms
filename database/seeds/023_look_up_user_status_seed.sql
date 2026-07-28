-- Migration: 023_look_up_user_status_seed.sql
INSERT INTO look_up (look_up_type, code, name, description, display_order, log_module_created, log_module_updated)
VALUES
  ('user_status','active','Active','User account is active',1,NULL,NULL),
  ('user_status','inactive','Inactive','User account is inactive',2,NULL,NULL),
  ('user_status','locked','Locked','User account locked',3,NULL,NULL)
--ON CONFLICT (look_up_type, code) DO NOTHING
;
