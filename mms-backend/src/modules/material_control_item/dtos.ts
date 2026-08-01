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
