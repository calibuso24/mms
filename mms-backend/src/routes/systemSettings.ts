import { Router } from 'express';
import { SystemSettingsController } from '../controllers/systemSettings.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new SystemSettingsController();

router.get('/categories', requirePermission('System Settings', 'VIEW'), (req, res, next) =>
  controller.listCategories(req, res, next)
);
router.get('/categories/:categoryCode', requirePermission('System Settings', 'VIEW'), (req, res, next) =>
  controller.getCategory(req, res, next)
);
router.get('/categories/:categoryCode/settings', requirePermission('System Settings', 'VIEW'), (req, res, next) =>
  controller.getCategorySettings(req, res, next)
);

// Public branding endpoint (no auth) to allow the login page to load branding before authentication
router.get('/public/branding', (req, res, next) => controller.getPublicBranding(req, res, next));

router.post('/categories', requirePermission('System Settings', 'EDIT'), (req, res, next) =>
  controller.createCategory(req, res, next)
);
router.put('/categories/:id', requirePermission('System Settings', 'SAVE'), (req, res, next) =>
  controller.updateCategory(req, res, next)
);
router.delete('/categories/:id', requirePermission('System Settings', 'EDIT'), (req, res, next) =>
  controller.deleteCategory(req, res, next)
);

router.post('/categories/:categoryCode/settings', requirePermission('System Settings', 'EDIT'), (req, res, next) =>
  controller.createSetting(req, res, next)
);
router.put('/settings/:id', requirePermission('System Settings', 'SAVE'), (req, res, next) =>
  controller.updateSetting(req, res, next)
);
router.delete('/settings/:id', requirePermission('System Settings', 'EDIT'), (req, res, next) =>
  controller.deleteSetting(req, res, next)
);
router.put('/categories/:categoryCode/settings', requirePermission('System Settings', 'SAVE'), (req, res, next) =>
  controller.saveCategorySettings(req, res, next)
);
router.post('/categories/:categoryCode/reset', requirePermission('System Settings', 'RESET'), (req, res, next) =>
  controller.resetCategory(req, res, next)
);

export default router;
