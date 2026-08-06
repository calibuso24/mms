import { Request, Response, NextFunction } from 'express';
import { MaterialTypeService } from '../services/materialType.js';
import { ValidationError } from '../utils/errors.js';

export class MaterialTypeController {
  private materialTypeService = new MaterialTypeService();

  async listMaterialTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const materialTypes = await this.materialTypeService.listMaterialTypes(limit, offset, search);
      res.json(materialTypes);
    } catch (error) {
      next(error);
    }
  }

  async getMaterialType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Material type ID is required');
      }

      const materialType = await this.materialTypeService.getMaterialType(parseInt(id, 10));
      res.json(materialType);
    } catch (error) {
      next(error);
    }
  }

  async createMaterialType(req: Request, res: Response, next: NextFunction) {
    try {
      const { material_type_code, material_type_name, description } = req.body;

      if (!material_type_name) {
        throw new ValidationError('Material type name is required');
      }

      const materialType = await this.materialTypeService.createMaterialType({
        material_type_code,
        material_type_name,
        description,
      });

      res.status(201).json(materialType);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterialType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ValidationError('Material type ID is required');
      }

      const materialType = await this.materialTypeService.updateMaterialType(parseInt(id, 10), req.body);
      res.json(materialType);
    } catch (error) {
      next(error);
    }
  }
}
