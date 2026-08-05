import { SubCategoryRepository } from '../repositories/subCategory.js';
import { CategoryRepository } from '../repositories/category.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

export class SubCategoryService {
  private subCategoryRepository = new SubCategoryRepository();
  private categoryRepository = new CategoryRepository();

  async getSubCategory(id: number) {
    const subCategory = await this.subCategoryRepository.findById(id);
    if (!subCategory) {
      throw new NotFoundError('Sub-category not found');
    }
    return subCategory;
  }

  async listSubCategories(categoryId?: number, limit?: number, offset?: number, search?: string) {
    if (categoryId) {
      return this.subCategoryRepository.findByCategory(categoryId, limit, offset, search);
    }
    return this.subCategoryRepository.findAll(limit, offset, search);
  }

  async createSubCategory(data: {
    category_id: number;
    sub_category_code: string;
    sub_category_name: string;
  }) {
    if (!data.category_id || !data.sub_category_code || !data.sub_category_name) {
      throw new ValidationError('Category, code, and name are required');
    }

    if (data.sub_category_code.length < 2) {
      throw new ValidationError('Sub-category code must be at least 2 characters');
    }

    // Verify category exists
    const category = await this.categoryRepository.findById(data.category_id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const existing = await this.subCategoryRepository.findByCode(data.sub_category_code);
    if (existing) {
      throw new ConflictError('Sub-category code already exists');
    }

    return this.subCategoryRepository.create(data);
  }

  async updateSubCategory(
    id: number,
    data: {
      sub_category_name?: string;
      is_active?: boolean;
    }
  ) {
    const existing = await this.subCategoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Sub-category not found');
    }

    return this.subCategoryRepository.update(id, data);
  }

  async deleteSubCategory(id: number) {
    const existing = await this.subCategoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Sub-category not found');
    }

    await this.subCategoryRepository.softDelete(id);
  }
}
