import { Router } from 'express';
import { AccountController } from '../controllers/account.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const controller = new AccountController();

// Apply auth middleware to all account routes
router.use(authMiddleware);

// Account CRUD
router.get('/me', (req, res, next) => controller.getMe(req, res, next));
router.get('/:id', (req, res, next) => controller.getAccount(req, res, next));
router.get('/', (req, res, next) => controller.listAccounts(req, res, next));
router.post('/', (req, res, next) => controller.createAccount(req, res, next));
router.put('/:id', (req, res, next) => controller.updateAccount(req, res, next));
router.delete('/:id', (req, res, next) => controller.deleteAccount(req, res, next));

// Role management
router.post('/:id/roles', (req, res, next) => controller.assignRole(req, res, next));
router.delete('/:id/roles/:roleCode', (req, res, next) => controller.removeRole(req, res, next));

// Address management
router.post('/:id/addresses', (req, res, next) => controller.createAddress(req, res, next));
router.put('/:id/addresses/:addressId', (req, res, next) => controller.updateAddress(req, res, next));
router.delete('/:id/addresses/:addressId', (req, res, next) => controller.deleteAddress(req, res, next));

// Phone management
router.post('/:id/phones', (req, res, next) => controller.createPhone(req, res, next));
router.put('/:id/phones/:phoneId', (req, res, next) => controller.updatePhone(req, res, next));
router.delete('/:id/phones/:phoneId', (req, res, next) => controller.deletePhone(req, res, next));

// Email management
router.post('/:id/emails', (req, res, next) => controller.createEmail(req, res, next));
router.put('/:id/emails/:emailId', (req, res, next) => controller.updateEmail(req, res, next));
router.delete('/:id/emails/:emailId', (req, res, next) => controller.deleteEmail(req, res, next));

export default router;
