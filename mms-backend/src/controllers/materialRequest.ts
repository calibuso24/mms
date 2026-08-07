import { NextFunction, Request, Response } from 'express';
import { MaterialRequestService } from '../services/materialRequest.js';
import { ValidationError } from '../utils/errors.js';

export class MaterialRequestController {
  private service = new MaterialRequestService();

  async listMaterialRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
      const statusId = req.query.status_id ? parseInt(req.query.status_id as string, 10) : undefined;

      const result = await this.service.listMaterialRequests({
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

  async getMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      const result = await this.service.getMaterialRequest(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async addMaterialRequestItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      const result = await this.service.addMaterialRequestItem(
        id,
        {
          material_id: Number(req.body.material_id),
          requested_quantity: Number(req.body.requested_quantity),
          approved_quantity:
            req.body.approved_quantity === undefined || req.body.approved_quantity === null || req.body.approved_quantity === ''
              ? null
              : Number(req.body.approved_quantity),
          estimated_quantity:
            req.body.estimated_quantity === undefined || req.body.estimated_quantity === null || req.body.estimated_quantity === ''
              ? null
              : Number(req.body.estimated_quantity),
          area_usage: req.body.area_usage ?? null,
          remarks: req.body.remarks ?? null,
          uom_id: Number(req.body.uom_id),
          notes: req.body.notes ?? null,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterialRequestItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid material request item ID');
      }

      const result = await this.service.updateMaterialRequestItem(
        id,
        itemId,
        {
          material_id: Number(req.body.material_id),
          requested_quantity: Number(req.body.requested_quantity),
          approved_quantity:
            req.body.approved_quantity === undefined || req.body.approved_quantity === null || req.body.approved_quantity === ''
              ? null
              : Number(req.body.approved_quantity),
          estimated_quantity:
            req.body.estimated_quantity === undefined || req.body.estimated_quantity === null || req.body.estimated_quantity === ''
              ? null
              : Number(req.body.estimated_quantity),
          area_usage: req.body.area_usage ?? null,
          remarks: req.body.remarks ?? null,
          uom_id: Number(req.body.uom_id),
          notes: req.body.notes ?? null,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
        },
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterialRequestItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid material request item ID');
      }

      const result = await this.service.deleteMaterialRequestItem(
        id,
        itemId,
        req.body?.expected_updated_at ?? undefined,
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createMaterialRequest(
        {
          project_id: Number(req.body.project_id),
          status_id: req.body.status_id !== undefined ? Number(req.body.status_id) : undefined,
          requested_at: req.body.requested_at ?? null,
          date_prepared: req.body.date_prepared ?? null,
          date_received: req.body.date_received ?? null,
          stock_checked: req.body.stock_checked === true || req.body.stock_checked === 'true',
          ceo_approval_required: req.body.ceo_approval_required === true || req.body.ceo_approval_required === 'true',
          notes: req.body.notes ?? null,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_id: Number(item.material_id),
                requested_quantity: Number(item.requested_quantity),
                approved_quantity:
                  item.approved_quantity === undefined || item.approved_quantity === null || item.approved_quantity === ''
                    ? null
                    : Number(item.approved_quantity),
                estimated_quantity:
                  item.estimated_quantity === undefined || item.estimated_quantity === null || item.estimated_quantity === ''
                    ? null
                    : Number(item.estimated_quantity),
                area_usage: item.area_usage ?? null,
                remarks: item.remarks ?? null,
                uom_id: Number(item.uom_id),
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

  async updateMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      const result = await this.service.updateMaterialRequest(
        id,
        {
          project_id: req.body.project_id !== undefined ? Number(req.body.project_id) : undefined,
          status_id: req.body.status_id !== undefined ? Number(req.body.status_id) : undefined,
          requested_at: req.body.requested_at ?? undefined,
          date_prepared: req.body.date_prepared ?? undefined,
          date_received: req.body.date_received ?? undefined,
          stock_checked: req.body.stock_checked === undefined ? undefined : req.body.stock_checked === true || req.body.stock_checked === 'true',
          ceo_approval_required:
            req.body.ceo_approval_required === undefined ? undefined : req.body.ceo_approval_required === true || req.body.ceo_approval_required === 'true',
          notes: req.body.notes !== undefined ? req.body.notes ?? null : undefined,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_id: Number(item.material_id),
                requested_quantity: Number(item.requested_quantity),
                approved_quantity:
                  item.approved_quantity === undefined || item.approved_quantity === null || item.approved_quantity === ''
                    ? null
                    : Number(item.approved_quantity),
                estimated_quantity:
                  item.estimated_quantity === undefined || item.estimated_quantity === null || item.estimated_quantity === ''
                    ? null
                    : Number(item.estimated_quantity),
                area_usage: item.area_usage ?? null,
                remarks: item.remarks ?? null,
                uom_id: Number(item.uom_id),
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

  async deleteMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      await this.service.deleteMaterialRequest(id, req.accountId);
      res.json({ message: 'Material Request deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async submitMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      res.json(await this.service.submitMaterialRequest(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async approveMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      res.json(await this.service.approveMaterialRequest(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async rejectMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      res.json(await this.service.rejectMaterialRequest(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async cancelMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      res.json(await this.service.cancelMaterialRequest(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async closeMaterialRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material request ID');
      }

      res.json(await this.service.closeMaterialRequest(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }
}