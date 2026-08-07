import { ValidationError } from '../../utils/errors.js';

export class StockTransferValidator {
  static validateItem(data: {
    purchase_order_item_id?: number | null;
    material_request_item_id?: number | null;
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    quantity: number;
    notes?: string | null;
  }) {
    const errors: string[] = [];

    if (data.purchase_order_item_id !== undefined && data.purchase_order_item_id !== null && (!Number.isInteger(data.purchase_order_item_id) || data.purchase_order_item_id <= 0)) {
      errors.push('Purchase order item must be a positive integer');
    }
    if (data.material_request_item_id !== undefined && data.material_request_item_id !== null && (!Number.isInteger(data.material_request_item_id) || data.material_request_item_id <= 0)) {
      errors.push('Material request item must be a positive integer');
    }
    if (!Number.isInteger(data.material_id) || data.material_id <= 0) {
      errors.push('Material is required');
    }
    if (data.material_brand_id !== undefined && data.material_brand_id !== null && (!Number.isInteger(data.material_brand_id) || data.material_brand_id <= 0)) {
      errors.push('Material brand must be a positive integer');
    }
    if (!Number.isInteger(data.uom_id) || data.uom_id <= 0) {
      errors.push('Unit of measure is required');
    }
    if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
      errors.push('Quantity must be greater than zero');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateCreate(data: {
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
    items: Array<{
      purchase_order_item_id?: number | null;
      material_request_item_id?: number | null;
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      quantity: number;
      notes?: string | null;
    }>;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.transfer_type_id) || data.transfer_type_id <= 0) {
      errors.push('Transfer type is required');
    }
    if (!Number.isInteger(data.source_id) || data.source_id <= 0) {
      errors.push('Source is required');
    }
    if (!Number.isInteger(data.destination_id) || data.destination_id <= 0) {
      errors.push('Destination is required');
    }
    if (data.source_id === data.destination_id) {
      errors.push('Source and destination must be different');
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('At least one line item is required');
    }

    if (Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        const prefix = `Item ${index + 1}`;
        if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
          errors.push(`${prefix}: Material is required`);
        }
        if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
          errors.push(`${prefix}: Unit of measure is required`);
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          errors.push(`${prefix}: Quantity must be greater than zero`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    transfer_type_id?: number;
    source_id?: number;
    destination_id?: number;
    items?: Array<{
      material_id: number;
      uom_id: number;
      quantity: number;
    }>;
  }) {
    const errors: string[] = [];

    if (data.transfer_type_id !== undefined && (!Number.isInteger(data.transfer_type_id) || data.transfer_type_id <= 0)) {
      errors.push('Transfer type must be a positive integer');
    }

    if (data.source_id !== undefined && (!Number.isInteger(data.source_id) || data.source_id <= 0)) {
      errors.push('Source must be a positive integer');
    }

    if (data.destination_id !== undefined && (!Number.isInteger(data.destination_id) || data.destination_id <= 0)) {
      errors.push('Destination must be a positive integer');
    }

    if (data.source_id !== undefined && data.destination_id !== undefined && data.source_id === data.destination_id) {
      errors.push('Source and destination must be different');
    }

    if (data.items !== undefined) {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        errors.push('At least one line item is required');
      }

      data.items?.forEach((item, index) => {
        const prefix = `Item ${index + 1}`;
        if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
          errors.push(`${prefix}: Material is required`);
        }
        if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
          errors.push(`${prefix}: Unit of measure is required`);
        }
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          errors.push(`${prefix}: Quantity must be greater than zero`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}
