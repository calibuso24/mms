import { Router } from 'express';
import { DeliveryAdviceController } from '../controllers/deliveryAdvice.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new DeliveryAdviceController();

router.get('/', requirePermission('Delivery Advice', 'VIEW'), (req, res, next) => controller.listDeliveryAdvices(req, res, next));
router.get('/:id', requirePermission('Delivery Advice', 'VIEW'), (req, res, next) => controller.getDeliveryAdvice(req, res, next));
router.post('/', requirePermission('Delivery Advice', 'CREATE'), (req, res, next) => controller.createDeliveryAdvice(req, res, next));
router.put('/:id', requirePermission('Delivery Advice', 'UPDATE'), (req, res, next) => controller.updateDeliveryAdvice(req, res, next));
router.post('/:id/items', requirePermission('Delivery Advice', 'UPDATE'), (req, res, next) => controller.addDeliveryAdviceItem(req, res, next));
router.put('/:id/items/:itemId', requirePermission('Delivery Advice', 'UPDATE'), (req, res, next) => controller.updateDeliveryAdviceItem(req, res, next));
router.delete('/:id/items/:itemId', requirePermission('Delivery Advice', 'UPDATE'), (req, res, next) => controller.deleteDeliveryAdviceItem(req, res, next));
router.delete('/:id', requirePermission('Delivery Advice', 'DELETE'), (req, res, next) => controller.deleteDeliveryAdvice(req, res, next));
router.post('/:id/submit', requirePermission('Delivery Advice', 'UPDATE'), (req, res, next) => controller.submitDeliveryAdvice(req, res, next));
router.post('/:id/complete', requirePermission('Delivery Advice', 'UPDATE'), (req, res, next) => controller.completeDeliveryAdvice(req, res, next));
router.post('/:id/cancel', requirePermission('Delivery Advice', 'UPDATE'), (req, res, next) => controller.cancelDeliveryAdvice(req, res, next));

export default router;
