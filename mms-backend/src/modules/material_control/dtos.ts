export interface CreateMaterialControlDto {
  project_id: number;
  control_code: string;
  budget: number;
  total_estimated_cost?: number | null;
  status_id: number;
  notes?: string | null;
}

export interface UpdateMaterialControlDto {
  project_id?: number;
  control_code?: string;
  budget?: number;
  total_estimated_cost?: number | null;
  status_id?: number;
  notes?: string | null;
}

export interface MaterialControlListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  projectId?: number;
  statusId?: number;
}