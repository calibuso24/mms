import { Router } from 'express';
import { StockTransferController } from '../controllers/stockTransfer.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new StockTransferController();

router.get('/', requirePermission('Stock Transfer', 'VIEW'), (req, res, next) => controller.listStockTransfers(req, res, next));
router.get('/:id', requirePermission('Stock Transfer', 'VIEW'), (req, res, next) => controller.getStockTransfer(req, res, next));
router.post('/', requirePermission('Stock Transfer', 'CREATE'), (req, res, next) => controller.createStockTransfer(req, res, next));
router.put('/:id', requirePermission('Stock Transfer', 'UPDATE'), (req, res, next) => controller.updateStockTransfer(req, res, next));
router.post('/:id/items', requirePermission('Stock Transfer', 'UPDATE'), (req, res, next) => controller.addStockTransferItem(req, res, next));
router.put('/:id/items/:itemId', requirePermission('Stock Transfer', 'UPDATE'), (req, res, next) => controller.updateStockTransferItem(req, res, next));
router.delete('/:id/items/:itemId', requirePermission('Stock Transfer', 'UPDATE'), (req, res, next) => controller.deleteStockTransferItem(req, res, next));
router.delete('/:id', requirePermission('Stock Transfer', 'DELETE'), (req, res, next) => controller.deleteStockTransfer(req, res, next));
router.post('/:id/submit', requirePermission('Stock Transfer', 'UPDATE'), (req, res, next) => controller.submitStockTransfer(req, res, next));
router.post('/:id/approve', requirePermission('Stock Transfer', 'APPROVE'), (req, res, next) => controller.approveStockTransfer(req, res, next));
router.post('/:id/cancel', requirePermission('Stock Transfer', 'APPROVE'), (req, res, next) => controller.cancelStockTransfer(req, res, next));

export default router;
