import { Router } from 'express';
import { SupplierDeliveryController } from '../controllers/supplierDelivery.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new SupplierDeliveryController();

router.get('/', requirePermission('Supplier Delivery', 'VIEW'), (req, res, next) => controller.listSupplierDeliveries(req, res, next));
router.get('/:id', requirePermission('Supplier Delivery', 'VIEW'), (req, res, next) => controller.getSupplierDelivery(req, res, next));
router.post('/', requirePermission('Supplier Delivery', 'CREATE'), (req, res, next) => controller.createSupplierDelivery(req, res, next));
router.put('/:id', requirePermission('Supplier Delivery', 'UPDATE'), (req, res, next) => controller.updateSupplierDelivery(req, res, next));
router.delete('/:id', requirePermission('Supplier Delivery', 'DELETE'), (req, res, next) => controller.deleteSupplierDelivery(req, res, next));
router.post('/:id/post', requirePermission('Supplier Delivery', 'APPROVE'), (req, res, next) => controller.postSupplierDelivery(req, res, next));
router.post('/:id/cancel', requirePermission('Supplier Delivery', 'APPROVE'), (req, res, next) => controller.cancelSupplierDelivery(req, res, next));

export default router;
