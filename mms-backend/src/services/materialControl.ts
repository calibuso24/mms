import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PartyRepository } from '../repositories/party.js';
import { MaterialControlRepository } from '../repositories/materialControl.js';
import {
  CreateMaterialControlDto,
  MaterialControlListQuery,
  UpdateMaterialControlDto,
} from '../modules/material_control/dtos.js';
import {
  MaterialControlListItemViewModel,
  MaterialControlListViewModel,
} from '../modules/material_control/viewModels.js';
import { MaterialControlValidator } from '../modules/material_control/validators.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'material_control';
const PROJECT_LOOKUP_TYPE = 'party_type';
const PROJECT_LOOKUP_CODE = 'project';
const STATUS_LOOKUP_TYPE = 'material_control_status';
const TERMINAL_STATUS_CODES = new Set(['approved', 'rejected', 'cancelled', 'closed']);

export class MaterialControlService {
  private repository = new MaterialControlRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private auditLogRepository = new AuditLogRepository();

  async listMaterialControls(query: MaterialControlListQuery): Promise<MaterialControlListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapRow(row)),
      total: result.total,
    };
  }

  async getMaterialControl(id: number): Promise<MaterialControlListItemViewModel> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundError('Material Control not found');
    }
    return this.mapRow(row);
  }

  async createMaterialControl(dto: CreateMaterialControlDto, createdByAccountId?: number): Promise<MaterialControlListItemViewModel> {
    MaterialControlValidator.validateCreate(dto);

    const project = await this.partyRepository.findById(dto.project_id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    const status = await this.requireLookup(dto.status_id, STATUS_LOOKUP_TYPE, 'status_id');

    const existing = await this.repository.findByControlCode(dto.control_code.trim());
    if (existing) {
      throw new ConflictError('Control code already exists');
    }

    const reviewFields = this.getReviewFields(status, createdByAccountId ?? null);
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const created = await this.repository.create(
        {
          project_id: dto.project_id,
          control_code: dto.control_code.trim(),
          budget: dto.budget,
          total_estimated_cost: dto.total_estimated_cost ?? null,
          status_id: dto.status_id,
          notes: dto.notes ?? null,
          reviewed_by_account_id: reviewFields.reviewed_by_account_id,
          log_date_reviewed: reviewFields.log_date_reviewed,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control',
          entityId: created.material_control_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            project_id: dto.project_id,
            control_code: dto.control_code.trim(),
            budget: dto.budget,
            total_estimated_cost: dto.total_estimated_cost ?? null,
            status_id: dto.status_id,
          },
          transactionId,
          notes: 'Material Control created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMaterialControl(id: number, dto: UpdateMaterialControlDto, updatedByAccountId?: number): Promise<MaterialControlListItemViewModel> {
    MaterialControlValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Control not found');
    }

    if (dto.project_id !== undefined) {
      const project = await this.partyRepository.findById(dto.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }
      await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    }

    let status = null as Awaited<ReturnType<typeof this.requireLookup>> | null;
    if (dto.status_id !== undefined) {
      status = await this.requireLookup(dto.status_id, STATUS_LOOKUP_TYPE, 'status_id');
    }

    if (dto.control_code !== undefined) {
      const duplicate = await this.repository.findByControlCode(dto.control_code.trim(), id);
      if (duplicate) {
        throw new ConflictError('Control code already exists');
      }
    }

    const reviewFields: {
      reviewed_by_account_id?: number | null;
      log_date_reviewed?: Date | null;
    } = status ? this.getReviewFields(status, updatedByAccountId ?? null) : {};
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const updated = await this.repository.update(
        id,
        {
          project_id: dto.project_id,
          control_code: dto.control_code?.trim(),
          budget: dto.budget,
          total_estimated_cost: dto.total_estimated_cost === undefined ? undefined : dto.total_estimated_cost,
          status_id: dto.status_id,
          notes: dto.notes,
          reviewed_by_account_id: reviewFields.reviewed_by_account_id,
          log_date_reviewed: reviewFields.log_date_reviewed,
        },
        updatedByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Material Control updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMaterialControl(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Control not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_control',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            material_control_id: id,
            control_code: existing.control_code,
          },
          transactionId,
          notes: 'Material Control deleted',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRow(row: any): MaterialControlListItemViewModel {
    return {
      material_control_id: row.material_control_id,
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      control_code: row.control_code,
      budget: row.budget,
      total_estimated_cost: row.total_estimated_cost ?? null,
      status_id: row.status_id,
      status_name: row.status_name,
      notes: row.notes ?? null,
      reviewed_by_account_id: row.reviewed_by_account_id ?? null,
      reviewed_by_account_name: row.reviewed_by_account_name ?? null,
      log_date_reviewed: row.log_date_reviewed ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  }

  private async requireLookup(id: number, type: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== type) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    return lookup;
  }

  private async assertLookup(id: number, type: string, code: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== type || lookup.code !== code) {
      throw new ValidationError(`${fieldName} must reference a ${code}`);
    }
  }

  private getReviewFields(status: { code: string }, actorAccountId: number | null) {
    if (!TERMINAL_STATUS_CODES.has(status.code)) {
      return {
        reviewed_by_account_id: undefined,
        log_date_reviewed: undefined,
      };
    }

    return {
      reviewed_by_account_id: actorAccountId,
      log_date_reviewed: new Date(),
    };
  }
}