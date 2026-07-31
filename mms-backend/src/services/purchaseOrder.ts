import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PartyRepository } from '../repositories/party.js';
import { MaterialRepository } from '../repositories/material.js';
import { UnitOfMeasureRepository } from '../repositories/unitOfMeasure.js';
import { MaterialRequestRepository } from '../repositories/materialRequest.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrder.js';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderItemDto,
  PurchaseOrderListQuery,
  UpdatePurchaseOrderDto,
} from '../modules/purchase_order/dtos.js';
import {
  PurchaseOrderDetailViewModel,
  PurchaseOrderItemViewModel,
  PurchaseOrderListItemViewModel,
  PurchaseOrderListViewModel,
} from '../modules/purchase_order/viewModels.js';
import { PurchaseOrderValidator } from '../modules/purchase_order/validators.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'purchase_order';
const PROJECT_LOOKUP_TYPE = 'party_type';
const PROJECT_LOOKUP_CODE = 'project';
const SUPPLIER_LOOKUP_CODE = 'supplier';
const STATUS_LOOKUP_TYPE = 'purchase_order_status';
const TYPE_LOOKUP_TYPE = 'purchase_order_type';
const DRAFT_STATUS_CODE = 'draft';
const APPROVED_STATUS_CODE = 'approved';
const CANCELLED_STATUS_CODE = 'cancelled';
const CANCELLABLE_STATUS_CODES = new Set(['draft', 'approved']);
const IMMUTABLE_STATUS_CODES = new Set(['approved', 'partially_delivered', 'delivered', 'cancelled']);

export class PurchaseOrderService {
  private repository = new PurchaseOrderRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private materialRepository = new MaterialRepository();
  private uomRepository = new UnitOfMeasureRepository();
  private materialRequestRepository = new MaterialRequestRepository();
  private auditLogRepository = new AuditLogRepository();

  async listPurchaseOrders(query: PurchaseOrderListQuery): Promise<PurchaseOrderListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapListRow(row)),
      total: result.total,
    };
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrderDetailViewModel> {
    const header = await this.repository.findById(id);
    if (!header) {
      throw new NotFoundError('Purchase Order not found');
    }

    const items = await this.repository.findItemsByOrderId(id);
    return {
      ...this.mapListRow(header),
      items: items.map((item) => this.mapItemRow(item)),
    };
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, createdByAccountId?: number): Promise<PurchaseOrderDetailViewModel> {
    PurchaseOrderValidator.validateCreate(dto);

    const project = await this.partyRepository.findById(dto.project_id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');

    const supplier = await this.partyRepository.findById(dto.supplier_party_id);
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }
    await this.assertLookup(supplier.party_type_id, PROJECT_LOOKUP_TYPE, SUPPLIER_LOOKUP_CODE, 'supplier_party_id');

    const orderType = await this.requireLookup(dto.order_type_id, TYPE_LOOKUP_TYPE, 'order_type_id');
    const draftStatus = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, DRAFT_STATUS_CODE, 'status_id');

    const requestContext = await this.loadRequestContext(dto.material_request_id ?? null);
    const items = dto.items.length > 0
      ? await this.validateAndNormalizeItems(dto.items, requestContext?.itemMap)
      : this.mapRequestItemsToPurchaseOrderItems(requestContext?.items ?? []);

    if ((dto.material_request_id ?? null) !== null && items.length === 0) {
      throw new ValidationError('Linked material request does not contain any items');
    }

    const totalAmount = dto.total_amount !== undefined && dto.total_amount !== null
      ? dto.total_amount
      : this.calculateTotalAmount(items);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const poNumber = await this.generateOrderNumber(client);
      const created = await this.repository.createHeader(
        {
          po_number: poNumber,
          project_id: dto.project_id,
          material_request_id: dto.material_request_id ?? null,
          supplier_party_id: dto.supplier_party_id,
          requested_by_account_id: createdByAccountId ?? null,
          prepared_at: dto.prepared_at ?? new Date().toISOString(),
          expected_delivery_date: dto.expected_delivery_date ?? null,
          order_type_id: orderType.look_up_id,
          status_id: draftStatus.look_up_id,
          total_amount: totalAmount,
          notes: dto.notes ?? null,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.repository.replaceItems(created.purchase_order_id, items, createdByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'purchase_order',
          entityId: created.purchase_order_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            po_number: poNumber,
            project_id: dto.project_id,
            supplier_party_id: dto.supplier_party_id,
            material_request_id: dto.material_request_id ?? null,
            order_type_id: orderType.look_up_id,
            status_id: draftStatus.look_up_id,
            total_amount: totalAmount,
            item_count: items.length,
          },
          transactionId,
          notes: 'Purchase Order created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getPurchaseOrder(created.purchase_order_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePurchaseOrder(id: number, dto: UpdatePurchaseOrderDto, updatedByAccountId?: number): Promise<PurchaseOrderDetailViewModel> {
    PurchaseOrderValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Purchase Order not found');
    }

    if (IMMUTABLE_STATUS_CODES.has(existing.status_code)) {
      throw new ConflictError('Only draft purchase orders can be updated');
    }

    if (dto.project_id !== undefined) {
      const project = await this.partyRepository.findById(dto.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }
      await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    }

    if (dto.supplier_party_id !== undefined) {
      const supplier = await this.partyRepository.findById(dto.supplier_party_id);
      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }
      await this.assertLookup(supplier.party_type_id, PROJECT_LOOKUP_TYPE, SUPPLIER_LOOKUP_CODE, 'supplier_party_id');
    }

    const orderType = dto.order_type_id !== undefined
      ? await this.requireLookup(dto.order_type_id, TYPE_LOOKUP_TYPE, 'order_type_id')
      : null;
    const requestContext = await this.loadRequestContext(dto.material_request_id ?? null);
    const items = dto.items !== undefined
      ? (dto.items.length > 0 ? await this.validateAndNormalizeItems(dto.items, requestContext?.itemMap) : this.mapRequestItemsToPurchaseOrderItems(requestContext?.items ?? []))
      : null;

    if ((dto.material_request_id ?? null) !== null && items !== null && items.length === 0) {
      throw new ValidationError('Linked material request does not contain any items');
    }

    const totalAmount = items !== null
      ? (dto.total_amount !== undefined && dto.total_amount !== null ? dto.total_amount : this.calculateTotalAmount(items))
      : dto.total_amount;

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          project_id: dto.project_id,
          material_request_id: dto.material_request_id,
          supplier_party_id: dto.supplier_party_id,
          prepared_at: dto.prepared_at,
          expected_delivery_date: dto.expected_delivery_date,
          order_type_id: orderType?.look_up_id,
          total_amount: totalAmount,
          notes: dto.notes,
        },
        updatedByAccountId ?? null,
        MODULE_NAME,
        client
      );

      if (items !== null) {
        await this.repository.replaceItems(id, items, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'purchase_order',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Purchase Order updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getPurchaseOrder(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePurchaseOrder(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Purchase Order not found');
    }

    if (IMMUTABLE_STATUS_CODES.has(existing.status_code)) {
      throw new ConflictError('Only draft purchase orders can be deleted');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'purchase_order',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            purchase_order_id: id,
            po_number: existing.po_number,
          },
          transactionId,
          notes: 'Purchase Order deleted',
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

  async approvePurchaseOrder(id: number, actorAccountId?: number): Promise<PurchaseOrderDetailViewModel> {
    return this.transitionStatus(id, APPROVED_STATUS_CODE, actorAccountId);
  }

  async cancelPurchaseOrder(id: number, actorAccountId?: number): Promise<PurchaseOrderDetailViewModel> {
    return this.transitionStatus(id, CANCELLED_STATUS_CODE, actorAccountId);
  }

  private async transitionStatus(id: number, statusCode: string, actorAccountId?: number): Promise<PurchaseOrderDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Purchase Order not found');
    }

    if (statusCode === APPROVED_STATUS_CODE && existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft purchase orders can be approved');
    }

    if (statusCode === CANCELLED_STATUS_CODE && !CANCELLABLE_STATUS_CODES.has(existing.status_code)) {
      throw new ConflictError('Only draft or approved purchase orders can be cancelled');
    }

    if (statusCode === CANCELLED_STATUS_CODE && existing.status_code === CANCELLED_STATUS_CODE) {
      throw new ConflictError('Purchase Order is already cancelled');
    }

    const status = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, statusCode, 'status_id');
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE purchase_order
         SET status_id = $2,
             log_date_updated = NOW(),
             log_updated_by_account_id = $3,
             log_module_updated = $4
         WHERE purchase_order_id = $1
           AND is_deleted = false`,
        [id, status.look_up_id, actorAccountId ?? null, MODULE_NAME]
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'purchase_order',
          entityId: id,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            status_id: status.look_up_id,
            status_code: status.code,
          },
          transactionId,
          notes: `Purchase Order ${status.name.toLowerCase()}`,
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getPurchaseOrder(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async loadRequestContext(materialRequestId: number | null) {
    if (!materialRequestId) {
      return null;
    }

    const request = await this.materialRequestRepository.findById(materialRequestId);
    if (!request) {
      throw new NotFoundError('Material Request not found');
    }

    const items = await this.materialRequestRepository.findItemsByRequestId(materialRequestId);
    const itemMap = new Map(items.map((item) => [item.material_request_item_id, item]));
    return { request, items, itemMap };
  }

  private mapRequestItemsToPurchaseOrderItems(items: Array<{
    material_request_item_id: number;
    material_id: number;
    material_code: string;
    material_name: string;
    requested_quantity: string;
    uom_id: number;
    uom_name: string;
    uom_abbreviation: string;
    notes: string | null;
  }>): PurchaseOrderItemDto[] {
    return items.map((item) => ({
      material_request_item_id: item.material_request_item_id,
      material_id: item.material_id,
      requested_quantity: Number(item.requested_quantity),
      ordered_quantity: Number(item.requested_quantity),
      received_quantity: 0,
      uom_id: item.uom_id,
      unit_price: null,
      line_total: null,
      supplier_reference: null,
      notes: item.notes ?? null,
    }));
  }

  private async validateAndNormalizeItems(items: PurchaseOrderItemDto[], requestItemMap?: Map<number, { material_request_item_id: number; material_id: number; uom_id: number }>): Promise<PurchaseOrderItemDto[]> {
    const normalized: PurchaseOrderItemDto[] = [];

    for (const item of items) {
      const material = await this.materialRepository.findById(item.material_id);
      if (!material) {
        throw new NotFoundError(`Material ${item.material_id} not found`);
      }

      const uom = await this.uomRepository.findById(item.uom_id);
      if (!uom) {
        throw new NotFoundError(`Unit of measure ${item.uom_id} not found`);
      }

      if (item.material_request_item_id !== undefined && item.material_request_item_id !== null) {
        const requestItem = requestItemMap?.get(item.material_request_item_id);
        if (!requestItem) {
          throw new ValidationError(`Material request item ${item.material_request_item_id} is invalid for this purchase order`);
        }

        if (requestItem.material_id !== item.material_id) {
          throw new ValidationError(`Material request item ${item.material_request_item_id} does not match the selected material`);
        }

        if (requestItem.uom_id !== item.uom_id) {
          throw new ValidationError(`Material request item ${item.material_request_item_id} does not match the selected unit of measure`);
        }
      }

      const unitPrice = item.unit_price !== undefined && item.unit_price !== null ? item.unit_price : null;
      const lineTotal = item.line_total !== undefined && item.line_total !== null
        ? item.line_total
        : (unitPrice !== null ? Number((Number(unitPrice) * Number(item.ordered_quantity)).toFixed(2)) : null);

      normalized.push({
        material_request_item_id: item.material_request_item_id ?? null,
        material_id: item.material_id,
        requested_quantity: Number(item.requested_quantity),
        ordered_quantity: Number(item.ordered_quantity),
        received_quantity: item.received_quantity ?? 0,
        uom_id: item.uom_id,
        unit_price: unitPrice,
        line_total: lineTotal,
        supplier_reference: item.supplier_reference ?? null,
        notes: item.notes ?? null,
      });
    }

    return normalized;
  }

  private calculateTotalAmount(items: PurchaseOrderItemDto[]): number | null {
    const total = items.reduce((sum, item) => {
      const line = item.line_total;
      if (line === undefined || line === null) {
        return sum;
      }
      return sum + Number(line);
    }, 0);

    return total > 0 ? Number(total.toFixed(2)) : null;
  }

  private mapListRow(row: any): PurchaseOrderListItemViewModel {
    return {
      purchase_order_id: row.purchase_order_id,
      po_number: row.po_number,
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      material_request_id: row.material_request_id ?? null,
      material_request_number: row.material_request_number ?? null,
      supplier_party_id: row.supplier_party_id,
      supplier_party_code: row.supplier_party_code,
      supplier_party_name: row.supplier_party_name,
      requested_by_account_id: row.requested_by_account_id ?? null,
      requested_by_account_name: row.requested_by_account_name ?? null,
      prepared_at: row.prepared_at ?? null,
      expected_delivery_date: row.expected_delivery_date ?? null,
      order_type_id: row.order_type_id,
      order_type_code: row.order_type_code,
      order_type_name: row.order_type_name,
      status_id: row.status_id,
      status_code: row.status_code,
      status_name: row.status_name,
      total_amount: row.total_amount ?? null,
      notes: row.notes ?? null,
      item_count: row.item_count,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  }

  private mapItemRow(row: any): PurchaseOrderItemViewModel {
    return {
      purchase_order_item_id: row.purchase_order_item_id,
      material_request_item_id: row.material_request_item_id ?? null,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      requested_quantity: row.requested_quantity,
      ordered_quantity: row.ordered_quantity,
      received_quantity: row.received_quantity,
      uom_id: row.uom_id,
      uom_name: row.uom_name,
      uom_abbreviation: row.uom_abbreviation,
      unit_price: row.unit_price ?? null,
      line_total: row.line_total ?? null,
      supplier_reference: row.supplier_reference ?? null,
      notes: row.notes ?? null,
    };
  }

  private async generateOrderNumber(client?: any): Promise<string> {
    const year = new Date().getFullYear();
    const nextSequence = await this.repository.getNextSequenceNumber(year, client);
    const sequence = String(nextSequence + 1).padStart(6, '0');
    return `PO-${year}-${sequence}`;
  }

  private async requireLookup(id: number, type: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== type) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    return lookup;
  }

  private async requireLookupByCode(type: string, code: string, fieldName: string) {
    const lookups = await this.lookupRepository.findByType(type);
    const lookup = lookups.find((item) => item.code === code);
    if (!lookup) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
    return lookup;
  }

  private async assertLookup(id: number, type: string, code: string, fieldName: string) {
    const lookup = await this.lookupRepository.findById(id);
    if (!lookup || lookup.look_up_type !== type || lookup.code !== code) {
      throw new ValidationError(`${fieldName} is invalid`);
    }
  }
}