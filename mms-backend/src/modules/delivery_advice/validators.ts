import { ValidationError } from '../../utils/errors.js';

export class DeliveryAdviceValidator {
  static validateItem(data: {
    purchase_order_item_id?: number | null;
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    advised_quantity: number;
    received_quantity?: number;
    notes?: string | null;
  }) {
    const errors: string[] = [];

    if (data.purchase_order_item_id !== undefined && data.purchase_order_item_id !== null && (!Number.isInteger(data.purchase_order_item_id) || data.purchase_order_item_id <= 0)) {
      errors.push('Purchase order item must be a positive integer');
    }
    if (!Number.isInteger(data.material_id) || data.material_id <= 0) {
      errors.push('Material is required');
    }
    if (!Number.isInteger(data.uom_id) || data.uom_id <= 0) {
      errors.push('Unit of measure is required');
    }
    if (!Number.isFinite(data.advised_quantity) || data.advised_quantity <= 0) {
      errors.push('Advised quantity must be greater than zero');
    }
    if (data.received_quantity !== undefined && data.received_quantity !== null && (!Number.isFinite(data.received_quantity) || data.received_quantity < 0)) {
      errors.push('Received quantity must be a non-negative number');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateCreate(data: {
    purchase_order_id: number;
    reference_code: string;
    issued_at?: string | null;
    received_at?: string | null;
    notes?: string | null;
    items: Array<{
      purchase_order_item_id?: number | null;
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      advised_quantity: number;
      received_quantity?: number;
      notes?: string | null;
    }>;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.purchase_order_id) || data.purchase_order_id <= 0) {
      errors.push('Purchase order is required');
    }

    if (typeof data.reference_code !== 'string' || data.reference_code.trim().length === 0) {
      errors.push('Reference code is required');
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('At least one line item is required');
    }

    if (Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        const prefix = `Item ${index + 1}`;
        if (item.purchase_order_item_id !== undefined && item.purchase_order_item_id !== null && (!Number.isInteger(item.purchase_order_item_id) || item.purchase_order_item_id <= 0)) {
          errors.push(`${prefix}: Purchase order item must be a positive integer`);
        }
        if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
          errors.push(`${prefix}: Material is required`);
        }
        if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
          errors.push(`${prefix}: Unit of measure is required`);
        }
        if (!Number.isFinite(item.advised_quantity) || item.advised_quantity <= 0) {
          errors.push(`${prefix}: Advised quantity must be greater than zero`);
        }
        if (item.received_quantity !== undefined && (!Number.isFinite(item.received_quantity) || item.received_quantity < 0)) {
          errors.push(`${prefix}: Received quantity must be a non-negative number`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    purchase_order_id?: number;
    reference_code?: string;
    issued_at?: string | null;
    received_at?: string | null;
    notes?: string | null;
    items?: Array<{
      purchase_order_item_id?: number | null;
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      advised_quantity: number;
      received_quantity?: number;
      notes?: string | null;
    }>;
  }) {
    const errors: string[] = [];

    if (data.purchase_order_id !== undefined && (!Number.isInteger(data.purchase_order_id) || data.purchase_order_id <= 0)) {
      errors.push('Purchase order must be a positive integer');
    }

    if (data.reference_code !== undefined && (typeof data.reference_code !== 'string' || data.reference_code.trim().length === 0)) {
      errors.push('Reference code is required');
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
        if (!Number.isFinite(item.advised_quantity) || item.advised_quantity <= 0) {
          errors.push(`${prefix}: Advised quantity must be greater than zero`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}
