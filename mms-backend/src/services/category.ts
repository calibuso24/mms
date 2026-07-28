import { CategoryRepository } from '../repositories/category.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

export class CategoryService {
  private categoryRepository = new CategoryRepository();

  async getCategory(id: number) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    return category;
  }

  async listCategories(limit?: number, offset?: number) {
    return this.categoryRepository.findAll(limit, offset);
  }

  async createCategory(data: {
    category_code: string;
    category_name: string;
    description?: string;
  }) {
    if (!data.category_code || !data.category_name) {
      throw new ValidationError('Category code and name are required');
    }

    if (data.category_code.length < 2) {
      throw new ValidationError('Category code must be at least 2 characters');
    }

    const existing = await this.categoryRepository.findByCode(data.category_code);
    if (existing) {
      throw new ConflictError('Category code already exists');
    }

    return this.categoryRepository.create(data);
  }

  async updateCategory(
    id: number,
    data: {
      category_name?: string;
      description?: string;
      is_active?: boolean;
    }
  ) {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    return this.categoryRepository.update(id, data);
  }

  async deleteCategory(id: number) {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    await this.categoryRepository.softDelete(id);
  }
}
