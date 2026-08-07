export interface SupplierDeliveryItemReferenceDto {
  reference_type_code: 'po' | 'delivery_advice' | 'material_request';
  reference_id: number;
  reference_line_id: number;
  quantity: number;
}

export interface SupplierDeliveryItemDto {
  material_id: number;
  material_brand_id?: number | null;
  uom_id: number;
  delivered_quantity: number;
  accepted_quantity: number;
  rejected_quantity?: number;
  notes?: string | null;
  references?: SupplierDeliveryItemReferenceDto[];
}

export interface SupplierDeliveryItemMutationDto extends SupplierDeliveryItemDto {
  expected_updated_at?: string | null;
}

export interface CreateSupplierDeliveryDto {
  supplier_id: number;
  project_id: number;
  received_by_account_id?: number | null;
  delivery_date?: string | null;
  reference_code?: string | null;
  notes?: string | null;
  purchase_order_ids?: number[];
  delivery_advice_ids?: number[];
  material_request_ids?: number[];
  items: SupplierDeliveryItemDto[];
}

export interface UpdateSupplierDeliveryDto {
  supplier_id?: number;
  project_id?: number;
  received_by_account_id?: number | null;
  delivery_date?: string | null;
  reference_code?: string | null;
  notes?: string | null;
  purchase_order_ids?: number[];
  delivery_advice_ids?: number[];
  material_request_ids?: number[];
  expected_updated_at?: string | null;
  items?: SupplierDeliveryItemDto[];
}

export interface SupplierDeliveryListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  purchaseOrderId?: number;
  supplierId?: number;
  projectId?: number;
  statusId?: number;
}
