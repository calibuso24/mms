import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface MaterialControlRow {
  material_control_id: number;
  project_id: number;
  project_code: string;
  project_name: string;
  control_code: string;
  budget: string;
  total_estimated_cost: string | null;
  status_id: number;
  status_name: string;
  notes: string | null;
  reviewed_by_account_id: number | null;
  reviewed_by_account_name: string | null;
  log_date_reviewed: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type QueryExecutor = PoolClient | typeof pool;

export class MaterialControlRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<MaterialControlRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        mc.material_control_id,
        mc.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        mc.control_code,
        mc.budget::TEXT AS budget,
        mc.total_estimated_cost::TEXT AS total_estimated_cost,
        mc.status_id,
        s.name AS status_name,
        mc.notes,
        mc.log_reviewed_by_account_id AS reviewed_by_account_id,
        COALESCE(a.full_name, a.user_name) AS reviewed_by_account_name,
        mc.log_date_reviewed,
        mc.log_date_created AS created_at,
        mc.log_date_updated AS updated_at
      FROM material_control mc
      JOIN party p ON p.party_id = mc.project_id AND p.is_deleted = false
      JOIN look_up s ON s.look_up_id = mc.status_id AND s.is_deleted = false
      LEFT JOIN account a ON a.account_id = mc.log_reviewed_by_account_id AND a.is_deleted = false
      WHERE mc.material_control_id = $1
        AND mc.is_deleted = false`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findByControlCode(controlCode: string, excludeId?: number, client?: PoolClient): Promise<MaterialControlRow | null> {
    const params: Array<string | number> = [controlCode];
    let sql = `SELECT
        mc.material_control_id,
        mc.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        mc.control_code,
        mc.budget::TEXT AS budget,
        mc.total_estimated_cost::TEXT AS total_estimated_cost,
        mc.status_id,
        s.name AS status_name,
        mc.notes,
        mc.log_reviewed_by_account_id AS reviewed_by_account_id,
        COALESCE(a.full_name, a.user_name) AS reviewed_by_account_name,
        mc.log_date_reviewed,
        mc.log_date_created AS created_at,
        mc.log_date_updated AS updated_at
      FROM material_control mc
      JOIN party p ON p.party_id = mc.project_id AND p.is_deleted = false
      JOIN look_up s ON s.look_up_id = mc.status_id AND s.is_deleted = false
      LEFT JOIN account a ON a.account_id = mc.log_reviewed_by_account_id AND a.is_deleted = false
      WHERE mc.control_code = $1
        AND mc.is_deleted = false`;

    if (excludeId !== undefined) {
      params.push(excludeId);
      sql += ` AND mc.material_control_id <> $2`;
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
  }, client?: PoolClient): Promise<{ rows: MaterialControlRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['mc.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        mc.control_code ILIKE $${queryParams.length}
        OR p.party_code ILIKE $${queryParams.length}
        OR p.party_name ILIKE $${queryParams.length}
        OR mc.notes ILIKE $${queryParams.length}
      )`);
    }

    if (params.projectId) {
      queryParams.push(params.projectId);
      where.push(`mc.project_id = $${queryParams.length}`);
    }

    if (params.statusId) {
      queryParams.push(params.statusId);
      where.push(`mc.status_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM material_control mc
       JOIN party p ON p.party_id = mc.project_id AND p.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      control_code: 'mc.control_code',
      project_name: 'p.party_name',
      project_code: 'p.party_code',
      budget: 'mc.budget',
      total_estimated_cost: 'mc.total_estimated_cost',
      status_name: 's.name',
      created_at: 'mc.log_date_created',
      reviewed_at: 'mc.log_date_reviewed',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'mc.log_date_created';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `SELECT
        mc.material_control_id,
        mc.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        mc.control_code,
        mc.budget::TEXT AS budget,
        mc.total_estimated_cost::TEXT AS total_estimated_cost,
        mc.status_id,
        s.name AS status_name,
        mc.notes,
        mc.log_reviewed_by_account_id AS reviewed_by_account_id,
        COALESCE(a.full_name, a.user_name) AS reviewed_by_account_name,
        mc.log_date_reviewed,
        mc.log_date_created AS created_at,
        mc.log_date_updated AS updated_at
      FROM material_control mc
      JOIN party p ON p.party_id = mc.project_id AND p.is_deleted = false
      JOIN look_up s ON s.look_up_id = mc.status_id AND s.is_deleted = false
      LEFT JOIN account a ON a.account_id = mc.log_reviewed_by_account_id AND a.is_deleted = false
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}, mc.material_control_id DESC
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
    project_id: number;
    control_code: string;
    budget: number;
    total_estimated_cost?: number | null;
    status_id: number;
    notes?: string | null;
    reviewed_by_account_id?: number | null;
    log_date_reviewed?: Date | null;
  }, createdByAccountId: number | null, moduleName: string, client?: PoolClient): Promise<MaterialControlRow> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO material_control (
        project_id,
        control_code,
        budget,
        total_estimated_cost,
        status_id,
        log_reviewed_by_account_id,
        log_date_reviewed,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      RETURNING material_control_id`,
      [
        data.project_id,
        data.control_code,
        data.budget,
        data.total_estimated_cost ?? null,
        data.status_id,
        data.reviewed_by_account_id ?? null,
        data.log_date_reviewed ?? null,
        data.notes ?? null,
        createdByAccountId,
        moduleName,
      ]
    );

    return this.findById(result.rows[0].material_control_id, client) as Promise<MaterialControlRow>;
  }

  async update(id: number, data: {
    project_id?: number;
    control_code?: string;
    budget?: number;
    total_estimated_cost?: number | null;
    status_id?: number;
    notes?: string | null;
    reviewed_by_account_id?: number | null;
    log_date_reviewed?: Date | null;
  }, updatedByAccountId: number | null, moduleName: string, client?: PoolClient): Promise<MaterialControlRow> {
    const sets: string[] = [];
    const params: Array<string | number | Date | null> = [id];
    let idx = 2;

    const pushField = (field: string, value: string | number | Date | null | undefined) => {
      if (value !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(value as string | number | Date | null);
      }
    };

    pushField('project_id', data.project_id);
    pushField('control_code', data.control_code);
    pushField('budget', data.budget);
    pushField('total_estimated_cost', data.total_estimated_cost === undefined ? undefined : data.total_estimated_cost);
    pushField('status_id', data.status_id);
    pushField('log_reviewed_by_account_id', data.reviewed_by_account_id === undefined ? undefined : data.reviewed_by_account_id);
    pushField('log_date_reviewed', data.log_date_reviewed === undefined ? undefined : data.log_date_reviewed);
    pushField('notes', data.notes);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(updatedByAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE material_control
       SET ${sets.join(', ')}
       WHERE material_control_id = $1
         AND is_deleted = false`,
      params
    );

    return this.findById(id, client) as Promise<MaterialControlRow>;
  }

  async softDelete(id: number, deletedByAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE material_control
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE material_control_id = $1
         AND is_deleted = false`,
      [id, deletedByAccountId, moduleName]
    );
  }
}