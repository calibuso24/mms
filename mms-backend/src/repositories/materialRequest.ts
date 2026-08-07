import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface MaterialRequestListRow {
  material_request_id: number;
  mr_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  status_id: number;
  status_code: string;
  status_name: string;
  requested_by_account_id: number | null;
  requested_by_account_name: string | null;
  requested_at: string | null;
  date_prepared: string | null;
  date_received: string | null;
  stock_checked: boolean;
  ceo_approval_required: boolean;
  ceo_approved: boolean | null;
  ceo_approved_by: number | null;
  ceo_approved_by_name: string | null;
  ceo_approved_at: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaterialRequestItemRow {
  material_request_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  requested_quantity: string;
  approved_quantity: string | null;
  estimated_quantity: string | null;
  area_usage: string | null;
  remarks: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  notes: string | null;
  updated_at: string | null;
}

type QueryExecutor = PoolClient | typeof pool;

export class MaterialRequestRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<MaterialRequestListRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mr.material_request_id,
        mr.mr_number,
        mr.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        mr.status_id,
        s.code AS status_code,
        s.name AS status_name,
        mr.requested_by_account_id,
        COALESCE(rqa.full_name, rqa.user_name) AS requested_by_account_name,
        mr.requested_at,
        mr.date_prepared,
        mr.date_received,
        mr.stock_checked,
        mr.ceo_approval_required,
        mr.ceo_approved,
        mr.ceo_approved_by,
        COALESCE(ceo.full_name, ceo.user_name) AS ceo_approved_by_name,
        mr.ceo_approved_at,
        mr.notes,
        (
          SELECT COUNT(*)::INT
          FROM material_request_item mri
          WHERE mri.material_request_id = mr.material_request_id
            AND mri.is_deleted = false
        ) AS item_count,
        mr.log_date_created AS created_at,
        mr.log_date_updated AS updated_at
      FROM material_request mr
      JOIN party p ON p.party_id = mr.project_id AND p.is_deleted = false
      JOIN look_up s ON s.look_up_id = mr.status_id AND s.is_deleted = false
      LEFT JOIN account rqa ON rqa.account_id = mr.requested_by_account_id AND rqa.is_deleted = false
      LEFT JOIN account ceo ON ceo.account_id = mr.ceo_approved_by AND ceo.is_deleted = false
      WHERE mr.material_request_id = $1
        AND mr.is_deleted = false`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findByMrNumber(mrNumber: string, excludeId?: number, client?: PoolClient): Promise<MaterialRequestListRow | null> {
    const params: Array<string | number> = [mrNumber];
    let sql = `SELECT material_request_id, mr_number
      FROM material_request
      WHERE mr_number = $1
        AND is_deleted = false`;

    if (excludeId !== undefined) {
      params.push(excludeId);
      sql += ` AND material_request_id <> $2`;
    }

    const result = await this.getExecutor(client).query(sql, params);
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
  }, client?: PoolClient): Promise<{ rows: MaterialRequestListRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['mr.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        mr.mr_number ILIKE $${queryParams.length}
        OR p.party_code ILIKE $${queryParams.length}
        OR p.party_name ILIKE $${queryParams.length}
        OR mr.notes ILIKE $${queryParams.length}
      )`);
    }

    if (params.projectId) {
      queryParams.push(params.projectId);
      where.push(`mr.project_id = $${queryParams.length}`);
    }

    if (params.statusId) {
      queryParams.push(params.statusId);
      where.push(`mr.status_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM material_request mr
       JOIN party p ON p.party_id = mr.project_id AND p.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      mr_number: 'mr.mr_number',
      project_code: 'p.party_code',
      project_name: 'p.party_name',
      status_name: 's.name',
      requested_at: 'mr.requested_at',
      created_at: 'mr.log_date_created',
      item_count: 'item_count',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'mr.requested_at';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `SELECT
        mr.material_request_id,
        mr.mr_number,
        mr.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        mr.status_id,
        s.code AS status_code,
        s.name AS status_name,
        mr.requested_by_account_id,
        COALESCE(rqa.full_name, rqa.user_name) AS requested_by_account_name,
        mr.requested_at,
        mr.date_prepared,
        mr.date_received,
        mr.stock_checked,
        mr.ceo_approval_required,
        mr.ceo_approved,
        mr.ceo_approved_by,
        COALESCE(ceo.full_name, ceo.user_name) AS ceo_approved_by_name,
        mr.ceo_approved_at,
        mr.notes,
        (
          SELECT COUNT(*)::INT
          FROM material_request_item mri
          WHERE mri.material_request_id = mr.material_request_id
            AND mri.is_deleted = false
        ) AS item_count,
        mr.log_date_created AS created_at,
        mr.log_date_updated AS updated_at
      FROM material_request mr
      JOIN party p ON p.party_id = mr.project_id AND p.is_deleted = false
      JOIN look_up s ON s.look_up_id = mr.status_id AND s.is_deleted = false
      LEFT JOIN account rqa ON rqa.account_id = mr.requested_by_account_id AND rqa.is_deleted = false
      LEFT JOIN account ceo ON ceo.account_id = mr.ceo_approved_by AND ceo.is_deleted = false
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}, mr.material_request_id DESC
      LIMIT $${dataParams.length - 1}
      OFFSET $${dataParams.length}`,
      dataParams
    );

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async findItemsByRequestId(requestId: number, client?: PoolClient): Promise<MaterialRequestItemRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mri.material_request_item_id,
        mri.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        mri.requested_quantity::TEXT AS requested_quantity,
        mri.approved_quantity::TEXT AS approved_quantity,
        mri.estimated_quantity::TEXT AS estimated_quantity,
        mri.area_usage,
        mri.remarks,
        mri.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        mri.notes,
        mri.log_date_updated AS updated_at
      FROM material_request_item mri
      JOIN material m ON m.material_id = mri.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mri.uom_id AND u.is_deleted = false
      WHERE mri.material_request_id = $1
        AND mri.is_deleted = false
      ORDER BY mri.material_request_item_id ASC`,
      [requestId]
    );

    return result.rows;
  }

  async getNextSequenceNumber(year: number, client?: PoolClient): Promise<number> {
    const result = await this.getExecutor(client).query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING(mr_number FROM '^[A-Z]+-[0-9]{4}-([0-9]+)$') AS INTEGER)),
        0
      ) AS max_sequence
      FROM material_request
      WHERE mr_number LIKE $1
        AND is_deleted = false`,
      [`MR-${year}-%`]
    );

    return Number(result.rows[0]?.max_sequence ?? 0);
  }

  async createHeader(data: {
    mr_number: string;
    project_id: number;
    requested_by_account_id: number | null;
    requested_at?: string | null;
    date_prepared?: string | null;
    date_received?: string | null;
    status_id: number;
    stock_checked: boolean;
    ceo_approval_required: boolean;
    ceo_approved?: boolean | null;
    ceo_approved_by?: number | null;
    ceo_approved_at?: string | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ material_request_id: number; mr_number: string }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO material_request (
        mr_number,
        project_id,
        requested_by_account_id,
        requested_at,
        date_prepared,
        date_received,
        status_id,
        stock_checked,
        ceo_approval_required,
        ceo_approved,
        ceo_approved_by,
        ceo_approved_at,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15
      ) RETURNING material_request_id, mr_number`,
      [
        data.mr_number,
        data.project_id,
        data.requested_by_account_id,
        data.requested_at ?? null,
        data.date_prepared ?? null,
        data.date_received ?? null,
        data.status_id,
        data.stock_checked,
        data.ceo_approval_required,
        data.ceo_approved ?? null,
        data.ceo_approved_by ?? null,
        data.ceo_approved_at ?? null,
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
    date_prepared?: string | null;
    date_received?: string | null;
    status_id?: number;
    stock_checked?: boolean;
    ceo_approval_required?: boolean;
    ceo_approved?: boolean | null;
    ceo_approved_by?: number | null;
    ceo_approved_at?: string | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    const sets: string[] = [];
    const params: Array<string | number | boolean | null> = [id];
    let idx = 2;

    const setField = (field: string, value: string | number | boolean | null | undefined) => {
      if (value !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(value as string | number | boolean | null);
      }
    };

    setField('project_id', data.project_id);
    setField('requested_by_account_id', data.requested_by_account_id);
    setField('requested_at', data.requested_at);
    setField('date_prepared', data.date_prepared);
    setField('date_received', data.date_received);
    setField('status_id', data.status_id);
    setField('stock_checked', data.stock_checked);
    setField('ceo_approval_required', data.ceo_approval_required);
    setField('ceo_approved', data.ceo_approved);
    setField('ceo_approved_by', data.ceo_approved_by);
    setField('ceo_approved_at', data.ceo_approved_at);
    setField('notes', data.notes);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(actorAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE material_request
       SET ${sets.join(', ')}
       WHERE material_request_id = $1
         AND is_deleted = false`,
      params
    );
  }

  async replaceItems(requestId: number, items: Array<{
    material_id: number;
    requested_quantity: number;
    approved_quantity?: number | null;
    estimated_quantity?: number | null;
    area_usage?: string | null;
    remarks?: string | null;
    uom_id: number;
    notes?: string | null;
  }>, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_request_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_request_id = $1
         AND is_deleted = false`,
      [requestId, actorAccountId, moduleName]
    );

    for (const item of items) {
      await this.getExecutor(client).query(
        `INSERT INTO material_request_item (
          material_request_id,
          material_id,
          requested_quantity,
          approved_quantity,
          estimated_quantity,
          area_usage,
          remarks,
          uom_id,
          notes,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)`,
        [
          requestId,
          item.material_id,
          item.requested_quantity,
          item.approved_quantity ?? null,
          item.estimated_quantity ?? null,
          item.area_usage ?? null,
          item.remarks ?? null,
          item.uom_id,
          item.notes ?? null,
          actorAccountId,
          moduleName,
        ]
      );
    }
  }

  async findItemById(itemId: number, client?: PoolClient): Promise<MaterialRequestItemRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mri.material_request_item_id,
        mri.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        mri.requested_quantity::TEXT AS requested_quantity,
        mri.approved_quantity::TEXT AS approved_quantity,
        mri.estimated_quantity::TEXT AS estimated_quantity,
        mri.area_usage,
        mri.remarks,
        mri.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        mri.notes,
        mri.log_date_updated AS updated_at
      FROM material_request_item mri
      JOIN material m ON m.material_id = mri.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = mri.uom_id AND u.is_deleted = false
      WHERE mri.material_request_item_id = $1
        AND mri.is_deleted = false`,
      [itemId]
    );

    return result.rows[0] ?? null;
  }

  async createItem(requestId: number, item: {
    material_id: number;
    requested_quantity: number;
    approved_quantity?: number | null;
    estimated_quantity?: number | null;
    area_usage?: string | null;
    remarks?: string | null;
    uom_id: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ material_request_item_id: number }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO material_request_item (
        material_request_id,
        material_id,
        requested_quantity,
        approved_quantity,
        estimated_quantity,
        area_usage,
        remarks,
        uom_id,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11
      ) RETURNING material_request_item_id`,
      [
        requestId,
        item.material_id,
        item.requested_quantity,
        item.approved_quantity ?? null,
        item.estimated_quantity ?? null,
        item.area_usage ?? null,
        item.remarks ?? null,
        item.uom_id,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateItem(itemId: number, item: {
    material_id: number;
    requested_quantity: number;
    approved_quantity?: number | null;
    estimated_quantity?: number | null;
    area_usage?: string | null;
    remarks?: string | null;
    uom_id: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_request_item
       SET material_id = $2,
           requested_quantity = $3,
           approved_quantity = $4,
           estimated_quantity = $5,
           area_usage = $6,
           remarks = $7,
           uom_id = $8,
           notes = $9,
           log_date_updated = NOW(),
           log_updated_by_account_id = $10,
           log_module_updated = $11
       WHERE material_request_item_id = $1
         AND is_deleted = false`,
      [
        itemId,
        item.material_id,
        item.requested_quantity,
        item.approved_quantity ?? null,
        item.estimated_quantity ?? null,
        item.area_usage ?? null,
        item.remarks ?? null,
        item.uom_id,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );
  }

  async softDeleteItem(itemId: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_request_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_request_item_id = $1
         AND is_deleted = false`,
      [itemId, actorAccountId, moduleName]
    );
  }

  async softDelete(id: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_request
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_request_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE material_request_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_request_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );
  }
}