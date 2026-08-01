import { Router } from 'express';
import multer from 'multer';
import { MaterialControlController } from '../controllers/materialControl.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new MaterialControlController();
const upload = multer({ storage: multer.memoryStorage() });

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

router.get(
  '/:id/items',
  requirePermission('Material Control', 'VIEW'),
  (req, res, next) => controller.listMaterialControlItems(req, res, next)
);

router.get(
  '/items/:id',
  requirePermission('Material Control', 'VIEW'),
  (req, res, next) => controller.getMaterialControlItem(req, res, next)
);

router.post(
  '/items',
  requirePermission('Material Control', 'CREATE'),
  (req, res, next) => controller.createMaterialControlItem(req, res, next)
);

router.put(
  '/items/:id',
  requirePermission('Material Control', 'UPDATE'),
  (req, res, next) => controller.updateMaterialControlItem(req, res, next)
);

router.delete(
  '/items/:id',
  requirePermission('Material Control', 'DELETE'),
  (req, res, next) => controller.deleteMaterialControlItem(req, res, next)
);

router.get(
  '/import/template',
  requirePermission('Material Control', 'VIEW'),
  (req, res, next) => controller.downloadTemplate(req, res, next)
);

router.post(
  '/import/preview',
  requirePermission('Material Control', 'CREATE'),
  upload.single('file'),
  (req, res, next) => controller.previewImport(req, res, next)
);

router.post(
  '/import/import',
  requirePermission('Material Control', 'CREATE'),
  (req, res, next) => controller.importMaterialControlItems(req, res, next)
);

export default router;