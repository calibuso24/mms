import { Request, Response, NextFunction } from 'express';
import { SubCategoryService } from '../services/subCategory.js';
import { ValidationError } from '../utils/errors.js';

export class SubCategoryController {
  private subCategoryService = new SubCategoryService();

  async getSubCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Sub-category ID is required');

      const subCategory = await this.subCategoryService.getSubCategory(parseInt(id));
      res.json(subCategory);
    } catch (error) {
      next(error);
    }
  }

  async listSubCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = req.query.category_id
        ? parseInt(req.query.category_id as string)
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const subCategories = await this.subCategoryService.listSubCategories(
        categoryId,
        limit,
        offset,
        search
      );
      res.json(subCategories);
    } catch (error) {
      next(error);
    }
  }

  async createSubCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { category_id, sub_category_code, sub_category_name } = req.body;

      if (!category_id || !sub_category_code || !sub_category_name) {
        throw new ValidationError('Category ID, code, and name are required');
      }

      const subCategory = await this.subCategoryService.createSubCategory({
        category_id,
        sub_category_code,
        sub_category_name,
      });

      res.status(201).json(subCategory);
    } catch (error) {
      next(error);
    }
  }

  async updateSubCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Sub-category ID is required');

      const subCategory = await this.subCategoryService.updateSubCategory(
        parseInt(id),
        req.body
      );
      res.json(subCategory);
    } catch (error) {
      next(error);
    }
  }

  async deleteSubCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new ValidationError('Sub-category ID is required');

      await this.subCategoryService.deleteSubCategory(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
