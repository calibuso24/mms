import { NextFunction, Request, Response } from 'express';
import { MaterialControlService } from '../services/materialControl.js';
import { ValidationError } from '../utils/errors.js';

interface UploadRequest extends Request {
  file?: Express.Multer.File;
}

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
          expected_updated_at: req.body.expected_updated_at ?? undefined,
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

  async listMaterialControlItems(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const materialControlId = req.query.material_control_id ? parseInt(req.query.material_control_id as string, 10) : undefined;
      const materialId = req.query.material_id ? parseInt(req.query.material_id as string, 10) : undefined;

      const result = await this.service.listMaterialControlItems({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
        materialControlId: Number.isInteger(materialControlId) ? materialControlId : undefined,
        materialId: Number.isInteger(materialId) ? materialId : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMaterialControlItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material control item ID');
      }

      const result = await this.service.getMaterialControlItem(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createMaterialControlItem(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createMaterialControlItem(
        {
          material_control_id: Number(req.body.material_control_id),
          material_id: Number(req.body.material_id),
          estimated_quantity: Number(req.body.estimated_quantity),
          uom_id: Number(req.body.uom_id),
          estimated_unit_cost:
            req.body.estimated_unit_cost === undefined || req.body.estimated_unit_cost === null || req.body.estimated_unit_cost === ''
              ? null
              : Number(req.body.estimated_unit_cost),
          estimated_total_cost:
            req.body.estimated_total_cost === undefined || req.body.estimated_total_cost === null || req.body.estimated_total_cost === ''
              ? null
              : Number(req.body.estimated_total_cost),
          remarks: req.body.remarks ?? null,
          line_no: Number(req.body.line_no),
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterialControlItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material control item ID');
      }

      const result = await this.service.updateMaterialControlItem(
        id,
        {
          material_control_id: req.body.material_control_id !== undefined ? Number(req.body.material_control_id) : undefined,
          material_id: req.body.material_id !== undefined ? Number(req.body.material_id) : undefined,
          estimated_quantity: req.body.estimated_quantity !== undefined ? Number(req.body.estimated_quantity) : undefined,
          uom_id: req.body.uom_id !== undefined ? Number(req.body.uom_id) : undefined,
          estimated_unit_cost:
            req.body.estimated_unit_cost === undefined
              ? undefined
              : req.body.estimated_unit_cost === null || req.body.estimated_unit_cost === ''
                ? null
                : Number(req.body.estimated_unit_cost),
          estimated_total_cost:
            req.body.estimated_total_cost === undefined
              ? undefined
              : req.body.estimated_total_cost === null || req.body.estimated_total_cost === ''
                ? null
                : Number(req.body.estimated_total_cost),
          remarks: req.body.remarks !== undefined ? req.body.remarks ?? null : undefined,
          line_no: req.body.line_no !== undefined ? Number(req.body.line_no) : undefined,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
        },
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterialControlItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid material control item ID');
      }

      await this.service.deleteMaterialControlItem(id, req.accountId, req.body?.expected_updated_at ?? undefined);
      res.json({ message: 'Material Control Item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async previewImport(req: UploadRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file?.buffer) {
        throw new ValidationError('A file is required');
      }

      const result = await this.service.previewImport(file.buffer, file.originalname);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async importMaterialControlItems(req: Request, res: Response, next: NextFunction) {
    try {
      const materialControlId = Number(req.body.material_control_id);
      const previewRows = req.body.rows;
      if (!Number.isInteger(materialControlId) || materialControlId <= 0) {
        throw new ValidationError('material_control_id is required');
      }
      if (!Array.isArray(previewRows)) {
        throw new ValidationError('rows must be provided');
      }

      const result = await this.service.importMaterialControlItems(materialControlId, previewRows, req.accountId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async downloadTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const format = (req.query.format as string)?.toLowerCase() === 'csv' ? 'csv' : 'xlsx';
      const buffer = this.service.buildTemplate(format);
      const fileName = format === 'csv' ? 'material_control_item_import_template.csv' : 'material_control_item_import_template.xlsx';
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}