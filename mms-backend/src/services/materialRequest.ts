import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PartyRepository } from '../repositories/party.js';
import { MaterialRepository } from '../repositories/material.js';
import { UnitOfMeasureRepository } from '../repositories/unitOfMeasure.js';
import { AccountRepository } from '../repositories/account.js';
import { MaterialRequestRepository } from '../repositories/materialRequest.js';
import {
  CreateMaterialRequestDto,
  MaterialRequestItemDto,
  MaterialRequestListQuery,
  UpdateMaterialRequestDto,
} from '../modules/material_request/dtos.js';
import {
  MaterialRequestDetailViewModel,
  MaterialRequestItemViewModel,
  MaterialRequestListItemViewModel,
  MaterialRequestListViewModel,
} from '../modules/material_request/viewModels.js';
import { MaterialRequestValidator } from '../modules/material_request/validators.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'material_request';
const PROJECT_LOOKUP_TYPE = 'party_type';
const PROJECT_LOOKUP_CODE = 'project';
const STATUS_LOOKUP_TYPE = 'material_request_status';
const TERMINAL_STATUS_CODES = new Set(['approved', 'rejected', 'cancelled', 'completed', 'closed']);

export class MaterialRequestService {
  private repository = new MaterialRequestRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private materialRepository = new MaterialRepository();
  private uomRepository = new UnitOfMeasureRepository();
  private accountRepository = new AccountRepository();
  private auditLogRepository = new AuditLogRepository();

  async listMaterialRequests(query: MaterialRequestListQuery): Promise<MaterialRequestListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapListRow(row)),
      total: result.total,
    };
  }

  async getMaterialRequest(id: number): Promise<MaterialRequestDetailViewModel> {
    const header = await this.repository.findById(id);
    if (!header) {
      throw new NotFoundError('Material Request not found');
    }

    const items = await this.repository.findItemsByRequestId(id);
    return {
      ...this.mapListRow(header),
      items: items.map((item) => this.mapItemRow(item)),
    };
  }

  async createMaterialRequest(dto: CreateMaterialRequestDto, createdByAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    MaterialRequestValidator.validateCreate(dto);

    const project = await this.partyRepository.findById(dto.project_id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');

    const status = await this.resolveStatus(dto.status_id);
    const items = await this.validateAndNormalizeItems(dto.items);
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const mrNumber = await this.generateRequestNumber(client);
      const reviewFields = this.getReviewFields(status.code, createdByAccountId ?? null);

      const created = await this.repository.createHeader(
        {
          mr_number: mrNumber,
          project_id: dto.project_id,
          requested_by_account_id: createdByAccountId ?? null,
          requested_at: dto.requested_at ?? null,
          date_prepared: dto.date_prepared ?? null,
          date_received: dto.date_received ?? null,
          status_id: status.look_up_id,
          stock_checked: dto.stock_checked ?? false,
          ceo_approval_required: dto.ceo_approval_required ?? false,
          ceo_approved: reviewFields.ceo_approved,
          ceo_approved_by: reviewFields.ceo_approved_by,
          ceo_approved_at: reviewFields.ceo_approved_at,
          notes: dto.notes ?? null,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.repository.replaceItems(created.material_request_id, items, createdByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_request',
          entityId: created.material_request_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            mr_number: mrNumber,
            project_id: dto.project_id,
            status_id: status.look_up_id,
            item_count: items.length,
          },
          transactionId,
          notes: 'Material Request created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialRequest(created.material_request_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMaterialRequest(id: number, dto: UpdateMaterialRequestDto, updatedByAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    MaterialRequestValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Request not found');
    }

    if (dto.project_id !== undefined) {
      const project = await this.partyRepository.findById(dto.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }
      await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    }

    const status = dto.status_id !== undefined ? await this.resolveStatus(dto.status_id) : null;
    const items = dto.items !== undefined ? await this.validateAndNormalizeItems(dto.items) : null;
    const reviewFields = status ? this.getReviewFields(status.code, updatedByAccountId ?? null) : null;
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          project_id: dto.project_id,
          requested_at: dto.requested_at,
          date_prepared: dto.date_prepared,
          date_received: dto.date_received,
          status_id: status?.look_up_id,
          stock_checked: dto.stock_checked,
          ceo_approval_required: dto.ceo_approval_required,
          ceo_approved: reviewFields?.ceo_approved,
          ceo_approved_by: reviewFields?.ceo_approved_by,
          ceo_approved_at: reviewFields?.ceo_approved_at,
          notes: dto.notes,
        },
        updatedByAccountId ?? null,
        MODULE_NAME,
        client
      );

      if (items) {
        await this.repository.replaceItems(id, items, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'material_request',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Material Request updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialRequest(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMaterialRequest(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Request not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');
      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_request',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: { material_request_id: id, mr_number: existing.mr_number },
          transactionId,
          notes: 'Material Request deleted',
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

  async submitMaterialRequest(id: number, actorAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    return this.transitionStatus(id, 'submitted', actorAccountId);
  }

  async approveMaterialRequest(id: number, actorAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    return this.transitionStatus(id, 'approved', actorAccountId);
  }

  async rejectMaterialRequest(id: number, actorAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    return this.transitionStatus(id, 'rejected', actorAccountId);
  }

  async cancelMaterialRequest(id: number, actorAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    return this.transitionStatus(id, 'cancelled', actorAccountId);
  }

  async closeMaterialRequest(id: number, actorAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    return this.transitionStatus(id, 'closed', actorAccountId);
  }

  private async transitionStatus(id: number, statusCode: string, actorAccountId?: number): Promise<MaterialRequestDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Request not found');
    }

    const status = await this.resolveStatusByCode(statusCode);
    const reviewFields = this.getReviewFields(statusCode, actorAccountId ?? null);
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          status_id: status.look_up_id,
          ceo_approved: reviewFields.ceo_approved,
          ceo_approved_by: reviewFields.ceo_approved_by,
          ceo_approved_at: reviewFields.ceo_approved_at,
          date_prepared: statusCode === 'submitted' ? new Date().toISOString() : undefined,
          date_received: statusCode === 'approved' || statusCode === 'closed' ? new Date().toISOString() : undefined,
        },
        actorAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_request',
          entityId: id,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: { status_code: statusCode },
          transactionId,
          notes: `Material Request marked as ${statusCode}`,
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialRequest(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async resolveStatus(statusId?: number): Promise<{ look_up_id: number; code: string }> {
    if (!statusId) {
      return this.resolveStatusByCode('draft');
    }

    const lookup = await this.lookupRepository.findById(statusId);
    if (!lookup || lookup.look_up_type !== STATUS_LOOKUP_TYPE) {
      throw new ValidationError('Status is invalid');
    }

    return { look_up_id: lookup.look_up_id, code: lookup.code };
  }

  private async resolveStatusByCode(code: string): Promise<{ look_up_id: number; code: string }> {
    const statuses = await this.lookupRepository.findByType(STATUS_LOOKUP_TYPE, 100);
    const status = statuses.find((item) => item.code === code);
    if (!status) {
      throw new ValidationError(`Missing ${code} status lookup`);
    }

    return { look_up_id: status.look_up_id, code: status.code };
  }

  private async generateRequestNumber(client?: any): Promise<string> {
    const year = new Date().getFullYear();
    const nextSequence = (await this.repository.getNextSequenceNumber(year, client)) + 1;
    return `MR-${year}-${String(nextSequence).padStart(6, '0')}`;
  }

  private async validateAndNormalizeItems(items: MaterialRequestItemDto[]): Promise<MaterialRequestItemDto[]> {
    const normalized: MaterialRequestItemDto[] = [];

    for (const item of items) {
      const material = await this.materialRepository.findById(item.material_id);
      if (!material) {
        throw new NotFoundError('Material not found');
      }

      const uom = await this.uomRepository.findById(item.uom_id);
      if (!uom) {
        throw new NotFoundError('Unit of measure not found');
      }

      normalized.push({
        material_id: item.material_id,
        requested_quantity: item.requested_quantity,
        approved_quantity: item.approved_quantity ?? null,
        estimated_quantity: item.estimated_quantity ?? null,
        area_usage: item.area_usage ?? null,
        remarks: item.remarks ?? null,
        uom_id: item.uom_id,
        notes: item.notes ?? null,
      });
    }

    return normalized;
  }

  private async assertLookup(id: number, type: string, code: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== type || lookup.code !== code) {
      throw new ValidationError(`${fieldName} must reference a ${code}`);
    }
  }

  private getReviewFields(statusCode: string, actorAccountId: number | null) {
    if (!TERMINAL_STATUS_CODES.has(statusCode)) {
      return {
        ceo_approved: null,
        ceo_approved_by: null,
        ceo_approved_at: null,
      };
    }

    return {
      ceo_approved: statusCode === 'approved' || statusCode === 'completed' || statusCode === 'closed',
      ceo_approved_by: actorAccountId,
      ceo_approved_at: new Date().toISOString(),
    };
  }

  private mapListRow(row: any): MaterialRequestListItemViewModel {
    return {
      material_request_id: row.material_request_id,
      mr_number: row.mr_number,
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      status_id: row.status_id,
      status_name: row.status_name,
      requested_by_account_id: row.requested_by_account_id ?? null,
      requested_by_account_name: row.requested_by_account_name ?? null,
      requested_at: row.requested_at ?? null,
      date_prepared: row.date_prepared ?? null,
      date_received: row.date_received ?? null,
      stock_checked: row.stock_checked,
      ceo_approval_required: row.ceo_approval_required,
      ceo_approved: row.ceo_approved ?? null,
      ceo_approved_by: row.ceo_approved_by ?? null,
      ceo_approved_by_name: row.ceo_approved_by_name ?? null,
      ceo_approved_at: row.ceo_approved_at ?? null,
      notes: row.notes ?? null,
      item_count: Number(row.item_count ?? 0),
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  }

  private mapItemRow(row: any): MaterialRequestItemViewModel {
    return {
      material_request_item_id: row.material_request_item_id,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      requested_quantity: row.requested_quantity,
      approved_quantity: row.approved_quantity ?? null,
      estimated_quantity: row.estimated_quantity ?? null,
      area_usage: row.area_usage ?? null,
      remarks: row.remarks ?? null,
      uom_id: row.uom_id,
      uom_name: row.uom_name,
      uom_abbreviation: row.uom_abbreviation,
      notes: row.notes ?? null,
    };
  }
}