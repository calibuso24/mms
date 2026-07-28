import { Router } from 'express';
import { NavigationController } from '../controllers/navigation.js';

const router = Router();
const navigationController = new NavigationController();

router.get('/main', (req, res, next) => navigationController.getMainNavigation(req, res, next));
router.get('/reports', (req, res, next) => navigationController.getReportsNavigation(req, res, next));
router.get('/context/:context', (req, res, next) =>
  navigationController.getNavigationByContext(req, res, next)
);
router.get('/report-catalog-sidebar', (req, res, next) =>
  navigationController.getReportCatalogSidebar(req, res, next)
);

export default router;
