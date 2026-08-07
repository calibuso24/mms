import { ValidationError } from '../../utils/errors.js';

export class SupplierDeliveryValidator {
  static validateItem(data: {
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    delivered_quantity: number;
    accepted_quantity: number;
    rejected_quantity?: number;
    notes?: string | null;
    references?: Array<{
      reference_type_code: 'po' | 'delivery_advice' | 'material_request';
      reference_id: number;
      reference_line_id: number;
      quantity: number;
    }>;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.material_id) || data.material_id <= 0) {
      errors.push('Material is required');
    }
    if (data.material_brand_id !== undefined && data.material_brand_id !== null && (!Number.isInteger(data.material_brand_id) || data.material_brand_id <= 0)) {
      errors.push('Material brand must be a positive integer');
    }
    if (!Number.isInteger(data.uom_id) || data.uom_id <= 0) {
      errors.push('Unit of measure is required');
    }
    if (!Number.isFinite(data.delivered_quantity) || data.delivered_quantity <= 0) {
      errors.push('Delivered quantity must be greater than zero');
    }
    if (!Number.isFinite(data.accepted_quantity) || data.accepted_quantity < 0) {
      errors.push('Accepted quantity must be a non-negative number');
    }
    const rejected = data.rejected_quantity ?? data.delivered_quantity - data.accepted_quantity;
    if (!Number.isFinite(rejected) || rejected < 0) {
      errors.push('Rejected quantity must be a non-negative number');
    }
    if (Math.abs((data.accepted_quantity + rejected) - data.delivered_quantity) > 0.000001) {
      errors.push('Accepted + rejected must equal delivered quantity');
    }

    if (data.references !== undefined) {
      if (!Array.isArray(data.references)) {
        errors.push('Item references must be an array');
      } else {
        data.references.forEach((reference, index) => {
          const prefix = `Item reference ${index + 1}`;
          if (!['po', 'delivery_advice', 'material_request'].includes(reference.reference_type_code)) {
            errors.push(`${prefix}: Reference type is invalid`);
          }
          if (!Number.isInteger(reference.reference_id) || reference.reference_id <= 0) {
            errors.push(`${prefix}: Reference ID must be a positive integer`);
          }
          if (!Number.isInteger(reference.reference_line_id) || reference.reference_line_id <= 0) {
            errors.push(`${prefix}: Reference line ID must be a positive integer`);
          }
          if (!Number.isFinite(reference.quantity) || reference.quantity <= 0) {
            errors.push(`${prefix}: Quantity must be greater than zero`);
          }
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateCreate(data: {
    supplier_id: number;
    project_id: number;
    received_by_account_id?: number | null;
    delivery_date?: string | null;
    reference_code?: string | null;
    notes?: string | null;
    purchase_order_ids?: number[];
    delivery_advice_ids?: number[];
    material_request_ids?: number[];
    items: Array<{
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      delivered_quantity: number;
      accepted_quantity: number;
      rejected_quantity?: number;
      notes?: string | null;
      references?: Array<{
        reference_type_code: 'po' | 'delivery_advice' | 'material_request';
        reference_id: number;
        reference_line_id: number;
        quantity: number;
      }>;
    }>;
  }) {
    const errors: string[] = [];

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

        if (item.references !== undefined) {
          if (!Array.isArray(item.references)) {
            errors.push(`${prefix}: References must be an array`);
          } else {
            item.references.forEach((reference, referenceIndex) => {
              const referencePrefix = `${prefix} reference ${referenceIndex + 1}`;
              if (!['po', 'delivery_advice', 'material_request'].includes(reference.reference_type_code)) {
                errors.push(`${referencePrefix}: Reference type is invalid`);
              }
              if (!Number.isInteger(reference.reference_id) || reference.reference_id <= 0) {
                errors.push(`${referencePrefix}: Reference ID must be a positive integer`);
              }
              if (!Number.isInteger(reference.reference_line_id) || reference.reference_line_id <= 0) {
                errors.push(`${referencePrefix}: Reference line ID must be a positive integer`);
              }
              if (!Number.isFinite(reference.quantity) || reference.quantity <= 0) {
                errors.push(`${referencePrefix}: Quantity must be greater than zero`);
              }
            });
          }
        }
      });
    }

    if (data.purchase_order_ids !== undefined) {
      if (!Array.isArray(data.purchase_order_ids)) {
        errors.push('Purchase order IDs must be an array');
      } else {
        data.purchase_order_ids.forEach((id, index) => {
          if (!Number.isInteger(id) || id <= 0) {
            errors.push(`Purchase order ${index + 1} must be a positive integer`);
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

    if (data.material_request_ids !== undefined) {
      if (!Array.isArray(data.material_request_ids)) {
        errors.push('Material request IDs must be an array');
      } else {
        data.material_request_ids.forEach((id, index) => {
          if (!Number.isInteger(id) || id <= 0) {
            errors.push(`Material request ${index + 1} must be a positive integer`);
          }
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    supplier_id?: number;
    project_id?: number;
    received_by_account_id?: number | null;
    delivery_date?: string | null;
    reference_code?: string | null;
    notes?: string | null;
    purchase_order_ids?: number[];
    delivery_advice_ids?: number[];
    material_request_ids?: number[];
    items?: Array<{
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      delivered_quantity: number;
      accepted_quantity: number;
      rejected_quantity?: number;
      notes?: string | null;
      references?: Array<{
        reference_type_code: 'po' | 'delivery_advice' | 'material_request';
        reference_id: number;
        reference_line_id: number;
        quantity: number;
      }>;
    }>;
  }) {
    const errors: string[] = [];

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

          if (item.references !== undefined) {
            if (!Array.isArray(item.references)) {
              errors.push(`${prefix}: References must be an array`);
            } else {
              item.references.forEach((reference, referenceIndex) => {
                const referencePrefix = `${prefix} reference ${referenceIndex + 1}`;
                if (!['po', 'delivery_advice', 'material_request'].includes(reference.reference_type_code)) {
                  errors.push(`${referencePrefix}: Reference type is invalid`);
                }
                if (!Number.isInteger(reference.reference_id) || reference.reference_id <= 0) {
                  errors.push(`${referencePrefix}: Reference ID must be a positive integer`);
                }
                if (!Number.isInteger(reference.reference_line_id) || reference.reference_line_id <= 0) {
                  errors.push(`${referencePrefix}: Reference line ID must be a positive integer`);
                }
                if (!Number.isFinite(reference.quantity) || reference.quantity <= 0) {
                  errors.push(`${referencePrefix}: Quantity must be greater than zero`);
                }
              });
            }
          }
        });
      }
    }

    if (data.purchase_order_ids !== undefined) {
      if (!Array.isArray(data.purchase_order_ids)) {
        errors.push('Purchase order IDs must be an array');
      } else {
        data.purchase_order_ids.forEach((id, index) => {
          if (!Number.isInteger(id) || id <= 0) {
            errors.push(`Purchase order ${index + 1} must be a positive integer`);
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

    if (data.material_request_ids !== undefined) {
      if (!Array.isArray(data.material_request_ids)) {
        errors.push('Material request IDs must be an array');
      } else {
        data.material_request_ids.forEach((id, index) => {
          if (!Number.isInteger(id) || id <= 0) {
            errors.push(`Material request ${index + 1} must be a positive integer`);
          }
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}
