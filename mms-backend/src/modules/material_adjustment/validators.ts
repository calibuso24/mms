import { ValidationError } from '../../utils/errors.js';

export class MaterialAdjustmentValidator {
  static validateItem(data: {
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    system_quantity: number;
    adjustment_quantity: number;
    resulting_quantity: number;
    notes?: string | null;
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
    if (!Number.isFinite(data.system_quantity)) {
      errors.push('System quantity is required');
    }
    if (!Number.isFinite(data.adjustment_quantity)) {
      errors.push('Adjustment quantity is required');
    }
    if (!Number.isFinite(data.resulting_quantity)) {
      errors.push('Resulting quantity is required');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateCreate(data: {
    project_id: number;
    requested_at?: string | null;
    adjustment_reason_id?: number | null;
    notes?: string | null;
    items: Array<{
      material_id: number;
      material_brand_id?: number | null;
      uom_id: number;
      system_quantity: number;
      adjustment_quantity: number;
      resulting_quantity: number;
      notes?: string | null;
    }>;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.project_id) || data.project_id <= 0) {
      errors.push('Project is required');
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
        if (!Number.isFinite(item.system_quantity)) {
          errors.push(`${prefix}: System quantity is required`);
        }
        if (!Number.isFinite(item.adjustment_quantity)) {
          errors.push(`${prefix}: Adjustment quantity is required`);
        }
        if (!Number.isFinite(item.resulting_quantity)) {
          errors.push(`${prefix}: Resulting quantity is required`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    project_id?: number;
    requested_at?: string | null;
    adjustment_reason_id?: number | null;
    notes?: string | null;
    items?: Array<{
      material_id: number;
      uom_id: number;
      system_quantity: number;
      adjustment_quantity: number;
      resulting_quantity: number;
    }>;
  }) {
    const errors: string[] = [];

    if (data.project_id !== undefined && (!Number.isInteger(data.project_id) || data.project_id <= 0)) {
      errors.push('Project must be a positive integer');
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
        if (!Number.isFinite(item.system_quantity)) {
          errors.push(`${prefix}: System quantity is required`);
        }
        if (!Number.isFinite(item.adjustment_quantity)) {
          errors.push(`${prefix}: Adjustment quantity is required`);
        }
        if (!Number.isFinite(item.resulting_quantity)) {
          errors.push(`${prefix}: Resulting quantity is required`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}
