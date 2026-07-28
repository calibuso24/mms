import { Request, Response, NextFunction } from 'express';
import { BrandService } from '../services/brand.js';
import { ValidationError } from '../utils/errors.js';

export class BrandController {
  private brandService = new BrandService();

  async getBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Brand ID is required');

      const brand = await this.brandService.getBrand(parseInt(id));
      res.json(brand);
    } catch (error) {
      next(error);
    }
  }

  async listBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const brands = await this.brandService.listBrands(limit, offset);
      res.json(brands);
    } catch (error) {
      next(error);
    }
  }

  async createBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const { brand_name } = req.body;

      if (!brand_name) {
        throw new ValidationError('Brand name is required');
      }

      const brand = await this.brandService.createBrand({ brand_name });
      res.status(201).json(brand);
    } catch (error) {
      next(error);
    }
  }

  async updateBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Brand ID is required');

      const brand = await this.brandService.updateBrand(parseInt(id), req.body);
      res.json(brand);
    } catch (error) {
      next(error);
    }
  }

  async deleteBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Brand ID is required');

      await this.brandService.deleteBrand(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
