import { Request, Response, NextFunction } from 'express';
import { MaterialService } from '../services/material.js';
import { ValidationError } from '../utils/errors.js';

export class MaterialController {
  private materialService = new MaterialService();

  async getMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Material ID is required');

      const material = await this.materialService.getMaterial(parseInt(id));
      res.json(material);
    } catch (error) {
      next(error);
    }
  }

  async listMaterials(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const withTotal =
        req.query.with_total === '1' ||
        req.query.with_total === 'true';
      const search = req.query.search as string | undefined;
      const category_id = req.query.category_id
        ? parseInt(req.query.category_id as string)
        : undefined;
      const sub_category_id = req.query.sub_category_id
        ? parseInt(req.query.sub_category_id as string)
        : undefined;
      const status_id = req.query.status_id
        ? parseInt(req.query.status_id as string)
        : undefined;
      const material_type_id = req.query.material_type_id
        ? parseInt(req.query.material_type_id as string)
        : undefined;
      const uom_id = req.query.uom_id
        ? parseInt(req.query.uom_id as string)
        : undefined;
      const brand_id = req.query.brand_id
        ? parseInt(req.query.brand_id as string)
        : undefined;

      const filters = {
        search,
        category_id,
        sub_category_id,
        status_id,
        material_type_id,
        uom_id,
        brand_id,
      };

      if (withTotal) {
        const paged = await this.materialService.listMaterialsPaged(
          limit,
          offset,
          filters
        );
        res.json(paged);
        return;
      }

      const materials = await this.materialService.listMaterials(limit, offset, filters);
      res.json(materials);
    } catch (error) {
      next(error);
    }
  }

  async createMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        product_name,
        category_id,
        sub_category_id,
        stock_uom_id,
        material_type_id,
        status_id,
        brand_id,
        notes,
        material_specification,
      } = req.body;

      if (!product_name) {
        throw new ValidationError('Product name is required');
      }

      const material = await this.materialService.createMaterial({
        product_name,
        category_id,
        sub_category_id,
        stock_uom_id,
        material_type_id,
        status_id,
        brand_id,
        notes,
        material_specification,
      });

      res.status(201).json(material);
    } catch (error) {
      next(error);
    }
  }

  async updateMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Material ID is required');

      const material = await this.materialService.updateMaterial(parseInt(id), req.body);
      res.json(material);
    } catch (error) {
      next(error);
    }
  }

  async deleteMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Material ID is required');

      await this.materialService.deleteMaterial(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
