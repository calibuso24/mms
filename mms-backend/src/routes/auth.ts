import { Router } from 'express';
import { AuthController } from '../controllers/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const controller = new AuthController();

// Login does not require authentication
router.post('/login', (req, res, next) => controller.login(req, res, next));

// Set password requires authentication
router.post('/set-password', authMiddleware, (req, res, next) => controller.setPassword(req, res, next));

export default router;
