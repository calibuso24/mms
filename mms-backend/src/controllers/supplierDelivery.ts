import { NextFunction, Request, Response } from 'express';
import { SupplierDeliveryService } from '../services/supplierDelivery.js';
import { ValidationError } from '../utils/errors.js';

export class SupplierDeliveryController {
  private service = new SupplierDeliveryService();

  async listSupplierDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';
      const purchaseOrderId = req.query.purchase_order_id ? parseInt(req.query.purchase_order_id as string, 10) : undefined;
      const supplierId = req.query.supplier_id ? parseInt(req.query.supplier_id as string, 10) : undefined;
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
      const statusId = req.query.status_id ? parseInt(req.query.status_id as string, 10) : undefined;

      const result = await this.service.listSupplierDeliveries({
        limit,
        offset,
        search,
        sortBy,
        sortDir,
        purchaseOrderId: Number.isInteger(purchaseOrderId) ? purchaseOrderId : undefined,
        supplierId: Number.isInteger(supplierId) ? supplierId : undefined,
        projectId: Number.isInteger(projectId) ? projectId : undefined,
        statusId: Number.isInteger(statusId) ? statusId : undefined,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSupplierDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }

      res.json(await this.service.getSupplierDelivery(id));
    } catch (error) {
      next(error);
    }
  }

  async createSupplierDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.createSupplierDelivery(
        {
          supplier_id: Number(req.body.supplier_id),
          project_id: Number(req.body.project_id),
          received_by_account_id:
            req.body.received_by_account_id === undefined || req.body.received_by_account_id === null || req.body.received_by_account_id === ''
              ? null
              : Number(req.body.received_by_account_id),
          delivery_date: req.body.delivery_date ?? null,
          reference_code: req.body.reference_code ?? null,
          notes: req.body.notes ?? null,
          purchase_order_ids: Array.isArray(req.body.purchase_order_ids)
            ? req.body.purchase_order_ids.map((id: any) => Number(id))
            : undefined,
          delivery_advice_ids: Array.isArray(req.body.delivery_advice_ids)
            ? req.body.delivery_advice_ids.map((id: any) => Number(id))
            : undefined,
          material_request_ids: Array.isArray(req.body.material_request_ids)
            ? req.body.material_request_ids.map((id: any) => Number(id))
            : undefined,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_id: Number(item.material_id),
                material_brand_id:
                  item.material_brand_id === undefined || item.material_brand_id === null || item.material_brand_id === ''
                    ? null
                    : Number(item.material_brand_id),
                uom_id: Number(item.uom_id),
                delivered_quantity: Number(item.delivered_quantity),
                accepted_quantity: Number(item.accepted_quantity),
                rejected_quantity:
                  item.rejected_quantity === undefined || item.rejected_quantity === null || item.rejected_quantity === ''
                    ? undefined
                    : Number(item.rejected_quantity),
                notes: item.notes ?? null,
                references: Array.isArray(item.references)
                  ? item.references.map((reference: any) => ({
                      reference_type_code: reference.reference_type_code,
                      reference_id: Number(reference.reference_id),
                      reference_line_id: Number(reference.reference_line_id),
                      quantity: Number(reference.quantity),
                    }))
                  : undefined,
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

  async updateSupplierDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }

      const result = await this.service.updateSupplierDelivery(
        id,
        {
          supplier_id: req.body.supplier_id !== undefined ? Number(req.body.supplier_id) : undefined,
          project_id: req.body.project_id !== undefined ? Number(req.body.project_id) : undefined,
          received_by_account_id:
            req.body.received_by_account_id === undefined
              ? undefined
              : req.body.received_by_account_id === null || req.body.received_by_account_id === ''
                ? null
                : Number(req.body.received_by_account_id),
          delivery_date: req.body.delivery_date ?? undefined,
          reference_code: req.body.reference_code !== undefined ? req.body.reference_code ?? null : undefined,
          notes: req.body.notes !== undefined ? req.body.notes ?? null : undefined,
          purchase_order_ids: Array.isArray(req.body.purchase_order_ids)
            ? req.body.purchase_order_ids.map((id: any) => Number(id))
            : undefined,
          delivery_advice_ids: Array.isArray(req.body.delivery_advice_ids)
            ? req.body.delivery_advice_ids.map((adviceId: any) => Number(adviceId))
            : undefined,
          material_request_ids: Array.isArray(req.body.material_request_ids)
            ? req.body.material_request_ids.map((requestId: any) => Number(requestId))
            : undefined,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
          items: Array.isArray(req.body.items)
            ? req.body.items.map((item: any) => ({
                material_id: Number(item.material_id),
                material_brand_id:
                  item.material_brand_id === undefined || item.material_brand_id === null || item.material_brand_id === ''
                    ? null
                    : Number(item.material_brand_id),
                uom_id: Number(item.uom_id),
                delivered_quantity: Number(item.delivered_quantity),
                accepted_quantity: Number(item.accepted_quantity),
                rejected_quantity:
                  item.rejected_quantity === undefined || item.rejected_quantity === null || item.rejected_quantity === ''
                    ? undefined
                    : Number(item.rejected_quantity),
                notes: item.notes ?? null,
                references: Array.isArray(item.references)
                  ? item.references.map((reference: any) => ({
                      reference_type_code: reference.reference_type_code,
                      reference_id: Number(reference.reference_id),
                      reference_line_id: Number(reference.reference_line_id),
                      quantity: Number(reference.quantity),
                    }))
                  : undefined,
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

  async addSupplierDeliveryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }

      const result = await this.service.addSupplierDeliveryItem(
        id,
        {
          material_id: Number(req.body.material_id),
          material_brand_id:
            req.body.material_brand_id === undefined || req.body.material_brand_id === null || req.body.material_brand_id === ''
              ? null
              : Number(req.body.material_brand_id),
          uom_id: Number(req.body.uom_id),
          delivered_quantity: Number(req.body.delivered_quantity),
          accepted_quantity: Number(req.body.accepted_quantity),
          rejected_quantity:
            req.body.rejected_quantity === undefined || req.body.rejected_quantity === null || req.body.rejected_quantity === ''
              ? undefined
              : Number(req.body.rejected_quantity),
          notes: req.body.notes ?? null,
          references: Array.isArray(req.body.references)
            ? req.body.references.map((reference: any) => ({
                reference_type_code: reference.reference_type_code,
                reference_id: Number(reference.reference_id),
                reference_line_id: Number(reference.reference_line_id),
                quantity: Number(reference.quantity),
              }))
            : undefined,
        },
        req.accountId
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateSupplierDeliveryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid supplier delivery item ID');
      }

      const result = await this.service.updateSupplierDeliveryItem(
        id,
        itemId,
        {
          material_id: Number(req.body.material_id),
          material_brand_id:
            req.body.material_brand_id === undefined || req.body.material_brand_id === null || req.body.material_brand_id === ''
              ? null
              : Number(req.body.material_brand_id),
          uom_id: Number(req.body.uom_id),
          delivered_quantity: Number(req.body.delivered_quantity),
          accepted_quantity: Number(req.body.accepted_quantity),
          rejected_quantity:
            req.body.rejected_quantity === undefined || req.body.rejected_quantity === null || req.body.rejected_quantity === ''
              ? undefined
              : Number(req.body.rejected_quantity),
          notes: req.body.notes ?? null,
          references: Array.isArray(req.body.references)
            ? req.body.references.map((reference: any) => ({
                reference_type_code: reference.reference_type_code,
                reference_id: Number(reference.reference_id),
                reference_line_id: Number(reference.reference_line_id),
                quantity: Number(reference.quantity),
              }))
            : undefined,
          expected_updated_at: req.body.expected_updated_at ?? undefined,
        },
        req.accountId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteSupplierDeliveryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const itemId = parseInt(req.params.itemId, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }
      if (Number.isNaN(itemId)) {
        throw new ValidationError('Invalid supplier delivery item ID');
      }

      const result = await this.service.deleteSupplierDeliveryItem(
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

  async deleteSupplierDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }

      await this.service.deleteSupplierDelivery(id, req.accountId);
      res.json({ message: 'Supplier Delivery deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async postSupplierDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }

      res.json(await this.service.postSupplierDelivery(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }

  async cancelSupplierDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        throw new ValidationError('Invalid supplier delivery ID');
      }

      res.json(await this.service.cancelSupplierDelivery(id, req.accountId, req.body?.expected_updated_at ?? undefined));
    } catch (error) {
      next(error);
    }
  }
}
