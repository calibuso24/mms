import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface MaterialControlItemRow {
  material_control_item_id: number;
  material_control_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  estimated_quantity: string;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  estimated_unit_cost: string | null;
  estimated_total_cost: string | null;
  remarks: string | null;
  line_no: number;
  created_at: string | null;
  updated_at: string | null;
}

type QueryExecutor = PoolClient | typeof pool;

export class MaterialControlItemRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<MaterialControlItemRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mci.material_control_item_id,
        mci.material_control_id,
        mci.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        mci.estimated_quantity::TEXT AS estimated_quantity,
        mci.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        mci.estimated_unit_cost::TEXT AS estimated_unit_cost,
        mci.estimated_total_cost::TEXT AS estimated_total_cost,
        mci.remarks,
        mci.line_no,
        mci.log_date_created AS created_at,
        mci.log_date_updated AS updated_at
      FROM material_control_item mci
      JOIN material m ON m.material_id = mci.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mci.uom_id AND u.is_deleted = false
      WHERE mci.material_control_item_id = $1
        AND mci.is_deleted = false`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findAllPaginated(params: {
    limit: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    materialControlId?: number;
    materialId?: number;
  }, client?: PoolClient): Promise<{ rows: MaterialControlItemRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['mci.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        m.product_code ILIKE $${queryParams.length}
        OR m.product_name ILIKE $${queryParams.length}
        OR mci.remarks ILIKE $${queryParams.length}
      )`);
    }

    if (params.materialControlId) {
      queryParams.push(params.materialControlId);
      where.push(`mci.material_control_id = $${queryParams.length}`);
    }

    if (params.materialId) {
      queryParams.push(params.materialId);
      where.push(`mci.material_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM material_control_item mci
       JOIN material m ON m.material_id = mci.material_id AND m.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      material_code: 'm.product_code',
      material_name: 'm.product_name',
      estimated_quantity: 'mci.estimated_quantity',
      line_no: 'mci.line_no',
      created_at: 'mci.log_date_created',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'mci.line_no';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `SELECT
        mci.material_control_item_id,
        mci.material_control_id,
        mci.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        mci.estimated_quantity::TEXT AS estimated_quantity,
        mci.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        mci.estimated_unit_cost::TEXT AS estimated_unit_cost,
        mci.estimated_total_cost::TEXT AS estimated_total_cost,
        mci.remarks,
        mci.line_no,
        mci.log_date_created AS created_at,
        mci.log_date_updated AS updated_at
      FROM material_control_item mci
      JOIN material m ON m.material_id = mci.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mci.uom_id AND u.is_deleted = false
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}, mci.material_control_item_id DESC
      LIMIT $${dataParams.length - 1}
      OFFSET $${dataParams.length}`,
      dataParams
    );

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async create(data: {
    material_control_id: number;
    material_id: number;
    estimated_quantity: number;
    uom_id: number;
    estimated_unit_cost?: number | null;
    estimated_total_cost?: number | null;
    remarks?: string | null;
    line_no: number;
  }, createdByAccountId: number | null, moduleName: string, client?: PoolClient): Promise<MaterialControlItemRow> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO material_control_item (
        material_control_id,
        material_id,
        estimated_quantity,
        uom_id,
        estimated_unit_cost,
        estimated_total_cost,
        remarks,
        line_no,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      RETURNING material_control_item_id`,
      [
        data.material_control_id,
        data.material_id,
        data.estimated_quantity,
        data.uom_id,
        data.estimated_unit_cost ?? null,
        data.estimated_total_cost ?? null,
        data.remarks ?? null,
        data.line_no,
        createdByAccountId,
        moduleName,
      ]
    );

    return this.findById(result.rows[0].material_control_item_id, client) as Promise<MaterialControlItemRow>;
  }

  async update(id: number, data: {
    material_control_id?: number;
    material_id?: number;
    estimated_quantity?: number;
    uom_id?: number;
    estimated_unit_cost?: number | null;
    estimated_total_cost?: number | null;
    remarks?: string | null;
    line_no?: number;
  }, updatedByAccountId: number | null, moduleName: string, client?: PoolClient): Promise<MaterialControlItemRow> {
    const sets: string[] = [];
    const params: Array<string | number | Date | null> = [id];
    let idx = 2;

    const pushField = (field: string, value: string | number | Date | null | undefined) => {
      if (value !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(value as string | number | Date | null);
      }
    };

    pushField('material_control_id', data.material_control_id);
    pushField('material_id', data.material_id);
    pushField('estimated_quantity', data.estimated_quantity);
    pushField('uom_id', data.uom_id);
    pushField('estimated_unit_cost', data.estimated_unit_cost);
    pushField('estimated_total_cost', data.estimated_total_cost);
    pushField('remarks', data.remarks);
    pushField('line_no', data.line_no);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(updatedByAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE material_control_item
       SET ${sets.join(', ')}
       WHERE material_control_item_id = $1
         AND is_deleted = false`,
      params
    );

    return this.findById(id, client) as Promise<MaterialControlItemRow>;
  }

  async softDelete(id: number, deletedByAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_control_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_control_item_id = $1
         AND is_deleted = false`,
      [id, deletedByAccountId, moduleName]
    );
  }
}
