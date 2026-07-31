export interface MaterialRequestItemDto {
  material_id: number;
  requested_quantity: number;
  approved_quantity?: number | null;
  estimated_quantity?: number | null;
  area_usage?: string | null;
  remarks?: string | null;
  uom_id: number;
  notes?: string | null;
}

export interface CreateMaterialRequestDto {
  project_id: number;
  status_id?: number;
  requested_at?: string | null;
  date_prepared?: string | null;
  date_received?: string | null;
  stock_checked?: boolean;
  ceo_approval_required?: boolean;
  notes?: string | null;
  items: MaterialRequestItemDto[];
}

export interface UpdateMaterialRequestDto {
  project_id?: number;
  status_id?: number;
  requested_at?: string | null;
  date_prepared?: string | null;
  date_received?: string | null;
  stock_checked?: boolean;
  ceo_approval_required?: boolean;
  notes?: string | null;
  items?: MaterialRequestItemDto[];
}

export interface MaterialRequestListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  projectId?: number;
  statusId?: number;
}