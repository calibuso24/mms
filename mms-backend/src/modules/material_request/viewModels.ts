export interface MaterialRequestListItemViewModel {
  material_request_id: number;
  mr_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  status_id: number;
  status_name: string;
  requested_by_account_id: number | null;
  requested_by_account_name: string | null;
  requested_at: string | null;
  date_prepared: string | null;
  date_received: string | null;
  stock_checked: boolean;
  ceo_approval_required: boolean;
  ceo_approved: boolean | null;
  ceo_approved_by: number | null;
  ceo_approved_by_name: string | null;
  ceo_approved_at: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaterialRequestItemViewModel {
  material_request_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  requested_quantity: string;
  approved_quantity: string | null;
  estimated_quantity: string | null;
  area_usage: string | null;
  remarks: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  notes: string | null;
}

export interface MaterialRequestDetailViewModel extends MaterialRequestListItemViewModel {
  items: MaterialRequestItemViewModel[];
}

export interface MaterialRequestListViewModel {
  items: MaterialRequestListItemViewModel[];
  total: number;
}