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