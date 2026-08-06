import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface MaterialOption {
  material_option_id: number;
  material_id: number;
  option_code: string;
  option_name: string;
  option_type_id: number;
  requires_approval: boolean;
  is_active: boolean;
  is_deleted: boolean;
  notes?: string;
  option_type_name?: string;
}

export interface MaterialOptionWithType extends MaterialOption {
  option_type_name?: string;
}

export interface MaterialOptionDetail {
  material_option_detail_id: number;
  material_option_id: number;
  component_material_id: number;
  required_quantity: string;
  uom_id: number;
  notes?: string;
}

export interface MaterialOptionComponentView extends MaterialOptionDetail {
  component_material_code: string;
  component_material_name: string;
  component_full_description: string | null;
  component_stock_uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
}

export interface MaterialOptionWithComponents extends MaterialOptionWithType {
  components: MaterialOptionComponentView[];
}

type QueryExecutor = PoolClient | typeof pool;

export class MaterialOptionRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findByMaterialId(materialId: number, client?: PoolClient): Promise<MaterialOptionWithType[]> {
    const result = await this.getExecutor(client).query(
      `SELECT mo.*, l.name as option_type_name
       FROM material_option mo
       LEFT JOIN look_up l ON mo.option_type_id = l.look_up_id
       WHERE mo.material_id = $1 AND mo.is_deleted = false
       ORDER BY mo.option_name ASC`,
      [materialId]
    );
    return result.rows;
  }

  async findById(id: number, client?: PoolClient): Promise<MaterialOptionWithType | null> {
    const result = await this.getExecutor(client).query(
      `SELECT mo.*, l.name as option_type_name
       FROM material_option mo
       LEFT JOIN look_up l ON mo.option_type_id = l.look_up_id
       WHERE mo.material_option_id = $1 AND mo.is_deleted = false`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code: string, client?: PoolClient): Promise<MaterialOptionWithType | null> {
    const result = await this.getExecutor(client).query(
      `SELECT mo.*, l.name as option_type_name
       FROM material_option mo
       LEFT JOIN look_up l ON mo.option_type_id = l.look_up_id
       WHERE mo.option_code = $1 AND mo.is_deleted = false`,
      [code]
    );
    return result.rows[0] || null;
  }

  async findByCodeForMaterial(
    materialId: number,
    code: string,
    excludeOptionId?: number,
    client?: PoolClient
  ): Promise<MaterialOptionWithType | null> {
    const params: Array<number | string> = [materialId, code];
    let query = `SELECT mo.*, l.name as option_type_name
       FROM material_option mo
       LEFT JOIN look_up l ON mo.option_type_id = l.look_up_id
       WHERE mo.material_id = $1
         AND mo.option_code = $2
         AND mo.is_deleted = false`;

    if (excludeOptionId !== undefined) {
      params.push(excludeOptionId);
      query += ` AND mo.material_option_id <> $3`;
    }

    const result = await this.getExecutor(client).query(query, params);
    return result.rows[0] || null;
  }

  async create(data: {
    material_id: number;
    option_code: string;
    option_name: string;
    option_type_id: number;
    requires_approval?: boolean;
    is_active?: boolean;
    notes?: string;
  }, client?: PoolClient): Promise<MaterialOptionWithType> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO material_option (
        material_id, option_code, option_name, option_type_id,
        requires_approval, is_active, notes, log_date_created, log_module_created, log_module_updated
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'material_option', 'material_option')
       RETURNING *`,
      [
        data.material_id,
        data.option_code,
        data.option_name,
        data.option_type_id,
        data.requires_approval ?? true,
        data.is_active ?? true,
        data.notes || null,
      ]
    );

    return this.findById(result.rows[0].material_option_id, client) as Promise<MaterialOptionWithType>;
  }

  async update(
    id: number,
    data: {
      option_name?: string;
      option_code?: string;
      option_type_id?: number;
      requires_approval?: boolean;
      is_active?: boolean;
      notes?: string;
    },
    client?: PoolClient
  ): Promise<MaterialOptionWithType> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.option_name !== undefined) {
      updates.push(`option_name = $${paramIndex}`);
      params.push(data.option_name);
      paramIndex++;
    }
    if (data.option_code !== undefined) {
      updates.push(`option_code = $${paramIndex}`);
      params.push(data.option_code);
      paramIndex++;
    }
    if (data.option_type_id !== undefined) {
      updates.push(`option_type_id = $${paramIndex}`);
      params.push(data.option_type_id);
      paramIndex++;
    }
    if (data.requires_approval !== undefined) {
      updates.push(`requires_approval = $${paramIndex}`);
      params.push(data.requires_approval);
      paramIndex++;
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(data.notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id, client) as Promise<MaterialOptionWithType>;
    }

    updates.push(`log_date_updated = NOW()`);
    updates.push(`log_module_updated = 'material_option'`);

    const result = await this.getExecutor(client).query(
      `UPDATE material_option SET ${updates.join(', ')} WHERE material_option_id = $1 RETURNING *`,
      params
    );

    return this.findById(result.rows[0].material_option_id, client) as Promise<MaterialOptionWithType>;
  }

  async softDelete(id: number, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_option
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_module_updated = 'material_option'
       WHERE material_option_id = $1`,
      [id]
    );
  }

  async findDetailsByOptionId(optionId: number, client?: PoolClient): Promise<MaterialOptionDetail[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        material_option_detail_id,
        material_option_id,
        component_material_id,
        required_quantity::TEXT AS required_quantity,
        uom_id,
        notes
      FROM material_option_detail
      WHERE material_option_id = $1
        AND is_deleted = false
      ORDER BY material_option_detail_id ASC`,
      [optionId]
    );

    return result.rows;
  }

  async findOptionWithComponentsById(optionId: number, client?: PoolClient): Promise<MaterialOptionWithComponents | null> {
    const option = await this.findById(optionId, client);
    if (!option) {
      return null;
    }

    const components = await this.findComponentViewsByOptionId(optionId, client);
    return {
      ...option,
      components,
    };
  }

  async findOptionsWithComponentsByMaterialId(materialId: number, client?: PoolClient): Promise<MaterialOptionWithComponents[]> {
    const options = await this.findByMaterialId(materialId, client);
    if (options.length === 0) {
      return [];
    }

    const optionIds = options.map((option) => option.material_option_id);
    const componentRows = await this.findComponentViewsByOptionIds(optionIds, client);
    const grouped = new Map<number, MaterialOptionComponentView[]>();

    for (const row of componentRows) {
      const list = grouped.get(row.material_option_id) || [];
      list.push(row);
      grouped.set(row.material_option_id, list);
    }

    return options.map((option) => ({
      ...option,
      components: grouped.get(option.material_option_id) || [],
    }));
  }

  async createDetail(
    optionId: number,
    data: {
      component_material_id: number;
      required_quantity: number;
      uom_id: number;
      notes?: string;
    },
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `INSERT INTO material_option_detail (
        material_option_id,
        component_material_id,
        required_quantity,
        uom_id,
        notes,
        is_deleted,
        log_date_created,
        log_module_created,
        log_module_updated
      ) VALUES (
        $1, $2, $3, $4, $5, false, NOW(), 'material_option', 'material_option'
      )
      ON CONFLICT (material_option_id, component_material_id)
      DO UPDATE SET
        required_quantity = EXCLUDED.required_quantity,
        uom_id = EXCLUDED.uom_id,
        notes = EXCLUDED.notes,
        is_deleted = false,
        log_date_deleted = NULL,
        log_date_updated = NOW(),
        log_module_updated = 'material_option'`,
      [
        optionId,
        data.component_material_id,
        data.required_quantity,
        data.uom_id,
        data.notes || null,
      ]
    );
  }

  async updateDetail(
    detailId: number,
    optionId: number,
    data: {
      component_material_id: number;
      required_quantity: number;
      uom_id: number;
      notes?: string;
    },
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_option_detail
       SET component_material_id = $3,
           required_quantity = $4,
           uom_id = $5,
           notes = $6,
           log_date_updated = NOW(),
           log_module_updated = 'material_option'
       WHERE material_option_detail_id = $1
         AND material_option_id = $2`,
      [
        detailId,
        optionId,
        data.component_material_id,
        data.required_quantity,
        data.uom_id,
        data.notes || null,
      ]
    );
  }

  async softDeleteDetailIds(detailIds: number[], client?: PoolClient): Promise<void> {
    if (detailIds.length === 0) {
      return;
    }

    await this.getExecutor(client).query(
      `UPDATE material_option_detail
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_module_updated = 'material_option'
       WHERE material_option_detail_id = ANY($1::bigint[])
         AND is_deleted = false`,
      [detailIds]
    );
  }

  async softDeleteDetailsByOptionId(optionId: number, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_option_detail
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_module_updated = 'material_option'
       WHERE material_option_id = $1
         AND is_deleted = false`,
      [optionId]
    );
  }

  private async findComponentViewsByOptionId(optionId: number, client?: PoolClient): Promise<MaterialOptionComponentView[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mod.material_option_detail_id,
        mod.material_option_id,
        mod.component_material_id,
        mod.required_quantity::TEXT AS required_quantity,
        mod.uom_id,
        mod.notes,
        cm.product_code AS component_material_code,
        cm.product_name AS component_material_name,
        cm.full_description AS component_full_description,
        cm.stock_uom_id AS component_stock_uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation
      FROM material_option_detail mod
      JOIN material cm ON cm.material_id = mod.component_material_id AND cm.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mod.uom_id AND u.is_deleted = false
      WHERE mod.material_option_id = $1
        AND mod.is_deleted = false
      ORDER BY mod.material_option_detail_id ASC`,
      [optionId]
    );

    return result.rows;
  }

  private async findComponentViewsByOptionIds(optionIds: number[], client?: PoolClient): Promise<MaterialOptionComponentView[]> {
    if (optionIds.length === 0) {
      return [];
    }

    const result = await this.getExecutor(client).query(
      `SELECT
        mod.material_option_detail_id,
        mod.material_option_id,
        mod.component_material_id,
        mod.required_quantity::TEXT AS required_quantity,
        mod.uom_id,
        mod.notes,
        cm.product_code AS component_material_code,
        cm.product_name AS component_material_name,
        cm.full_description AS component_full_description,
        cm.stock_uom_id AS component_stock_uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation
      FROM material_option_detail mod
      JOIN material cm ON cm.material_id = mod.component_material_id AND cm.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mod.uom_id AND u.is_deleted = false
      WHERE mod.material_option_id = ANY($1::bigint[])
        AND mod.is_deleted = false
      ORDER BY mod.material_option_id ASC, mod.material_option_detail_id ASC`,
      [optionIds]
    );

    return result.rows;
  }
}
