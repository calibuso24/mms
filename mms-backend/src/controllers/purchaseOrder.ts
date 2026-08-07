import { NextFunction, Request, Response } from 'express';
import { PurchaseOrderService } from '../services/purchaseOrder.js';
import { ValidationError } from '../utils/errors.js';

export class PurchaseOrderController {
  private service = new PurchaseOrderService();

  async listPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
      const supplierPartyId = req.query.supplier_party_id ? parseInt(req.query.supplier_party_id as string, 10) : undefined;
      const statusId = req.query.status_id ? parseInt(req.query.status_id as string, 10) : undefined;
      const orderTypeId = req.query.order_type_id ? parseInt(req.query.order_type_id as string, 10) : undefined;

      const result = await this.service.listPurchaseOrders({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
        projectId: Number.isInteger(projectId) ? projectId : undefined,
        supplierPartyId: Number.isInteger(supplierPartyId) ? supplierPartyId : undefined,
        statusId: Number.isInteger(statusId) ? statusId : undefined,
        orderTypeId: Number.isInteger(orderTypeId) ? orderTypeId : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }

      res.json(await this.service.getPurchaseOrder(id));
    } catch (error) {
      next(error);
    }
  }

  async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createPurchaseOrder(
        {
          project_id: Number(req.body.project_id),
          material_request_id: req.body.material_request_id !== undefined && req.body.material_request_id !== null && req.body.material_request_id !== ''
            ? Number(req.body.material_request_id)
            : null,
          supplier_party_id: Number(req.body.supplier_party_id),
          prepared_at: req.body.prepared_at ?? null,
          expected_delivery_date: req.body.expected_delivery_date ?? null,
          order_type_id: Number(req.body.order_type_id),
          total_amount: req.body.total_amount !== undefined && req.body.total_amount !== null && req.body.total_amount !== ''
            ? Number(req.body.total_amount)
            : null,
          notes: req.body.notes ?? null,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_request_item_id:
                  item.material_request_item_id === undefined || item.material_request_item_id === null || item.material_request_item_id === ''
                    ? null
                    : Number(item.material_request_item_id),
                material_id: Number(item.material_id),
                requested_quantity: Number(item.requested_quantity),
                ordered_quantity: Number(item.ordered_quantity),
                received_quantity:
                  item.received_quantity === undefined || item.received_quantity === null || item.received_quantity === ''
                    ? 0
                    : Number(item.received_quantity),
                uom_id: Number(item.uom_id),
                unit_price:
                  item.unit_price === undefined || item.unit_price === null || item.unit_price === ''
                    ? null
                    : Number(item.unit_price),
                line_total:
                  item.line_total === undefined || item.line_total === null || item.line_total === ''
                    ? null
                    : Number(item.line_total),
                supplier_reference: item.supplier_reference ?? null,
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

  async updatePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }

      const result = await this.service.updatePurchaseOrder(
        id,
        {
          project_id: req.body.project_id !== undefined ? Number(req.body.project_id) : undefined,
          material_request_id:
            req.body.material_request_id === undefined
              ? undefined
              : req.body.material_request_id === null || req.body.material_request_id === ''
                ? null
                : Number(req.body.material_request_id),
          supplier_party_id: req.body.supplier_party_id !== undefined ? Number(req.body.supplier_party_id) : undefined,
          prepared_at: req.body.prepared_at ?? undefined,
          expected_delivery_date: req.body.expected_delivery_date ?? undefined,
          order_type_id: req.body.order_type_id !== undefined ? Number(req.body.order_type_id) : undefined,
          total_amount:
            req.body.total_amount === undefined
              ? undefined
              : req.body.total_amount === null || req.body.total_amount === ''
                ? null
                : Number(req.body.total_amount),
          notes: req.body.notes !== undefined ? req.body.notes ?? null : undefined,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_request_item_id:
                  item.material_request_item_id === undefined || item.material_request_item_id === null || item.material_request_item_id === ''
                    ? null
                    : Number(item.material_request_item_id),
                material_id: Number(item.material_id),
                requested_quantity: Number(item.requested_quantity),
                ordered_quantity: Number(item.ordered_quantity),
                received_quantity:
                  item.received_quantity === undefined || item.received_quantity === null || item.received_quantity === ''
                    ? 0
                    : Number(item.received_quantity),
                uom_id: Number(item.uom_id),
                unit_price:
                  item.unit_price === undefined || item.unit_price === null || item.unit_price === ''
                    ? null
                    : Number(item.unit_price),
                line_total:
                  item.line_total === undefined || item.line_total === null || item.line_total === ''
                    ? null
                    : Number(item.line_total),
                supplier_reference: item.supplier_reference ?? null,
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

  async addPurchaseOrderItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }

      const result = await this.service.addPurchaseOrderItem(
        id,
        {
          material_request_item_id:
            req.body.material_request_item_id === undefined || req.body.material_request_item_id === null || req.body.material_request_item_id === ''
              ? null
              : Number(req.body.material_request_item_id),
          material_id: Number(req.body.material_id),
          requested_quantity: Number(req.body.requested_quantity),
          ordered_quantity: Number(req.body.ordered_quantity),
          received_quantity:
            req.body.received_quantity === undefined || req.body.received_quantity === null || req.body.received_quantity === ''
              ? 0
              : Number(req.body.received_quantity),
          uom_id: Number(req.body.uom_id),
          unit_price:
            req.body.unit_price === undefined || req.body.unit_price === null || req.body.unit_price === ''
              ? null
              : Number(req.body.unit_price),
          line_total:
            req.body.line_total === undefined || req.body.line_total === null || req.body.line_total === ''
              ? null
              : Number(req.body.line_total),
          supplier_reference: req.body.supplier_reference ?? null,
          notes: req.body.notes ?? null,
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updatePurchaseOrderItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid purchase order item ID');
      }

      const result = await this.service.updatePurchaseOrderItem(
        id,
        itemId,
        {
          material_request_item_id:
            req.body.material_request_item_id === undefined || req.body.material_request_item_id === null || req.body.material_request_item_id === ''
              ? null
              : Number(req.body.material_request_item_id),
          material_id: Number(req.body.material_id),
          requested_quantity: Number(req.body.requested_quantity),
          ordered_quantity: Number(req.body.ordered_quantity),
          received_quantity:
            req.body.received_quantity === undefined || req.body.received_quantity === null || req.body.received_quantity === ''
              ? 0
              : Number(req.body.received_quantity),
          uom_id: Number(req.body.uom_id),
          unit_price:
            req.body.unit_price === undefined || req.body.unit_price === null || req.body.unit_price === ''
              ? null
              : Number(req.body.unit_price),
          line_total:
            req.body.line_total === undefined || req.body.line_total === null || req.body.line_total === ''
              ? null
              : Number(req.body.line_total),
          supplier_reference: req.body.supplier_reference ?? null,
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

  async deletePurchaseOrderItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid purchase order item ID');
      }

      const result = await this.service.deletePurchaseOrderItem(
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

  async deletePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }

      await this.service.deletePurchaseOrder(id, req.accountId);
      res.json({ message: 'Purchase Order deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async approvePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }

      res.json(await this.service.approvePurchaseOrder(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async cancelPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid purchase order ID');
      }

      res.json(await this.service.cancelPurchaseOrder(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }
}