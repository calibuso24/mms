export interface DeliveryAdviceListItemViewModel {
  delivery_advice_id: number;
  purchase_order_id: number;
  po_number: string;
  da_number: string;
  reference_code: string;
  issued_at: string;
  received_at: string | null;
  status_id: number;
  status_code: string;
  status_name: string;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface DeliveryAdviceItemViewModel {
  delivery_advice_item_id: number;
  purchase_order_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  advised_quantity: string;
  received_quantity: string;
  notes: string | null;
  updated_at: string | null;
}

export interface DeliveryAdviceDetailViewModel extends DeliveryAdviceListItemViewModel {
  items: DeliveryAdviceItemViewModel[];
}

export interface DeliveryAdviceListViewModel {
  items: DeliveryAdviceListItemViewModel[];
  total: number;
}
