import { Router } from 'express';
import { MaterialControlController } from '../controllers/materialControl.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new MaterialControlController();

router.get(
  '/',
  requirePermission('Material Control', 'VIEW'),
  (req, res, next) => controller.listMaterialControls(req, res, next)
);

router.get(
  '/:id',
  requirePermission('Material Control', 'VIEW'),
  (req, res, next) => controller.getMaterialControl(req, res, next)
);

router.post(
  '/',
  requirePermission('Material Control', 'CREATE'),
  (req, res, next) => controller.createMaterialControl(req, res, next)
);

router.put(
  '/:id',
  requirePermission('Material Control', 'UPDATE'),
  (req, res, next) => controller.updateMaterialControl(req, res, next)
);

router.delete(
  '/:id',
  requirePermission('Material Control', 'DELETE'),
  (req, res, next) => controller.deleteMaterialControl(req, res, next)
);

export default router;