export interface PurchaseOrderItemDto {
  material_request_item_id?: number | null;
  material_id: number;
  requested_quantity: number;
  ordered_quantity: number;
  received_quantity?: number;
  uom_id: number;
  unit_price?: number | null;
  line_total?: number | null;
  supplier_reference?: string | null;
  notes?: string | null;
}

export interface PurchaseOrderItemMutationDto extends PurchaseOrderItemDto {
  expected_updated_at?: string | null;
}

export interface CreatePurchaseOrderDto {
  project_id: number;
  material_request_id?: number | null;
  supplier_party_id: number;
  prepared_at?: string | null;
  expected_delivery_date?: string | null;
  order_type_id: number;
  total_amount?: number | null;
  notes?: string | null;
  items: PurchaseOrderItemDto[];
}

export interface UpdatePurchaseOrderDto {
  project_id?: number;
  material_request_id?: number | null;
  supplier_party_id?: number;
  prepared_at?: string | null;
  expected_delivery_date?: string | null;
  order_type_id?: number;
  total_amount?: number | null;
  notes?: string | null;
  expected_updated_at?: string | null;
  items?: PurchaseOrderItemDto[];
}

export interface PurchaseOrderListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  projectId?: number;
  supplierPartyId?: number;
  statusId?: number;
  orderTypeId?: number;
}