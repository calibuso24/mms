import { UnitOfMeasureRepository } from '../repositories/unitOfMeasure.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

export class UnitOfMeasureService {
  private uomRepository = new UnitOfMeasureRepository();

  async getUnitOfMeasure(id: number) {
    const uom = await this.uomRepository.findById(id);
    if (!uom) {
      throw new NotFoundError('Unit of measure not found');
    }
    return uom;
  }

  async listUnitsOfMeasure(limit?: number, offset?: number, search?: string) {
    return this.uomRepository.findAll(limit, offset, search);
  }

  async createUnitOfMeasure(data: {
    uom_name: string;
    abbreviation: string;
  }) {
    if (!data.uom_name || data.uom_name.length < 2) {
      throw new ValidationError('UOM name must be at least 2 characters');
    }

    if (!data.abbreviation || data.abbreviation.length < 1) {
      throw new ValidationError('Abbreviation is required');
    }

    const existingName = await this.uomRepository.findByName(data.uom_name);
    if (existingName) {
      throw new ConflictError('UOM name already exists');
    }

    const existingAbbr = await this.uomRepository.findByAbbreviation(data.abbreviation);
    if (existingAbbr) {
      throw new ConflictError('Abbreviation already exists');
    }

    return this.uomRepository.create(data);
  }

  async updateUnitOfMeasure(
    id: number,
    data: {
      uom_name?: string;
      abbreviation?: string;
      is_active?: boolean;
    }
  ) {
    const existing = await this.uomRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Unit of measure not found');
    }

    if (data.uom_name) {
      const duplicate = await this.uomRepository.findByName(data.uom_name);
      if (duplicate && duplicate.uom_id !== existing.uom_id) {
        throw new ConflictError('UOM name already exists');
      }
    }

    if (data.abbreviation) {
      const duplicate = await this.uomRepository.findByAbbreviation(data.abbreviation);
      if (duplicate && duplicate.uom_id !== existing.uom_id) {
        throw new ConflictError('Abbreviation already exists');
      }
    }

    return this.uomRepository.update(id, data);
  }

  async deleteUnitOfMeasure(id: number) {
    const existing = await this.uomRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Unit of measure not found');
    }

    await this.uomRepository.softDelete(id);
  }
}
