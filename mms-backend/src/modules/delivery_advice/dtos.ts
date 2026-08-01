export interface DeliveryAdviceItemDto {
  purchase_order_item_id?: number | null;
  material_id: number;
  material_brand_id?: number | null;
  uom_id: number;
  advised_quantity: number;
  received_quantity?: number;
  notes?: string | null;
}

export interface CreateDeliveryAdviceDto {
  purchase_order_id: number;
  reference_code: string;
  issued_at?: string | null;
  received_at?: string | null;
  notes?: string | null;
  items: DeliveryAdviceItemDto[];
}

export interface UpdateDeliveryAdviceDto {
  purchase_order_id?: number;
  reference_code?: string;
  issued_at?: string | null;
  received_at?: string | null;
  notes?: string | null;
  items?: DeliveryAdviceItemDto[];
}

export interface DeliveryAdviceListQuery {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  purchaseOrderId?: number;
  statusId?: number;
}
