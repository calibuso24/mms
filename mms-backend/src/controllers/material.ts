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
      const search = req.query.search as string | undefined;
      const category_id = req.query.category_id
        ? parseInt(req.query.category_id as string)
        : undefined;
      const brand_id = req.query.brand_id
        ? parseInt(req.query.brand_id as string)
        : undefined;

      const materials = await this.materialService.listMaterials(limit, offset, {
        search,
        category_id,
        brand_id,
      });

      res.json(materials);
    } catch (error) {
      next(error);
    }
  }

  async createMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        product_code,
        product_name,
        source_description,
        category_id,
        sub_category_id,
        stock_uom_id,
        status_id,
        notes,
      } = req.body;

      if (!product_code || !product_name) {
        throw new ValidationError('Product code and name are required');
      }

      const material = await this.materialService.createMaterial({
        product_code,
        product_name,
        source_description,
        category_id,
        sub_category_id,
        stock_uom_id,
        status_id,
        notes,
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
