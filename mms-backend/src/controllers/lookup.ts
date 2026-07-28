import { Request, Response, NextFunction } from 'express';
import { LookupService } from '../services/lookup.js';
import { ValidationError } from '../utils/errors.js';

export class LookupController {
  private lookupService = new LookupService();

  async getLookupsByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      if (!type) throw new ValidationError('Lookup type is required');

      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const lookups = await this.lookupService.getLookupsByType(type, limit, offset);
      res.json(lookups);
    } catch (error) {
      next(error);
    }
  }

  async getLookupById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Lookup ID is required');

      const lookup = await this.lookupService.getLookupById(parseInt(id));
      res.json(lookup);
    } catch (error) {
      next(error);
    }
  }
}
