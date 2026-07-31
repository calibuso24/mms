import { Router } from 'express';
import { AccountController } from '../controllers/account.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = Router();
const controller = new AccountController();

// Apply auth middleware to all account routes
router.use(authMiddleware);

// Account CRUD
router.get('/me', (req, res, next) => controller.getMe(req, res, next));
router.put('/me', (req, res, next) => controller.updateMe(req, res, next));
router.get('/meta/roles', requirePermission('User Management', 'VIEW'), (req, res, next) =>
	controller.listRoles(req, res, next)
);
router.get('/', requirePermission('User Management', 'VIEW'), (req, res, next) =>
	controller.listAccounts(req, res, next)
);
router.get('/:id/permissions', requirePermission('User Management', 'VIEW'), (req, res, next) =>
	controller.getAccountPermissions(req, res, next)
);
router.get('/:id', requirePermission('User Management', 'VIEW'), (req, res, next) =>
	controller.getAccount(req, res, next)
);
router.post('/', requirePermission('User Management', 'CREATE'), (req, res, next) =>
	controller.createAccount(req, res, next)
);
router.put('/:id', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.updateAccount(req, res, next)
);
router.delete('/:id', requirePermission('User Management', 'DELETE'), (req, res, next) =>
	controller.deleteAccount(req, res, next)
);

// Role management
router.post('/:id/roles', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.assignRole(req, res, next)
);
router.delete('/:id/roles/:roleCode', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.removeRole(req, res, next)
);

// Address management
router.post('/:id/addresses', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.createAddress(req, res, next)
);
router.put('/:id/addresses/:addressId', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.updateAddress(req, res, next)
);
router.delete('/:id/addresses/:addressId', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.deleteAddress(req, res, next)
);

// Phone management
router.post('/:id/phones', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.createPhone(req, res, next)
);
router.put('/:id/phones/:phoneId', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.updatePhone(req, res, next)
);
router.delete('/:id/phones/:phoneId', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.deletePhone(req, res, next)
);

// Email management
router.post('/:id/emails', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.createEmail(req, res, next)
);
router.put('/:id/emails/:emailId', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.updateEmail(req, res, next)
);
router.delete('/:id/emails/:emailId', requirePermission('User Management', 'UPDATE'), (req, res, next) =>
	controller.deleteEmail(req, res, next)
);

export default router;
