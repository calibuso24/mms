export interface MaterialAdjustmentItemDto {
  material_id: number;
  material_brand_id?: number | null;
  uom_id: number;
  system_quantity: number;
  adjustment_quantity: number;
  resulting_quantity: number;
  notes?: string | null;
}

export interface MaterialAdjustmentItemMutationDto extends MaterialAdjustmentItemDto {
  expected_updated_at?: string | null;
}

export interface CreateMaterialAdjustmentDto {
  project_id: number;
  requested_at?: string | null;
  adjustment_reason_id?: number | null;
  notes?: string | null;
  items: MaterialAdjustmentItemDto[];
}

export interface UpdateMaterialAdjustmentDto {
  project_id?: number;
  requested_at?: string | null;
  adjustment_reason_id?: number | null;
  notes?: string | null;
  expected_updated_at?: string | null;
  items?: MaterialAdjustmentItemDto[];
}

export interface MaterialAdjustmentListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  projectId?: number;
  statusId?: number;
  reasonId?: number;
}
