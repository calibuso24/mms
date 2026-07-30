import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface Role {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
  log_date_created: string | null;
  log_date_updated: string | null;
  log_date_deleted: string | null;
  log_created_by_account_id: number | null;
  log_updated_by_account_id: number | null;
  log_deleted_by_account_id: number | null;
}

type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<any>;
};

export class RoleRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(roleId: number, client?: PoolClient): Promise<Role | null> {
    const result = await this.getExecutor(client).query(
      'SELECT * FROM role WHERE role_id = $1 AND is_deleted = false',
      [roleId]
    );
    return result.rows[0] || null;
  }

  async findByCode(roleCode: string, client?: PoolClient): Promise<Role | null> {
    const result = await this.getExecutor(client).query(
      'SELECT * FROM role WHERE role_code = $1 AND is_deleted = false',
      [roleCode]
    );
    return result.rows[0] || null;
  }

  async findByName(roleName: string, excludeRoleId?: number, client?: PoolClient): Promise<Role | null> {
    const executor = this.getExecutor(client);
    if (excludeRoleId !== undefined) {
      const result = await executor.query(
        'SELECT * FROM role WHERE LOWER(role_name) = LOWER($1) AND is_deleted = false AND role_id != $2',
        [roleName, excludeRoleId]
      );
      return result.rows[0] || null;
    }
    const result = await executor.query(
      'SELECT * FROM role WHERE LOWER(role_name) = LOWER($1) AND is_deleted = false',
      [roleName]
    );
    return result.rows[0] || null;
  }

  async findAll(client?: PoolClient): Promise<Role[]> {
    const result = await this.getExecutor(client).query(
      'SELECT * FROM role WHERE is_deleted = false ORDER BY role_name'
    );
    return result.rows;
  }

  async findAllPaginated(params: {
    limit: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }): Promise<{ roles: any[]; total: number }> {
    const { limit, offset, search } = params;
    const sortDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';
    const allowedSortFields: Record<string, string> = {
      role_name: 'r.role_name',
      role_code: 'r.role_code',
      is_active: 'r.is_active',
      log_date_created: 'r.log_date_created',
    };
    const sortField = allowedSortFields[params.sortBy ?? ''] ?? 'r.role_name';

    const whereParts = ['r.is_deleted = false'];
    const queryParams: any[] = [];
    let paramIdx = 1;

    if (search && search.trim().length > 0) {
      whereParts.push(`(r.role_name ILIKE $${paramIdx} OR r.role_code ILIKE $${paramIdx} OR r.description ILIKE $${paramIdx})`);
      queryParams.push(`%${search.trim()}%`);
      paramIdx++;
    }

    const whereClause = whereParts.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM role r WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataParams = [...queryParams, limit, offset];
    const result = await pool.query(
      `SELECT
        r.role_id,
        r.role_code,
        r.role_name,
        r.description,
        r.is_active,
        r.log_date_created,
        r.log_date_updated,
        COUNT(DISTINCT ar.account_id) FILTER (WHERE ar.is_deleted = false) AS account_count,
        COUNT(DISTINCT rp.permission_id) FILTER (WHERE rp.is_deleted = false) AS permission_count
       FROM role r
       LEFT JOIN account_role ar ON ar.role_id = r.role_id
       LEFT JOIN role_permission rp ON rp.role_id = r.role_id
       WHERE ${whereClause}
       GROUP BY r.role_id
       ORDER BY ${sortField} ${sortDir}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      dataParams
    );

    return { roles: result.rows, total };
  }

  async createRole(
    data: { role_code: string; role_name: string; description?: string | null; is_active?: boolean },
    createdByAccountId?: number | null,
    client?: PoolClient
  ): Promise<Role> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO role (role_code, role_name, description, is_active, log_date_created, log_created_by_account_id, log_module_created)
       VALUES ($1, $2, $3, $4, NOW(), $5, 'manage_roles')
       RETURNING *`,
      [
        data.role_code,
        data.role_name,
        data.description ?? null,
        data.is_active !== false,
        createdByAccountId ?? null,
      ]
    );
    return result.rows[0];
  }

  async updateRole(
    roleId: number,
    data: { role_name?: string; description?: string | null; is_active?: boolean },
    updatedByAccountId?: number | null,
    client?: PoolClient
  ): Promise<Role> {
    const updates: string[] = [];
    const params: any[] = [roleId];
    let paramIdx = 2;

    if (data.role_name !== undefined) {
      updates.push(`role_name = $${paramIdx++}`);
      params.push(data.role_name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      params.push(data.description);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      params.push(data.is_active);
    }
    updates.push(`log_date_updated = NOW()`);
    updates.push(`log_updated_by_account_id = $${paramIdx++}`);
    params.push(updatedByAccountId ?? null);
    updates.push(`log_module_updated = 'manage_roles'`);

    const result = await this.getExecutor(client).query(
      `UPDATE role SET ${updates.join(', ')} WHERE role_id = $1 AND is_deleted = false RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async softDeleteRole(roleId: number, deletedByAccountId?: number | null, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE role
       SET is_deleted = true, log_date_deleted = NOW(), log_deleted_by_account_id = $2, log_module_updated = 'manage_roles'
       WHERE role_id = $1 AND is_deleted = false`,
      [roleId, deletedByAccountId ?? null]
    );
  }

  async countAssignedAccounts(roleId: number, client?: PoolClient): Promise<number> {
    const result = await this.getExecutor(client).query(
      `SELECT COUNT(*) AS total
       FROM account_role ar
       JOIN account a ON ar.account_id = a.account_id
       WHERE ar.role_id = $1 AND ar.is_deleted = false AND a.is_deleted = false`,
      [roleId]
    );
    return parseInt(result.rows[0].total, 10);
  }

  async findAllPermissions(client?: PoolClient): Promise<any[]> {
    const result = await this.getExecutor(client).query(
      `SELECT permission_id, module_name, permission_code, permission_name, description
       FROM permission
       WHERE is_deleted = false AND is_active = true
       ORDER BY module_name ASC, permission_code ASC`
    );
    return result.rows;
  }

  async getPermissionsForRole(roleId: number, client?: PoolClient): Promise<any[]> {
    const result = await this.getExecutor(client).query(
      `SELECT p.permission_id, p.module_name, p.permission_code, p.permission_name, p.description
       FROM permission p
       JOIN role_permission rp ON p.permission_id = rp.permission_id
       WHERE rp.role_id = $1 AND rp.is_deleted = false AND p.is_deleted = false
       ORDER BY p.module_name, p.permission_code`,
      [roleId]
    );
    return result.rows;
  }

  async setRolePermissions(
    roleId: number,
    permissionIds: number[],
    createdByAccountId?: number | null,
    client?: PoolClient
  ): Promise<void> {
    const executor = this.getExecutor(client);
    // Soft-delete existing
    await executor.query(
      `UPDATE role_permission SET is_deleted = true WHERE role_id = $1 AND is_deleted = false`,
      [roleId]
    );
    if (permissionIds.length === 0) return;
    // Re-insert (or re-activate if already soft-deleted)
    const valueRows = permissionIds.map(
      (_, i) => `($1, $${i + 2}, true, NOW(), $${permissionIds.length + 2}, 'manage_roles')`
    );
    const params: any[] = [roleId, ...permissionIds, createdByAccountId ?? null];
    await executor.query(
      `INSERT INTO role_permission (role_id, permission_id, is_active, log_date_created, log_created_by_account_id, log_module_created)
       VALUES ${valueRows.join(', ')}
       ON CONFLICT (role_id, permission_id)
       DO UPDATE SET is_deleted = false, is_active = true`,
      params
    );
  }

  async findByCodes(roleCodes: string[]): Promise<Role[]> {
    if (roleCodes.length === 0) {
      return [];
    }
    const result = await pool.query(
      `SELECT *
       FROM role
       WHERE role_code = ANY($1::text[]) AND is_deleted = false
       ORDER BY role_name`,
      [roleCodes]
    );
    return result.rows;
  }

  async getRolesForAccount(accountId: number): Promise<Role[]> {
    const result = await pool.query(
      `SELECT r.*
       FROM role r
       JOIN account_role ar ON r.role_id = ar.role_id
       WHERE ar.account_id = $1
         AND ar.is_deleted = false
         AND r.is_deleted = false
       ORDER BY r.role_name`,
      [accountId]
    );
    return result.rows;
  }

  async getPermissionCodesForRole(roleId: number): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT CONCAT(p.module_name, ':', p.permission_code) as permission
       FROM permission p
       JOIN role_permission rp ON p.permission_id = rp.permission_id
       WHERE rp.role_id = $1 AND rp.is_deleted = false AND p.is_deleted = false`,
      [roleId]
    );
    return result.rows.map((r: any) => r.permission);
  }

  async getPermissionCodesForAccount(accountId: number): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT CONCAT(p.module_name, ':', p.permission_code) as permission
       FROM permission p
       JOIN role_permission rp ON p.permission_id = rp.permission_id
       JOIN role r ON rp.role_id = r.role_id
       JOIN account_role ar ON r.role_id = ar.role_id
       WHERE ar.account_id = $1 
         AND ar.is_deleted = false 
         AND rp.is_deleted = false 
         AND p.is_deleted = false 
         AND r.is_deleted = false`,
      [accountId]
    );
    return result.rows.map((r: any) => r.permission);
  }

  async getPermissionsForAccount(accountId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT DISTINCT
        p.permission_id,
        p.module_name,
        p.permission_code,
        p.permission_name,
        p.description
      FROM permission p
      JOIN role_permission rp ON p.permission_id = rp.permission_id
      JOIN role r ON rp.role_id = r.role_id
      JOIN account_role ar ON r.role_id = ar.role_id
      WHERE ar.account_id = $1
        AND ar.is_deleted = false
        AND rp.is_deleted = false
        AND p.is_deleted = false
        AND r.is_deleted = false
      ORDER BY p.module_name, p.permission_code`,
      [accountId]
    );

    return result.rows;
  }

  async hasPermission(accountId: number, moduleName: string, permissionCode: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1
       FROM account_role ar
       JOIN role_permission rp ON ar.role_id = rp.role_id
       JOIN permission p ON rp.permission_id = p.permission_id
       WHERE ar.account_id = $1
         AND ar.is_deleted = false
         AND rp.is_deleted = false
         AND p.is_deleted = false
         AND p.module_name = $2
         AND p.permission_code = $3
       LIMIT 1`,
      [accountId, moduleName, permissionCode]
    );

    return result.rows.length > 0;
  }
}
