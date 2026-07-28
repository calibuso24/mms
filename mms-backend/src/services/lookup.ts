import { LookupRepository } from '../repositories/lookup.js';
import { NotFoundError } from '../utils/errors.js';

export class LookupService {
  private lookupRepository = new LookupRepository();

  async getLookupsByType(type: string, limit?: number, offset?: number) {
    return this.lookupRepository.findByType(type, limit, offset);
  }

  async getLookupById(id: number) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup) {
      throw new NotFoundError('Lookup entry not found');
    }
    return lookup;
  }
}
