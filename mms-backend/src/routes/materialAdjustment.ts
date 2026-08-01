import { Router } from 'express';
import { MaterialAdjustmentController } from '../controllers/materialAdjustment.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new MaterialAdjustmentController();

router.get('/', requirePermission('Inventory Adjustment', 'VIEW'), (req, res, next) => controller.listMaterialAdjustments(req, res, next));
router.get('/:id', requirePermission('Inventory Adjustment', 'VIEW'), (req, res, next) => controller.getMaterialAdjustment(req, res, next));
router.post('/', requirePermission('Inventory Adjustment', 'CREATE'), (req, res, next) => controller.createMaterialAdjustment(req, res, next));
router.put('/:id', requirePermission('Inventory Adjustment', 'UPDATE'), (req, res, next) => controller.updateMaterialAdjustment(req, res, next));
router.delete('/:id', requirePermission('Inventory Adjustment', 'DELETE'), (req, res, next) => controller.deleteMaterialAdjustment(req, res, next));
router.post('/:id/approve', requirePermission('Inventory Adjustment', 'APPROVE'), (req, res, next) => controller.approveMaterialAdjustment(req, res, next));
router.post('/:id/reject', requirePermission('Inventory Adjustment', 'APPROVE'), (req, res, next) => controller.rejectMaterialAdjustment(req, res, next));
router.post('/:id/complete', requirePermission('Inventory Adjustment', 'APPROVE'), (req, res, next) => controller.completeMaterialAdjustment(req, res, next));

export default router;
