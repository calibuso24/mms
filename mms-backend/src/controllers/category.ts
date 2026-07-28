import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.js';
import { ValidationError } from '../utils/errors.js';

export class CategoryController {
  private categoryService = new CategoryService();

  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Category ID is required');

      const category = await this.categoryService.getCategory(parseInt(id));
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const categories = await this.categoryService.listCategories(limit, offset);
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { category_code, category_name, description } = req.body;

      if (!category_code || !category_name) {
        throw new ValidationError('Category code and name are required');
      }

      const category = await this.categoryService.createCategory({
        category_code,
        category_name,
        description,
      });

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Category ID is required');

      const category = await this.categoryService.updateCategory(parseInt(id), req.body);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Category ID is required');

      await this.categoryService.deleteCategory(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
