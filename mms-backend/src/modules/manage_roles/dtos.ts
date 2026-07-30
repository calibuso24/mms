export interface CreateRoleDto {
  role_code: string;
  role_name: string;
  description?: string | null;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface UpdateRoleDto {
  role_name?: string;
  description?: string | null;
  is_active?: boolean;
  permission_ids?: number[];
}
