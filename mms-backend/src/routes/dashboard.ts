import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new DashboardController();

router.get('/types', requirePermission('Dashboard', 'VIEW'), (req, res, next) =>
  controller.listDashboardTypes(req, res, next)
);

router.get('/:dashboardType/widgets', requirePermission('Dashboard', 'VIEW'), (req, res, next) =>
  controller.listWidgets(req, res, next)
);

router.get('/:dashboardType/widgets/:widgetKey', requirePermission('Dashboard', 'VIEW'), (req, res, next) =>
  controller.getWidgetData(req, res, next)
);

export default router;
