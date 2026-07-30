import { Router } from 'express';
import { PartyController } from '../controllers/party.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new PartyController();

// Project Management
router.get('/projects', requirePermission('Project Management', 'VIEW'), (req, res, next) =>
  controller.listProjects(req, res, next)
);
router.get('/projects/:id', requirePermission('Project Management', 'VIEW'), (req, res, next) =>
  controller.getProject(req, res, next)
);
router.post('/projects', requirePermission('Project Management', 'CREATE'), (req, res, next) =>
  controller.createProject(req, res, next)
);
router.put('/projects/:id', requirePermission('Project Management', 'UPDATE'), (req, res, next) =>
  controller.updateProject(req, res, next)
);
router.delete('/projects/:id', requirePermission('Project Management', 'DELETE'), (req, res, next) =>
  controller.deleteProject(req, res, next)
);

// Supplier Management
router.get('/suppliers', requirePermission('Supplier', 'VIEW'), (req, res, next) =>
  controller.listSuppliers(req, res, next)
);
router.get('/suppliers/:id', requirePermission('Supplier', 'VIEW'), (req, res, next) =>
  controller.getSupplier(req, res, next)
);
router.post('/suppliers', requirePermission('Supplier', 'CREATE'), (req, res, next) =>
  controller.createSupplier(req, res, next)
);
router.put('/suppliers/:id', requirePermission('Supplier', 'UPDATE'), (req, res, next) =>
  controller.updateSupplier(req, res, next)
);
router.delete('/suppliers/:id', requirePermission('Supplier', 'DELETE'), (req, res, next) =>
  controller.deleteSupplier(req, res, next)
);

export default router;
