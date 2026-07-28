import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.js';
import { ValidationError } from '../utils/errors.js';

export class AuthController {
  private authService = new AuthService();

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { account_name, password } = req.body;

      if (!account_name || !password) {
        throw new ValidationError('Account name and password are required');
      }

      const result = await this.authService.login(account_name, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new Error('Unauthorized');
      }

      const { password, currentPassword } = req.body;

      if (!password) {
        throw new ValidationError('Password is required');
      }

      await this.authService.setPassword(req.accountId, password, currentPassword);
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}
