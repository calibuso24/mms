import { NextFunction, Request, Response } from 'express';
import { StockTransferService } from '../services/stockTransfer.js';
import { ValidationError } from '../utils/errors.js';

export class StockTransferController {
  private service = new StockTransferService();

  async listStockTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const transferTypeId = req.query.transfer_type_id ? parseInt(req.query.transfer_type_id as string, 10) : undefined;
      const sourceId = req.query.source_id ? parseInt(req.query.source_id as string, 10) : undefined;
      const destinationId = req.query.destination_id ? parseInt(req.query.destination_id as string, 10) : undefined;
      const statusId = req.query.status_id ? parseInt(req.query.status_id as string, 10) : undefined;

      const result = await this.service.listStockTransfers({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
        transferTypeId: Number.isInteger(transferTypeId) ? transferTypeId : undefined,
        sourceId: Number.isInteger(sourceId) ? sourceId : undefined,
        destinationId: Number.isInteger(destinationId) ? destinationId : undefined,
        statusId: Number.isInteger(statusId) ? statusId : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }

      res.json(await this.service.getStockTransfer(id));
    } catch (error) {
      next(error);
    }
  }

  async createStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createStockTransfer(
        {
          transfer_type_id: Number(req.body.transfer_type_id),
          source_id: Number(req.body.source_id),
          destination_id: Number(req.body.destination_id),
          project_id: req.body.project_id ? Number(req.body.project_id) : null,
          purchase_order_id: req.body.purchase_order_id ? Number(req.body.purchase_order_id) : null,
          delivery_advice_id: req.body.delivery_advice_id ? Number(req.body.delivery_advice_id) : null,
          material_request_id: req.body.material_request_id ? Number(req.body.material_request_id) : null,
          job_order_id: req.body.job_order_id ? Number(req.body.job_order_id) : null,
          prepared_by_account_id: req.body.prepared_by_account_id ? Number(req.body.prepared_by_account_id) : null,
          transfer_date: req.body.transfer_date ?? null,
          reference_code: req.body.reference_code ?? null,
          notes: req.body.notes ?? null,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                purchase_order_item_id: item.purchase_order_item_id ? Number(item.purchase_order_item_id) : null,
                material_request_item_id: item.material_request_item_id ? Number(item.material_request_item_id) : null,
                material_id: Number(item.material_id),
                material_brand_id: item.material_brand_id ? Number(item.material_brand_id) : null,
                uom_id: Number(item.uom_id),
                quantity: Number(item.quantity),
                notes: item.notes ?? null,
              }))
            : [],
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }

      const result = await this.service.updateStockTransfer(
        id,
        {
          transfer_type_id: req.body.transfer_type_id !== undefined ? Number(req.body.transfer_type_id) : undefined,
          source_id: req.body.source_id !== undefined ? Number(req.body.source_id) : undefined,
          destination_id: req.body.destination_id !== undefined ? Number(req.body.destination_id) : undefined,
          project_id: req.body.project_id !== undefined ? (req.body.project_id ? Number(req.body.project_id) : null) : undefined,
          purchase_order_id: req.body.purchase_order_id !== undefined ? (req.body.purchase_order_id ? Number(req.body.purchase_order_id) : null) : undefined,
          delivery_advice_id: req.body.delivery_advice_id !== undefined ? (req.body.delivery_advice_id ? Number(req.body.delivery_advice_id) : null) : undefined,
          material_request_id: req.body.material_request_id !== undefined ? (req.body.material_request_id ? Number(req.body.material_request_id) : null) : undefined,
          job_order_id: req.body.job_order_id !== undefined ? (req.body.job_order_id ? Number(req.body.job_order_id) : null) : undefined,
          prepared_by_account_id: req.body.prepared_by_account_id !== undefined ? (req.body.prepared_by_account_id ? Number(req.body.prepared_by_account_id) : null) : undefined,
          transfer_date: req.body.transfer_date ?? undefined,
          reference_code: req.body.reference_code !== undefined ? req.body.reference_code ?? null : undefined,
          notes: req.body.notes !== undefined ? req.body.notes ?? null : undefined,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                purchase_order_item_id: item.purchase_order_item_id ? Number(item.purchase_order_item_id) : null,
                material_request_item_id: item.material_request_item_id ? Number(item.material_request_item_id) : null,
                material_id: Number(item.material_id),
                material_brand_id: item.material_brand_id ? Number(item.material_brand_id) : null,
                uom_id: Number(item.uom_id),
                quantity: Number(item.quantity),
                notes: item.notes ?? null,
              }))
            : undefined,
        },
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async addStockTransferItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }

      const result = await this.service.addStockTransferItem(
        id,
        {
          purchase_order_item_id: req.body.purchase_order_item_id ? Number(req.body.purchase_order_item_id) : null,
          material_request_item_id: req.body.material_request_item_id ? Number(req.body.material_request_item_id) : null,
          material_id: Number(req.body.material_id),
          material_brand_id: req.body.material_brand_id ? Number(req.body.material_brand_id) : null,
          uom_id: Number(req.body.uom_id),
          quantity: Number(req.body.quantity),
          notes: req.body.notes ?? null,
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateStockTransferItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid stock transfer item ID');
      }

      const result = await this.service.updateStockTransferItem(
        id,
        itemId,
        {
          purchase_order_item_id: req.body.purchase_order_item_id ? Number(req.body.purchase_order_item_id) : null,
          material_request_item_id: req.body.material_request_item_id ? Number(req.body.material_request_item_id) : null,
          material_id: Number(req.body.material_id),
          material_brand_id: req.body.material_brand_id ? Number(req.body.material_brand_id) : null,
          uom_id: Number(req.body.uom_id),
          quantity: Number(req.body.quantity),
          notes: req.body.notes ?? null,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
        },
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteStockTransferItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid stock transfer item ID');
      }

      const result = await this.service.deleteStockTransferItem(
        id,
        itemId,
        req.body?.expected_updated_at ?? undefined,
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }

      await this.service.deleteStockTransfer(id, req.accountId);
      res.json({ message: 'Stock Transfer deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async submitStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }

      res.json(await this.service.submitStockTransfer(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async approveStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }

      res.json(await this.service.approveStockTransfer(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async cancelStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid stock transfer ID');
      }

      res.json(await this.service.cancelStockTransfer(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }
}
