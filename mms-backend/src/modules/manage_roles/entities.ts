export interface RoleEntity {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
  log_date_created: string | null;
  log_date_updated: string | null;
  log_date_deleted: string | null;
  log_created_by_account_id: number | null;
  log_updated_by_account_id: number | null;
  log_deleted_by_account_id: number | null;
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

export interface RolePermissionEntity {
  role_permission_id: number;
  role_id: number;
  permission_id: number;
  is_active: boolean;
  is_deleted: boolean;
}
