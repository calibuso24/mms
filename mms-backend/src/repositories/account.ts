import { pool } from '../config/database.js';

export interface Account {
  account_id: number;
  account_name: string;
  password_hash: string | null;
  full_name: string;
  contact_id: number | null;
  is_active: boolean;
  is_deleted: boolean;
  log_date_created: string;
  log_date_updated: string | null;
  log_created_by_account_id: number | null;
  log_updated_by_account_id: number | null;
}

export class AccountRepository {
  async findByAccountName(accountName: string): Promise<Account | null> {
    const result = await pool.query(
      'SELECT * FROM account WHERE account_name = $1 AND is_deleted = false',
      [accountName]
    );
    return result.rows[0] || null;
  }

  async findById(accountId: number): Promise<Account | null> {
    const result = await pool.query(
      'SELECT * FROM account WHERE account_id = $1 AND is_deleted = false',
      [accountId]
    );
    return result.rows[0] || null;
  }

  async findByIdWithRoles(accountId: number): Promise<(Account & { roles: string[] }) | null> {
    const result = await pool.query(
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

  async create(
    accountName: string,
    fullName: string,
    passwordHash: string | null,
    contactId: number | null = null,
    createdByAccountId: number | null = null
  ): Promise<Account> {
    const result = await pool.query(
      `INSERT INTO account 
       (account_name, password_hash, full_name, contact_id, is_active, log_date_created, log_created_by_account_id, log_module_created)
       VALUES ($1, $2, $3, $4, true, now(), $5, 'auth')
       RETURNING *`,
      [accountName, passwordHash, fullName, contactId, createdByAccountId]
    );
    return result.rows[0];
  }

  async update(
    accountId: number,
    updates: Partial<Pick<Account, 'full_name' | 'is_active' | 'password_hash'>>,
    updatedByAccountId: number | null = null
  ): Promise<Account> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.full_name !== undefined) {
      fields.push(`full_name = $${paramCount++}`);
      values.push(updates.full_name);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }
    if (updates.password_hash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(updates.password_hash);
    }

    fields.push(`log_date_updated = now()`);
    fields.push(`log_updated_by_account_id = $${paramCount++}`);
    fields.push(`log_module_updated = 'auth'`);
    values.push(updatedByAccountId);
    values.push(accountId);

    const result = await pool.query(
      `UPDATE account SET ${fields.join(', ')} WHERE account_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }
    return result.rows[0];
  }

  async softDelete(accountId: number, deletedByAccountId: number | null = null): Promise<void> {
    await pool.query(
      `UPDATE account 
       SET is_deleted = true, log_date_deleted = now(), log_deleted_by_account_id = $1, log_module_updated = 'auth'
       WHERE account_id = $2`,
      [deletedByAccountId, accountId]
    );
  }

  async assignRole(accountId: number, roleId: number, createdByAccountId: number | null = null): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO account_role (account_id, role_id, is_active, log_date_created, log_created_by_account_id, log_module_created)
         VALUES ($1, $2, true, now(), $3, 'auth')
         ON CONFLICT (account_id, role_id) DO UPDATE SET is_active = true`,
        [accountId, roleId, createdByAccountId]
      );
    } catch (error: any) {
      if (error.code === '23503') {
        throw new Error('Role not found');
      }
      throw error;
    }
  }

  async removeRole(accountId: number, roleId: number): Promise<void> {
    await pool.query(
      `UPDATE account_role SET is_deleted = true WHERE account_id = $1 AND role_id = $2`,
      [accountId, roleId]
    );
  }
}
