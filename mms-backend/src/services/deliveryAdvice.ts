import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { DeliveryAdviceRepository } from '../repositories/deliveryAdvice.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrder.js';
import {
  CreateDeliveryAdviceDto,
  DeliveryAdviceItemMutationDto,
  DeliveryAdviceItemDto,
  DeliveryAdviceListQuery,
  UpdateDeliveryAdviceDto,
} from '../modules/delivery_advice/dtos.js';
import {
  DeliveryAdviceDetailViewModel,
  DeliveryAdviceItemViewModel,
  DeliveryAdviceListItemViewModel,
  DeliveryAdviceListViewModel,
} from '../modules/delivery_advice/viewModels.js';
import { DeliveryAdviceValidator } from '../modules/delivery_advice/validators.js';
import { assertOptimisticConcurrency } from '../shared/transaction/concurrency.js';
import { TransactionLifecycleManager } from '../shared/transaction/lifecycle.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'delivery_advice';
const STATUS_LOOKUP_TYPE = 'delivery_advice_status';
const DRAFT_STATUS_CODE = 'draft';
const SUBMITTED_STATUS_CODE = 'submitted';
const COMPLETED_STATUS_CODE = 'completed';
const CANCELLED_STATUS_CODE = 'cancelled';
const lifecycleManager = new TransactionLifecycleManager({
  moduleName: 'Delivery Advice',
  transitions: {
    draft: ['submitted', 'cancelled'],
    submitted: ['completed', 'cancelled'],
  },
});

export class DeliveryAdviceService {
  private repository = new DeliveryAdviceRepository();
  private lookupRepository = new LookupRepository();
  private purchaseOrderRepository = new PurchaseOrderRepository();
  private auditLogRepository = new AuditLogRepository();

  async listDeliveryAdvices(query: DeliveryAdviceListQuery): Promise<DeliveryAdviceListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapListRow(row)),
      total: result.total,
    };
  }

  async getDeliveryAdvice(id: number): Promise<DeliveryAdviceDetailViewModel> {
    const header = await this.repository.findById(id);
    if (!header) {
      throw new NotFoundError('Delivery Advice not found');
    }

    const items = await this.repository.findItemsByAdviceId(id);
    return {
      ...this.mapListRow(header),
      items: items.map((item) => this.mapItemRow(item)),
    };
  }

  async createDeliveryAdvice(dto: CreateDeliveryAdviceDto, createdByAccountId?: number): Promise<DeliveryAdviceDetailViewModel> {
    DeliveryAdviceValidator.validateCreate(dto);

    const purchaseOrder = await this.purchaseOrderRepository.findById(dto.purchase_order_id);
    if (!purchaseOrder) {
      throw new NotFoundError('Purchase Order not found');
    }

    const duplicateReference = await this.repository.findByReferenceCode(dto.reference_code.trim());
    if (duplicateReference) {
      throw new ConflictError('Reference code already exists');
    }

    const draftStatus = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, DRAFT_STATUS_CODE, 'status_id');
    const normalizedItems = await this.validateAndNormalizeItems(dto.purchase_order_id, dto.items);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const daNumber = await this.generateAdviceNumber(client);
      const created = await this.repository.createHeader(
        {
          purchase_order_id: dto.purchase_order_id,
          da_number: daNumber,
          reference_code: dto.reference_code.trim(),
          issued_at: dto.issued_at ?? new Date().toISOString(),
          received_at: dto.received_at ?? null,
          status_id: draftStatus.look_up_id,
          notes: dto.notes ?? null,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.repository.replaceItems(created.delivery_advice_id, normalizedItems, createdByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'delivery_advice',
          entityId: created.delivery_advice_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            da_number: daNumber,
            purchase_order_id: dto.purchase_order_id,
            reference_code: dto.reference_code.trim(),
            status_id: draftStatus.look_up_id,
            item_count: normalizedItems.length,
          },
          transactionId,
          notes: 'Delivery Advice created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getDeliveryAdvice(created.delivery_advice_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDeliveryAdvice(id: number, dto: UpdateDeliveryAdviceDto, updatedByAccountId?: number): Promise<DeliveryAdviceDetailViewModel> {
    DeliveryAdviceValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Delivery Advice not found');
    }

    assertOptimisticConcurrency('Delivery Advice', dto.expected_updated_at, existing.updated_at);

    if (existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft delivery advice records can be updated');
    }

    if (dto.purchase_order_id !== undefined) {
      const purchaseOrder = await this.purchaseOrderRepository.findById(dto.purchase_order_id);
      if (!purchaseOrder) {
        throw new NotFoundError('Purchase Order not found');
      }
    }

    if (dto.reference_code !== undefined) {
      const duplicateReference = await this.repository.findByReferenceCode(dto.reference_code.trim(), id);
      if (duplicateReference) {
        throw new ConflictError('Reference code already exists');
      }
    }

    const purchaseOrderId = dto.purchase_order_id ?? existing.purchase_order_id;
    const normalizedItems = dto.items ? await this.validateAndNormalizeItems(purchaseOrderId, dto.items) : null;

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          purchase_order_id: dto.purchase_order_id,
          reference_code: dto.reference_code !== undefined ? dto.reference_code.trim() : undefined,
          issued_at: dto.issued_at,
          received_at: dto.received_at,
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
          entityTable: 'delivery_advice',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Delivery Advice updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getDeliveryAdvice(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDeliveryAdvice(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Delivery Advice not found');
    }

    if (existing.status_code !== DRAFT_STATUS_CODE && existing.status_code !== CANCELLED_STATUS_CODE) {
      throw new ConflictError('Only draft or cancelled delivery advice records can be deleted');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'delivery_advice',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            delivery_advice_id: id,
            da_number: existing.da_number,
          },
          transactionId,
          notes: 'Delivery Advice deleted',
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

  async submitDeliveryAdvice(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<DeliveryAdviceDetailViewModel> {
    return this.transitionStatus(id, SUBMITTED_STATUS_CODE, actorAccountId, expectedUpdatedAt);
  }

  async completeDeliveryAdvice(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<DeliveryAdviceDetailViewModel> {
    return this.transitionStatus(id, COMPLETED_STATUS_CODE, actorAccountId, expectedUpdatedAt, { setReceivedAt: true });
  }

  async cancelDeliveryAdvice(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<DeliveryAdviceDetailViewModel> {
    return this.transitionStatus(id, CANCELLED_STATUS_CODE, actorAccountId, expectedUpdatedAt);
  }

  async addDeliveryAdviceItem(
    adviceId: number,
    dto: DeliveryAdviceItemMutationDto,
    actorAccountId?: number
  ): Promise<DeliveryAdviceDetailViewModel> {
    DeliveryAdviceValidator.validateItem(dto);

    const advice = await this.repository.findById(adviceId);
    if (!advice) {
      throw new NotFoundError('Delivery Advice not found');
    }
    this.assertAdviceMutable(advice.status_code);

    const [normalized] = await this.validateAndNormalizeItems(advice.purchase_order_id, [dto]);

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      const created = await this.repository.createItem(adviceId, normalized, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'delivery_advice',
          entityId: adviceId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'ADD',
            delivery_advice_item_id: created.delivery_advice_item_id,
            material_id: normalized.material_id,
          },
          transactionId,
          notes: 'Delivery Advice item added',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getDeliveryAdvice(adviceId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDeliveryAdviceItem(
    adviceId: number,
    itemId: number,
    dto: DeliveryAdviceItemMutationDto,
    actorAccountId?: number
  ): Promise<DeliveryAdviceDetailViewModel> {
    DeliveryAdviceValidator.validateItem(dto);

    const advice = await this.repository.findById(adviceId);
    if (!advice) {
      throw new NotFoundError('Delivery Advice not found');
    }
    this.assertAdviceMutable(advice.status_code);

    const item = await this.repository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Delivery Advice item not found');
    }

    const items = await this.repository.findItemsByAdviceId(adviceId);
    const belongsToAdvice = items.some((row) => row.delivery_advice_item_id === itemId);
    if (!belongsToAdvice) {
      throw new ConflictError('Item does not belong to the delivery advice');
    }

    assertOptimisticConcurrency('Delivery Advice item', dto.expected_updated_at, item.updated_at);

    const [normalized] = await this.validateAndNormalizeItems(advice.purchase_order_id, [dto]);

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      await this.repository.updateItem(itemId, normalized, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'delivery_advice',
          entityId: adviceId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'UPDATE',
            delivery_advice_item_id: itemId,
            material_id: normalized.material_id,
          },
          transactionId,
          notes: 'Delivery Advice item updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getDeliveryAdvice(adviceId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDeliveryAdviceItem(
    adviceId: number,
    itemId: number,
    expectedUpdatedAt: string | null | undefined,
    actorAccountId?: number
  ): Promise<DeliveryAdviceDetailViewModel> {
    const advice = await this.repository.findById(adviceId);
    if (!advice) {
      throw new NotFoundError('Delivery Advice not found');
    }
    this.assertAdviceMutable(advice.status_code);

    const item = await this.repository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Delivery Advice item not found');
    }

    const items = await this.repository.findItemsByAdviceId(adviceId);
    const belongsToAdvice = items.some((row) => row.delivery_advice_item_id === itemId);
    if (!belongsToAdvice) {
      throw new ConflictError('Item does not belong to the delivery advice');
    }

    assertOptimisticConcurrency('Delivery Advice item', expectedUpdatedAt, item.updated_at);

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      await this.repository.softDeleteItem(itemId, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'delivery_advice',
          entityId: adviceId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'DELETE',
            delivery_advice_item_id: itemId,
            material_id: item.material_id,
          },
          transactionId,
          notes: 'Delivery Advice item deleted',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getDeliveryAdvice(adviceId);
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
    expectedUpdatedAt?: string | null,
    options?: { setReceivedAt?: boolean }
  ): Promise<DeliveryAdviceDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Delivery Advice not found');
    }

    assertOptimisticConcurrency('Delivery Advice', expectedUpdatedAt, existing.updated_at);
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
          received_at: options?.setReceivedAt ? new Date().toISOString() : undefined,
        },
        actorAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'delivery_advice',
          entityId: id,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            status_id: status.look_up_id,
            status_code: status.code,
          },
          transactionId,
          notes: `Delivery Advice ${status.name.toLowerCase()}`,
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getDeliveryAdvice(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async validateAndNormalizeItems(purchaseOrderId: number, items: DeliveryAdviceItemDto[]) {
    const poItems = await this.purchaseOrderRepository.findItemsByOrderId(purchaseOrderId);
    const poItemMap = new Map(poItems.map((item) => [item.purchase_order_item_id, item]));

    return items.map((item) => {
      if (item.purchase_order_item_id !== undefined && item.purchase_order_item_id !== null) {
        const poItem = poItemMap.get(item.purchase_order_item_id);
        if (!poItem) {
          throw new ValidationError(`Purchase order item ${item.purchase_order_item_id} does not belong to this purchase order`);
        }
        if (poItem.material_id !== item.material_id) {
          throw new ValidationError(`Material mismatch for purchase order item ${item.purchase_order_item_id}`);
        }
        if (poItem.uom_id !== item.uom_id) {
          throw new ValidationError(`UOM mismatch for purchase order item ${item.purchase_order_item_id}`);
        }
      }

      return {
        purchase_order_item_id: item.purchase_order_item_id ?? null,
        material_id: item.material_id,
        material_brand_id: item.material_brand_id ?? null,
        uom_id: item.uom_id,
        advised_quantity: item.advised_quantity,
        received_quantity: item.received_quantity ?? 0,
        notes: item.notes ?? null,
      };
    });
  }

  private assertAdviceMutable(statusCode: string): void {
    if (statusCode !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft delivery advice records can be modified');
    }
  }

  private async requireLookupByCode(lookupType: string, code: string, fieldName: string) {
    const lookup = await this.lookupRepository.findByTypeAndCode(lookupType, code);
    if (!lookup) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    return lookup;
  }

  private async generateAdviceNumber(client: any): Promise<string> {
    const year = new Date().getFullYear();
    const next = await this.repository.getNextSequenceNumber(year, client);
    return `DA-${year}-${String(next + 1).padStart(6, '0')}`;
  }

  private mapListRow(row: any): DeliveryAdviceListItemViewModel {
    return {
      delivery_advice_id: row.delivery_advice_id,
      purchase_order_id: row.purchase_order_id,
      po_number: row.po_number,
      da_number: row.da_number,
      reference_code: row.reference_code,
      issued_at: row.issued_at,
      received_at: row.received_at,
      status_id: row.status_id,
      status_code: row.status_code,
      status_name: row.status_name,
      notes: row.notes,
      item_count: row.item_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapItemRow(row: any): DeliveryAdviceItemViewModel {
    return {
      delivery_advice_item_id: row.delivery_advice_item_id,
      purchase_order_item_id: row.purchase_order_item_id,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      material_brand_id: row.material_brand_id,
      material_brand_name: row.material_brand_name,
      uom_id: row.uom_id,
      uom_name: row.uom_name,
      uom_abbreviation: row.uom_abbreviation,
      advised_quantity: row.advised_quantity,
      received_quantity: row.received_quantity,
      notes: row.notes,
      updated_at: row.updated_at ?? null,
    };
  }
}
