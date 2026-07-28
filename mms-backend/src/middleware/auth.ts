import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
import { UnauthorizedError } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      accountId?: number;
      account?: any;
      roles?: string[];
      permissions?: string[];
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.accountId = decoded.accountId;
    req.account = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        req.accountId = decoded.accountId;
        req.account = decoded;
      }
    }
    next();
  } catch (error) {
    next();
  }
}
