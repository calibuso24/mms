import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

type QueryExecutor = PoolClient | typeof pool;

export interface MaterialAdjustmentListRow {
  material_adjustment_id: number;
  material_adjustment_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  requested_by_account_id: number | null;
  requested_by_account_name: string | null;
  requested_at: string;
  approved_by_account_id: number | null;
  approved_by_account_name: string | null;
  approved_at: string | null;
  status_id: number;
  status_code: string;
  status_name: string;
  adjustment_reason_id: number | null;
  adjustment_reason_code: string | null;
  adjustment_reason_name: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaterialAdjustmentItemRow {
  material_adjustment_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  system_quantity: string;
  adjustment_quantity: string;
  resulting_quantity: string;
  notes: string | null;
  updated_at: string | null;
}

export class MaterialAdjustmentRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<MaterialAdjustmentListRow | null> {
    const result = await this.getExecutor(client).query(this.baseSelectQuery('ma.material_adjustment_id = $1'), [id]);
    return result.rows[0] ?? null;
  }

  async findAllPaginated(params: {
    limit: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    projectId?: number;
    statusId?: number;
    reasonId?: number;
  }, client?: PoolClient): Promise<{ rows: MaterialAdjustmentListRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['ma.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        ma.material_adjustment_number ILIKE $${queryParams.length}
        OR p.party_code ILIKE $${queryParams.length}
        OR p.party_name ILIKE $${queryParams.length}
        OR ma.notes ILIKE $${queryParams.length}
      )`);
    }

    if (params.projectId) {
      queryParams.push(params.projectId);
      where.push(`ma.project_id = $${queryParams.length}`);
    }

    if (params.statusId) {
      queryParams.push(params.statusId);
      where.push(`ma.status_id = $${queryParams.length}`);
    }

    if (params.reasonId) {
      queryParams.push(params.reasonId);
      where.push(`ma.adjustment_reason_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM material_adjustment ma
       JOIN party p ON p.party_id = ma.project_id AND p.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      material_adjustment_number: 'ma.material_adjustment_number',
      project_name: 'p.party_name',
      status_name: 'st.name',
      requested_at: 'ma.requested_at',
      approved_at: 'ma.approved_at',
      created_at: 'ma.log_date_created',
      item_count: 'item_count',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'ma.requested_at';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `${this.baseSelectQuery(where.join(' AND '))}
       ORDER BY ${orderBy} ${orderDir}, ma.material_adjustment_id DESC
       LIMIT $${dataParams.length - 1}
       OFFSET $${dataParams.length}`,
      dataParams
    );

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async findItemsByAdjustmentId(materialAdjustmentId: number, client?: PoolClient): Promise<MaterialAdjustmentItemRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mai.material_adjustment_item_id,
        mai.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        mai.material_brand_id,
        b.brand_name AS material_brand_name,
        mai.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        mai.system_quantity::TEXT AS system_quantity,
        mai.adjustment_quantity::TEXT AS adjustment_quantity,
        mai.resulting_quantity::TEXT AS resulting_quantity,
        mai.notes,
        mai.log_date_updated AS updated_at
      FROM material_adjustment_item mai
      JOIN material m ON m.material_id = mai.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mai.uom_id AND u.is_deleted = false
      LEFT JOIN material_brand mb ON mb.material_brand_id = mai.material_brand_id AND mb.is_deleted = false
      LEFT JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
      WHERE mai.material_adjustment_id = $1
        AND mai.is_deleted = false
      ORDER BY mai.material_adjustment_item_id ASC`,
      [materialAdjustmentId]
    );

    return result.rows;
  }

  async getNextSequenceNumber(year: number, client?: PoolClient): Promise<number> {
    const result = await this.getExecutor(client).query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING(material_adjustment_number FROM '^[A-Z]+-[0-9]{4}-([0-9]+)$') AS INTEGER)),
        0
      ) AS max_sequence
      FROM material_adjustment
      WHERE material_adjustment_number LIKE $1
        AND is_deleted = false`,
      [`MA-${year}-%`]
    );

    return Number(result.rows[0]?.max_sequence ?? 0);
  }

  async createHeader(data: {
    material_adjustment_number: string;
    project_id: number;
    requested_by_account_id?: number | null;
    requested_at: string;
    status_id: number;
    adjustment_reason_id?: number | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ material_adjustment_id: number; material_adjustment_number: string }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO material_adjustment (
        material_adjustment_number,
        project_id,
        requested_by_account_id,
        requested_at,
        status_id,
        adjustment_reason_id,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
      RETURNING material_adjustment_id, material_adjustment_number`,
      [
        data.material_adjustment_number,
        data.project_id,
        data.requested_by_account_id ?? null,
        data.requested_at,
        data.status_id,
        data.adjustment_reason_id ?? null,
        data.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateHeader(id: number, data: {
    project_id?: number;
    requested_by_account_id?: number | null;
    requested_at?: string | null;
    approved_by_account_id?: number | null;
    approved_at?: string | null;
    status_id?: number;
    adjustment_reason_id?: number | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    const sets: string[] = [];
    const params: Array<string | number | null> = [id];
    let idx = 2;

    const setField = (field: string, value: string | number | null | undefined) => {
      if (value !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(value);
      }
    };

    setField('project_id', data.project_id);
    setField('requested_by_account_id', data.requested_by_account_id);
    setField('requested_at', data.requested_at);
    setField('approved_by_account_id', data.approved_by_account_id);
    setField('approved_at', data.approved_at);
    setField('status_id', data.status_id);
    setField('adjustment_reason_id', data.adjustment_reason_id);
    setField('notes', data.notes);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(actorAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE material_adjustment
       SET ${sets.join(', ')}
       WHERE material_adjustment_id = $1
         AND is_deleted = false`,
      params
    );
  }

  async replaceItems(materialAdjustmentId: number, items: Array<{
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    system_quantity: number;
    adjustment_quantity: number;
    resulting_quantity: number;
    notes?: string | null;
  }>, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_adjustment_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_adjustment_id = $1
         AND is_deleted = false`,
      [materialAdjustmentId, actorAccountId, moduleName]
    );

    for (const item of items) {
      await this.getExecutor(client).query(
        `INSERT INTO material_adjustment_item (
          material_adjustment_id,
          material_id,
          material_brand_id,
          uom_id,
          system_quantity,
          adjustment_quantity,
          resulting_quantity,
          notes,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
        [
          materialAdjustmentId,
          item.material_id,
          item.material_brand_id ?? null,
          item.uom_id,
          item.system_quantity,
          item.adjustment_quantity,
          item.resulting_quantity,
          item.notes ?? null,
          actorAccountId,
          moduleName,
        ]
      );
    }
  }

  async findItemById(itemId: number, client?: PoolClient): Promise<MaterialAdjustmentItemRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mai.material_adjustment_item_id,
        mai.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        mai.material_brand_id,
        b.brand_name AS material_brand_name,
        mai.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        mai.system_quantity::TEXT AS system_quantity,
        mai.adjustment_quantity::TEXT AS adjustment_quantity,
        mai.resulting_quantity::TEXT AS resulting_quantity,
        mai.notes,
        mai.log_date_updated AS updated_at
      FROM material_adjustment_item mai
      JOIN material m ON m.material_id = mai.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mai.uom_id AND u.is_deleted = false
      LEFT JOIN material_brand mb ON mb.material_brand_id = mai.material_brand_id AND mb.is_deleted = false
      LEFT JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
      WHERE mai.material_adjustment_item_id = $1
        AND mai.is_deleted = false`,
      [itemId]
    );

    return result.rows[0] ?? null;
  }

  async createItem(materialAdjustmentId: number, item: {
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    system_quantity: number;
    adjustment_quantity: number;
    resulting_quantity: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ material_adjustment_item_id: number }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO material_adjustment_item (
        material_adjustment_id,
        material_id,
        material_brand_id,
        uom_id,
        system_quantity,
        adjustment_quantity,
        resulting_quantity,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      RETURNING material_adjustment_item_id`,
      [
        materialAdjustmentId,
        item.material_id,
        item.material_brand_id ?? null,
        item.uom_id,
        item.system_quantity,
        item.adjustment_quantity,
        item.resulting_quantity,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateItem(itemId: number, item: {
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    system_quantity: number;
    adjustment_quantity: number;
    resulting_quantity: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_adjustment_item
       SET material_id = $2,
           material_brand_id = $3,
           uom_id = $4,
           system_quantity = $5,
           adjustment_quantity = $6,
           resulting_quantity = $7,
           notes = $8,
           log_date_updated = NOW(),
           log_updated_by_account_id = $9,
           log_module_updated = $10
       WHERE material_adjustment_item_id = $1
         AND is_deleted = false`,
      [
        itemId,
        item.material_id,
        item.material_brand_id ?? null,
        item.uom_id,
        item.system_quantity,
        item.adjustment_quantity,
        item.resulting_quantity,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );
  }

  async softDeleteItem(itemId: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_adjustment_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_adjustment_item_id = $1
         AND is_deleted = false`,
      [itemId, actorAccountId, moduleName]
    );
  }

  async softDelete(id: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_adjustment
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE material_adjustment_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE material_adjustment_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE material_adjustment_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );
  }

  private baseSelectQuery(whereClause: string): string {
    return `SELECT
      ma.material_adjustment_id,
      ma.material_adjustment_number,
      ma.project_id,
      p.party_code AS project_code,
      p.party_name AS project_name,
      ma.requested_by_account_id,
      COALESCE(req.full_name, req.user_name) AS requested_by_account_name,
      ma.requested_at,
      ma.approved_by_account_id,
      COALESCE(app.full_name, app.user_name) AS approved_by_account_name,
      ma.approved_at,
      ma.status_id,
      st.code AS status_code,
      st.name AS status_name,
      ma.adjustment_reason_id,
      rsn.code AS adjustment_reason_code,
      rsn.name AS adjustment_reason_name,
      ma.notes,
      (
        SELECT COUNT(*)::INT
        FROM material_adjustment_item mai
        WHERE mai.material_adjustment_id = ma.material_adjustment_id
          AND mai.is_deleted = false
      ) AS item_count,
      ma.log_date_created AS created_at,
      ma.log_date_updated AS updated_at
    FROM material_adjustment ma
    JOIN party p ON p.party_id = ma.project_id AND p.is_deleted = false
    JOIN look_up st ON st.look_up_id = ma.status_id AND st.is_deleted = false
    LEFT JOIN look_up rsn ON rsn.look_up_id = ma.adjustment_reason_id AND rsn.is_deleted = false
    LEFT JOIN account req ON req.account_id = ma.requested_by_account_id AND req.is_deleted = false
    LEFT JOIN account app ON app.account_id = ma.approved_by_account_id AND app.is_deleted = false
    WHERE ${whereClause}`;
  }
}
