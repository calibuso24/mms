import { Request, Response, NextFunction } from 'express';
import { AccountService, CreateAccountRequest, UpdateAccountRequest } from '../services/account.js';
import { ValidationError } from '../utils/errors.js';

export class AccountController {
  private accountService = new AccountService();

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new Error('Unauthorized');
      }

      const account = await this.accountService.getAccount(req.accountId);
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  async getAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId)) {
        throw new ValidationError('Invalid account ID');
      }

      const account = await this.accountService.getAccount(accountId);
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  async listAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.accountService.listAccounts(limit, offset);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const requestBody: CreateAccountRequest = req.body;

      const account = await this.accountService.createAccount(requestBody, req.accountId);
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }

  async updateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId)) {
        throw new ValidationError('Invalid account ID');
      }

      const requestBody: UpdateAccountRequest = req.body;
      const account = await this.accountService.updateAccount(accountId, requestBody, req.accountId);
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId)) {
        throw new ValidationError('Invalid account ID');
      }

      await this.accountService.deleteAccount(accountId, req.accountId);
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async assignRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role_code } = req.body;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId) || !role_code) {
        throw new ValidationError('Invalid account ID or role code');
      }

      await this.accountService.assignRole(accountId, role_code, req.accountId);
      res.json({ message: 'Role assigned successfully' });
    } catch (error) {
      next(error);
    }
  }

  async removeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, roleCode } = req.params;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId) || !roleCode) {
        throw new ValidationError('Invalid account ID or role code');
      }

      await this.accountService.removeRole(accountId, roleCode);
      res.json({ message: 'Role removed successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Address management
  async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { address, label, is_primary } = req.body;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId) || !address) {
        throw new ValidationError('Invalid account ID or address');
      }

      const result = await this.accountService.createAddress(accountId, address, label, is_primary);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, addressId } = req.params;
      const accountId = parseInt(id, 10);
      const parsedAddressId = parseInt(addressId, 10);

      if (isNaN(accountId) || isNaN(parsedAddressId)) {
        throw new ValidationError('Invalid account ID or address ID');
      }

      const result = await this.accountService.updateAddress(accountId, parsedAddressId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, addressId } = req.params;
      const accountId = parseInt(id, 10);
      const parsedAddressId = parseInt(addressId, 10);

      if (isNaN(accountId) || isNaN(parsedAddressId)) {
        throw new ValidationError('Invalid account ID or address ID');
      }

      await this.accountService.deleteAddress(accountId, parsedAddressId);
      res.json({ message: 'Address deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Phone management
  async createPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { phone_number, label, is_primary } = req.body;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId) || !phone_number) {
        throw new ValidationError('Invalid account ID or phone number');
      }

      const result = await this.accountService.createPhone(accountId, phone_number, label, is_primary);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updatePhone(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, phoneId } = req.params;
      const accountId = parseInt(id, 10);
      const parsedPhoneId = parseInt(phoneId, 10);

      if (isNaN(accountId) || isNaN(parsedPhoneId)) {
        throw new ValidationError('Invalid account ID or phone ID');
      }

      const result = await this.accountService.updatePhone(accountId, parsedPhoneId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deletePhone(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, phoneId } = req.params;
      const accountId = parseInt(id, 10);
      const parsedPhoneId = parseInt(phoneId, 10);

      if (isNaN(accountId) || isNaN(parsedPhoneId)) {
        throw new ValidationError('Invalid account ID or phone ID');
      }

      await this.accountService.deletePhone(accountId, parsedPhoneId);
      res.json({ message: 'Phone deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Email management
  async createEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { email_address, label, is_primary } = req.body;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId) || !email_address) {
        throw new ValidationError('Invalid account ID or email address');
      }

      const result = await this.accountService.createEmail(accountId, email_address, label, is_primary);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, emailId } = req.params;
      const accountId = parseInt(id, 10);
      const parsedEmailId = parseInt(emailId, 10);

      if (isNaN(accountId) || isNaN(parsedEmailId)) {
        throw new ValidationError('Invalid account ID or email ID');
      }

      const result = await this.accountService.updateEmail(accountId, parsedEmailId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, emailId } = req.params;
      const accountId = parseInt(id, 10);
      const parsedEmailId = parseInt(emailId, 10);

      if (isNaN(accountId) || isNaN(parsedEmailId)) {
        throw new ValidationError('Invalid account ID or email ID');
      }

      await this.accountService.deleteEmail(accountId, parsedEmailId);
      res.json({ message: 'Email deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
