import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PartyRepository } from '../repositories/party.js';
import { PurchaseOrderRepository } from '../repositories/purchaseOrder.js';
import { StockTransferRepository } from '../repositories/stockTransfer.js';
import {
  CreateStockTransferDto,
  StockTransferItemDto,
  StockTransferListQuery,
  UpdateStockTransferDto,
} from '../modules/stock_transfer/dtos.js';
import {
  StockTransferDetailViewModel,
  StockTransferItemViewModel,
  StockTransferListItemViewModel,
  StockTransferListViewModel,
} from '../modules/stock_transfer/viewModels.js';
import { StockTransferValidator } from '../modules/stock_transfer/validators.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const MODULE_NAME = 'stock_transfer';
const TYPE_LOOKUP_TYPE = 'stock_transfer_type';
const STATUS_LOOKUP_TYPE = 'stock_transfer_status';
const DRAFT_STATUS_CODE = 'draft';
const SUBMITTED_STATUS_CODE = 'submitted';
const APPROVED_STATUS_CODE = 'approved';
const CANCELLED_STATUS_CODE = 'cancelled';

export class StockTransferService {
  private repository = new StockTransferRepository();
  private lookupRepository = new LookupRepository();
  private partyRepository = new PartyRepository();
  private purchaseOrderRepository = new PurchaseOrderRepository();
  private auditLogRepository = new AuditLogRepository();

  async listStockTransfers(query: StockTransferListQuery): Promise<StockTransferListViewModel> {
    const result = await this.repository.findAllPaginated(query);
    return {
      items: result.rows.map((row) => this.mapListRow(row)),
      total: result.total,
    };
  }

  async getStockTransfer(id: number): Promise<StockTransferDetailViewModel> {
    const header = await this.repository.findById(id);
    if (!header) {
      throw new NotFoundError('Stock Transfer not found');
    }

    const items = await this.repository.findItemsByTransferId(id);
    return {
      ...this.mapListRow(header),
      items: items.map((item) => this.mapItemRow(item)),
    };
  }

  async createStockTransfer(dto: CreateStockTransferDto, createdByAccountId?: number): Promise<StockTransferDetailViewModel> {
    StockTransferValidator.validateCreate(dto);

    await this.assertParty(dto.source_id, 'source_id');
    await this.assertParty(dto.destination_id, 'destination_id');

    const transferType = await this.requireLookup(dto.transfer_type_id, TYPE_LOOKUP_TYPE, 'transfer_type_id');
    const draftStatus = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, DRAFT_STATUS_CODE, 'status_id');

    const normalizedItems = await this.validateAndNormalizeItems(dto.purchase_order_id ?? null, dto.items);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const stockTransferNumber = await this.generateTransferNumber(client);
      const created = await this.repository.createHeader(
        {
          stock_transfer_number: stockTransferNumber,
          transfer_type_id: transferType.look_up_id,
          source_id: dto.source_id,
          destination_id: dto.destination_id,
          project_id: dto.project_id ?? null,
          purchase_order_id: dto.purchase_order_id ?? null,
          delivery_advice_id: dto.delivery_advice_id ?? null,
          material_request_id: dto.material_request_id ?? null,
          job_order_id: dto.job_order_id ?? null,
          prepared_by_account_id: dto.prepared_by_account_id ?? createdByAccountId ?? null,
          transfer_date: dto.transfer_date ?? new Date().toISOString(),
          status_id: draftStatus.look_up_id,
          reference_code: dto.reference_code ?? null,
          notes: dto.notes ?? null,
        },
        createdByAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.repository.replaceItems(created.stock_transfer_id, normalizedItems, createdByAccountId ?? null, MODULE_NAME, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'stock_transfer',
          entityId: created.stock_transfer_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            stock_transfer_number: stockTransferNumber,
            transfer_type_id: transferType.look_up_id,
            source_id: dto.source_id,
            destination_id: dto.destination_id,
            status_id: draftStatus.look_up_id,
            item_count: normalizedItems.length,
          },
          transactionId,
          notes: 'Stock Transfer created',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getStockTransfer(created.stock_transfer_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStockTransfer(id: number, dto: UpdateStockTransferDto, updatedByAccountId?: number): Promise<StockTransferDetailViewModel> {
    StockTransferValidator.validateUpdate(dto);

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Stock Transfer not found');
    }

    if (existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft stock transfers can be updated');
    }

    const sourceId = dto.source_id ?? existing.source_id;
    const destinationId = dto.destination_id ?? existing.destination_id;
    if (sourceId === destinationId) {
      throw new ValidationError('Source and destination must be different');
    }

    if (dto.source_id !== undefined) await this.assertParty(dto.source_id, 'source_id');
    if (dto.destination_id !== undefined) await this.assertParty(dto.destination_id, 'destination_id');

    if (dto.transfer_type_id !== undefined) {
      await this.requireLookup(dto.transfer_type_id, TYPE_LOOKUP_TYPE, 'transfer_type_id');
    }

    const purchaseOrderId = dto.purchase_order_id === undefined ? existing.purchase_order_id : dto.purchase_order_id;
    const normalizedItems = dto.items ? await this.validateAndNormalizeItems(purchaseOrderId, dto.items) : null;

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        {
          transfer_type_id: dto.transfer_type_id,
          source_id: dto.source_id,
          destination_id: dto.destination_id,
          project_id: dto.project_id,
          purchase_order_id: dto.purchase_order_id,
          delivery_advice_id: dto.delivery_advice_id,
          material_request_id: dto.material_request_id,
          job_order_id: dto.job_order_id,
          prepared_by_account_id: dto.prepared_by_account_id,
          transfer_date: dto.transfer_date,
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

      await this.auditLogRepository.create(
        {
          entityTable: 'stock_transfer',
          entityId: id,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: { ...dto },
          transactionId,
          notes: 'Stock Transfer updated',
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getStockTransfer(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteStockTransfer(id: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Stock Transfer not found');
    }

    if (existing.status_code !== DRAFT_STATUS_CODE && existing.status_code !== CANCELLED_STATUS_CODE) {
      throw new ConflictError('Only draft or cancelled stock transfers can be deleted');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');
      await this.repository.softDelete(id, deletedByAccountId ?? null, MODULE_NAME, client);
      await this.auditLogRepository.create(
        {
          entityTable: 'stock_transfer',
          entityId: id,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            stock_transfer_id: id,
            stock_transfer_number: existing.stock_transfer_number,
          },
          transactionId,
          notes: 'Stock Transfer deleted',
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

  async submitStockTransfer(id: number, actorAccountId?: number): Promise<StockTransferDetailViewModel> {
    return this.transitionStatus(id, SUBMITTED_STATUS_CODE, actorAccountId);
  }

  async approveStockTransfer(id: number, actorAccountId?: number): Promise<StockTransferDetailViewModel> {
    return this.transitionStatus(id, APPROVED_STATUS_CODE, actorAccountId);
  }

  async cancelStockTransfer(id: number, actorAccountId?: number): Promise<StockTransferDetailViewModel> {
    return this.transitionStatus(id, CANCELLED_STATUS_CODE, actorAccountId);
  }

  private async transitionStatus(id: number, targetStatusCode: string, actorAccountId?: number): Promise<StockTransferDetailViewModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Stock Transfer not found');
    }

    if (targetStatusCode === SUBMITTED_STATUS_CODE && existing.status_code !== DRAFT_STATUS_CODE) {
      throw new ConflictError('Only draft stock transfers can be submitted');
    }

    if (targetStatusCode === APPROVED_STATUS_CODE && existing.status_code !== SUBMITTED_STATUS_CODE) {
      throw new ConflictError('Only submitted stock transfers can be approved');
    }

    if (targetStatusCode === CANCELLED_STATUS_CODE && !new Set([DRAFT_STATUS_CODE, SUBMITTED_STATUS_CODE]).has(existing.status_code)) {
      throw new ConflictError('Only draft or submitted stock transfers can be cancelled');
    }

    const status = await this.requireLookupByCode(STATUS_LOOKUP_TYPE, targetStatusCode, 'status_id');
    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.repository.updateHeader(
        id,
        { status_id: status.look_up_id },
        actorAccountId ?? null,
        MODULE_NAME,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'stock_transfer',
          entityId: id,
          operation: 'UPDATE',
          changedBy: actorAccountId ?? null,
          changes: {
            status_id: status.look_up_id,
            status_code: status.code,
          },
          transactionId,
          notes: `Stock Transfer ${status.name.toLowerCase()}`,
          moduleName: MODULE_NAME,
        },
        client
      );

      await client.query('COMMIT');
      return this.getStockTransfer(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async assertParty(id: number, fieldName: string): Promise<void> {
    const party = await this.partyRepository.findById(id);
    if (!party) {
      throw new NotFoundError(`${fieldName} party not found`);
    }
  }

  private async validateAndNormalizeItems(purchaseOrderId: number | null, items: StockTransferItemDto[]) {
    const poItems = purchaseOrderId ? await this.purchaseOrderRepository.findItemsByOrderId(purchaseOrderId) : [];
    const poItemMap = new Map(poItems.map((item) => [item.purchase_order_item_id, item]));

    return items.map((item) => {
      if (purchaseOrderId && item.purchase_order_item_id) {
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
        material_request_item_id: item.material_request_item_id ?? null,
        material_id: item.material_id,
        material_brand_id: item.material_brand_id ?? null,
        uom_id: item.uom_id,
        quantity: item.quantity,
        notes: item.notes ?? null,
      };
    });
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

  private async generateTransferNumber(client: any): Promise<string> {
    const year = new Date().getFullYear();
    const next = await this.repository.getNextSequenceNumber(year, client);
    return `ST-${year}-${String(next + 1).padStart(6, '0')}`;
  }

  private mapListRow(row: any): StockTransferListItemViewModel {
    return {
      stock_transfer_id: row.stock_transfer_id,
      stock_transfer_number: row.stock_transfer_number,
      transfer_type_id: row.transfer_type_id,
      transfer_type_code: row.transfer_type_code,
      transfer_type_name: row.transfer_type_name,
      source_id: row.source_id,
      source_code: row.source_code,
      source_name: row.source_name,
      destination_id: row.destination_id,
      destination_code: row.destination_code,
      destination_name: row.destination_name,
      project_id: row.project_id,
      project_code: row.project_code,
      project_name: row.project_name,
      purchase_order_id: row.purchase_order_id,
      po_number: row.po_number,
      delivery_advice_id: row.delivery_advice_id,
      da_number: row.da_number,
      material_request_id: row.material_request_id,
      mr_number: row.mr_number,
      status_id: row.status_id,
      status_code: row.status_code,
      status_name: row.status_name,
      transfer_date: row.transfer_date,
      reference_code: row.reference_code,
      notes: row.notes,
      item_count: row.item_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapItemRow(row: any): StockTransferItemViewModel {
    return {
      stock_transfer_item_id: row.stock_transfer_item_id,
      purchase_order_item_id: row.purchase_order_item_id,
      material_request_item_id: row.material_request_item_id,
      material_id: row.material_id,
      material_code: row.material_code,
      material_name: row.material_name,
      material_brand_id: row.material_brand_id,
      material_brand_name: row.material_brand_name,
      uom_id: row.uom_id,
      uom_name: row.uom_name,
      uom_abbreviation: row.uom_abbreviation,
      quantity: row.quantity,
      notes: row.notes,
    };
  }
}
