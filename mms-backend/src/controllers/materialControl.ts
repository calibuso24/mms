import { NextFunction, Request, Response } from 'express';
import { MaterialControlService } from '../services/materialControl.js';
import { ValidationError } from '../utils/errors.js';

export class MaterialControlController {
  private service = new MaterialControlService();

  async listMaterialControls(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
      const statusId = req.query.status_id ? parseInt(req.query.status_id as string, 10) : undefined;

      const result = await this.service.listMaterialControls({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
        projectId: Number.isInteger(projectId) ? projectId : undefined,
        statusId: Number.isInteger(statusId) ? statusId : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMaterialControl(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material control ID');
      }

      const result = await this.service.getMaterialControl(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createMaterialControl(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createMaterialControl(
        {
          project_id: Number(req.body.project_id),
          control_code: (req.body.control_code ?? '').toString(),
          budget: Number(req.body.budget),
          total_estimated_cost:
            req.body.total_estimated_cost === undefined || req.body.total_estimated_cost === null || req.body.total_estimated_cost === ''
              ? null
              : Number(req.body.total_estimated_cost),
          status_id: Number(req.body.status_id),
          notes: req.body.notes ?? null,
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterialControl(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material control ID');
      }

      const result = await this.service.updateMaterialControl(
        id,
        {
          project_id: req.body.project_id !== undefined ? Number(req.body.project_id) : undefined,
          control_code: req.body.control_code !== undefined ? (req.body.control_code ?? '').toString() : undefined,
          budget: req.body.budget !== undefined ? Number(req.body.budget) : undefined,
          total_estimated_cost:
            req.body.total_estimated_cost === undefined
              ? undefined
              : req.body.total_estimated_cost === null || req.body.total_estimated_cost === ''
                ? null
                : Number(req.body.total_estimated_cost),
          status_id: req.body.status_id !== undefined ? Number(req.body.status_id) : undefined,
          notes: req.body.notes !== undefined ? req.body.notes ?? null : undefined,
        },
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterialControl(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material control ID');
      }

      await this.service.deleteMaterialControl(id, req.accountId);
      res.json({ message: 'Material Control deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}