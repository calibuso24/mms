import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchaseOrder.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new PurchaseOrderController();

router.get('/', requirePermission('Purchase Order', 'VIEW'), (req, res, next) => controller.listPurchaseOrders(req, res, next));
router.get('/:id', requirePermission('Purchase Order', 'VIEW'), (req, res, next) => controller.getPurchaseOrder(req, res, next));
router.post('/', requirePermission('Purchase Order', 'CREATE'), (req, res, next) => controller.createPurchaseOrder(req, res, next));
router.put('/:id', requirePermission('Purchase Order', 'UPDATE'), (req, res, next) => controller.updatePurchaseOrder(req, res, next));
router.delete('/:id', requirePermission('Purchase Order', 'DELETE'), (req, res, next) => controller.deletePurchaseOrder(req, res, next));
router.post('/:id/approve', requirePermission('Purchase Order', 'APPROVE'), (req, res, next) => controller.approvePurchaseOrder(req, res, next));
router.post('/:id/cancel', requirePermission('Purchase Order', 'APPROVE'), (req, res, next) => controller.cancelPurchaseOrder(req, res, next));

export default router;