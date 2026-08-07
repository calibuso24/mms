import { NextFunction, Request, Response } from 'express';
import { DeliveryAdviceService } from '../services/deliveryAdvice.js';
import { ValidationError } from '../utils/errors.js';

export class DeliveryAdviceController {
  private service = new DeliveryAdviceService();

  async listDeliveryAdvices(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const purchaseOrderId = req.query.purchase_order_id ? parseInt(req.query.purchase_order_id as string, 10) : undefined;
      const statusId = req.query.status_id ? parseInt(req.query.status_id as string, 10) : undefined;

      const result = await this.service.listDeliveryAdvices({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
        purchaseOrderId: Number.isInteger(purchaseOrderId) ? purchaseOrderId : undefined,
        statusId: Number.isInteger(statusId) ? statusId : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDeliveryAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }

      res.json(await this.service.getDeliveryAdvice(id));
    } catch (error) {
      next(error);
    }
  }

  async createDeliveryAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createDeliveryAdvice(
        {
          purchase_order_id: Number(req.body.purchase_order_id),
          reference_code: req.body.reference_code,
          issued_at: req.body.issued_at ?? null,
          received_at: req.body.received_at ?? null,
          notes: req.body.notes ?? null,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                purchase_order_item_id:
                  item.purchase_order_item_id === undefined || item.purchase_order_item_id === null || item.purchase_order_item_id === ''
                    ? null
                    : Number(item.purchase_order_item_id),
                material_id: Number(item.material_id),
                material_brand_id:
                  item.material_brand_id === undefined || item.material_brand_id === null || item.material_brand_id === ''
                    ? null
                    : Number(item.material_brand_id),
                uom_id: Number(item.uom_id),
                advised_quantity: Number(item.advised_quantity),
                received_quantity:
                  item.received_quantity === undefined || item.received_quantity === null || item.received_quantity === ''
                    ? 0
                    : Number(item.received_quantity),
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

  async updateDeliveryAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }

      const result = await this.service.updateDeliveryAdvice(
        id,
        {
          purchase_order_id: req.body.purchase_order_id !== undefined ? Number(req.body.purchase_order_id) : undefined,
          reference_code: req.body.reference_code !== undefined ? req.body.reference_code : undefined,
          issued_at: req.body.issued_at ?? undefined,
          received_at: req.body.received_at ?? undefined,
          notes: req.body.notes !== undefined ? req.body.notes ?? null : undefined,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                purchase_order_item_id:
                  item.purchase_order_item_id === undefined || item.purchase_order_item_id === null || item.purchase_order_item_id === ''
                    ? null
                    : Number(item.purchase_order_item_id),
                material_id: Number(item.material_id),
                material_brand_id:
                  item.material_brand_id === undefined || item.material_brand_id === null || item.material_brand_id === ''
                    ? null
                    : Number(item.material_brand_id),
                uom_id: Number(item.uom_id),
                advised_quantity: Number(item.advised_quantity),
                received_quantity:
                  item.received_quantity === undefined || item.received_quantity === null || item.received_quantity === ''
                    ? 0
                    : Number(item.received_quantity),
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

  async addDeliveryAdviceItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }

      const result = await this.service.addDeliveryAdviceItem(
        id,
        {
          purchase_order_item_id:
            req.body.purchase_order_item_id === undefined || req.body.purchase_order_item_id === null || req.body.purchase_order_item_id === ''
              ? null
              : Number(req.body.purchase_order_item_id),
          material_id: Number(req.body.material_id),
          material_brand_id:
            req.body.material_brand_id === undefined || req.body.material_brand_id === null || req.body.material_brand_id === ''
              ? null
              : Number(req.body.material_brand_id),
          uom_id: Number(req.body.uom_id),
          advised_quantity: Number(req.body.advised_quantity),
          received_quantity:
            req.body.received_quantity === undefined || req.body.received_quantity === null || req.body.received_quantity === ''
              ? 0
              : Number(req.body.received_quantity),
          notes: req.body.notes ?? null,
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateDeliveryAdviceItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid delivery advice item ID');
      }

      const result = await this.service.updateDeliveryAdviceItem(
        id,
        itemId,
        {
          purchase_order_item_id:
            req.body.purchase_order_item_id === undefined || req.body.purchase_order_item_id === null || req.body.purchase_order_item_id === ''
              ? null
              : Number(req.body.purchase_order_item_id),
          material_id: Number(req.body.material_id),
          material_brand_id:
            req.body.material_brand_id === undefined || req.body.material_brand_id === null || req.body.material_brand_id === ''
              ? null
              : Number(req.body.material_brand_id),
          uom_id: Number(req.body.uom_id),
          advised_quantity: Number(req.body.advised_quantity),
          received_quantity:
            req.body.received_quantity === undefined || req.body.received_quantity === null || req.body.received_quantity === ''
              ? 0
              : Number(req.body.received_quantity),
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

  async deleteDeliveryAdviceItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid delivery advice item ID');
      }

      const result = await this.service.deleteDeliveryAdviceItem(
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

  async deleteDeliveryAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }

      await this.service.deleteDeliveryAdvice(id, req.accountId);
      res.json({ message: 'Delivery Advice deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async submitDeliveryAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }

      res.json(await this.service.submitDeliveryAdvice(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async completeDeliveryAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }

      res.json(await this.service.completeDeliveryAdvice(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async cancelDeliveryAdvice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid delivery advice ID');
      }

      res.json(await this.service.cancelDeliveryAdvice(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }
}
