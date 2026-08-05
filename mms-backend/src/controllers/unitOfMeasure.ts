import { Request, Response, NextFunction } from 'express';
import { UnitOfMeasureService } from '../services/unitOfMeasure.js';
import { ValidationError } from '../utils/errors.js';

export class UnitOfMeasureController {
  private uomService = new UnitOfMeasureService();

  async getUnitOfMeasure(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('UOM ID is required');

      const uom = await this.uomService.getUnitOfMeasure(parseInt(id));
      res.json(uom);
    } catch (error) {
      next(error);
    }
  }

  async listUnitsOfMeasure(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const uoms = await this.uomService.listUnitsOfMeasure(limit, offset, search);
      res.json(uoms);
    } catch (error) {
      next(error);
    }
  }

  async createUnitOfMeasure(req: Request, res: Response, next: NextFunction) {
    try {
      const { uom_name, abbreviation } = req.body;

      if (!uom_name || !abbreviation) {
        throw new ValidationError('UOM name and abbreviation are required');
      }

      const uom = await this.uomService.createUnitOfMeasure({
        uom_name,
        abbreviation,
      });

      res.status(201).json(uom);
    } catch (error) {
      next(error);
    }
  }

  async updateUnitOfMeasure(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('UOM ID is required');

      const uom = await this.uomService.updateUnitOfMeasure(parseInt(id), req.body);
      res.json(uom);
    } catch (error) {
      next(error);
    }
  }

  async deleteUnitOfMeasure(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('UOM ID is required');

      await this.uomService.deleteUnitOfMeasure(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
