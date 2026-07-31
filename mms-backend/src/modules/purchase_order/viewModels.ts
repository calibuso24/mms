export interface PurchaseOrderListItemViewModel {
  purchase_order_id: number;
  po_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  material_request_id: number | null;
  material_request_number: string | null;
  supplier_party_id: number;
  supplier_party_code: string;
  supplier_party_name: string;
  requested_by_account_id: number | null;
  requested_by_account_name: string | null;
  prepared_at: string | null;
  expected_delivery_date: string | null;
  order_type_id: number;
  order_type_code: string;
  order_type_name: string;
  status_id: number;
  status_code: string;
  status_name: string;
  total_amount: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PurchaseOrderItemViewModel {
  purchase_order_item_id: number;
  material_request_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  requested_quantity: string;
  ordered_quantity: string;
  received_quantity: string;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  unit_price: string | null;
  line_total: string | null;
  supplier_reference: string | null;
  notes: string | null;
}

export interface PurchaseOrderDetailViewModel extends PurchaseOrderListItemViewModel {
  items: PurchaseOrderItemViewModel[];
}

export interface PurchaseOrderListViewModel {
  items: PurchaseOrderListItemViewModel[];
  total: number;
}