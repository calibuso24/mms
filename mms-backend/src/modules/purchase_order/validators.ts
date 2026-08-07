import { ValidationError } from '../../utils/errors.js';

export class PurchaseOrderValidator {
  static validateItem(data: {
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
  }) {
    const errors: string[] = [];

    if (data.material_request_item_id !== undefined && data.material_request_item_id !== null && (!Number.isInteger(data.material_request_item_id) || data.material_request_item_id <= 0)) {
      errors.push('Material request item must be a positive integer');
    }
    if (!Number.isInteger(data.material_id) || data.material_id <= 0) {
      errors.push('Material is required');
    }
    if (!Number.isFinite(data.requested_quantity) || data.requested_quantity <= 0) {
      errors.push('Requested quantity must be greater than zero');
    }
    if (!Number.isFinite(data.ordered_quantity) || data.ordered_quantity <= 0) {
      errors.push('Ordered quantity must be greater than zero');
    }
    if (data.received_quantity !== undefined && data.received_quantity !== null) {
      if (!Number.isFinite(data.received_quantity) || data.received_quantity < 0) {
        errors.push('Received quantity must be a non-negative number');
      } else if (Number.isFinite(data.ordered_quantity) && data.received_quantity > data.ordered_quantity) {
        errors.push('Received quantity cannot exceed ordered quantity');
      }
    }
    if (!Number.isInteger(data.uom_id) || data.uom_id <= 0) {
      errors.push('Unit of measure is required');
    }
    if (data.unit_price !== undefined && data.unit_price !== null && (!Number.isFinite(data.unit_price) || data.unit_price < 0)) {
      errors.push('Unit price must be a non-negative number');
    }
    if (data.line_total !== undefined && data.line_total !== null && (!Number.isFinite(data.line_total) || data.line_total < 0)) {
      errors.push('Line total must be a non-negative number');
    }
    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateCreate(data: {
    project_id: number;
    material_request_id?: number | null;
    supplier_party_id: number;
    prepared_at?: string | null;
    expected_delivery_date?: string | null;
    order_type_id: number;
    total_amount?: number | null;
    notes?: string | null;
    items: Array<{
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
    }>;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.project_id) || data.project_id <= 0) {
      errors.push('Project is required');
    }

    if (!Number.isInteger(data.supplier_party_id) || data.supplier_party_id <= 0) {
      errors.push('Supplier is required');
    }

    if (data.material_request_id !== undefined && data.material_request_id !== null && (!Number.isInteger(data.material_request_id) || data.material_request_id <= 0)) {
      errors.push('Material request must be a positive integer');
    }

    if (!Number.isInteger(data.order_type_id) || data.order_type_id <= 0) {
      errors.push('Order type is required');
    }

    if (data.prepared_at !== undefined && data.prepared_at !== null && typeof data.prepared_at !== 'string') {
      errors.push('Prepared at must be a string');
    }

    if (data.expected_delivery_date !== undefined && data.expected_delivery_date !== null && typeof data.expected_delivery_date !== 'string') {
      errors.push('Expected delivery date must be a string');
    }

    if (data.material_request_id === undefined || data.material_request_id === null) {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        errors.push('At least one line item is required');
      }
    }

    if (Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        const prefix = `Item ${index + 1}`;
        if (item.material_request_item_id !== undefined && item.material_request_item_id !== null && (!Number.isInteger(item.material_request_item_id) || item.material_request_item_id <= 0)) {
          errors.push(`${prefix}: Material request item must be a positive integer`);
        }
        if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
          errors.push(`${prefix}: Material is required`);
        }
        if (!Number.isFinite(item.requested_quantity) || item.requested_quantity <= 0) {
          errors.push(`${prefix}: Requested quantity must be greater than zero`);
        }
        if (!Number.isFinite(item.ordered_quantity) || item.ordered_quantity <= 0) {
          errors.push(`${prefix}: Ordered quantity must be greater than zero`);
        }
        if (item.received_quantity !== undefined && item.received_quantity !== null) {
          if (!Number.isFinite(item.received_quantity) || item.received_quantity < 0) {
            errors.push(`${prefix}: Received quantity must be a non-negative number`);
          } else if (Number.isFinite(item.ordered_quantity) && item.received_quantity > item.ordered_quantity) {
            errors.push(`${prefix}: Received quantity cannot exceed ordered quantity`);
          }
        }
        if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
          errors.push(`${prefix}: Unit of measure is required`);
        }
        if (item.unit_price !== undefined && item.unit_price !== null && (!Number.isFinite(item.unit_price) || item.unit_price < 0)) {
          errors.push(`${prefix}: Unit price must be a non-negative number`);
        }
        if (item.line_total !== undefined && item.line_total !== null && (!Number.isFinite(item.line_total) || item.line_total < 0)) {
          errors.push(`${prefix}: Line total must be a non-negative number`);
        }
        if (item.notes !== undefined && item.notes !== null && typeof item.notes !== 'string') {
          errors.push(`${prefix}: Notes must be a string`);
        }
      });
    }

    if (data.total_amount !== undefined && data.total_amount !== null && (!Number.isFinite(data.total_amount) || data.total_amount < 0)) {
      errors.push('Total amount must be a non-negative number');
    }

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    project_id?: number;
    material_request_id?: number | null;
    supplier_party_id?: number;
    prepared_at?: string | null;
    expected_delivery_date?: string | null;
    order_type_id?: number;
    total_amount?: number | null;
    notes?: string | null;
    items?: Array<{
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
    }>;
  }) {
    const errors: string[] = [];

    if (data.project_id !== undefined && (!Number.isInteger(data.project_id) || data.project_id <= 0)) {
      errors.push('Project must be a positive integer');
    }

    if (data.material_request_id !== undefined && data.material_request_id !== null && (!Number.isInteger(data.material_request_id) || data.material_request_id <= 0)) {
      errors.push('Material request must be a positive integer');
    }

    if (data.supplier_party_id !== undefined && (!Number.isInteger(data.supplier_party_id) || data.supplier_party_id <= 0)) {
      errors.push('Supplier must be a positive integer');
    }

    if (data.prepared_at !== undefined && data.prepared_at !== null && typeof data.prepared_at !== 'string') {
      errors.push('Prepared at must be a string');
    }

    if (data.expected_delivery_date !== undefined && data.expected_delivery_date !== null && typeof data.expected_delivery_date !== 'string') {
      errors.push('Expected delivery date must be a string');
    }

    if (data.order_type_id !== undefined && (!Number.isInteger(data.order_type_id) || data.order_type_id <= 0)) {
      errors.push('Order type must be a positive integer');
    }

    if (data.items !== undefined) {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        errors.push('At least one line item is required');
      }

      data.items?.forEach((item, index) => {
        const prefix = `Item ${index + 1}`;
        if (item.material_request_item_id !== undefined && item.material_request_item_id !== null && (!Number.isInteger(item.material_request_item_id) || item.material_request_item_id <= 0)) {
          errors.push(`${prefix}: Material request item must be a positive integer`);
        }
        if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
          errors.push(`${prefix}: Material is required`);
        }
        if (!Number.isFinite(item.requested_quantity) || item.requested_quantity <= 0) {
          errors.push(`${prefix}: Requested quantity must be greater than zero`);
        }
        if (!Number.isFinite(item.ordered_quantity) || item.ordered_quantity <= 0) {
          errors.push(`${prefix}: Ordered quantity must be greater than zero`);
        }
        if (item.received_quantity !== undefined && item.received_quantity !== null) {
          if (!Number.isFinite(item.received_quantity) || item.received_quantity < 0) {
            errors.push(`${prefix}: Received quantity must be a non-negative number`);
          } else if (Number.isFinite(item.ordered_quantity) && item.received_quantity > item.ordered_quantity) {
            errors.push(`${prefix}: Received quantity cannot exceed ordered quantity`);
          }
        }
        if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
          errors.push(`${prefix}: Unit of measure is required`);
        }
        if (item.unit_price !== undefined && item.unit_price !== null && (!Number.isFinite(item.unit_price) || item.unit_price < 0)) {
          errors.push(`${prefix}: Unit price must be a non-negative number`);
        }
        if (item.line_total !== undefined && item.line_total !== null && (!Number.isFinite(item.line_total) || item.line_total < 0)) {
          errors.push(`${prefix}: Line total must be a non-negative number`);
        }
        if (item.notes !== undefined && item.notes !== null && typeof item.notes !== 'string') {
          errors.push(`${prefix}: Notes must be a string`);
        }
      });
    }

    if (data.total_amount !== undefined && data.total_amount !== null && (!Number.isFinite(data.total_amount) || data.total_amount < 0)) {
      errors.push('Total amount must be a non-negative number');
    }

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}