import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface PartyRow {
  party_id: number;
  contact_id: number;
  party_code: string;
  party_name: string;
  party_type_id: number;
  status_id: number;
  description: string | null;
  project_type_id: number | null;
  payment_terms_id: number | null;
  business_hours: string | null;
  is_deleted: boolean;
  log_date_created: string | null;
  log_date_updated: string | null;
}

export interface PartyListRow extends PartyRow {
  status_name: string;
  project_type_name: string | null;
  payment_terms_name: string | null;
}

type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<any>;
};

export class PartyRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(partyId: number, client?: PoolClient): Promise<PartyListRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        p.*,
        s.name AS status_name,
        pt.name AS project_type_name,
        terms.name AS payment_terms_name
      FROM party p
      JOIN look_up s ON s.look_up_id = p.status_id AND s.is_deleted = false
      LEFT JOIN look_up pt ON pt.look_up_id = p.project_type_id AND pt.is_deleted = false
      LEFT JOIN look_up terms ON terms.look_up_id = p.payment_terms_id AND terms.is_deleted = false
      WHERE p.party_id = $1
        AND p.is_deleted = false`,
      [partyId]
    );

    return result.rows[0] || null;
  }

  async findByCode(partyCode: string, client?: PoolClient): Promise<PartyRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT *
      FROM party
      WHERE party_code = $1
        AND is_deleted = false`,
      [partyCode]
    );

    return result.rows[0] || null;
  }

  async findAllByType(
    partyTypeId: number,
    limit: number,
    offset: number,
    search?: string,
    client?: PoolClient
  ): Promise<{ rows: PartyListRow[]; total: number }> {
    const executor = this.getExecutor(client);

    const params: any[] = [partyTypeId];
    const where: string[] = [
      'p.is_deleted = false',
      'p.party_type_id = $1',
    ];

    if (search && search.trim().length > 0) {
      params.push(`%${search.trim()}%`);
      where.push(`(p.party_code ILIKE $${params.length} OR p.party_name ILIKE $${params.length})`);
    }

    const countQuery = `
      SELECT COUNT(*)::INT AS total
      FROM party p
      WHERE ${where.join(' AND ')}
    `;

    const countResult = await executor.query(countQuery, params);

    params.push(limit);
    params.push(offset);

    const dataQuery = `
      SELECT
        p.*,
        s.name AS status_name,
        pt.name AS project_type_name,
        terms.name AS payment_terms_name
      FROM party p
      JOIN look_up s ON s.look_up_id = p.status_id AND s.is_deleted = false
      LEFT JOIN look_up pt ON pt.look_up_id = p.project_type_id AND pt.is_deleted = false
      LEFT JOIN look_up terms ON terms.look_up_id = p.payment_terms_id AND terms.is_deleted = false
      WHERE ${where.join(' AND ')}
      ORDER BY p.party_name ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const dataResult = await executor.query(dataQuery, params);

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async create(
    data: {
      contact_id: number;
      party_code: string;
      party_name: string;
      party_type_id: number;
      status_id: number;
      description?: string | null;
      project_type_id?: number | null;
      payment_terms_id?: number | null;
      business_hours?: string | null;
    },
    createdByAccountId: number | null,
    moduleName: string,
    client?: PoolClient
  ): Promise<PartyRow> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO party (
        contact_id,
        party_code,
        party_name,
        party_type_id,
        status_id,
        description,
        project_type_id,
        payment_terms_id,
        business_hours,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11)
      RETURNING *`,
      [
        data.contact_id,
        data.party_code,
        data.party_name,
        data.party_type_id,
        data.status_id,
        data.description ?? null,
        data.project_type_id ?? null,
        data.payment_terms_id ?? null,
        data.business_hours ?? null,
        createdByAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async update(
    partyId: number,
    updates: {
      party_code?: string;
      party_name?: string;
      status_id?: number;
      description?: string | null;
      project_type_id?: number | null;
      payment_terms_id?: number | null;
      business_hours?: string | null;
    },
    updatedByAccountId: number | null,
    moduleName: string,
    client?: PoolClient
  ): Promise<PartyRow> {
    const sets: string[] = [];
    const params: any[] = [partyId];
    let idx = 2;

    if (updates.party_code !== undefined) {
      sets.push(`party_code = $${idx++}`);
      params.push(updates.party_code);
    }

    if (updates.party_name !== undefined) {
      sets.push(`party_name = $${idx++}`);
      params.push(updates.party_name);
    }

    if (updates.status_id !== undefined) {
      sets.push(`status_id = $${idx++}`);
      params.push(updates.status_id);
    }

    if (updates.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(updates.description);
    }

    if (updates.project_type_id !== undefined) {
      sets.push(`project_type_id = $${idx++}`);
      params.push(updates.project_type_id);
    }

    if (updates.payment_terms_id !== undefined) {
      sets.push(`payment_terms_id = $${idx++}`);
      params.push(updates.payment_terms_id);
    }

    if (updates.business_hours !== undefined) {
      sets.push(`business_hours = $${idx++}`);
      params.push(updates.business_hours);
    }

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(updatedByAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    const result = await this.getExecutor(client).query(
      `UPDATE party
      SET ${sets.join(', ')}
      WHERE party_id = $1
        AND is_deleted = false
      RETURNING *`,
      params
    );

    return result.rows[0];
  }

  async softDelete(
    partyId: number,
    deletedByAccountId: number | null,
    moduleName: string,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE party
      SET is_deleted = true,
          log_date_deleted = NOW(),
          log_deleted_by_account_id = $2,
          log_module_updated = $3
      WHERE party_id = $1
        AND is_deleted = false`,
      [partyId, deletedByAccountId, moduleName]
    );
  }
}
