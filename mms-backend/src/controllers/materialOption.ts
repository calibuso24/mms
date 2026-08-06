import { NextFunction, Request, Response } from 'express';
import { MaterialOptionService } from '../services/materialOption.js';
import { ValidationError } from '../utils/errors.js';

export class MaterialOptionController {
  private materialOptionService = new MaterialOptionService();

  async listByMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      const materialId = Number(req.params.materialId);
      if (!Number.isInteger(materialId) || materialId <= 0) {
        throw new ValidationError('Material ID is required');
      }

      const options = await this.materialOptionService.listByMaterialId(materialId);
      res.json(options);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const materialId = Number(req.params.materialId);
      const optionId = Number(req.params.optionId);
      if (!Number.isInteger(materialId) || materialId <= 0) {
        throw new ValidationError('Material ID is required');
      }
      if (!Number.isInteger(optionId) || optionId <= 0) {
        throw new ValidationError('Material option ID is required');
      }

      const option = await this.materialOptionService.getById(materialId, optionId);
      res.json(option);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const materialId = Number(req.params.materialId);
      if (!Number.isInteger(materialId) || materialId <= 0) {
        throw new ValidationError('Material ID is required');
      }

      const option = await this.materialOptionService.createForMaterial(materialId, req.body);
      res.status(201).json(option);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const materialId = Number(req.params.materialId);
      const optionId = Number(req.params.optionId);
      if (!Number.isInteger(materialId) || materialId <= 0) {
        throw new ValidationError('Material ID is required');
      }
      if (!Number.isInteger(optionId) || optionId <= 0) {
        throw new ValidationError('Material option ID is required');
      }

      const option = await this.materialOptionService.updateForMaterial(materialId, optionId, req.body);
      res.json(option);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const materialId = Number(req.params.materialId);
      const optionId = Number(req.params.optionId);
      if (!Number.isInteger(materialId) || materialId <= 0) {
        throw new ValidationError('Material ID is required');
      }
      if (!Number.isInteger(optionId) || optionId <= 0) {
        throw new ValidationError('Material option ID is required');
      }

      await this.materialOptionService.deleteForMaterial(materialId, optionId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
