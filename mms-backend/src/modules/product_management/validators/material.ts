import { ValidationError } from '../../../utils/errors.js';

export class MaterialValidator {
  static validateCreateMaterial(data: any) {
    const errors: string[] = [];

    // Product code validation
    if (!data.product_code || typeof data.product_code !== 'string') {
      errors.push('Product code is required and must be a string');
    } else if (data.product_code.trim().length < 2) {
      errors.push('Product code must be at least 2 characters');
    } else if (data.product_code.trim().length > 50) {
      errors.push('Product code must not exceed 50 characters');
    }

    // Product name validation
    if (!data.product_name || typeof data.product_name !== 'string') {
      errors.push('Product name is required and must be a string');
    } else if (data.product_name.trim().length < 3) {
      errors.push('Product name must be at least 3 characters');
    } else if (data.product_name.trim().length > 255) {
      errors.push('Product name must not exceed 255 characters');
    }

    // Category validation
    if (!data.category_id) {
      errors.push('Category is required');
    } else if (!Number.isInteger(data.category_id) || data.category_id <= 0) {
      errors.push('Category ID must be a positive integer');
    }

    // UOM validation
    if (!data.stock_uom_id) {
      errors.push('Unit of Measure is required');
    } else if (!Number.isInteger(data.stock_uom_id) || data.stock_uom_id <= 0) {
      errors.push('UOM ID must be a positive integer');
    }

    // Status validation
    if (!data.status_id) {
      errors.push('Status is required');
    } else if (!Number.isInteger(data.status_id) || data.status_id <= 0) {
      errors.push('Status ID must be a positive integer');
    }

    // Optional field validations
    if (data.sub_category_id !== undefined && data.sub_category_id !== null) {
      if (!Number.isInteger(data.sub_category_id) || data.sub_category_id <= 0) {
        errors.push('Sub Category ID must be a positive integer');
      }
    }

    if (data.brand_id !== undefined && data.brand_id !== null) {
      if (!Number.isInteger(data.brand_id) || data.brand_id <= 0) {
        errors.push('Brand ID must be a positive integer');
      }
    }

    if (data.source_description !== undefined && data.source_description !== null) {
      if (typeof data.source_description !== 'string') {
        errors.push('Source description must be a string');
      } else if (data.source_description.length > 500) {
        errors.push('Source description must not exceed 500 characters');
      }
    }

    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push('Notes must be a string');
      } else if (data.notes.length > 1000) {
        errors.push('Notes must not exceed 1000 characters');
      }
    }

    // Material specification validation
    if (data.material_specification) {
      this.validateMaterialSpecification(data.material_specification, errors);
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateUpdateMaterial(data: any) {
    const errors: string[] = [];

    // Product name validation (if provided)
    if (data.product_name !== undefined) {
      if (typeof data.product_name !== 'string') {
        errors.push('Product name must be a string');
      } else if (data.product_name.trim().length < 3) {
        errors.push('Product name must be at least 3 characters');
      } else if (data.product_name.trim().length > 255) {
        errors.push('Product name must not exceed 255 characters');
      }
    }

    // Category validation (if provided)
    if (data.category_id !== undefined) {
      if (!Number.isInteger(data.category_id) || data.category_id <= 0) {
        errors.push('Category ID must be a positive integer');
      }
    }

    // Sub Category validation (if provided)
    if (data.sub_category_id !== undefined && data.sub_category_id !== null) {
      if (!Number.isInteger(data.sub_category_id) || data.sub_category_id <= 0) {
        errors.push('Sub Category ID must be a positive integer');
      }
    }

    // UOM validation (if provided)
    if (data.stock_uom_id !== undefined) {
      if (!Number.isInteger(data.stock_uom_id) || data.stock_uom_id <= 0) {
        errors.push('UOM ID must be a positive integer');
      }
    }

    // Status validation (if provided)
    if (data.status_id !== undefined) {
      if (!Number.isInteger(data.status_id) || data.status_id <= 0) {
        errors.push('Status ID must be a positive integer');
      }
    }

    // Brand validation (if provided)
    if (data.brand_id !== undefined && data.brand_id !== null) {
      if (!Number.isInteger(data.brand_id) || data.brand_id <= 0) {
        errors.push('Brand ID must be a positive integer');
      }
    }

    // Source description validation (if provided)
    if (data.source_description !== undefined && data.source_description !== null) {
      if (typeof data.source_description !== 'string') {
        errors.push('Source description must be a string');
      } else if (data.source_description.length > 500) {
        errors.push('Source description must not exceed 500 characters');
      }
    }

    // Notes validation (if provided)
    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push('Notes must be a string');
      } else if (data.notes.length > 1000) {
        errors.push('Notes must not exceed 1000 characters');
      }
    }

    // Material specification validation
    if (data.material_specification) {
      this.validateMaterialSpecification(data.material_specification, errors);
    }

    // Material option validation
    if (data.material_option) {
      this.validateMaterialOption(data.material_option, errors);
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateMaterialSpecification(spec: any, errors: string[]): void {
    const numericFields = [
      'primary_size',
      'secondary_size',
      'alternate_size',
      'thickness_or_gauge',
      'width',
      'length',
      'schedule',
      'pressure_or_load_rating',
    ];

    for (const field of numericFields) {
      if (spec[field] !== undefined && spec[field] !== null) {
        if (typeof spec[field] !== 'string') {
          errors.push(`Material Specification ${field} must be a string`);
        } else if (spec[field].length > 100) {
          errors.push(`Material Specification ${field} must not exceed 100 characters`);
        }
      }
    }
  }

  static validateMaterialOption(option: any, errors: string[]): void {
    // If updating existing option
    if (option.material_option_id) {
      if (!Number.isInteger(option.material_option_id) || option.material_option_id <= 0) {
        errors.push('Material option ID must be a positive integer');
      }

      if (option.option_name !== undefined) {
        if (typeof option.option_name !== 'string' || option.option_name.trim().length === 0) {
          errors.push('Option name must be a non-empty string');
        } else if (option.option_name.length > 255) {
          errors.push('Option name must not exceed 255 characters');
        }
      }

      if (option.option_type_id !== undefined) {
        if (!Number.isInteger(option.option_type_id) || option.option_type_id <= 0) {
          errors.push('Option type ID must be a positive integer');
        }
      }
    } else if (option.option_code) {
      // Creating new option
      if (typeof option.option_code !== 'string' || option.option_code.trim().length === 0) {
        errors.push('Option code must be a non-empty string');
      } else if (option.option_code.length > 50) {
        errors.push('Option code must not exceed 50 characters');
      }

      if (!option.option_name || typeof option.option_name !== 'string') {
        errors.push('Option name is required and must be a string');
      } else if (option.option_name.trim().length === 0) {
        errors.push('Option name must not be empty');
      } else if (option.option_name.length > 255) {
        errors.push('Option name must not exceed 255 characters');
      }

      if (option.option_type_id && (!Number.isInteger(option.option_type_id) || option.option_type_id <= 0)) {
        errors.push('Option type ID must be a positive integer');
      }
    }

    if (option.requires_approval !== undefined && typeof option.requires_approval !== 'boolean') {
      errors.push('requires_approval must be a boolean');
    }

    if (option.is_active !== undefined && typeof option.is_active !== 'boolean') {
      errors.push('is_active must be a boolean');
    }

    if (option.notes !== undefined && option.notes !== null) {
      if (typeof option.notes !== 'string') {
        errors.push('Notes must be a string');
      } else if (option.notes.length > 1000) {
        errors.push('Notes must not exceed 1000 characters');
      }
    }
  }
}
