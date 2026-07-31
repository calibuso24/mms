import { NextFunction, Request, Response } from 'express';
import { PartyService } from '../services/party.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateSupplierDto,
  UpdateSupplierDto,
} from '../modules/party/dtos.js';
import { ValidationError } from '../utils/errors.js';

export class PartyController {
  private partyService = new PartyService();

  async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';

      const result = await this.partyService.listProjects(limit, offset, search, sortBy, sortDir);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project ID');
      }

      const result = await this.partyService.getProject(projectId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateProjectDto = req.body;
      const result = await this.partyService.createProject(dto, req.accountId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project ID');
      }

      const dto: UpdateProjectDto = req.body;
      const result = await this.partyService.updateProject(projectId, dto, req.accountId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project ID');
      }

      await this.partyService.deleteProject(projectId, req.accountId);
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async listSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';

      const result = await this.partyService.listSuppliers(limit, offset, search, sortBy, sortDir);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = parseInt(req.params.id, 10);
      if (isNaN(supplierId)) {
        throw new ValidationError('Invalid supplier ID');
      }

      const result = await this.partyService.getSupplier(supplierId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateSupplierDto = req.body;
      const result = await this.partyService.createSupplier(dto, req.accountId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = parseInt(req.params.id, 10);
      if (isNaN(supplierId)) {
        throw new ValidationError('Invalid supplier ID');
      }

      const dto: UpdateSupplierDto = req.body;
      const result = await this.partyService.updateSupplier(supplierId, dto, req.accountId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = parseInt(req.params.id, 10);
      if (isNaN(supplierId)) {
        throw new ValidationError('Invalid supplier ID');
      }

      await this.partyService.deleteSupplier(supplierId, req.accountId);
      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
