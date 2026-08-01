import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface Account {
  account_id: number;
  user_name: string;
  password: string | null;
  full_name: string;
  contact_id: number | null;
  profile: any;
  is_active: boolean;
  is_deleted: boolean;
  log_date_created: string;
  log_date_updated: string | null;
  log_created_by_account_id: number | null;
  log_updated_by_account_id: number | null;
}

type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<any>;
};

export class AccountRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findByUserName(userName: string, client?: PoolClient): Promise<Account | null> {
    const result = await this.getExecutor(client).query(
      'SELECT * FROM account WHERE user_name = $1 AND is_deleted = false',
      [userName]
    );
    return result.rows[0] || null;
  }

  async findById(accountId: number, client?: PoolClient): Promise<Account | null> {
    const result = await this.getExecutor(client).query(
      'SELECT * FROM account WHERE account_id = $1 AND is_deleted = false',
      [accountId]
    );
    return result.rows[0] || null;
  }

  async findByIdWithRoles(
    accountId: number,
    client?: PoolClient
  ): Promise<(Account & { roles: string[] }) | null> {
    const result = await this.getExecutor(client).query(
      `SELECT 
        a.*,
        COALESCE(json_agg(DISTINCT r.role_code) FILTER (WHERE r.role_code IS NOT NULL), '[]'::json) as roles
      FROM account a
      LEFT JOIN account_role ar ON a.account_id = ar.account_id AND ar.is_deleted = false
      LEFT JOIN role r ON ar.role_id = r.role_id AND r.is_deleted = false
      WHERE a.account_id = $1 AND a.is_deleted = false
      GROUP BY a.account_id`,
      [accountId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      roles: row.roles || [],
    };
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<{ accounts: Account[]; total: number }> {
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM account WHERE is_deleted = false'
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await pool.query(
      `SELECT * FROM account 
       WHERE is_deleted = false 
       ORDER BY log_date_created DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return { accounts: result.rows, total };
  }

  async findAllWithDetails(
    limit: number = 50,
    offset: number = 0,
    search?: string,
    sortBy?: string,
    sortDir?: 'asc' | 'desc'
  ): Promise<{ accounts: any[]; total: number }> {
    const whereParts = ['a.is_deleted = false'];
    const countParams: any[] = [];
    const queryParams: any[] = [];

    if (search && search.trim().length > 0) {
      whereParts.push('(a.user_name ILIKE $1 OR a.full_name ILIKE $1)');
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm);
      queryParams.push(searchTerm);
    }

    const whereClause = whereParts.join(' AND ');

    const allowedSortFields: Record<string, string> = {
      user_name: 'a.user_name',
      full_name: 'a.full_name',
      is_active: 'a.is_active',
      created_at: 'a.log_date_created',
    };
    const sortField = allowedSortFields[sortBy ?? ''] ?? 'a.log_date_created';
    const sortDirection = sortDir === 'desc' ? 'DESC' : 'ASC';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM account a WHERE ${whereClause}`,
      countParams
    );

    const limitParam = queryParams.length + 1;
    const offsetParam = queryParams.length + 2;

    const result = await pool.query(
      `SELECT
        a.account_id,
        a.user_name,
        a.full_name,
        a.is_active,
        a.contact_id,
        a.log_date_created,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'role_id', r.role_id,
              'role_code', r.role_code,
              'role_name', r.role_name
            )
          ) FILTER (WHERE r.role_id IS NOT NULL),
          '[]'::json
        ) AS roles,
        (
          SELECT e.email_address
          FROM email e
          WHERE e.contact_id = a.contact_id AND e.is_deleted = false
          ORDER BY e.is_primary DESC, e.email_id ASC
          LIMIT 1
        ) AS primary_email,
        (
          SELECT p.phone_number
          FROM phone p
          WHERE p.contact_id = a.contact_id AND p.is_deleted = false
          ORDER BY p.is_primary DESC, p.phone_id ASC
          LIMIT 1
        ) AS primary_phone
      FROM account a
      LEFT JOIN account_role ar ON a.account_id = ar.account_id AND ar.is_deleted = false
      LEFT JOIN role r ON ar.role_id = r.role_id AND r.is_deleted = false
      WHERE ${whereClause}
      GROUP BY a.account_id
      ORDER BY ${sortField} ${sortDirection}, a.log_date_created DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...queryParams, limit, offset]
    );

    return {
      accounts: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  async create(
    userName: string,
    fullName: string,
    password: string | null,
    contactId: number | null = null,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Account> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO account 
       (user_name, password, full_name, contact_id, is_active, log_date_created, log_created_by_account_id, log_module_created)
       VALUES ($1, $2, $3, $4, true, now(), $5, 'auth')
       RETURNING *`,
      [userName, password, fullName, contactId, createdByAccountId]
    );
    return result.rows[0];
  }

  async update(
    accountId: number,
    updates: Partial<Pick<Account, 'user_name' | 'full_name' | 'is_active' | 'password' | 'profile'>>,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Account> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.user_name !== undefined) {
      fields.push(`user_name = $${paramCount++}`);
      values.push(updates.user_name);
    }
    if (updates.full_name !== undefined) {
      fields.push(`full_name = $${paramCount++}`);
      values.push(updates.full_name);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }
    if (updates.password !== undefined) {
      fields.push(`password = $${paramCount++}`);
      values.push(updates.password);
    }
    if (updates.profile !== undefined) {
      fields.push(`profile = $${paramCount++}::jsonb`);
      values.push(updates.profile === null ? null : JSON.stringify(updates.profile));
    }

    fields.push(`log_date_updated = now()`);
    fields.push(`log_updated_by_account_id = $${paramCount++}`);
    fields.push(`log_module_updated = 'auth'`);
    values.push(updatedByAccountId);
    values.push(accountId);

    const result = await this.getExecutor(client).query(
      `UPDATE account SET ${fields.join(', ')} WHERE account_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }
    return result.rows[0];
  }

  async softDelete(
    accountId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE account 
       SET is_deleted = true, log_date_deleted = now(), log_deleted_by_account_id = $1, log_module_updated = 'auth'
       WHERE account_id = $2`,
      [deletedByAccountId, accountId]
    );
  }

  async assignRole(
    accountId: number,
    roleId: number,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    try {
      await this.getExecutor(client).query(
        `INSERT INTO account_role (account_id, role_id, is_active, log_date_created, log_created_by_account_id, log_module_created)
         VALUES ($1, $2, true, now(), $3, 'auth')
         ON CONFLICT (account_id, role_id) DO UPDATE SET
           is_active = true,
           is_deleted = false`,
        [accountId, roleId, createdByAccountId]
      );
    } catch (error: any) {
      if (error.code === '23503') {
        throw new Error('Role not found');
      }
      throw error;
    }
  }

  async removeRole(accountId: number, roleId: number, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE account_role
       SET is_deleted = true, is_active = false
       WHERE account_id = $1 AND role_id = $2`,
      [accountId, roleId]
    );
  }

  async replaceRoles(
    accountId: number,
    roleIds: number[],
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    const executor = this.getExecutor(client);
    await executor.query(
      `UPDATE account_role
       SET is_deleted = true, is_active = false
       WHERE account_id = $1 AND is_deleted = false`,
      [accountId]
    );

    for (const roleId of roleIds) {
      await this.assignRole(accountId, roleId, updatedByAccountId, client);
    }
  }

  async softDeleteRoles(
    accountId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE account_role
       SET is_deleted = true, is_active = false, log_created_by_account_id = COALESCE(log_created_by_account_id, $2)
       WHERE account_id = $1 AND is_deleted = false`,
      [accountId, deletedByAccountId]
    );
  }
}
