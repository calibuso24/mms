import { Request, Response, NextFunction } from 'express';
import { RoleManagementService } from '../services/roleManagement.js';
import { ValidationError } from '../utils/errors.js';
import { CreateRoleDto, UpdateRoleDto } from '../modules/manage_roles/dtos.js';

export class RoleManagementController {
  private roleManagementService = new RoleManagementService();

  async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';

      const result = await this.roleManagementService.listRoles({ limit, offset, search, sortBy, sortDir });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = parseInt(req.params.id, 10);
      if (isNaN(roleId)) throw new ValidationError('Invalid role ID');

      const role = await this.roleManagementService.getRole(roleId);
      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateRoleDto = {
        role_code: (req.body.role_code ?? '').toString().trim().toUpperCase(),
        role_name: req.body.role_name,
        description: req.body.description ?? null,
        is_active: req.body.is_active !== false,
        permission_ids: Array.isArray(req.body.permission_ids) ? req.body.permission_ids.map(Number) : [],
      };

      const role = await this.roleManagementService.createRole(dto, req.accountId);
      res.status(201).json(role);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = parseInt(req.params.id, 10);
      if (isNaN(roleId)) throw new ValidationError('Invalid role ID');

      const dto: UpdateRoleDto = {};
      if (req.body.role_name !== undefined) dto.role_name = req.body.role_name;
      if (req.body.description !== undefined) dto.description = req.body.description;
      if (req.body.is_active !== undefined) dto.is_active = Boolean(req.body.is_active);
      if (Array.isArray(req.body.permission_ids)) {
        dto.permission_ids = req.body.permission_ids.map(Number);
      }

      const role = await this.roleManagementService.updateRole(roleId, dto, req.accountId);
      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = parseInt(req.params.id, 10);
      if (isNaN(roleId)) throw new ValidationError('Invalid role ID');

      await this.roleManagementService.deleteRole(roleId, req.accountId);
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async listPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await this.roleManagementService.listAllPermissions();
      res.json(groups);
    } catch (error) {
      next(error);
    }
  }
}
