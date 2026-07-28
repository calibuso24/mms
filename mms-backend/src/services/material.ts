import { MaterialRepository } from '../repositories/material.js';
import { CategoryRepository } from '../repositories/category.js';
import { UnitOfMeasureRepository } from '../repositories/unitOfMeasure.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { pool } from '../config/database.js';

export class MaterialService {
  private materialRepository = new MaterialRepository();
  private categoryRepository = new CategoryRepository();
  private uomRepository = new UnitOfMeasureRepository();

  async getMaterial(id: number) {
    const material = await this.materialRepository.findById(id);
    if (!material) {
      throw new NotFoundError('Material not found');
    }
    return material;
  }

  async listMaterials(
    limit?: number,
    offset?: number,
    filters?: { search?: string; category_id?: number; brand_id?: number }
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
  }) {
    // Validation
    if (!data.product_code || !data.product_name) {
      throw new ValidationError('Product code and name are required');
    }

    if (data.product_code.length < 2) {
      throw new ValidationError('Product code must be at least 2 characters');
    }

    if (!data.category_id || !data.stock_uom_id || !data.status_id) {
      throw new ValidationError('Category, UOM, and status are required');
    }

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

    return this.materialRepository.create(data);
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
    }
  ) {
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

    return this.materialRepository.update(id, data);
  }

  async deleteMaterial(id: number) {
    const existing = await this.materialRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material not found');
    }

    await this.materialRepository.softDelete(id);
  }
}
