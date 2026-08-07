export interface StockTransferItemDto {
  purchase_order_item_id?: number | null;
  material_request_item_id?: number | null;
  material_id: number;
  material_brand_id?: number | null;
  uom_id: number;
  quantity: number;
  notes?: string | null;
}

export interface StockTransferItemMutationDto extends StockTransferItemDto {
  expected_updated_at?: string | null;
}

export interface CreateStockTransferDto {
  transfer_type_id: number;
  source_id: number;
  destination_id: number;
  project_id?: number | null;
  purchase_order_id?: number | null;
  delivery_advice_id?: number | null;
  material_request_id?: number | null;
  job_order_id?: number | null;
  prepared_by_account_id?: number | null;
  transfer_date?: string | null;
  reference_code?: string | null;
  notes?: string | null;
  items: StockTransferItemDto[];
}

export interface UpdateStockTransferDto {
  transfer_type_id?: number;
  source_id?: number;
  destination_id?: number;
  project_id?: number | null;
  purchase_order_id?: number | null;
  delivery_advice_id?: number | null;
  material_request_id?: number | null;
  job_order_id?: number | null;
  prepared_by_account_id?: number | null;
  transfer_date?: string | null;
  reference_code?: string | null;
  notes?: string | null;
  expected_updated_at?: string | null;
  items?: StockTransferItemDto[];
}

export interface StockTransferListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  transferTypeId?: number;
  sourceId?: number;
  destinationId?: number;
  statusId?: number;
}
