import { pool } from '../config/database.js';
import { MaterialRepository } from '../repositories/material.js';
import { MaterialOptionRepository } from '../repositories/materialOption.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import {
  MaterialOptionPayload,
  MaterialOptionValidator,
} from '../modules/product_management/validators/materialOption.js';

export class MaterialOptionService {
  private materialRepository = new MaterialRepository();
  private optionRepository = new MaterialOptionRepository();

  async listByMaterialId(materialId: number) {
    await this.assertMaterialExists(materialId);
    return this.optionRepository.findOptionsWithComponentsByMaterialId(materialId);
  }

  async getById(materialId: number, optionId: number) {
    await this.assertMaterialExists(materialId);
    const option = await this.optionRepository.findOptionWithComponentsById(optionId);
    if (!option || Number(option.material_id) !== materialId) {
      throw new NotFoundError('Material option not found');
    }

    return option;
  }

  async createForMaterial(materialId: number, payload: MaterialOptionPayload) {
    MaterialOptionValidator.validateCreate(payload);
    await this.assertMaterialExists(materialId);
    await this.assertOptionTypeExists(payload.option_type_id);
    await this.assertOptionCodeUnique(payload.option_code);
    await this.validateComponentPayload(materialId, payload.components, undefined);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const created = await this.optionRepository.create(
        {
          material_id: materialId,
          option_code: payload.option_code.trim(),
          option_name: payload.option_name.trim(),
          option_type_id: payload.option_type_id,
          requires_approval: payload.requires_approval ?? true,
          is_active: payload.is_active ?? true,
          notes: payload.notes,
        },
        client
      );

      await this.syncOptionDetails(created.material_option_id, payload.components, client);

      await client.query('COMMIT');
      return this.optionRepository.findOptionWithComponentsById(created.material_option_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateForMaterial(materialId: number, optionId: number, payload: MaterialOptionPayload) {
    MaterialOptionValidator.validateUpdate(payload);
    await this.assertMaterialExists(materialId);

    const existing = await this.optionRepository.findById(optionId);
    if (!existing || Number(existing.material_id) !== materialId) {
      throw new NotFoundError('Material option not found');
    }

    await this.assertOptionTypeExists(payload.option_type_id);
    await this.assertOptionCodeUnique(payload.option_code, optionId);
    await this.validateComponentPayload(materialId, payload.components, optionId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await this.optionRepository.update(
        optionId,
        {
          option_code: payload.option_code.trim(),
          option_name: payload.option_name.trim(),
          option_type_id: payload.option_type_id,
          requires_approval: payload.requires_approval ?? true,
          is_active: payload.is_active ?? true,
          notes: payload.notes,
        },
        client
      );

      await this.syncOptionDetails(optionId, payload.components, client);

      await client.query('COMMIT');
      return this.optionRepository.findOptionWithComponentsById(optionId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteForMaterial(materialId: number, optionId: number): Promise<void> {
    await this.assertMaterialExists(materialId);

    const existing = await this.optionRepository.findById(optionId);
    if (!existing || Number(existing.material_id) !== materialId) {
      throw new NotFoundError('Material option not found');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await this.optionRepository.softDeleteDetailsByOptionId(optionId, client);
      await this.optionRepository.softDelete(optionId, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async syncOptionDetails(
    optionId: number,
    components: Array<{
      material_option_detail_id?: number;
      component_material_id: number;
      required_quantity: number;
      uom_id: number;
      notes?: string;
    }>,
    client: any
  ) {
    const existing = await this.optionRepository.findDetailsByOptionId(optionId, client);
    const existingById = new Map<number, (typeof existing)[number]>();
    existing.forEach((row) => existingById.set(Number(row.material_option_detail_id), row));

    const incomingIds = new Set<number>();
    for (const component of components) {
      if (component.material_option_detail_id !== undefined) {
        const detailId = Number(component.material_option_detail_id);
        const existingDetail = existingById.get(detailId);
        if (!existingDetail) {
          throw new ValidationError(`Component detail ${detailId} does not belong to this material option`);
        }
        incomingIds.add(detailId);
      }
    }

    const toDelete = existing
      .map((row) => Number(row.material_option_detail_id))
      .filter((id) => !incomingIds.has(id));

    await this.optionRepository.softDeleteDetailIds(toDelete, client);

    for (const component of components) {
      const detailPayload = {
        component_material_id: Number(component.component_material_id),
        required_quantity: Number(component.required_quantity),
        uom_id: Number(component.uom_id),
        notes: component.notes,
      };

      if (component.material_option_detail_id !== undefined) {
        await this.optionRepository.updateDetail(
          Number(component.material_option_detail_id),
          optionId,
          detailPayload,
          client
        );
      } else {
        await this.optionRepository.createDetail(optionId, detailPayload, client);
      }
    }
  }

  private async validateComponentPayload(
    parentMaterialId: number,
    components: Array<{
      component_material_id: number;
      required_quantity: number;
      uom_id: number;
    }>,
    currentOptionId?: number
  ) {
    const componentMaterialIds = components.map((component) => Number(component.component_material_id));

    if (componentMaterialIds.some((id) => id === parentMaterialId)) {
      throw new ValidationError('Component material cannot be the same as the parent material');
    }

    const materialResult = await pool.query<{ material_id: number }>(
      `SELECT material_id
       FROM material
       WHERE material_id = ANY($1::bigint[])
         AND is_deleted = false`,
      [componentMaterialIds]
    );
    const materialSet = new Set(materialResult.rows.map((row) => Number(row.material_id)));
    const missingMaterials = componentMaterialIds.filter((id) => !materialSet.has(id));
    if (missingMaterials.length > 0) {
      throw new NotFoundError(`Component material not found: ${missingMaterials.join(', ')}`);
    }

    const uomIds = Array.from(new Set(components.map((component) => Number(component.uom_id))));
    const uomResult = await pool.query<{ uom_id: number }>(
      `SELECT uom_id
       FROM unit_of_measure
       WHERE uom_id = ANY($1::bigint[])
         AND is_deleted = false`,
      [uomIds]
    );
    const uomSet = new Set(uomResult.rows.map((row) => Number(row.uom_id)));
    const missingUom = uomIds.filter((id) => !uomSet.has(id));
    if (missingUom.length > 0) {
      throw new NotFoundError(`Component UOM not found: ${missingUom.join(', ')}`);
    }

    const cycleResult = await pool.query<{ start_component: number }>(
      `WITH RECURSIVE edges AS (
         SELECT
           mo.material_id,
           mod.component_material_id
         FROM material_option mo
         JOIN material_option_detail mod
           ON mod.material_option_id = mo.material_option_id
          AND mod.is_deleted = false
         WHERE mo.is_deleted = false
           AND ($3::bigint IS NULL OR mo.material_option_id <> $3)
       ),
       seeds AS (
         SELECT UNNEST($1::bigint[]) AS start_component
       ),
       walk AS (
         SELECT
           s.start_component,
           s.start_component AS current_component,
           0 AS depth
         FROM seeds s

         UNION ALL

         SELECT
           w.start_component,
           e.component_material_id AS current_component,
           w.depth + 1
         FROM walk w
         JOIN edges e
           ON e.material_id = w.current_component
         WHERE w.depth < 30
       )
       SELECT DISTINCT w.start_component
       FROM walk w
       WHERE w.current_component = $2
         AND w.depth > 0`,
      [componentMaterialIds, parentMaterialId, currentOptionId ?? null]
    );

    if (cycleResult.rows.length > 0) {
      const invalid = cycleResult.rows.map((row) => row.start_component).join(', ');
      throw new ValidationError(`Circular material option reference detected for component material IDs: ${invalid}`);
    }
  }

  private async assertMaterialExists(materialId: number): Promise<void> {
    const material = await this.materialRepository.findById(materialId);
    if (!material) {
      throw new NotFoundError('Material not found');
    }
  }

  private async assertOptionTypeExists(optionTypeId: number): Promise<void> {
    const result = await pool.query(
      `SELECT look_up_id
       FROM look_up
       WHERE look_up_id = $1
         AND look_up_type = 'material_option_type'
         AND is_deleted = false`,
      [optionTypeId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Material option type not found');
    }
  }

  private async assertOptionCodeUnique(optionCode: string, excludeOptionId?: number): Promise<void> {
    const existing = await this.optionRepository.findByCode(optionCode.trim());
    if (existing && (excludeOptionId === undefined || Number(existing.material_option_id) !== excludeOptionId)) {
      throw new ValidationError('Option code already exists');
    }
  }
}
