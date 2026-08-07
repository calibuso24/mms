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
  expected_updated_at?: string | null;
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

export interface CreateMaterialControlItemDto {
  material_control_id: number;
  material_id: number;
  estimated_quantity: number;
  uom_id: number;
  estimated_unit_cost?: number | null;
  estimated_total_cost?: number | null;
  remarks?: string | null;
  line_no: number;
}

export interface UpdateMaterialControlItemDto {
  material_control_id?: number;
  material_id?: number;
  estimated_quantity?: number;
  uom_id?: number;
  estimated_unit_cost?: number | null;
  estimated_total_cost?: number | null;
  remarks?: string | null;
  line_no?: number;
  expected_updated_at?: string | null;
}

export interface MaterialControlItemListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  materialControlId?: number;
  materialId?: number;
}