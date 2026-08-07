export interface StockTransferListItemViewModel {
  stock_transfer_id: number;
  stock_transfer_number: string;
  transfer_type_id: number;
  transfer_type_code: string;
  transfer_type_name: string;
  source_id: number;
  source_code: string;
  source_name: string;
  destination_id: number;
  destination_code: string;
  destination_name: string;
  project_id: number | null;
  project_code: string | null;
  project_name: string | null;
  purchase_order_id: number | null;
  po_number: string | null;
  delivery_advice_id: number | null;
  da_number: string | null;
  material_request_id: number | null;
  mr_number: string | null;
  status_id: number;
  status_code: string;
  status_name: string;
  transfer_date: string;
  reference_code: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface StockTransferItemViewModel {
  stock_transfer_item_id: number;
  purchase_order_item_id: number | null;
  material_request_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  quantity: string;
  notes: string | null;
  updated_at: string | null;
}

export interface StockTransferDetailViewModel extends StockTransferListItemViewModel {
  items: StockTransferItemViewModel[];
}

export interface StockTransferListViewModel {
  items: StockTransferListItemViewModel[];
  total: number;
}
