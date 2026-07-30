export interface AccountEntity {
  account_id: number;
  user_name: string;
  password: string | null;
  full_name: string | null;
  contact_id: number | null;
  is_active: boolean;
  is_deleted: boolean;
  log_date_created: string;
  log_date_updated: string | null;
  log_date_deleted: string | null;
  log_created_by_account_id: number | null;
  log_updated_by_account_id: number | null;
  log_deleted_by_account_id: number | null;
}

export interface AccountRoleEntity {
  account_role_id: number;
  account_id: number;
  role_id: number;
  is_active: boolean;
  is_deleted: boolean;
}

export interface RoleEntity {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
}

export interface PermissionEntity {
  permission_id: number;
  module_name: string;
  permission_code: string;
  permission_name: string;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
}

export interface ContactEntity {
  contact_id: number;
  parent_contact_id: number | null;
  entity_type_id: number;
  prefix_id: number | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix_id: number | null;
  contact_name: string;
  is_deleted: boolean;
}

export interface AddressEntity {
  address_id: number;
  contact_id: number;
  address_type_id: number | null;
  address: string;
  is_primary: boolean;
  is_deleted: boolean;
}

export interface PhoneEntity {
  phone_id: number;
  contact_id: number;
  phone_type_id: number | null;
  phone_number: string;
  is_primary: boolean;
  is_deleted: boolean;
}

export interface EmailEntity {
  email_id: number;
  contact_id: number;
  email_type_id: number | null;
  email_address: string;
  is_primary: boolean;
  is_deleted: boolean;
}

export interface AuditLogEntity {
  audit_log_id: number;
  entity_table: string;
  entity_id: number | null;
  operation: string;
  changed_by: number | null;
  changed_at: string;
  changes: Record<string, unknown> | null;
  reference_code: string | null;
  notes: string | null;
  transaction_id: string | null;
  is_deleted: boolean;
  log_module_created: string | null;
}
