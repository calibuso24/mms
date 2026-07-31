import { Router } from 'express';
import { MaterialRequestController } from '../controllers/materialRequest.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new MaterialRequestController();

router.get('/', requirePermission('Material Request', 'VIEW'), (req, res, next) => controller.listMaterialRequests(req, res, next));
router.get('/:id', requirePermission('Material Request', 'VIEW'), (req, res, next) => controller.getMaterialRequest(req, res, next));
router.post('/', requirePermission('Material Request', 'CREATE'), (req, res, next) => controller.createMaterialRequest(req, res, next));
router.put('/:id', requirePermission('Material Request', 'UPDATE'), (req, res, next) => controller.updateMaterialRequest(req, res, next));
router.delete('/:id', requirePermission('Material Request', 'DELETE'), (req, res, next) => controller.deleteMaterialRequest(req, res, next));
router.post('/:id/submit', requirePermission('Material Request', 'UPDATE'), (req, res, next) => controller.submitMaterialRequest(req, res, next));
router.post('/:id/approve', requirePermission('Material Request', 'APPROVE'), (req, res, next) => controller.approveMaterialRequest(req, res, next));
router.post('/:id/reject', requirePermission('Material Request', 'APPROVE'), (req, res, next) => controller.rejectMaterialRequest(req, res, next));
router.post('/:id/cancel', requirePermission('Material Request', 'UPDATE'), (req, res, next) => controller.cancelMaterialRequest(req, res, next));
router.post('/:id/close', requirePermission('Material Request', 'UPDATE'), (req, res, next) => controller.closeMaterialRequest(req, res, next));

export default router;