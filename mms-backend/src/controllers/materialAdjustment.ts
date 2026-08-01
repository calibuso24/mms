import { NextFunction, Request, Response } from 'express';
import { MaterialAdjustmentService } from '../services/materialAdjustment.js';
import { ValidationError } from '../utils/errors.js';

export class MaterialAdjustmentController {
  private service = new MaterialAdjustmentService();

  async listMaterialAdjustments(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
      const statusId = req.query.status_id ? parseInt(req.query.status_id as string, 10) : undefined;
      const reasonId = req.query.reason_id ? parseInt(req.query.reason_id as string, 10) : undefined;

      const result = await this.service.listMaterialAdjustments({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
        projectId: Number.isInteger(projectId) ? projectId : undefined,
        statusId: Number.isInteger(statusId) ? statusId : undefined,
        reasonId: Number.isInteger(reasonId) ? reasonId : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMaterialAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material adjustment ID');
      }

      res.json(await this.service.getMaterialAdjustment(id));
    } catch (error) {
      next(error);
    }
  }

  async createMaterialAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createMaterialAdjustment(
        {
          project_id: Number(req.body.project_id),
          requested_at: req.body.requested_at ?? null,
          adjustment_reason_id: req.body.adjustment_reason_id ? Number(req.body.adjustment_reason_id) : null,
          notes: req.body.notes ?? null,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_id: Number(item.material_id),
                material_brand_id: item.material_brand_id ? Number(item.material_brand_id) : null,
                uom_id: Number(item.uom_id),
                system_quantity: Number(item.system_quantity),
                adjustment_quantity: Number(item.adjustment_quantity),
                resulting_quantity: Number(item.resulting_quantity),
                notes: item.notes ?? null,
              }))
            : [],
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterialAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material adjustment ID');
      }

      const result = await this.service.updateMaterialAdjustment(
        id,
        {
          project_id: req.body.project_id !== undefined ? Number(req.body.project_id) : undefined,
          requested_at: req.body.requested_at ?? undefined,
          adjustment_reason_id: req.body.adjustment_reason_id !== undefined ? (req.body.adjustment_reason_id ? Number(req.body.adjustment_reason_id) : null) : undefined,
          notes: req.body.notes !== undefined ? req.body.notes ?? null : undefined,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_id: Number(item.material_id),
                material_brand_id: item.material_brand_id ? Number(item.material_brand_id) : null,
                uom_id: Number(item.uom_id),
                system_quantity: Number(item.system_quantity),
                adjustment_quantity: Number(item.adjustment_quantity),
                resulting_quantity: Number(item.resulting_quantity),
                notes: item.notes ?? null,
              }))
            : undefined,
        },
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterialAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material adjustment ID');
      }

      await this.service.deleteMaterialAdjustment(id, req.accountId);
      res.json({ message: 'Material Adjustment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async approveMaterialAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material adjustment ID');
      }

      res.json(await this.service.approveMaterialAdjustment(id, req.accountId));
    } catch (error) {
      next(error);
    }
  }

  async rejectMaterialAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material adjustment ID');
      }

      res.json(await this.service.rejectMaterialAdjustment(id, req.accountId));
    } catch (error) {
      next(error);
    }
  }

  async completeMaterialAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material adjustment ID');
      }

      res.json(await this.service.completeMaterialAdjustment(id, req.accountId));
    } catch (error) {
      next(error);
    }
  }
}
