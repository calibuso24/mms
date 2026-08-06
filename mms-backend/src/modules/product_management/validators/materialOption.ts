import { ValidationError } from '../../../utils/errors.js';

export interface MaterialOptionComponentPayload {
  material_option_detail_id?: number;
  component_material_id: number;
  required_quantity: number;
  uom_id: number;
  notes?: string;
}

export interface MaterialOptionPayload {
  option_code: string;
  option_name: string;
  option_type_id: number;
  requires_approval?: boolean;
  is_active?: boolean;
  notes?: string;
  components: MaterialOptionComponentPayload[];
}

export class MaterialOptionValidator {
  static validateCreate(data: MaterialOptionPayload): void {
    this.validateBase(data, false);
  }

  static validateUpdate(data: MaterialOptionPayload): void {
    this.validateBase(data, true);
  }

  private static validateBase(data: MaterialOptionPayload, forUpdate: boolean): void {
    const errors: string[] = [];

    if (!data.option_code || typeof data.option_code !== 'string' || data.option_code.trim().length === 0) {
      errors.push('Option code is required');
    } else if (data.option_code.trim().length > 50) {
      errors.push('Option code must not exceed 50 characters');
    }

    if (!data.option_name || typeof data.option_name !== 'string' || data.option_name.trim().length === 0) {
      errors.push('Option name is required');
    } else if (data.option_name.trim().length > 255) {
      errors.push('Option name must not exceed 255 characters');
    }

    if (!Number.isInteger(data.option_type_id) || Number(data.option_type_id) <= 0) {
      errors.push('Option type is required');
    }

    if (data.requires_approval !== undefined && typeof data.requires_approval !== 'boolean') {
      errors.push('Requires approval must be a boolean');
    }

    if (data.is_active !== undefined && typeof data.is_active !== 'boolean') {
      errors.push('Active must be a boolean');
    }

    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push('Notes must be a string');
      } else if (data.notes.length > 1000) {
        errors.push('Notes must not exceed 1000 characters');
      }
    }

    if (!Array.isArray(data.components) || data.components.length === 0) {
      errors.push('At least one component material is required');
    } else {
      const seen = new Set<number>();
      for (const component of data.components) {
        if (forUpdate && component.material_option_detail_id !== undefined) {
          if (!Number.isInteger(component.material_option_detail_id) || component.material_option_detail_id <= 0) {
            errors.push('Component detail id must be a positive integer');
          }
        }

        if (!Number.isInteger(component.component_material_id) || component.component_material_id <= 0) {
          errors.push('Component material is required');
        } else if (seen.has(component.component_material_id)) {
          errors.push('Duplicate component materials are not allowed');
        } else {
          seen.add(component.component_material_id);
        }

        const quantity = Number(component.required_quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          errors.push('Required quantity must be greater than zero');
        }

        if (!Number.isInteger(component.uom_id) || component.uom_id <= 0) {
          errors.push('Component UOM is required');
        }

        if (component.notes !== undefined && component.notes !== null) {
          if (typeof component.notes !== 'string') {
            errors.push('Component notes must be a string');
          } else if (component.notes.length > 1000) {
            errors.push('Component notes must not exceed 1000 characters');
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }
}
