import { ValidationError } from '../../utils/errors.js';

export class MaterialControlValidator {
  static validateCreate(data: {
    project_id: number;
    control_code: string;
    budget: number;
    total_estimated_cost?: number | null;
    status_id: number;
    notes?: string | null;
  }) {
    const errors: string[] = [];

    if (!Number.isInteger(data.project_id) || data.project_id <= 0) {
      errors.push('Project is required');
    }

    if (!data.control_code || typeof data.control_code !== 'string') {
      errors.push('Control code is required');
    } else if (data.control_code.trim().length < 2) {
      errors.push('Control code must be at least 2 characters');
    } else if (data.control_code.trim().length > 50) {
      errors.push('Control code must not exceed 50 characters');
    }

    if (!Number.isFinite(data.budget) || data.budget < 0) {
      errors.push('Budget must be a non-negative number');
    }

    if (!Number.isInteger(data.status_id) || data.status_id <= 0) {
      errors.push('Status is required');
    }

    if (data.total_estimated_cost !== undefined && data.total_estimated_cost !== null) {
      if (!Number.isFinite(data.total_estimated_cost) || data.total_estimated_cost < 0) {
        errors.push('Total estimated cost must be a non-negative number');
      }
    }

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    } else if (typeof data.notes === 'string' && data.notes.length > 2000) {
      errors.push('Notes must not exceed 2000 characters');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdate(data: {
    project_id?: number;
    control_code?: string;
    budget?: number;
    total_estimated_cost?: number | null;
    status_id?: number;
    notes?: string | null;
  }) {
    const errors: string[] = [];

    if (data.project_id !== undefined && (!Number.isInteger(data.project_id) || data.project_id <= 0)) {
      errors.push('Project must be a positive integer');
    }

    if (data.control_code !== undefined) {
      if (typeof data.control_code !== 'string') {
        errors.push('Control code must be a string');
      } else if (data.control_code.trim().length < 2) {
        errors.push('Control code must be at least 2 characters');
      } else if (data.control_code.trim().length > 50) {
        errors.push('Control code must not exceed 50 characters');
      }
    }

    if (data.budget !== undefined && (!Number.isFinite(data.budget) || data.budget < 0)) {
      errors.push('Budget must be a non-negative number');
    }

    if (data.status_id !== undefined && (!Number.isInteger(data.status_id) || data.status_id <= 0)) {
      errors.push('Status must be a positive integer');
    }

    if (data.total_estimated_cost !== undefined && data.total_estimated_cost !== null) {
      if (!Number.isFinite(data.total_estimated_cost) || data.total_estimated_cost < 0) {
        errors.push('Total estimated cost must be a non-negative number');
      }
    }

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    } else if (typeof data.notes === 'string' && data.notes.length > 2000) {
      errors.push('Notes must not exceed 2000 characters');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}