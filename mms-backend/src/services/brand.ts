import { BrandRepository } from '../repositories/brand.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

export class BrandService {
  private brandRepository = new BrandRepository();

  async getBrand(id: number) {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }
    return brand;
  }

  async listBrands(limit?: number, offset?: number, search?: string) {
    return this.brandRepository.findAll(limit, offset, search);
  }

  async createBrand(data: { brand_name: string }) {
    if (!data.brand_name || data.brand_name.length < 2) {
      throw new ValidationError('Brand name must be at least 2 characters');
    }

    const existing = await this.brandRepository.findByName(data.brand_name);
    if (existing) {
      throw new ConflictError('Brand name already exists');
    }

    return this.brandRepository.create(data);
  }

  async updateBrand(
    id: number,
    data: {
      brand_name?: string;
      is_active?: boolean;
    }
  ) {
    const existing = await this.brandRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Brand not found');
    }

    if (data.brand_name) {
      const duplicate = await this.brandRepository.findByName(data.brand_name);
      if (duplicate && duplicate.brand_id !== existing.brand_id) {
        throw new ConflictError('Brand name already exists');
      }
    }

    return this.brandRepository.update(id, data);
  }

  async deleteBrand(id: number) {
    const existing = await this.brandRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Brand not found');
    }

    await this.brandRepository.softDelete(id);
  }
}
