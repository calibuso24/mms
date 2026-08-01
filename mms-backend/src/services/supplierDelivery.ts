import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PartyRepository } from '../repositories/party.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrder.js';
import { SupplierDeliveryRepository } from '../repositories/supplierDelivery.js';
import {
  CreateSupplierDeliveryDto,
  SupplierDeliveryItemDto,
  SupplierDeliveryListQuery,
  UpdateSupplierDeliveryDto,
} from '../modules/supplier_delivery/dtos.js';
import {
  SupplierDeliveryDetailViewModel,
  SupplierDeliveryItemViewModel,
  SupplierDeliveryListItemViewModel,
  SupplierDeliveryListViewModel,
} from '../modules/supplier_delivery/viewModels.js';
import { SupplierDeliveryValidator } from '../modules/supplier_delivery/validators.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'supplier_delivery';
const PROJECT_LOOKUP_TYPE = 'party_type';
const PROJECT_LOOKUP_CODE = 'project';
const SUPPLIER_LOOKUP_CODE = 'supplier';
const STATUS_LOOKUP_TYPE = 'supplier_delivery_status';
const DRAFT_STATUS_CODE = 'draft';
const POSTED_STATUS_CODE = 'posted';
const CANCELLED_STATUS_CODE = 'cancelled';

export class SupplierDeliveryService {
  private repository = new SupplierDeliveryRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private purchaseOrderRepository = new PurchaseOrderRepository();
  private auditLogRepository = new AuditLogRepository();

  async listSupplierDeliveries(query: SupplierDeliveryListQuery): Promise<SupplierDeliveryListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapListRow(row)),
      total: result.total,
    };
  }

  async getSupplierDelivery(id: number): Promise<SupplierDeliveryDetailViewModel> {
    const header = await this.repository.findById(id);
    if (!header) {
      throw new NotFoundError('Supplier Delivery not found');
    }

    const items = await this.repository.findItemsByDeliveryId(id);
    const advices = await this.repository.findAdviceByDeliveryId(id);

    return {
      ...this.mapListRow(header),
      items: items.map((item) => this.mapItemRow(item)),
      advices,
    };
  }

  async createSupplierDelivery(dto: CreateSupplierDeliveryDto, createdByAccountId?: number): Promise<SupplierDeliveryDetailViewModel> {
    SupplierDeliveryValidator.validateCreate(dto);

    const purchaseOrder = await this.purchaseOrderRepository.findById(dto.purchase_order_id);
    if (!purchaseOrder) {
      throw new NotFoundError('Purchase Order not found');
    }

    const project = await this.partyRepository.findById(dto.project_id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }
    await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');

    const supplier = await this.partyRepository.findById(dto.supplier_id);
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }
    await this.assertLookup(supplier.party_type_id, PROJECT_LOOKUP_TYPE, SUPPLIER_LOOKUP_CODE, 'supplier_id');

    if (purchaseOrder.supplier_party_id !== dto.supplier_id) {
      throw new ValidationError('Supplier does not match purchase order supplier');
    }

    const draftStatus = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, DRAFT_STATUS_CODE, 'status_id');
    const normalizedItems = await this.validateAndNormalizeItems(dto.purchase_order_id, dto.items);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const deliveryNumber = await this.generateDeliveryNumber(client);
      const created = await this.repository.createHeader(
        {
          supplier_delivery_number: deliveryNumber,
          purchase_order_id: dto.purchase_order_id,
          supplier_id: dto.supplier_id,
          project_id: dto.project_id,
          received_by_account_id: dto.received_by_account_id ?? createdByAccountId ?? null,
          delivery_date: dto.delivery_date ?? new Date().toISOString(),
          status_id: draftStatus.look_up_id,
          reference_code: dto.reference_code ?? null,
          notes: dto.notes ?? null,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.repository.replaceItems(created.supplier_delivery_id, normalizedItems, createdByAccountId ?? null, MODULE_NAME, client);

      if (dto.delivery_advice_ids !== undefined) {
        await this.repository.replaceAdvices(created.supplier_delivery_id, dto.delivery_advice_ids, createdByAccountId ?? null, MODULE_NAME, client);
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: created.supplier_delivery_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            supplier_delivery_number: deliveryNumber,
            purchase_order_id: dto.purchase_order_id,
            supplier_id: dto.supplier_id,
            project_id: dto.project_id,
            status_id: draftStatus.look_up_id,
            item_count: normalizedItems.length,
          },
          transactionId,
          notes: 'Supplier Delivery created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierDelivery(created.supplier_delivery_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSupplierDelivery(id: number, dto: UpdateSupplierDeliveryDto, updatedByAccountId?: number): Promise<SupplierDeliveryDetailViewModel> {
    SupplierDeliveryValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Delivery not found');
    }

    if (existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft supplier deliveries can be updated');
    }

    const purchaseOrderId = dto.purchase_order_id ?? existing.purchase_order_id;
    const supplierId = dto.supplier_id ?? existing.supplier_id;

    const purchaseOrder = await this.purchaseOrderRepository.findById(purchaseOrderId);
    if (!purchaseOrder) {
      throw new NotFoundError('Purchase Order not found');
    }

    if (purchaseOrder.supplier_party_id !== supplierId) {
      throw new ValidationError('Supplier does not match purchase order supplier');
    }

    if (dto.project_id !== undefined) {
      const project = await this.partyRepository.findById(dto.project_id);
      if (!project) {
        throw new NotFoundError('Project not found');
      }
      await this.assertLookup(project.party_type_id, PROJECT_LOOKUP_TYPE, PROJECT_LOOKUP_CODE, 'project_id');
    }

    if (dto.supplier_id !== undefined) {
      const supplier = await this.partyRepository.findById(dto.supplier_id);
      if (!supplier) {
        throw new NotFoundError('Supplier not found');
      }
      await this.assertLookup(supplier.party_type_id, PROJECT_LOOKUP_TYPE, SUPPLIER_LOOKUP_CODE, 'supplier_id');
    }

    const normalizedItems = dto.items ? await this.validateAndNormalizeItems(purchaseOrderId, dto.items) : null;

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          purchase_order_id: dto.purchase_order_id,
          supplier_id: dto.supplier_id,
          project_id: dto.project_id,
          received_by_account_id: dto.received_by_account_id,
          delivery_date: dto.delivery_date,
          reference_code: dto.reference_code,
          notes: dto.notes,
        },
        updatedByAccountId ?? null,
        MODULE_NAME,
        client
      );

      if (normalizedItems) {
        await this.repository.replaceItems(id, normalizedItems, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      if (dto.delivery_advice_ids !== undefined) {
        await this.repository.replaceAdvices(id, dto.delivery_advice_ids, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Supplier Delivery updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierDelivery(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSupplierDelivery(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Delivery not found');
    }

    if (existing.status_code !== DRAFT_STATUS_CODE && existing.status_code !== CANCELLED_STATUS_CODE) {
      throw new ConflictError('Only draft or cancelled supplier deliveries can be deleted');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            supplier_delivery_id: id,
            supplier_delivery_number: existing.supplier_delivery_number,
          },
          transactionId,
          notes: 'Supplier Delivery deleted',
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

  async postSupplierDelivery(id: number, actorAccountId?: number): Promise<SupplierDeliveryDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Delivery not found');
    }

    if (existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft supplier deliveries can be posted');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.post(id, actorAccountId ?? null, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: id,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: { status_code: POSTED_STATUS_CODE },
          transactionId,
          notes: 'Supplier Delivery posted',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierDelivery(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelSupplierDelivery(id: number, actorAccountId?: number): Promise<SupplierDeliveryDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Delivery not found');
    }

    if (existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft supplier deliveries can be cancelled');
    }

    const cancelledStatus = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, CANCELLED_STATUS_CODE, 'status_id');
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateStatus(id, cancelledStatus.look_up_id, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: id,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            status_id: cancelledStatus.look_up_id,
            status_code: cancelledStatus.code,
          },
          transactionId,
          notes: 'Supplier Delivery cancelled',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierDelivery(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async validateAndNormalizeItems(purchaseOrderId: number, items: SupplierDeliveryItemDto[]) {
    const poItems = await this.purchaseOrderRepository.findItemsByOrderId(purchaseOrderId);
    const poItemMap = new Map(poItems.map((item) => [item.purchase_order_item_id, item]));

    return items.map((item) => {
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

      const rejected = item.rejected_quantity ?? item.delivered_quantity - item.accepted_quantity;

      return {
        purchase_order_item_id: item.purchase_order_item_id,
        material_id: item.material_id,
        material_brand_id: item.material_brand_id ?? null,
        uom_id: item.uom_id,
        delivered_quantity: item.delivered_quantity,
        accepted_quantity: item.accepted_quantity,
        rejected_quantity: rejected,
        notes: item.notes ?? null,
      };
    });
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

  private async generateDeliveryNumber(client: any): Promise<string> {
    const year = new Date().getFullYear();
    const next = await this.repository.getNextSequenceNumber(year, client);
    return `SD-${year}-${String(next + 1).padStart(6, '0')}`;
  }

  private mapListRow(row: any): SupplierDeliveryListItemViewModel {
    return {
      supplier_delivery_id: row.supplier_delivery_id,
      supplier_delivery_number: row.supplier_delivery_number,
      purchase_order_id: row.purchase_order_id,
      po_number: row.po_number,
      supplier_id: row.supplier_id,
      supplier_code: row.supplier_code,
      supplier_name: row.supplier_name,
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      received_by_account_id: row.received_by_account_id,
      received_by_account_name: row.received_by_account_name,
      delivery_date: row.delivery_date,
      status_id: row.status_id,
      status_code: row.status_code,
      status_name: row.status_name,
      posted_at: row.posted_at,
      posted_by_account_id: row.posted_by_account_id,
      posted_by_account_name: row.posted_by_account_name,
      reference_code: row.reference_code,
      notes: row.notes,
      item_count: row.item_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapItemRow(row: any): SupplierDeliveryItemViewModel {
    return {
      supplier_delivery_item_id: row.supplier_delivery_item_id,
      purchase_order_item_id: row.purchase_order_item_id,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      material_brand_id: row.material_brand_id,
      material_brand_name: row.material_brand_name,
      uom_id: row.uom_id,
      uom_name: row.uom_name,
      uom_abbreviation: row.uom_abbreviation,
      delivered_quantity: row.delivered_quantity,
      accepted_quantity: row.accepted_quantity,
      rejected_quantity: row.rejected_quantity,
      stock_movement_id: row.stock_movement_id,
      notes: row.notes,
    };
  }
}
