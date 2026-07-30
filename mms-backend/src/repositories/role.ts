import { pool } from '../config/database.js';

export interface Role {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
}

export class RoleRepository {
  async findById(roleId: number): Promise<Role | null> {
    const result = await pool.query(
      'SELECT * FROM role WHERE role_id = $1 AND is_deleted = false',
      [roleId]
    );
    return result.rows[0] || null;
  }

  async findByCode(roleCode: string): Promise<Role | null> {
    const result = await pool.query(
      'SELECT * FROM role WHERE role_code = $1 AND is_deleted = false',
      [roleCode]
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<Role[]> {
    const result = await pool.query(
      'SELECT * FROM role WHERE is_deleted = false ORDER BY role_name'
    );
    return result.rows;
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

  async getPermissionsForRole(roleId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT p.* FROM permission p
       JOIN role_permission rp ON p.permission_id = rp.permission_id
       WHERE rp.role_id = $1 AND rp.is_deleted = false AND p.is_deleted = false`,
      [roleId]
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
