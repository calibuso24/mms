import { ValidationError } from '../../utils/errors.js';

export class MaterialControlItemValidator {
  static validateCreate(data: {
    material_control_id: number;
    material_id: number;
    estimated_quantity: number;
    uom_id: number;
    estimated_unit_cost?: number | null;
    estimated_total_cost?: number | null;
    remarks?: string | null;
    line_no: number;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.material_control_id) || data.material_control_id <= 0) {
      errors.push('Material control is required');
    }

    if (!Number.isInteger(data.material_id) || data.material_id <= 0) {
      errors.push('Material is required');
    }

    if (!Number.isFinite(data.estimated_quantity) || data.estimated_quantity <= 0) {
      errors.push('Estimated quantity must be a positive number');
    }

    if (!Number.isInteger(data.uom_id) || data.uom_id <= 0) {
      errors.push('Unit of measure is required');
    }

    if (data.estimated_unit_cost !== undefined && data.estimated_unit_cost !== null) {
      if (!Number.isFinite(data.estimated_unit_cost) || data.estimated_unit_cost < 0) {
        errors.push('Estimated unit cost must be a non-negative number');
      }
    }

    if (data.estimated_total_cost !== undefined && data.estimated_total_cost !== null) {
      if (!Number.isFinite(data.estimated_total_cost) || data.estimated_total_cost < 0) {
        errors.push('Estimated total cost must be a non-negative number');
      }
    }

    if (data.remarks !== undefined && data.remarks !== null && typeof data.remarks !== 'string') {
      errors.push('Remarks must be a string');
    } else if (typeof data.remarks === 'string' && data.remarks.length > 2000) {
      errors.push('Remarks must not exceed 2000 characters');
    }

    if (!Number.isInteger(data.line_no) || data.line_no <= 0) {
      errors.push('Line number must be a positive integer');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    material_control_id?: number;
    material_id?: number;
    estimated_quantity?: number;
    uom_id?: number;
    estimated_unit_cost?: number | null;
    estimated_total_cost?: number | null;
    remarks?: string | null;
    line_no?: number;
  }) {
    const errors: string[] = [];

    if (data.material_control_id !== undefined && (!Number.isInteger(data.material_control_id) || data.material_control_id <= 0)) {
      errors.push('Material control must be a positive integer');
    }

    if (data.material_id !== undefined && (!Number.isInteger(data.material_id) || data.material_id <= 0)) {
      errors.push('Material must be a positive integer');
    }

    if (data.estimated_quantity !== undefined && (!Number.isFinite(data.estimated_quantity) || data.estimated_quantity <= 0)) {
      errors.push('Estimated quantity must be a positive number');
    }

    if (data.uom_id !== undefined && (!Number.isInteger(data.uom_id) || data.uom_id <= 0)) {
      errors.push('Unit of measure must be a positive integer');
    }

    if (data.estimated_unit_cost !== undefined && data.estimated_unit_cost !== null) {
      if (!Number.isFinite(data.estimated_unit_cost) || data.estimated_unit_cost < 0) {
        errors.push('Estimated unit cost must be a non-negative number');
      }
    }

    if (data.estimated_total_cost !== undefined && data.estimated_total_cost !== null) {
      if (!Number.isFinite(data.estimated_total_cost) || data.estimated_total_cost < 0) {
        errors.push('Estimated total cost must be a non-negative number');
      }
    }

    if (data.remarks !== undefined && data.remarks !== null && typeof data.remarks !== 'string') {
      errors.push('Remarks must be a string');
    } else if (typeof data.remarks === 'string' && data.remarks.length > 2000) {
      errors.push('Remarks must not exceed 2000 characters');
    }

    if (data.line_no !== undefined && (!Number.isInteger(data.line_no) || data.line_no <= 0)) {
      errors.push('Line number must be a positive integer');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}
