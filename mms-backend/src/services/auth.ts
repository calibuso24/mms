import { AccountRepository } from '../repositories/account.js';
import { ContactRepository } from '../repositories/contact.js';
import { RoleRepository } from '../repositories/role.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors.js';
import { pool } from '../config/database.js';

export class AuthService {
  private accountRepository = new AccountRepository();
  private contactRepository = new ContactRepository();
  private roleRepository = new RoleRepository();

  async login(userName: string, password: string): Promise<{ token: string; account: any }> {
    if (!userName || !password) {
      throw new ValidationError('Account name and password are required');
    }

    const account = await this.accountRepository.findByIdWithRoles(
      await this.getAccountIdByUserName(userName)
    );

    if (!account) {
      throw new UnauthorizedError('Invalid account name or password');
    }

    if (!account.is_active) {
      throw new UnauthorizedError('Account is inactive');
    }

    if (!account.password) {
      throw new UnauthorizedError('Account does not have a password set');
    }

    const isPasswordValid = await verifyPassword(password, account.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid account name or password');
    }

    const token = generateToken({
      accountId: account.account_id,
      userName: account.user_name,
      fullName: account.full_name,
      roles: account.roles || [],
    });

    return {
      token,
      account: {
        account_id: account.account_id,
        user_name: account.user_name,
        full_name: account.full_name,
        is_active: account.is_active,
        roles: account.roles || [],
      },
    };
  }

  private async getAccountIdByUserName(userName: string): Promise<number> {
    const account = await this.accountRepository.findByUserName(userName);
    if (!account) {
      throw new UnauthorizedError('Invalid account name or password');
    }
    return account.account_id;
  }

  async setPassword(accountId: number, newPassword: string, currentPassword?: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    if (currentPassword && account.password) {
      const isValid = await verifyPassword(currentPassword, account.password);
      if (!isValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.accountRepository.update(accountId, { password: hashedPassword }, accountId);
  }
}
