export interface SupplierDeliveryItemDto {
  purchase_order_item_id: number;
  material_id: number;
  material_brand_id?: number | null;
  uom_id: number;
  delivered_quantity: number;
  accepted_quantity: number;
  rejected_quantity?: number;
  notes?: string | null;
}

export interface CreateSupplierDeliveryDto {
  purchase_order_id: number;
  supplier_id: number;
  project_id: number;
  received_by_account_id?: number | null;
  delivery_date?: string | null;
  reference_code?: string | null;
  notes?: string | null;
  items: SupplierDeliveryItemDto[];
  delivery_advice_ids?: number[];
}

export interface UpdateSupplierDeliveryDto {
  purchase_order_id?: number;
  supplier_id?: number;
  project_id?: number;
  received_by_account_id?: number | null;
  delivery_date?: string | null;
  reference_code?: string | null;
  notes?: string | null;
  items?: SupplierDeliveryItemDto[];
  delivery_advice_ids?: number[];
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
