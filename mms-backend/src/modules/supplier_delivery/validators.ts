import { ValidationError } from '../../utils/errors.js';

export class SupplierDeliveryValidator {
  static validateCreate(data: {
    purchase_order_id: number;
    supplier_id: number;
    project_id: number;
    received_by_account_id?: number | null;
    delivery_date?: string | null;
    reference_code?: string | null;
    notes?: string | null;
    items: Array<{
      purchase_order_item_id: number;
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      delivered_quantity: number;
      accepted_quantity: number;
      rejected_quantity?: number;
      notes?: string | null;
    }>;
    delivery_advice_ids?: number[];
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.purchase_order_id) || data.purchase_order_id <= 0) {
      errors.push('Purchase order is required');
    }

    if (!Number.isInteger(data.supplier_id) || data.supplier_id <= 0) {
      errors.push('Supplier is required');
    }

    if (!Number.isInteger(data.project_id) || data.project_id <= 0) {
      errors.push('Project is required');
    }

    if (data.received_by_account_id !== undefined && data.received_by_account_id !== null && (!Number.isInteger(data.received_by_account_id) || data.received_by_account_id <= 0)) {
      errors.push('Received by account must be a positive integer');
    }

    if (data.delivery_date !== undefined && data.delivery_date !== null && typeof data.delivery_date !== 'string') {
      errors.push('Delivery date must be a string');
    }

    if (data.reference_code !== undefined && data.reference_code !== null && typeof data.reference_code !== 'string') {
      errors.push('Reference code must be a string');
    }

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('At least one line item is required');
    }

    if (Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        const prefix = `Item ${index + 1}`;
        if (!Number.isInteger(item.purchase_order_item_id) || item.purchase_order_item_id <= 0) {
          errors.push(`${prefix}: Purchase order item is required`);
        }
        if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
          errors.push(`${prefix}: Material is required`);
        }
        if (item.material_brand_id !== undefined && item.material_brand_id !== null && (!Number.isInteger(item.material_brand_id) || item.material_brand_id <= 0)) {
          errors.push(`${prefix}: Material brand must be a positive integer`);
        }
        if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
          errors.push(`${prefix}: Unit of measure is required`);
        }
        if (!Number.isFinite(item.delivered_quantity) || item.delivered_quantity <= 0) {
          errors.push(`${prefix}: Delivered quantity must be greater than zero`);
        }
        if (!Number.isFinite(item.accepted_quantity) || item.accepted_quantity < 0) {
          errors.push(`${prefix}: Accepted quantity must be a non-negative number`);
        }
        const rejected = item.rejected_quantity ?? item.delivered_quantity - item.accepted_quantity;
        if (!Number.isFinite(rejected) || rejected < 0) {
          errors.push(`${prefix}: Rejected quantity must be a non-negative number`);
        }
        if (Math.abs((item.accepted_quantity + rejected) - item.delivered_quantity) > 0.000001) {
          errors.push(`${prefix}: Accepted + rejected must equal delivered quantity`);
        }
      });
    }

    if (data.delivery_advice_ids !== undefined) {
      if (!Array.isArray(data.delivery_advice_ids)) {
        errors.push('Delivery advice IDs must be an array');
      } else {
        data.delivery_advice_ids.forEach((id, index) => {
          if (!Number.isInteger(id) || id <= 0) {
            errors.push(`Delivery advice ${index + 1} must be a positive integer`);
          }
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    purchase_order_id?: number;
    supplier_id?: number;
    project_id?: number;
    received_by_account_id?: number | null;
    delivery_date?: string | null;
    reference_code?: string | null;
    notes?: string | null;
    items?: Array<{
      purchase_order_item_id: number;
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      delivered_quantity: number;
      accepted_quantity: number;
      rejected_quantity?: number;
      notes?: string | null;
    }>;
    delivery_advice_ids?: number[];
  }) {
    const errors: string[] = [];

    if (data.purchase_order_id !== undefined && (!Number.isInteger(data.purchase_order_id) || data.purchase_order_id <= 0)) {
      errors.push('Purchase order must be a positive integer');
    }

    if (data.supplier_id !== undefined && (!Number.isInteger(data.supplier_id) || data.supplier_id <= 0)) {
      errors.push('Supplier must be a positive integer');
    }

    if (data.project_id !== undefined && (!Number.isInteger(data.project_id) || data.project_id <= 0)) {
      errors.push('Project must be a positive integer');
    }

    if (data.received_by_account_id !== undefined && data.received_by_account_id !== null && (!Number.isInteger(data.received_by_account_id) || data.received_by_account_id <= 0)) {
      errors.push('Received by account must be a positive integer');
    }

    if (data.items !== undefined) {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        errors.push('At least one line item is required');
      }
      if (Array.isArray(data.items)) {
        data.items.forEach((item, index) => {
          const prefix = `Item ${index + 1}`;
          if (!Number.isInteger(item.purchase_order_item_id) || item.purchase_order_item_id <= 0) {
            errors.push(`${prefix}: Purchase order item is required`);
          }
          if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
            errors.push(`${prefix}: Material is required`);
          }
          if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
            errors.push(`${prefix}: Unit of measure is required`);
          }
          if (!Number.isFinite(item.delivered_quantity) || item.delivered_quantity <= 0) {
            errors.push(`${prefix}: Delivered quantity must be greater than zero`);
          }
          if (!Number.isFinite(item.accepted_quantity) || item.accepted_quantity < 0) {
            errors.push(`${prefix}: Accepted quantity must be a non-negative number`);
          }
          const rejected = item.rejected_quantity ?? item.delivered_quantity - item.accepted_quantity;
          if (!Number.isFinite(rejected) || rejected < 0) {
            errors.push(`${prefix}: Rejected quantity must be a non-negative number`);
          }
          if (Math.abs((item.accepted_quantity + rejected) - item.delivered_quantity) > 0.000001) {
            errors.push(`${prefix}: Accepted + rejected must equal delivered quantity`);
          }
        });
      }
    }

    if (data.delivery_advice_ids !== undefined) {
      if (!Array.isArray(data.delivery_advice_ids)) {
        errors.push('Delivery advice IDs must be an array');
      } else {
        data.delivery_advice_ids.forEach((id, index) => {
          if (!Number.isInteger(id) || id <= 0) {
            errors.push(`Delivery advice ${index + 1} must be a positive integer`);
          }
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}
