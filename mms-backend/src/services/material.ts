import { MaterialRepository } from '../repositories/material.js';
import { MaterialSpecificationRepository } from '../repositories/materialSpecification.js';
import { MaterialOptionRepository } from '../repositories/materialOption.js';
import { CategoryRepository } from '../repositories/category.js';
import { UnitOfMeasureRepository } from '../repositories/unitOfMeasure.js';
import { MaterialValidator } from '../modules/product_management/validators/material.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { pool } from '../config/database.js';

export class MaterialService {
  private materialRepository = new MaterialRepository();
  private specificationRepository = new MaterialSpecificationRepository();
  private optionRepository = new MaterialOptionRepository();
  private categoryRepository = new CategoryRepository();
  private uomRepository = new UnitOfMeasureRepository();

  async getMaterial(id: number) {
    const material = await this.materialRepository.findById(id);
    if (!material) {
      throw new NotFoundError('Material not found');
    }

    // Fetch related data
    const specification = await this.specificationRepository.findByMaterialId(id);
    const options = await this.optionRepository.findByMaterialId(id);

    return {
      ...material,
      material_specification: specification,
      material_options: options,
    };
  }

  async listMaterials(
    limit?: number,
    offset?: number,
    filters?: { search?: string; category_id?: number; sub_category_id?: number; status_id?: number; uom_id?: number; brand_id?: number }
  ) {
    return this.materialRepository.findAll(limit, offset, filters);
  }

  async createMaterial(data: {
    product_code: string;
    product_name: string;
    source_description?: string;
    category_id: number;
    sub_category_id?: number;
    stock_uom_id: number;
    status_id: number;
    notes?: string;
    brand_id?: number;
    material_specification?: {
      primary_size?: string;
      secondary_size?: string;
      alternate_size?: string;
      thickness_or_gauge?: string;
      width?: string;
      length?: string;
      schedule?: string;
      pressure_or_load_rating?: string;
      standard?: string;
      pack_size?: string;
      additional_specification?: string;
    };
  }) {
    // Validate input
    MaterialValidator.validateCreateMaterial(data);

    // Verify references exist
    const category = await this.categoryRepository.findById(data.category_id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const uom = await this.uomRepository.findById(data.stock_uom_id);
    if (!uom) {
      throw new NotFoundError('Unit of measure not found');
    }

    // Verify status exists in look_up table
    const statusResult = await pool.query(
      'SELECT * FROM look_up WHERE look_up_id = $1 AND is_deleted = false',
      [data.status_id]
    );
    if (statusResult.rows.length === 0) {
      throw new NotFoundError('Status not found');
    }

    // Check for duplicate product code
    const existing = await this.materialRepository.findByCode(data.product_code);
    if (existing) {
      throw new ValidationError('Product code already exists');
    }

    // Create material
    const material = await this.materialRepository.create({
      product_code: data.product_code,
      product_name: data.product_name,
      source_description: data.source_description,
      category_id: data.category_id,
      sub_category_id: data.sub_category_id,
      stock_uom_id: data.stock_uom_id,
      status_id: data.status_id,
      notes: data.notes,
    });

    // Create material specification if provided
    if (data.material_specification) {
      try {
        await this.specificationRepository.create({
          material_id: parseInt(material.material_id as string),
          ...data.material_specification,
        });
      } catch (error) {
        // If specification creation fails, soft delete the material
        await this.materialRepository.softDelete(parseInt(material.material_id as string));
        throw error;
      }
    }

    return material;
  }

  async updateMaterial(
    id: number,
    data: {
      product_name?: string;
      source_description?: string;
      category_id?: number;
      sub_category_id?: number;
      stock_uom_id?: number;
      status_id?: number;
      notes?: string;
      brand_id?: number;
      material_specification?: {
        primary_size?: string;
        secondary_size?: string;
        alternate_size?: string;
        thickness_or_gauge?: string;
        width?: string;
        length?: string;
        schedule?: string;
        pressure_or_load_rating?: string;
        standard?: string;
        pack_size?: string;
        additional_specification?: string;
      };
      material_option?: {
        material_option_id?: number;
        option_code?: string;
        option_name?: string;
        option_type_id?: number;
        requires_approval?: boolean;
        is_active?: boolean;
        notes?: string;
      };
    }
  ) {
    // Validate input
    MaterialValidator.validateUpdateMaterial(data);

    const existing = await this.materialRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material not found');
    }

    // Verify foreign keys if provided
    if (data.category_id) {
      const category = await this.categoryRepository.findById(data.category_id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }

    if (data.stock_uom_id) {
      const uom = await this.uomRepository.findById(data.stock_uom_id);
      if (!uom) {
        throw new NotFoundError('Unit of measure not found');
      }
    }

    if (data.status_id) {
      const statusResult = await pool.query(
        'SELECT * FROM look_up WHERE look_up_id = $1 AND is_deleted = false',
        [data.status_id]
      );
      if (statusResult.rows.length === 0) {
        throw new NotFoundError('Status not found');
      }
    }

    // Prepare data for material update (exclude specification and option fields)
    const materialUpdateData: any = {};
    if (data.product_name !== undefined) materialUpdateData.product_name = data.product_name;
    if (data.source_description !== undefined) materialUpdateData.source_description = data.source_description;
    if (data.category_id !== undefined) materialUpdateData.category_id = data.category_id;
    if (data.sub_category_id !== undefined) materialUpdateData.sub_category_id = data.sub_category_id;
    if (data.stock_uom_id !== undefined) materialUpdateData.stock_uom_id = data.stock_uom_id;
    if (data.status_id !== undefined) materialUpdateData.status_id = data.status_id;
    if (data.notes !== undefined) materialUpdateData.notes = data.notes;

    // Update material
    const material = await this.materialRepository.update(id, materialUpdateData);

    // Update or create material specification if provided
    if (data.material_specification) {
      const existingSpec = await this.specificationRepository.findByMaterialId(id);
      if (existingSpec) {
        await this.specificationRepository.update(id, data.material_specification);
      } else {
        await this.specificationRepository.create({
          material_id: id,
          ...data.material_specification,
        });
      }
    }

    // Handle material_option if provided
    if (data.material_option) {
      if (data.material_option.material_option_id) {
        // Update existing option
        await this.optionRepository.update(data.material_option.material_option_id, {
          option_name: data.material_option.option_name,
          option_type_id: data.material_option.option_type_id,
          requires_approval: data.material_option.requires_approval,
          is_active: data.material_option.is_active,
          notes: data.material_option.notes,
        });
      } else if (data.material_option.option_code) {
        // Create new option
        await this.optionRepository.create({
          material_id: id,
          option_code: data.material_option.option_code,
          option_name: data.material_option.option_name || '',
          option_type_id: data.material_option.option_type_id || 1,
          requires_approval: data.material_option.requires_approval,
          is_active: data.material_option.is_active,
          notes: data.material_option.notes,
        });
      }
    }

    return material;
  }

  async deleteMaterial(id: number) {
    const existing = await this.materialRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material not found');
    }

    await this.materialRepository.softDelete(id);
  }
}
