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
    filters?: { search?: string; category_id?: number; sub_category_id?: number; status_id?: number; material_type_id?: number; uom_id?: number; brand_id?: number }
  ) {
    return this.materialRepository.findAll(limit, offset, filters);
  }

  async listMaterialsPaged(
    limit = 25,
    offset = 0,
    filters?: { search?: string; category_id?: number; sub_category_id?: number; status_id?: number; material_type_id?: number; uom_id?: number; brand_id?: number }
  ) {
    const [items, total] = await Promise.all([
      this.materialRepository.findAll(limit, offset, filters),
      this.materialRepository.countAll(filters),
    ]);

    return { items, total };
  }

  async createMaterial(data: {
    product_name: string;
    category_id: number;
    sub_category_id?: number;
    stock_uom_id: number;
    material_type_id?: number;
    status_id?: number;
    notes?: string;
    brand_ids?: number[];
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

    if (data.material_type_id) {
      const materialTypeResult = await pool.query(
        'SELECT material_type_id FROM material_type WHERE material_type_id = $1 AND is_deleted = false',
        [data.material_type_id]
      );
      if (materialTypeResult.rows.length === 0) {
        throw new NotFoundError('Material type not found');
      }
    }

    // Resolve status. Create defaults to Active; provided status_id is ignored to enforce the requirement.
    const activeStatusResult = await pool.query(
      `SELECT look_up_id
       FROM look_up
       WHERE look_up_type = 'material_status'
         AND code = 'active'
         AND is_deleted = false
       LIMIT 1`
    );
    if (activeStatusResult.rows.length === 0) {
      throw new NotFoundError('Default material status Active not found');
    }
    const activeStatusId = Number(activeStatusResult.rows[0].look_up_id);

    const generatedProductCode = await this.generateProductCode(data.category_id, data.sub_category_id);

    // Create material
    const material = await this.materialRepository.create({
      product_code: generatedProductCode,
      product_name: data.product_name,
      category_id: data.category_id,
      sub_category_id: data.sub_category_id,
      stock_uom_id: data.stock_uom_id,
      material_type_id: data.material_type_id,
      status_id: activeStatusId,
      notes: data.notes,
    });

    try {
      // Create material specification if provided
      if (data.material_specification) {
        await this.specificationRepository.create({
          material_id: parseInt(material.material_id as string, 10),
          ...data.material_specification,
        });
      }

      if (data.brand_ids !== undefined) {
        const normalizedBrandIds = this.normalizeBrandIds(data.brand_ids);
        await this.assertBrandsExist(normalizedBrandIds);
        await this.syncMaterialBrands(parseInt(material.material_id as string, 10), normalizedBrandIds);
      }
    } catch (error) {
      // Keep existing compensation behavior on create failures.
      await this.materialRepository.softDelete(parseInt(material.material_id as string, 10));
      throw error;
    }

    return this.getMaterial(parseInt(material.material_id as string, 10));
  }

  async updateMaterial(
    id: number,
    data: {
      product_name?: string;
      category_id?: number;
      sub_category_id?: number;
      stock_uom_id?: number;
      material_type_id?: number;
      status_id?: number;
      notes?: string;
      brand_ids?: number[];
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

    if (data.material_type_id) {
      const materialTypeResult = await pool.query(
        'SELECT material_type_id FROM material_type WHERE material_type_id = $1 AND is_deleted = false',
        [data.material_type_id]
      );
      if (materialTypeResult.rows.length === 0) {
        throw new NotFoundError('Material type not found');
      }
    }

    if (data.brand_ids !== undefined) {
      const normalizedBrandIds = this.normalizeBrandIds(data.brand_ids);
      await this.assertBrandsExist(normalizedBrandIds);
    }

    // Prepare data for material update (exclude specification and option fields)
    const materialUpdateData: any = {};
    if (data.product_name !== undefined) materialUpdateData.product_name = data.product_name;
    if (data.category_id !== undefined) materialUpdateData.category_id = data.category_id;
    if (data.sub_category_id !== undefined) materialUpdateData.sub_category_id = data.sub_category_id;
    if (data.stock_uom_id !== undefined) materialUpdateData.stock_uom_id = data.stock_uom_id;
    if (data.material_type_id !== undefined) materialUpdateData.material_type_id = data.material_type_id;
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

    if (data.brand_ids !== undefined) {
      const normalizedBrandIds = this.normalizeBrandIds(data.brand_ids);
      await this.syncMaterialBrands(id, normalizedBrandIds);
      return this.getMaterial(id);
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

  private async generateProductCode(categoryId: number, subCategoryId?: number): Promise<string> {
    const MAX_ATTEMPTS = 5;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1)', [categoryId]);

        const { category_code, sub_category_code } = await this.materialRepository.getCategoryCodes(categoryId, subCategoryId);
        if (!category_code) {
          throw new ValidationError('Unable to generate product code for invalid category context');
        }

        const nextSequence = (await this.materialRepository.getNextProductCodeSequence(category_code, sub_category_code, client)) + 1;
        const candidate = `${category_code}${sub_category_code}${String(nextSequence).padStart(5, '0')}`;

        const exists = await client.query(
          `SELECT 1
           FROM material
           WHERE product_code = $1
           LIMIT 1`,
          [candidate]
        );
        if (exists.rows.length > 0) {
          await client.query('ROLLBACK');
          continue;
        }

        await client.query('COMMIT');
        return candidate;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    throw new ValidationError('Unable to generate unique product code. Please retry.');
  }

  private normalizeBrandIds(brandIds: number[]): number[] {
    return Array.from(
      new Set(
        (brandIds || [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );
  }

  private async assertBrandsExist(brandIds: number[]): Promise<void> {
    if (brandIds.length === 0) {
      return;
    }

    const result = await pool.query<{ brand_id: number }>(
      `SELECT brand_id
       FROM brand
       WHERE brand_id = ANY($1::bigint[])
         AND is_deleted = false`,
      [brandIds]
    );

    const found = new Set(result.rows.map((row) => Number(row.brand_id)));
    const missing = brandIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new NotFoundError(`Brand not found: ${missing.join(', ')}`);
    }
  }

  private async syncMaterialBrands(materialId: number, brandIds: number[]): Promise<void> {
    if (brandIds.length === 0) {
      await pool.query(
        `UPDATE material_brand
         SET is_deleted = true,
             log_date_deleted = NOW(),
             log_module_updated = 'material'
         WHERE material_id = $1
           AND is_deleted = false`,
        [materialId]
      );
      return;
    }

    await pool.query(
      `UPDATE material_brand
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_module_updated = 'material'
       WHERE material_id = $1
         AND is_deleted = false
         AND NOT (brand_id = ANY($2::bigint[]))`,
      [materialId, brandIds]
    );

    await pool.query(
      `INSERT INTO material_brand (
        material_id,
        brand_id,
        is_deleted,
        log_date_created,
        log_module_created,
        log_module_updated
      )
      SELECT
        $1,
        bid.brand_id,
        false,
        NOW(),
        'material',
        'material'
      FROM UNNEST($2::bigint[]) AS bid(brand_id)
      ON CONFLICT (material_id, brand_id)
      DO UPDATE SET
        is_deleted = false,
        log_date_deleted = NULL,
        log_date_updated = NOW(),
        log_module_updated = 'material'`,
      [materialId, brandIds]
    );
  }
}
