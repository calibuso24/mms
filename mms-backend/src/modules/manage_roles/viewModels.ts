export interface RolePermissionViewModel {
  permission_id: number;
  module_name: string;
  permission_code: string;
  permission_name: string;
  description: string | null;
}

export interface PermissionGroupViewModel {
  module_name: string;
  permissions: RolePermissionViewModel[];
}

export interface RoleDetailViewModel {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  account_count: number;
  permissions: RolePermissionViewModel[];
  created_at: string | null;
  updated_at: string | null;
}

export interface RoleListItemViewModel {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  account_count: number;
  permission_count: number;
  created_at: string | null;
}

export interface RoleListViewModel {
  items: RoleListItemViewModel[];
  total: number;
}
