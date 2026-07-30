import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { RoleRepository } from '../repositories/role.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { CreateRoleDto, UpdateRoleDto } from '../modules/manage_roles/dtos.js';
import {
  RoleDetailViewModel,
  RoleListViewModel,
  PermissionGroupViewModel,
  RolePermissionViewModel,
} from '../modules/manage_roles/viewModels.js';

/** Role codes that are considered system-level and cannot be deleted. */
const SYSTEM_ROLE_CODES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
]);

export class RoleManagementService {
  private roleRepository = new RoleRepository();
  private auditLogRepository = new AuditLogRepository();

  async listRoles(params: {
    limit: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }): Promise<RoleListViewModel> {
    const { roles, total } = await this.roleRepository.findAllPaginated(params);
    return {
      items: roles.map((r) => ({
        role_id: r.role_id,
        role_code: r.role_code,
        role_name: r.role_name,
        description: r.description,
        is_active: r.is_active,
        account_count: parseInt(r.account_count ?? '0', 10),
        permission_count: parseInt(r.permission_count ?? '0', 10),
        created_at: r.log_date_created,
      })),
      total,
    };
  }

  async getRole(roleId: number): Promise<RoleDetailViewModel> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    const [permissions, accountCount] = await Promise.all([
      this.roleRepository.getPermissionsForRole(roleId),
      this.roleRepository.countAssignedAccounts(roleId),
    ]);
    return this.buildDetailViewModel(role, permissions, accountCount);
  }

  async createRole(dto: CreateRoleDto, createdByAccountId?: number): Promise<RoleDetailViewModel> {
    this.validateCreateDto(dto);

    const existingByCode = await this.roleRepository.findByCode(dto.role_code);
    if (existingByCode) {
      throw new ConflictError('Role code already exists');
    }
    const existingByName = await this.roleRepository.findByName(dto.role_name);
    if (existingByName) {
      throw new ConflictError('Role name already exists');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      const role = await this.roleRepository.createRole(
        {
          role_code: dto.role_code,
          role_name: dto.role_name,
          description: dto.description ?? null,
          is_active: dto.is_active !== false,
        },
        createdByAccountId ?? null,
        client
      );

      if (dto.permission_ids && dto.permission_ids.length > 0) {
        await this.roleRepository.setRolePermissions(
          role.role_id,
          dto.permission_ids,
          createdByAccountId ?? null,
          client
        );
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'role',
          entityId: role.role_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            role_code: dto.role_code,
            role_name: dto.role_name,
            is_active: dto.is_active !== false,
            permission_count: dto.permission_ids?.length ?? 0,
          },
          transactionId,
          notes: 'Role created via Manage Roles',
          moduleName: 'manage_roles',
        },
        client
      );

      await client.query('COMMIT');
      return this.getRole(role.role_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRole(roleId: number, dto: UpdateRoleDto, updatedByAccountId?: number): Promise<RoleDetailViewModel> {
    const existing = await this.roleRepository.findById(roleId);
    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    if (dto.role_name !== undefined) {
      if (!dto.role_name || dto.role_name.trim().length < 2) {
        throw new ValidationError('Role name must be at least 2 characters');
      }
      const duplicate = await this.roleRepository.findByName(dto.role_name, roleId);
      if (duplicate) {
        throw new ConflictError('Role name already exists');
      }
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      await this.roleRepository.updateRole(
        roleId,
        {
          role_name: dto.role_name,
          description: dto.description,
          is_active: dto.is_active,
        },
        updatedByAccountId ?? null,
        client
      );

      if (dto.permission_ids !== undefined) {
        await this.roleRepository.setRolePermissions(
          roleId,
          dto.permission_ids,
          updatedByAccountId ?? null,
          client
        );
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'role',
          entityId: roleId,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Role updated via Manage Roles',
          moduleName: 'manage_roles',
        },
        client
      );

      await client.query('COMMIT');
      return this.getRole(roleId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRole(roleId: number, deletedByAccountId?: number): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (SYSTEM_ROLE_CODES.has(role.role_code)) {
      throw new ValidationError('System roles cannot be deleted');
    }

    const assignedCount = await this.roleRepository.countAssignedAccounts(roleId);
    if (assignedCount > 0) {
      throw new ConflictError(
        `Role is assigned to ${assignedCount} account(s) and cannot be deleted`
      );
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      await this.roleRepository.softDeleteRole(roleId, deletedByAccountId ?? null, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'role',
          entityId: roleId,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: { role_code: role.role_code, role_name: role.role_name },
          transactionId,
          notes: 'Role soft-deleted via Manage Roles',
          moduleName: 'manage_roles',
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAllPermissions(): Promise<PermissionGroupViewModel[]> {
    const permissions = await this.roleRepository.findAllPermissions();
    const grouped = new Map<string, RolePermissionViewModel[]>();
    for (const p of permissions) {
      if (!grouped.has(p.module_name)) {
        grouped.set(p.module_name, []);
      }
      grouped.get(p.module_name)!.push({
        permission_id: p.permission_id,
        module_name: p.module_name,
        permission_code: p.permission_code,
        permission_name: p.permission_name,
        description: p.description,
      });
    }
    return Array.from(grouped.entries()).map(([module_name, perms]) => ({
      module_name,
      permissions: perms,
    }));
  }

  private buildDetailViewModel(
    role: any,
    permissions: any[],
    accountCount: number
  ): RoleDetailViewModel {
    return {
      role_id: role.role_id,
      role_code: role.role_code,
      role_name: role.role_name,
      description: role.description,
      is_active: role.is_active,
      account_count: accountCount,
      permissions: permissions.map((p) => ({
        permission_id: p.permission_id,
        module_name: p.module_name,
        permission_code: p.permission_code,
        permission_name: p.permission_name,
        description: p.description,
      })),
      created_at: role.log_date_created ?? null,
      updated_at: role.log_date_updated ?? null,
    };
  }

  private validateCreateDto(dto: CreateRoleDto): void {
    if (!dto.role_code || dto.role_code.trim().length < 2) {
      throw new ValidationError('Role code must be at least 2 characters');
    }
    if (!/^[A-Z0-9_]+$/.test(dto.role_code.trim())) {
      throw new ValidationError('Role code must contain only uppercase letters, digits, and underscores');
    }
    if (!dto.role_name || dto.role_name.trim().length < 2) {
      throw new ValidationError('Role name must be at least 2 characters');
    }
  }
}
