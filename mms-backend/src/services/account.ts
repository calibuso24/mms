import { AccountRepository, Account } from '../repositories/account.js';
import { ContactRepository, Address, Phone, Email } from '../repositories/contact.js';
import { RoleRepository } from '../repositories/role.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { pool } from '../config/database.js';

export interface CreateAccountRequest {
  userName: string;
  fullName: string;
  password?: string;
  addresses?: Array<{ label?: string; address: string; isPrimary?: boolean }>;
  phones?: Array<{ label?: string; number: string; isPrimary?: boolean }>;
  emails?: Array<{ label?: string; address: string; isPrimary?: boolean }>;
}

export interface UpdateAccountRequest {
  fullName?: string;
  isActive?: boolean;
}

export class AccountService {
  private accountRepository = new AccountRepository();
  private contactRepository = new ContactRepository();
  private roleRepository = new RoleRepository();

  async getAccount(accountId: number): Promise<any> {
    const account = await this.accountRepository.findByIdWithRoles(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const contact = account.contact_id
      ? await this.contactRepository.findById(account.contact_id)
      : null;

    const addresses = contact ? await this.contactRepository.getAddressesByContact(contact.contact_id) : [];
    const phones = contact ? await this.contactRepository.getPhonesByContact(contact.contact_id) : [];
    const emails = contact ? await this.contactRepository.getEmailsByContact(contact.contact_id) : [];

    return {
      account_id: account.account_id,
      user_name: account.user_name,
      full_name: account.full_name,
      is_active: account.is_active,
      contact_id: account.contact_id,
      roles: account.roles || [],
      contact: contact
        ? {
            contact_id: contact.contact_id,
            contact_name: contact.contact_name,
            addresses,
            phones,
            emails,
          }
        : null,
    };
  }

  async listAccounts(limit: number = 50, offset: number = 0): Promise<{ accounts: any[]; total: number }> {
    const { accounts, total } = await this.accountRepository.findAll(limit, offset);

    const enrichedAccounts = await Promise.all(
      accounts.map(async (acc) => {
        const withRoles = await this.accountRepository.findByIdWithRoles(acc.account_id);
        return {
          account_id: acc.account_id,
          user_name: acc.user_name,
          full_name: acc.full_name,
          is_active: acc.is_active,
          roles: withRoles?.roles || [],
        };
      })
    );

    return { accounts: enrichedAccounts, total };
  }

  async createAccount(
    req: CreateAccountRequest,
    createdByAccountId?: number
  ): Promise<any> {
    // Validate input
    if (!req.userName || !req.fullName) {
      throw new ValidationError('Account name and full name are required');
    }

    // Check for duplicate account name
    const existing = await this.accountRepository.findByUserName(req.userName);
    if (existing) {
      throw new ConflictError('Account name already exists');
    }

    // Create contact entity first (required for storing addresses, phones, emails)
    const personEntityType = await this.getPersonEntityTypeId();
    const contact = await this.contactRepository.create(personEntityType, req.fullName);

    // Add addresses
    if (req.addresses && req.addresses.length > 0) {
      for (const addr of req.addresses) {
        await this.contactRepository.createAddress(
          contact.contact_id,
          addr.address,
          addr.label || null,
          addr.isPrimary || false
        );
      }
    }

    // Add phones
    if (req.phones && req.phones.length > 0) {
      for (const phone of req.phones) {
        await this.contactRepository.createPhone(
          contact.contact_id,
          phone.number,
          phone.label || null,
          phone.isPrimary || false
        );
      }
    }

    // Add emails
    if (req.emails && req.emails.length > 0) {
      for (const email of req.emails) {
        await this.contactRepository.createEmail(
          contact.contact_id,
          email.address,
          email.label || null,
          email.isPrimary || false
        );
      }
    }

    // Create account
    const account = await this.accountRepository.create(
      req.userName,
      req.fullName,
      req.password ? await this.hashPassword(req.password) : null,
      contact.contact_id,
      createdByAccountId
    );

    return await this.getAccount(account.account_id);
  }

  async updateAccount(
    accountId: number,
    req: UpdateAccountRequest,
    updatedByAccountId?: number
  ): Promise<any> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const updates: any = {};
    if (req.fullName !== undefined) updates.full_name = req.fullName;
    if (req.isActive !== undefined) updates.is_active = req.isActive;

    if (Object.keys(updates).length > 0) {
      await this.accountRepository.update(accountId, updates, updatedByAccountId);

      // Update contact name if full name changed
      if (req.fullName !== undefined && account.contact_id) {
        await this.contactRepository.update(account.contact_id, req.fullName);
      }
    }

    return await this.getAccount(accountId);
  }

  async deleteAccount(accountId: number, deletedByAccountId?: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    await this.accountRepository.softDelete(accountId, deletedByAccountId);
  }

  async assignRole(accountId: number, roleCode: string, assignedByAccountId?: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const role = await this.roleRepository.findByCode(roleCode);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    await this.accountRepository.assignRole(accountId, role.role_id, assignedByAccountId);
  }

  async removeRole(accountId: number, roleCode: string): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const role = await this.roleRepository.findByCode(roleCode);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    await this.accountRepository.removeRole(accountId, role.role_id);
  }

  // Contact management
  async updateAddress(
    accountId: number,
    addressId: number,
    updates: Partial<Pick<Address, 'address' | 'address_label' | 'is_primary'>>
  ): Promise<Address> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return await this.contactRepository.updateAddress(addressId, updates);
  }

  async createAddress(
    accountId: number,
    address: string,
    label?: string,
    isPrimary?: boolean
  ): Promise<Address> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return await this.contactRepository.createAddress(account.contact_id, address, label, isPrimary);
  }

  async deleteAddress(accountId: number, addressId: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    await this.contactRepository.deleteAddress(addressId);
  }

  async updatePhone(
    accountId: number,
    phoneId: number,
    updates: Partial<Pick<Phone, 'phone_number' | 'phone_label' | 'is_primary'>>
  ): Promise<Phone> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return await this.contactRepository.updatePhone(phoneId, updates);
  }

  async createPhone(
    accountId: number,
    phoneNumber: string,
    label?: string,
    isPrimary?: boolean
  ): Promise<Phone> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return await this.contactRepository.createPhone(account.contact_id, phoneNumber, label, isPrimary);
  }

  async deletePhone(accountId: number, phoneId: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    await this.contactRepository.deletePhone(phoneId);
  }

  async updateEmail(
    accountId: number,
    emailId: number,
    updates: Partial<Pick<Email, 'email_address' | 'email_label' | 'is_primary'>>
  ): Promise<Email> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return await this.contactRepository.updateEmail(emailId, updates);
  }

  async createEmail(
    accountId: number,
    emailAddress: string,
    label?: string,
    isPrimary?: boolean
  ): Promise<Email> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return await this.contactRepository.createEmail(account.contact_id, emailAddress, label, isPrimary);
  }

  async deleteEmail(accountId: number, emailId: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    await this.contactRepository.deleteEmail(emailId);
  }

  private async getPersonEntityTypeId(): Promise<number> {
    const result = await pool.query(
      `SELECT look_up_id FROM look_up 
       WHERE look_up_type = 'contact_entity_type' AND name = 'Person' AND is_deleted = false`
    );
    if (result.rows.length === 0) {
      throw new Error('Person entity type not found in database');
    }
    return result.rows[0].look_up_id;
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.default.genSalt(10);
    return bcrypt.default.hash(password, salt);
  }
}
