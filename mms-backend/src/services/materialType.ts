import { MaterialTypeRepository } from '../repositories/materialType.js';
import { NotFoundError } from '../utils/errors.js';

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
}
