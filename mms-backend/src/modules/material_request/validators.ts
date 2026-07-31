import { ValidationError } from '../../utils/errors.js';

export class MaterialRequestValidator {
  static validateCreate(data: {
    project_id: number;
    status_id?: number;
    notes?: string | null;
    items: Array<{
      material_id: number;
      requested_quantity: number;
      approved_quantity?: number | null;
      estimated_quantity?: number | null;
      area_usage?: string | null;
      remarks?: string | null;
      uom_id: number;
      notes?: string | null;
    }>;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.project_id) || data.project_id <= 0) {
      errors.push('Project is required');
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('At least one line item is required');
    } else {
      data.items.forEach((item, index) => {
        const prefix = `Item ${index + 1}`;
        if (!Number.isInteger(item.material_id) || item.material_id <= 0) {
          errors.push(`${prefix}: Material is required`);
        }
        if (!Number.isInteger(item.uom_id) || item.uom_id <= 0) {
          errors.push(`${prefix}: Unit of measure is required`);
        }
        if (!Number.isFinite(item.requested_quantity) || item.requested_quantity <= 0) {
          errors.push(`${prefix}: Requested quantity must be greater than zero`);
        }
        if (item.approved_quantity !== undefined && item.approved_quantity !== null && (!Number.isFinite(item.approved_quantity) || item.approved_quantity < 0)) {
          errors.push(`${prefix}: Approved quantity must be a non-negative number`);
        }
        if (item.estimated_quantity !== undefined && item.estimated_quantity !== null && (!Number.isFinite(item.estimated_quantity) || item.estimated_quantity < 0)) {
          errors.push(`${prefix}: Estimated quantity must be a non-negative number`);
        }
      });
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
    status_id?: number;
    notes?: string | null;
    items?: Array<{
      material_id: number;
      requested_quantity: number;
      approved_quantity?: number | null;
      estimated_quantity?: number | null;
      area_usage?: string | null;
      remarks?: string | null;
      uom_id: number;
      notes?: string | null;
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
        if (!Number.isFinite(item.requested_quantity) || item.requested_quantity <= 0) {
          errors.push(`${prefix}: Requested quantity must be greater than zero`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}