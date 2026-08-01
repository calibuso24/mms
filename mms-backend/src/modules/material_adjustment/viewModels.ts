export interface MaterialAdjustmentListItemViewModel {
  material_adjustment_id: number;
  material_adjustment_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  requested_by_account_id: number | null;
  requested_by_account_name: string | null;
  requested_at: string;
  approved_by_account_id: number | null;
  approved_by_account_name: string | null;
  approved_at: string | null;
  status_id: number;
  status_code: string;
  status_name: string;
  adjustment_reason_id: number | null;
  adjustment_reason_code: string | null;
  adjustment_reason_name: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaterialAdjustmentItemViewModel {
  material_adjustment_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  system_quantity: string;
  adjustment_quantity: string;
  resulting_quantity: string;
  notes: string | null;
}

export interface MaterialAdjustmentDetailViewModel extends MaterialAdjustmentListItemViewModel {
  items: MaterialAdjustmentItemViewModel[];
}

export interface MaterialAdjustmentListViewModel {
  items: MaterialAdjustmentListItemViewModel[];
  total: number;
}
