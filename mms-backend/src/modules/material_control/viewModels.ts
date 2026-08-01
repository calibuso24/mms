export interface MaterialControlListItemViewModel {
  material_control_id: number;
  project_id: number;
  project_code: string;
  project_name: string;
  control_code: string;
  budget: string;
  total_estimated_cost: string | null;
  status_id: number;
  status_name: string;
  notes: string | null;
  reviewed_by_account_id: number | null;
  reviewed_by_account_name: string | null;
  log_date_reviewed: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaterialControlListViewModel {
  items: MaterialControlListItemViewModel[];
  total: number;
}

export interface MaterialControlItemListItemViewModel {
  material_control_item_id: number;
  material_control_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  estimated_quantity: string;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  estimated_unit_cost: string | null;
  estimated_total_cost: string | null;
  remarks: string | null;
  line_no: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaterialControlItemListViewModel {
  items: MaterialControlItemListItemViewModel[];
  total: number;
}