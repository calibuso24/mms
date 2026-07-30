import { Router } from 'express';
import { RoleManagementController } from '../controllers/roleManagement.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new RoleManagementController();

router.get(
  '/meta/permissions',
  requirePermission('Manage Roles', 'VIEW'),
  (req, res, next) => controller.listPermissions(req, res, next)
);

router.get(
  '/',
  requirePermission('Manage Roles', 'VIEW'),
  (req, res, next) => controller.listRoles(req, res, next)
);

router.get(
  '/:id',
  requirePermission('Manage Roles', 'VIEW'),
  (req, res, next) => controller.getRole(req, res, next)
);

router.post(
  '/',
  requirePermission('Manage Roles', 'CREATE'),
  (req, res, next) => controller.createRole(req, res, next)
);

router.put(
  '/:id',
  requirePermission('Manage Roles', 'UPDATE'),
  (req, res, next) => controller.updateRole(req, res, next)
);

router.delete(
  '/:id',
  requirePermission('Manage Roles', 'DELETE'),
  (req, res, next) => controller.deleteRole(req, res, next)
);

export default router;
