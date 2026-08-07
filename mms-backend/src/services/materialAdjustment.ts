import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { LookupRepository } from '../repositories/lookup.js';
import { MaterialAdjustmentRepository } from '../repositories/materialAdjustment.js';
import { MaterialRepository } from '../repositories/material.js';
import { PartyRepository } from '../repositories/party.js';
import { UnitOfMeasureRepository } from '../repositories/unitOfMeasure.js';
import {
  CreateMaterialAdjustmentDto,
  MaterialAdjustmentItemMutationDto,
  MaterialAdjustmentItemDto,
  MaterialAdjustmentListQuery,
  UpdateMaterialAdjustmentDto,
} from '../modules/material_adjustment/dtos.js';
import {
  MaterialAdjustmentDetailViewModel,
  MaterialAdjustmentItemViewModel,
  MaterialAdjustmentListItemViewModel,
  MaterialAdjustmentListViewModel,
} from '../modules/material_adjustment/viewModels.js';
import { MaterialAdjustmentValidator } from '../modules/material_adjustment/validators.js';
import { assertOptimisticConcurrency } from '../shared/transaction/concurrency.js';
import { TransactionLifecycleManager } from '../shared/transaction/lifecycle.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'material_adjustment';
const STATUS_LOOKUP_TYPE = 'material_adjustment_status';
const REASON_LOOKUP_TYPE = 'material_adjustment_reason';
const PROJECT_LOOKUP_TYPE = 'party_type';
const PROJECT_LOOKUP_CODE = 'project';
const PENDING_STATUS_CODE = 'pending';
const APPROVED_STATUS_CODE = 'approved';
const REJECTED_STATUS_CODE = 'rejected';
const COMPLETED_STATUS_CODE = 'completed';
const lifecycleManager = new TransactionLifecycleManager({
  moduleName: 'Material Adjustment',
  transitions: {
    pending: ['approved', 'rejected'],
    approved: ['completed'],
  },
});

export class MaterialAdjustmentService {
  private repository = new MaterialAdjustmentRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private materialRepository = new MaterialRepository();
  private uomRepository = new UnitOfMeasureRepository();
  private auditLogRepository = new AuditLogRepository();

  async listMaterialAdjustments(query: MaterialAdjustmentListQuery): Promise<MaterialAdjustmentListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapListRow(row)),
      total: result.total,
    };
  }

  async getMaterialAdjustment(id: number): Promise<MaterialAdjustmentDetailViewModel> {
    const header = await this.repository.findById(id);
    if (!header) {
      throw new NotFoundError('Material Adjustment not found');
    }

    const items = await this.repository.findItemsByAdjustmentId(id);
    return {
      ...this.mapListRow(header),
      items: items.map((item) => this.mapItemRow(item)),
    };
  }

  async createMaterialAdjustment(dto: CreateMaterialAdjustmentDto, createdByAccountId?: number): Promise<MaterialAdjustmentDetailViewModel> {
    MaterialAdjustmentValidator.validateCreate(dto);

    const project = await this.partyRepository.findById(dto.project_id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');

    if (dto.adjustment_reason_id) {
      await this.requireLookup(dto.adjustment_reason_id, REASON_LOOKUP_TYPE, 'adjustment_reason_id');
    }

    const pendingStatus = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, PENDING_STATUS_CODE, 'status_id');
    const normalizedItems = await this.validateAndNormalizeItems(dto.items);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const materialAdjustmentNumber = await this.generateAdjustmentNumber(client);
      const created = await this.repository.createHeader(
        {
          material_adjustment_number: materialAdjustmentNumber,
          project_id: dto.project_id,
          requested_by_account_id: createdByAccountId ?? null,
          requested_at: dto.requested_at ?? new Date().toISOString(),
          status_id: pendingStatus.look_up_id,
          adjustment_reason_id: dto.adjustment_reason_id ?? null,
          notes: dto.notes ?? null,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.repository.replaceItems(created.material_adjustment_id, normalizedItems, createdByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_adjustment',
          entityId: created.material_adjustment_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            material_adjustment_number: materialAdjustmentNumber,
            project_id: dto.project_id,
            status_id: pendingStatus.look_up_id,
            adjustment_reason_id: dto.adjustment_reason_id ?? null,
            item_count: normalizedItems.length,
          },
          transactionId,
          notes: 'Material Adjustment created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialAdjustment(created.material_adjustment_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMaterialAdjustment(id: number, dto: UpdateMaterialAdjustmentDto, updatedByAccountId?: number): Promise<MaterialAdjustmentDetailViewModel> {
    MaterialAdjustmentValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Adjustment not found');
    }

    assertOptimisticConcurrency('Material Adjustment', dto.expected_updated_at, existing.updated_at);
    this.assertAdjustmentMutable(existing.status_code);

    if (dto.project_id !== undefined) {
      const project = await this.partyRepository.findById(dto.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }
      await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    }

    if (dto.adjustment_reason_id !== undefined && dto.adjustment_reason_id !== null) {
      await this.requireLookup(dto.adjustment_reason_id, REASON_LOOKUP_TYPE, 'adjustment_reason_id');
    }

    const normalizedItems = dto.items ? await this.validateAndNormalizeItems(dto.items) : null;

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          project_id: dto.project_id,
          requested_at: dto.requested_at,
          adjustment_reason_id: dto.adjustment_reason_id,
          notes: dto.notes,
        },
        updatedByAccountId ?? null,
        MODULE_NAME,
        client
      );

      if (normalizedItems) {
        await this.repository.replaceItems(id, normalizedItems, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'material_adjustment',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Material Adjustment updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialAdjustment(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMaterialAdjustment(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Adjustment not found');
    }

    if (existing.status_code !== PENDING_STATUS_CODE && existing.status_code !== REJECTED_STATUS_CODE) {
      throw new ConflictError('Only pending or rejected adjustments can be deleted');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');
      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);
      await this.auditLogRepository.create(
        {
          entityTable: 'material_adjustment',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            material_adjustment_id: id,
            material_adjustment_number: existing.material_adjustment_number,
          },
          transactionId,
          notes: 'Material Adjustment deleted',
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

  async approveMaterialAdjustment(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<MaterialAdjustmentDetailViewModel> {
    return this.transitionStatus(id, APPROVED_STATUS_CODE, actorAccountId, expectedUpdatedAt);
  }

  async rejectMaterialAdjustment(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<MaterialAdjustmentDetailViewModel> {
    return this.transitionStatus(id, REJECTED_STATUS_CODE, actorAccountId, expectedUpdatedAt);
  }

  async completeMaterialAdjustment(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<MaterialAdjustmentDetailViewModel> {
    return this.transitionStatus(id, COMPLETED_STATUS_CODE, actorAccountId, expectedUpdatedAt);
  }

  async addMaterialAdjustmentItem(
    adjustmentId: number,
    dto: MaterialAdjustmentItemMutationDto,
    actorAccountId?: number
  ): Promise<MaterialAdjustmentDetailViewModel> {
    MaterialAdjustmentValidator.validateItem(dto);

    const adjustment = await this.repository.findById(adjustmentId);
    if (!adjustment) {
      throw new NotFoundError('Material Adjustment not found');
    }
    this.assertAdjustmentMutable(adjustment.status_code);

    const [normalized] = await this.validateAndNormalizeItems([dto]);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const created = await this.repository.createItem(adjustmentId, normalized, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_adjustment',
          entityId: adjustmentId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'ADD',
            material_adjustment_item_id: created.material_adjustment_item_id,
            material_id: normalized.material_id,
          },
          transactionId,
          notes: 'Material Adjustment item added',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialAdjustment(adjustmentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMaterialAdjustmentItem(
    adjustmentId: number,
    itemId: number,
    dto: MaterialAdjustmentItemMutationDto,
    actorAccountId?: number
  ): Promise<MaterialAdjustmentDetailViewModel> {
    MaterialAdjustmentValidator.validateItem(dto);

    const adjustment = await this.repository.findById(adjustmentId);
    if (!adjustment) {
      throw new NotFoundError('Material Adjustment not found');
    }
    this.assertAdjustmentMutable(adjustment.status_code);

    const item = await this.repository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Material Adjustment item not found');
    }

    const items = await this.repository.findItemsByAdjustmentId(adjustmentId);
    const belongsToAdjustment = items.some((row) => row.material_adjustment_item_id === itemId);
    if (!belongsToAdjustment) {
      throw new ConflictError('Item does not belong to the material adjustment');
    }

    assertOptimisticConcurrency('Material Adjustment item', dto.expected_updated_at, item.updated_at);

    const [normalized] = await this.validateAndNormalizeItems([dto]);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateItem(itemId, normalized, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_adjustment',
          entityId: adjustmentId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'UPDATE',
            material_adjustment_item_id: itemId,
            material_id: normalized.material_id,
          },
          transactionId,
          notes: 'Material Adjustment item updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialAdjustment(adjustmentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMaterialAdjustmentItem(
    adjustmentId: number,
    itemId: number,
    expectedUpdatedAt: string | null | undefined,
    actorAccountId?: number
  ): Promise<MaterialAdjustmentDetailViewModel> {
    const adjustment = await this.repository.findById(adjustmentId);
    if (!adjustment) {
      throw new NotFoundError('Material Adjustment not found');
    }
    this.assertAdjustmentMutable(adjustment.status_code);

    const item = await this.repository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Material Adjustment item not found');
    }

    const items = await this.repository.findItemsByAdjustmentId(adjustmentId);
    const belongsToAdjustment = items.some((row) => row.material_adjustment_item_id === itemId);
    if (!belongsToAdjustment) {
      throw new ConflictError('Item does not belong to the material adjustment');
    }

    assertOptimisticConcurrency('Material Adjustment item', expectedUpdatedAt, item.updated_at);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.softDeleteItem(itemId, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'material_adjustment',
          entityId: adjustmentId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'DELETE',
            material_adjustment_item_id: itemId,
            material_id: item.material_id,
          },
          transactionId,
          notes: 'Material Adjustment item deleted',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialAdjustment(adjustmentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async transitionStatus(
    id: number,
    targetStatusCode: string,
    actorAccountId?: number,
    expectedUpdatedAt?: string | null
  ): Promise<MaterialAdjustmentDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Material Adjustment not found');
    }

    assertOptimisticConcurrency('Material Adjustment', expectedUpdatedAt, existing.updated_at);
    lifecycleManager.assertCanTransition(existing.status_code, targetStatusCode);

    const status = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, targetStatusCode, 'status_id');

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          status_id: status.look_up_id,
          approved_by_account_id: targetStatusCode === APPROVED_STATUS_CODE || targetStatusCode === REJECTED_STATUS_CODE ? actorAccountId ?? null : undefined,
          approved_at: targetStatusCode === APPROVED_STATUS_CODE || targetStatusCode === REJECTED_STATUS_CODE ? new Date().toISOString() : undefined,
        },
        actorAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'material_adjustment',
          entityId: id,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            status_id: status.look_up_id,
            status_code: status.code,
          },
          transactionId,
          notes: `Material Adjustment ${status.name.toLowerCase()}`,
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getMaterialAdjustment(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async validateAndNormalizeItems(items: MaterialAdjustmentItemDto[]) {
    const normalized = [] as Array<{
      material_id: number;
      material_brand_id: number | null;
      uom_id: number;
      system_quantity: number;
      adjustment_quantity: number;
      resulting_quantity: number;
      notes: string | null;
    }>;

    for (const item of items) {
      const material = await this.materialRepository.findById(item.material_id);
      if (!material) {
        throw new NotFoundError(`Material ${item.material_id} not found`);
      }

      const uom = await this.uomRepository.findById(item.uom_id);
      if (!uom) {
        throw new NotFoundError(`Unit of measure ${item.uom_id} not found`);
      }

      normalized.push({
        material_id: item.material_id,
        material_brand_id: item.material_brand_id ?? null,
        uom_id: item.uom_id,
        system_quantity: item.system_quantity,
        adjustment_quantity: item.adjustment_quantity,
        resulting_quantity: item.resulting_quantity,
        notes: item.notes ?? null,
      });
    }

    return normalized;
  }

  private assertAdjustmentMutable(statusCode: string): void {
    if (statusCode !== PENDING_STATUS_CODE) {
      throw new ConflictError('Only pending adjustments can be updated');
    }
  }

  private async requireLookup(id: number, lookupType: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== lookupType) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    return lookup;
  }

  private async requireLookupByCode(lookupType: string, code: string, fieldName: string) {
    const lookup = await this.lookupRepository.findByTypeAndCode(lookupType, code);
    if (!lookup) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    return lookup;
  }

  private async assertLookup(id: number, lookupType: string, expectedCode: string, fieldName: string): Promise<void> {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== lookupType || lookup.code !== expectedCode) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
  }

  private async generateAdjustmentNumber(client: any): Promise<string> {
    const year = new Date().getFullYear();
    const next = await this.repository.getNextSequenceNumber(year, client);
    return `MA-${year}-${String(next + 1).padStart(6, '0')}`;
  }

  private mapListRow(row: any): MaterialAdjustmentListItemViewModel {
    return {
      material_adjustment_id: row.material_adjustment_id,
      material_adjustment_number: row.material_adjustment_number,
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      requested_by_account_id: row.requested_by_account_id,
      requested_by_account_name: row.requested_by_account_name,
      requested_at: row.requested_at,
      approved_by_account_id: row.approved_by_account_id,
      approved_by_account_name: row.approved_by_account_name,
      approved_at: row.approved_at,
      status_id: row.status_id,
      status_code: row.status_code,
      status_name: row.status_name,
      adjustment_reason_id: row.adjustment_reason_id,
      adjustment_reason_code: row.adjustment_reason_code,
      adjustment_reason_name: row.adjustment_reason_name,
      notes: row.notes,
      item_count: row.item_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapItemRow(row: any): MaterialAdjustmentItemViewModel {
    return {
      material_adjustment_item_id: row.material_adjustment_item_id,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      material_brand_id: row.material_brand_id,
      material_brand_name: row.material_brand_name,
      uom_id: row.uom_id,
      uom_name: row.uom_name,
      uom_abbreviation: row.uom_abbreviation,
      system_quantity: row.system_quantity,
      adjustment_quantity: row.adjustment_quantity,
      resulting_quantity: row.resulting_quantity,
      notes: row.notes,
      updated_at: row.updated_at ?? null,
    };
  }
}
