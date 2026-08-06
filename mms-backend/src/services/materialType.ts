import { MaterialTypeRepository } from '../repositories/materialType.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

export class MaterialTypeService {
  private materialTypeRepository = new MaterialTypeRepository();

  async getMaterialType(id: number) {
    const materialType = await this.materialTypeRepository.findById(id);
    if (!materialType) {
      throw new NotFoundError('Material type not found');
    }

    return materialType;
  }

  async listMaterialTypes(limit?: number, offset?: number, search?: string) {
    return this.materialTypeRepository.findAll(limit, offset, search);
  }

  async createMaterialType(data: {
    material_type_code?: string | null;
    material_type_name: string;
    description?: string | null;
  }) {
    if (!data.material_type_name || data.material_type_name.trim().length < 2) {
      throw new ValidationError('Material type name must be at least 2 characters');
    }

    if (data.material_type_code && data.material_type_code.trim().length < 2) {
      throw new ValidationError('Material type code must be at least 2 characters');
    }

    if (data.material_type_code) {
      const codeDuplicate = await this.materialTypeRepository.findByCode(data.material_type_code.trim());
      if (codeDuplicate) {
        throw new ConflictError('Material type code already exists');
      }
    }

    const nameDuplicate = await this.materialTypeRepository.findByName(data.material_type_name.trim());
    if (nameDuplicate) {
      throw new ConflictError('Material type name already exists');
    }

    return this.materialTypeRepository.create({
      material_type_code: data.material_type_code?.trim() || null,
      material_type_name: data.material_type_name.trim(),
      description: data.description?.trim() || null,
    });
  }

  async updateMaterialType(
    id: number,
    data: {
      material_type_code?: string | null;
      material_type_name?: string;
      description?: string | null;
      is_active?: boolean;
    }
  ) {
    const existing = await this.materialTypeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material type not found');
    }

    if (data.material_type_code !== undefined && data.material_type_code !== null && data.material_type_code.trim().length > 0) {
      if (data.material_type_code.trim().length < 2) {
        throw new ValidationError('Material type code must be at least 2 characters');
      }
      const codeDuplicate = await this.materialTypeRepository.findByCode(data.material_type_code.trim());
      if (codeDuplicate && codeDuplicate.material_type_id !== existing.material_type_id) {
        throw new ConflictError('Material type code already exists');
      }
    }

    if (data.material_type_name !== undefined) {
      if (!data.material_type_name || data.material_type_name.trim().length < 2) {
        throw new ValidationError('Material type name must be at least 2 characters');
      }
      const nameDuplicate = await this.materialTypeRepository.findByName(data.material_type_name.trim());
      if (nameDuplicate && nameDuplicate.material_type_id !== existing.material_type_id) {
        throw new ConflictError('Material type name already exists');
      }
    }

    return this.materialTypeRepository.update(id, {
      material_type_code: data.material_type_code === undefined ? undefined : (data.material_type_code?.trim() || null),
      material_type_name: data.material_type_name?.trim(),
      description: data.description === undefined ? undefined : (data.description?.trim() || null),
      is_active: data.is_active,
    });
  }
}
