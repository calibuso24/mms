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

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new Error('Unauthorized');
      }

      const account = await this.accountService.updateCurrentProfile(req.accountId, req.body);
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
      const search = (req.query.search as string) || undefined;
      const sortBy = (req.query.sort_by as string) || undefined;
      const sortDir = (req.query.sort_dir as string) === 'desc' ? 'desc' : 'asc';

      const result = await this.accountService.listAccounts(limit, offset, search, sortBy, sortDir);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const requestBody: CreateAccountRequest = {
        ...req.body,
        user_name: req.body.user_name ?? req.body.userName,
        full_name: req.body.full_name ?? req.body.fullName,
      };

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

      const requestBody: UpdateAccountRequest = {
        ...req.body,
        user_name: req.body.user_name ?? req.body.userName,
        full_name: req.body.full_name ?? req.body.fullName,
      };
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
      const { role_code, roleCode } = req.body;
      const accountId = parseInt(id, 10);
      const normalizedRoleCode = role_code || roleCode;

      if (isNaN(accountId) || !normalizedRoleCode) {
        throw new ValidationError('Invalid account ID or role code');
      }

      await this.accountService.assignRole(accountId, normalizedRoleCode, req.accountId);
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

  async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await this.accountService.listRoles();
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }

  async getAccountPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId)) {
        throw new ValidationError('Invalid account ID');
      }

      const permissions = await this.accountService.getAccountPermissions(accountId);
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }

  // Address management
  async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId)) {
        throw new ValidationError('Invalid account ID');
      }

      const result = await this.accountService.createAddress(accountId, req.body);
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
      const { phone_number, phone_type_id, is_primary } = req.body;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId) || !phone_number) {
        throw new ValidationError('Invalid account ID or phone number');
      }

      const result = await this.accountService.createPhone(
        accountId,
        phone_number,
        phone_type_id,
        is_primary
      );
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
      const { email_address, email_type_id, is_primary } = req.body;
      const accountId = parseInt(id, 10);

      if (isNaN(accountId) || !email_address) {
        throw new ValidationError('Invalid account ID or email address');
      }

      const result = await this.accountService.createEmail(
        accountId,
        email_address,
        email_type_id,
        is_primary
      );
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
