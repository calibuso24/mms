export interface SupplierDeliveryListItemViewModel {
  supplier_delivery_id: number;
  supplier_delivery_number: string;
  purchase_order_id: number;
  po_number: string;
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  project_id: number;
  project_code: string;
  project_name: string;
  received_by_account_id: number | null;
  received_by_account_name: string | null;
  delivery_date: string;
  status_id: number;
  status_code: string;
  status_name: string;
  posted_at: string | null;
  posted_by_account_id: number | null;
  posted_by_account_name: string | null;
  reference_code: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SupplierDeliveryItemViewModel {
  supplier_delivery_item_id: number;
  purchase_order_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  delivered_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  stock_movement_id: number | null;
  notes: string | null;
  updated_at: string | null;
}

export interface SupplierDeliveryAdviceViewModel {
  supplier_delivery_advice_id: number;
  delivery_advice_id: number;
  da_number: string;
  notes: string | null;
}

export interface SupplierDeliveryDetailViewModel extends SupplierDeliveryListItemViewModel {
  items: SupplierDeliveryItemViewModel[];
  advices: SupplierDeliveryAdviceViewModel[];
}

export interface SupplierDeliveryListViewModel {
  items: SupplierDeliveryListItemViewModel[];
  total: number;
}
