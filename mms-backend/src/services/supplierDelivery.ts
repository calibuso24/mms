import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { DeliveryAdviceRepository } from '../repositories/deliveryAdvice.js';
import { LookupRepository } from '../repositories/lookup.js';
import { MaterialRequestRepository } from '../repositories/materialRequest.js';
import { PartyRepository } from '../repositories/party.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrder.js';
import { SupplierDeliveryRepository } from '../repositories/supplierDelivery.js';
import {
  CreateSupplierDeliveryDto,
  SupplierDeliveryItemDto,
  SupplierDeliveryItemMutationDto,
  SupplierDeliveryListQuery,
  UpdateSupplierDeliveryDto,
} from '../modules/supplier_delivery/dtos.js';
import {
  SupplierDeliveryDetailViewModel,
  SupplierDeliveryItemReferenceViewModel,
  SupplierDeliveryItemViewModel,
  SupplierDeliveryListItemViewModel,
  SupplierDeliveryListViewModel,
} from '../modules/supplier_delivery/viewModels.js';
import { SupplierDeliveryValidator } from '../modules/supplier_delivery/validators.js';
import { assertOptimisticConcurrency } from '../shared/transaction/concurrency.js';
import { TransactionLifecycleManager } from '../shared/transaction/lifecycle.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'supplier_delivery';
const PROJECT_LOOKUP_TYPE = 'party_type';
const PROJECT_LOOKUP_CODE = 'project';
const SUPPLIER_LOOKUP_CODE = 'supplier';
const STATUS_LOOKUP_TYPE = 'supplier_delivery_status';
const DRAFT_STATUS_CODE = 'draft';
const POSTED_STATUS_CODE = 'posted';
const CANCELLED_STATUS_CODE = 'cancelled';
const REFERENCE_LOOKUP_TYPE = 'supplier_delivery_reference_type';
const lifecycleManager = new TransactionLifecycleManager({
  moduleName: 'Supplier Delivery',
  transitions: {
    draft: ['posted', 'cancelled'],
  },
});

type SourceContext = {
  poIds: Set<number>;
  daIds: Set<number>;
  mrIds: Set<number>;
  poLineMap: Map<string, { material_id: number; uom_id: number }>;
  daLineMap: Map<string, { material_id: number; uom_id: number }>;
  mrLineMap: Map<string, { material_id: number; uom_id: number }>;
};

export class SupplierDeliveryService {
  private repository = new SupplierDeliveryRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private purchaseOrderRepository = new PurchaseOrderRepository();
  private deliveryAdviceRepository = new DeliveryAdviceRepository();
  private materialRequestRepository = new MaterialRequestRepository();
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
    const references = await this.repository.findItemReferencesByDeliveryId(id);
    const purchaseOrders = await this.repository.findPurchaseOrdersByDeliveryId(id);
    const advices = await this.repository.findAdviceByDeliveryId(id);
    const materialRequests = await this.repository.findMaterialRequestsByDeliveryId(id);

    const referencesByItem = new Map<number, SupplierDeliveryItemReferenceViewModel[]>();
    for (const reference of references) {
      const list = referencesByItem.get(reference.supplier_delivery_item_id) ?? [];
      list.push({
        supplier_delivery_item_reference_id: reference.supplier_delivery_item_reference_id,
        reference_type_lookup_id: reference.reference_type_lookup_id,
        reference_type_code: reference.reference_type_code,
        reference_type_name: reference.reference_type_name,
        reference_id: reference.reference_id,
        reference_line_id: reference.reference_line_id,
        quantity: reference.quantity,
        reference_number: reference.reference_number,
        reference_line_number: reference.reference_line_number,
      });
      referencesByItem.set(reference.supplier_delivery_item_id, list);
    }

    return {
      ...this.mapListRow(header),
      items: items.map((item) => this.mapItemRow(item, referencesByItem.get(item.supplier_delivery_item_id) ?? [])),
      purchase_orders: purchaseOrders,
      advices,
      material_requests: materialRequests,
    };
  }

  async createSupplierDelivery(dto: CreateSupplierDeliveryDto, createdByAccountId?: number): Promise<SupplierDeliveryDetailViewModel> {
    SupplierDeliveryValidator.validateCreate(dto);

    const purchaseOrderIds = this.normalizeIdArray(dto.purchase_order_ids);
    const deliveryAdviceIds = this.normalizeIdArray(dto.delivery_advice_ids);
    const materialRequestIds = this.normalizeIdArray(dto.material_request_ids);

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

    const sourceContext = await this.buildSourceContext(
      purchaseOrderIds,
      deliveryAdviceIds,
      materialRequestIds,
      dto.supplier_id,
      dto.project_id
    );
    const normalizedItems = await this.validateAndNormalizeItems(dto.items, sourceContext);
    const draftStatus = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, DRAFT_STATUS_CODE, 'status_id');

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const deliveryNumber = await this.generateDeliveryNumber(client);
      const created = await this.repository.createHeader(
        {
          supplier_delivery_number: deliveryNumber,
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
      await this.repository.replacePurchaseOrders(created.supplier_delivery_id, purchaseOrderIds, createdByAccountId ?? null, MODULE_NAME, client);
      await this.repository.replaceAdvices(created.supplier_delivery_id, deliveryAdviceIds, createdByAccountId ?? null, MODULE_NAME, client);
      await this.repository.replaceMaterialRequests(created.supplier_delivery_id, materialRequestIds, createdByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: created.supplier_delivery_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            supplier_delivery_number: deliveryNumber,
            supplier_id: dto.supplier_id,
            project_id: dto.project_id,
            status_id: draftStatus.look_up_id,
            purchase_order_count: purchaseOrderIds.length,
            delivery_advice_count: deliveryAdviceIds.length,
            material_request_count: materialRequestIds.length,
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

    assertOptimisticConcurrency('Supplier Delivery', dto.expected_updated_at, existing.updated_at);

    if (existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft supplier deliveries can be updated');
    }

    const supplierId = dto.supplier_id ?? existing.supplier_id;
    const projectId = dto.project_id ?? existing.project_id;

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

    const existingPurchaseOrders = await this.repository.findPurchaseOrdersByDeliveryId(id);
    const existingAdvices = await this.repository.findAdviceByDeliveryId(id);
    const existingMaterialRequests = await this.repository.findMaterialRequestsByDeliveryId(id);

    const purchaseOrderIds = dto.purchase_order_ids !== undefined
      ? this.normalizeIdArray(dto.purchase_order_ids)
      : existingPurchaseOrders.map((row) => row.purchase_order_id);
    const deliveryAdviceIds = dto.delivery_advice_ids !== undefined
      ? this.normalizeIdArray(dto.delivery_advice_ids)
      : existingAdvices.map((row) => row.delivery_advice_id);
    const materialRequestIds = dto.material_request_ids !== undefined
      ? this.normalizeIdArray(dto.material_request_ids)
      : existingMaterialRequests.map((row) => row.material_request_id);

    const sourceContext = await this.buildSourceContext(
      purchaseOrderIds,
      deliveryAdviceIds,
      materialRequestIds,
      supplierId,
      projectId
    );

    const normalizedItems = dto.items ? await this.validateAndNormalizeItems(dto.items, sourceContext) : null;

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
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

      if (dto.purchase_order_ids !== undefined) {
        await this.repository.replacePurchaseOrders(id, purchaseOrderIds, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      if (dto.delivery_advice_ids !== undefined) {
        await this.repository.replaceAdvices(id, deliveryAdviceIds, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      if (dto.material_request_ids !== undefined) {
        await this.repository.replaceMaterialRequests(id, materialRequestIds, updatedByAccountId ?? null, MODULE_NAME, client);
      }

      if (normalizedItems) {
        await this.repository.replaceItems(id, normalizedItems, updatedByAccountId ?? null, MODULE_NAME, client);
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

  async postSupplierDelivery(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<SupplierDeliveryDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Delivery not found');
    }

    assertOptimisticConcurrency('Supplier Delivery', expectedUpdatedAt, existing.updated_at);
    lifecycleManager.assertCanTransition(existing.status_code, POSTED_STATUS_CODE);

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

  async cancelSupplierDelivery(id: number, actorAccountId?: number, expectedUpdatedAt?: string | null): Promise<SupplierDeliveryDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Delivery not found');
    }

    assertOptimisticConcurrency('Supplier Delivery', expectedUpdatedAt, existing.updated_at);
    lifecycleManager.assertCanTransition(existing.status_code, CANCELLED_STATUS_CODE);

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

  async addSupplierDeliveryItem(
    deliveryId: number,
    dto: SupplierDeliveryItemMutationDto,
    actorAccountId?: number
  ): Promise<SupplierDeliveryDetailViewModel> {
    SupplierDeliveryValidator.validateItem(dto);

    const delivery = await this.repository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundError('Supplier Delivery not found');
    }
    this.assertDeliveryMutable(delivery.status_code);

    const sourceContext = await this.getSourceContextForDelivery(deliveryId, delivery.supplier_id, delivery.project_id);
    const [normalized] = await this.validateAndNormalizeItems([dto], sourceContext);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const created = await this.repository.createItem(deliveryId, normalized, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: deliveryId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'ADD',
            supplier_delivery_item_id: created.supplier_delivery_item_id,
            material_id: normalized.material_id,
          },
          transactionId,
          notes: 'Supplier Delivery item added',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierDelivery(deliveryId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSupplierDeliveryItem(
    deliveryId: number,
    itemId: number,
    dto: SupplierDeliveryItemMutationDto,
    actorAccountId?: number
  ): Promise<SupplierDeliveryDetailViewModel> {
    SupplierDeliveryValidator.validateItem(dto);

    const delivery = await this.repository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundError('Supplier Delivery not found');
    }
    this.assertDeliveryMutable(delivery.status_code);

    const item = await this.repository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Supplier Delivery item not found');
    }

    const items = await this.repository.findItemsByDeliveryId(deliveryId);
    const belongsToDelivery = items.some((row) => row.supplier_delivery_item_id === itemId);
    if (!belongsToDelivery) {
      throw new ConflictError('Item does not belong to the supplier delivery');
    }

    assertOptimisticConcurrency('Supplier Delivery item', dto.expected_updated_at, item.updated_at);

    const sourceContext = await this.getSourceContextForDelivery(deliveryId, delivery.supplier_id, delivery.project_id);
    const [normalized] = await this.validateAndNormalizeItems([dto], sourceContext);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateItem(itemId, normalized, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: deliveryId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'UPDATE',
            supplier_delivery_item_id: itemId,
            material_id: normalized.material_id,
          },
          transactionId,
          notes: 'Supplier Delivery item updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierDelivery(deliveryId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSupplierDeliveryItem(
    deliveryId: number,
    itemId: number,
    expectedUpdatedAt: string | null | undefined,
    actorAccountId?: number
  ): Promise<SupplierDeliveryDetailViewModel> {
    const delivery = await this.repository.findById(deliveryId);
    if (!delivery) {
      throw new NotFoundError('Supplier Delivery not found');
    }
    this.assertDeliveryMutable(delivery.status_code);

    const item = await this.repository.findItemById(itemId);
    if (!item) {
      throw new NotFoundError('Supplier Delivery item not found');
    }

    const items = await this.repository.findItemsByDeliveryId(deliveryId);
    const belongsToDelivery = items.some((row) => row.supplier_delivery_item_id === itemId);
    if (!belongsToDelivery) {
      throw new ConflictError('Item does not belong to the supplier delivery');
    }

    assertOptimisticConcurrency('Supplier Delivery item', expectedUpdatedAt, item.updated_at);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.softDeleteItem(itemId, actorAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'supplier_delivery',
          entityId: deliveryId,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            item_operation: 'DELETE',
            supplier_delivery_item_id: itemId,
            material_id: item.material_id,
          },
          transactionId,
          notes: 'Supplier Delivery item deleted',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierDelivery(deliveryId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async getSourceContextForDelivery(deliveryId: number, supplierId: number, projectId: number): Promise<SourceContext> {
    const purchaseOrders = await this.repository.findPurchaseOrdersByDeliveryId(deliveryId);
    const advices = await this.repository.findAdviceByDeliveryId(deliveryId);
    const materialRequests = await this.repository.findMaterialRequestsByDeliveryId(deliveryId);

    return this.buildSourceContext(
      purchaseOrders.map((row) => row.purchase_order_id),
      advices.map((row) => row.delivery_advice_id),
      materialRequests.map((row) => row.material_request_id),
      supplierId,
      projectId
    );
  }

  private async buildSourceContext(
    purchaseOrderIds: number[],
    deliveryAdviceIds: number[],
    materialRequestIds: number[],
    supplierId: number,
    projectId: number
  ): Promise<SourceContext> {
    const poIds = new Set<number>(purchaseOrderIds);
    const daIds = new Set<number>(deliveryAdviceIds);
    const mrIds = new Set<number>(materialRequestIds);

    const poLineMap = new Map<string, { material_id: number; uom_id: number }>();
    const daLineMap = new Map<string, { material_id: number; uom_id: number }>();
    const mrLineMap = new Map<string, { material_id: number; uom_id: number }>();

    for (const purchaseOrderId of poIds) {
      const purchaseOrder = await this.purchaseOrderRepository.findById(purchaseOrderId);
      if (!purchaseOrder) {
        throw new ValidationError(`Purchase order ${purchaseOrderId} not found`);
      }
      if (purchaseOrder.supplier_party_id !== supplierId) {
        throw new ValidationError(`Purchase order ${purchaseOrderId} supplier does not match supplier delivery supplier`);
      }
      if (purchaseOrder.project_id !== projectId) {
        throw new ValidationError(`Purchase order ${purchaseOrderId} project does not match supplier delivery project`);
      }

      const poItems = await this.purchaseOrderRepository.findItemsByOrderId(purchaseOrderId);
      for (const poItem of poItems) {
        poLineMap.set(`${purchaseOrderId}:${poItem.purchase_order_item_id}`, {
          material_id: poItem.material_id,
          uom_id: poItem.uom_id,
        });
      }
    }

    for (const deliveryAdviceId of daIds) {
      const advice = await this.deliveryAdviceRepository.findById(deliveryAdviceId);
      if (!advice) {
        throw new ValidationError(`Delivery advice ${deliveryAdviceId} not found`);
      }

      const purchaseOrder = await this.purchaseOrderRepository.findById(advice.purchase_order_id);
      if (!purchaseOrder) {
        throw new ValidationError(`Delivery advice ${deliveryAdviceId} purchase order not found`);
      }
      if (purchaseOrder.supplier_party_id !== supplierId) {
        throw new ValidationError(`Delivery advice ${deliveryAdviceId} supplier does not match supplier delivery supplier`);
      }
      if (purchaseOrder.project_id !== projectId) {
        throw new ValidationError(`Delivery advice ${deliveryAdviceId} project does not match supplier delivery project`);
      }

      const adviceItems = await this.deliveryAdviceRepository.findItemsByAdviceId(deliveryAdviceId);
      for (const adviceItem of adviceItems) {
        daLineMap.set(`${deliveryAdviceId}:${adviceItem.delivery_advice_item_id}`, {
          material_id: adviceItem.material_id,
          uom_id: adviceItem.uom_id,
        });
      }
    }

    for (const materialRequestId of mrIds) {
      const materialRequest = await this.materialRequestRepository.findById(materialRequestId);
      if (!materialRequest) {
        throw new ValidationError(`Material request ${materialRequestId} not found`);
      }
      if (materialRequest.project_id !== projectId) {
        throw new ValidationError(`Material request ${materialRequestId} project does not match supplier delivery project`);
      }

      const requestItems = await this.materialRequestRepository.findItemsByRequestId(materialRequestId);
      for (const requestItem of requestItems) {
        mrLineMap.set(`${materialRequestId}:${requestItem.material_request_item_id}`, {
          material_id: requestItem.material_id,
          uom_id: requestItem.uom_id,
        });
      }
    }

    return {
      poIds,
      daIds,
      mrIds,
      poLineMap,
      daLineMap,
      mrLineMap,
    };
  }

  private async validateAndNormalizeItems(items: SupplierDeliveryItemDto[], sourceContext: SourceContext) {
    const poLookup = await this.requireLookupByCode(REFERENCE_LOOKUP_TYPE, 'po', 'reference_type_code');
    const daLookup = await this.requireLookupByCode(REFERENCE_LOOKUP_TYPE, 'delivery_advice', 'reference_type_code');
    const mrLookup = await this.requireLookupByCode(REFERENCE_LOOKUP_TYPE, 'material_request', 'reference_type_code');

    return items.map((item) => {
      const rejected = item.rejected_quantity ?? item.delivered_quantity - item.accepted_quantity;
      const references = item.references ?? [];

      let referenceQuantitySum = 0;
      const normalizedReferences = references.map((reference) => {
        let referenceTypeLookupId: number;
        if (reference.reference_type_code === 'po') {
          referenceTypeLookupId = poLookup.look_up_id;
          if (!sourceContext.poIds.has(reference.reference_id)) {
            throw new ValidationError(`Reference purchase order ${reference.reference_id} is not selected on this supplier delivery`);
          }
          const line = sourceContext.poLineMap.get(`${reference.reference_id}:${reference.reference_line_id}`);
          if (!line) {
            throw new ValidationError(`Purchase order line ${reference.reference_line_id} does not belong to purchase order ${reference.reference_id}`);
          }
          if (line.material_id !== item.material_id) {
            throw new ValidationError(`PO reference line ${reference.reference_line_id} material does not match receipt item material`);
          }
          if (line.uom_id !== item.uom_id) {
            throw new ValidationError(`PO reference line ${reference.reference_line_id} UOM does not match receipt item UOM`);
          }
        } else if (reference.reference_type_code === 'delivery_advice') {
          referenceTypeLookupId = daLookup.look_up_id;
          if (!sourceContext.daIds.has(reference.reference_id)) {
            throw new ValidationError(`Reference delivery advice ${reference.reference_id} is not selected on this supplier delivery`);
          }
          const line = sourceContext.daLineMap.get(`${reference.reference_id}:${reference.reference_line_id}`);
          if (!line) {
            throw new ValidationError(`Delivery advice line ${reference.reference_line_id} does not belong to delivery advice ${reference.reference_id}`);
          }
          if (line.material_id !== item.material_id) {
            throw new ValidationError(`Delivery advice reference line ${reference.reference_line_id} material does not match receipt item material`);
          }
          if (line.uom_id !== item.uom_id) {
            throw new ValidationError(`Delivery advice reference line ${reference.reference_line_id} UOM does not match receipt item UOM`);
          }
        } else {
          referenceTypeLookupId = mrLookup.look_up_id;
          if (!sourceContext.mrIds.has(reference.reference_id)) {
            throw new ValidationError(`Reference material request ${reference.reference_id} is not selected on this supplier delivery`);
          }
          const line = sourceContext.mrLineMap.get(`${reference.reference_id}:${reference.reference_line_id}`);
          if (!line) {
            throw new ValidationError(`Material request line ${reference.reference_line_id} does not belong to material request ${reference.reference_id}`);
          }
          if (line.material_id !== item.material_id) {
            throw new ValidationError(`Material request reference line ${reference.reference_line_id} material does not match receipt item material`);
          }
          if (line.uom_id !== item.uom_id) {
            throw new ValidationError(`Material request reference line ${reference.reference_line_id} UOM does not match receipt item UOM`);
          }
        }

        referenceQuantitySum += reference.quantity;
        return {
          reference_type_lookup_id: referenceTypeLookupId,
          reference_id: reference.reference_id,
          reference_line_id: reference.reference_line_id,
          quantity: reference.quantity,
        };
      });

      if (normalizedReferences.length > 0 && Math.abs(referenceQuantitySum - item.accepted_quantity) > 0.000001) {
        throw new ValidationError(`Item ${item.material_id}: accepted quantity must equal sum of reference quantities`);
      }

      return {
        material_id: item.material_id,
        material_brand_id: item.material_brand_id ?? null,
        uom_id: item.uom_id,
        delivered_quantity: item.delivered_quantity,
        accepted_quantity: item.accepted_quantity,
        rejected_quantity: rejected,
        notes: item.notes ?? null,
        references: normalizedReferences,
      };
    });
  }

  private normalizeIdArray(input?: number[]): number[] {
    if (!input) {
      return [];
    }

    const unique = new Set<number>();
    input.forEach((id) => {
      if (Number.isInteger(id) && id > 0) {
        unique.add(id);
      }
    });

    return [...unique.values()];
  }

  private assertDeliveryMutable(statusCode: string): void {
    if (statusCode !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft supplier deliveries can be modified');
    }
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
      purchase_order_numbers: Array.isArray(row.purchase_order_numbers) ? row.purchase_order_numbers : [],
      delivery_advice_numbers: Array.isArray(row.delivery_advice_numbers) ? row.delivery_advice_numbers : [],
      material_request_numbers: Array.isArray(row.material_request_numbers) ? row.material_request_numbers : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapItemRow(row: any, references: SupplierDeliveryItemReferenceViewModel[]): SupplierDeliveryItemViewModel {
    return {
      supplier_delivery_item_id: row.supplier_delivery_item_id,
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
      references,
      updated_at: row.updated_at ?? null,
    };
  }
}
