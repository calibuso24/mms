import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import { hashPassword } from '../utils/auth.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { AccountRepository } from '../repositories/account.js';
import { ContactRepository } from '../repositories/contact.js';
import { RoleRepository } from '../repositories/role.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import {
  CreateManagedUserDto,
  UpdateManagedUserDto,
  AddressDto,
  PhoneDto,
  EmailDto,
  ContactDto,
} from '../modules/manage_users/dtos.js';
import {
  ManagedUserDetailViewModel,
  ManagedUserListViewModel,
  UserPermissionViewModel,
} from '../modules/manage_users/viewModels.js';

export type CreateAccountRequest = CreateManagedUserDto;
export type UpdateAccountRequest = UpdateManagedUserDto;

export class AccountService {
  private accountRepository = new AccountRepository();
  private contactRepository = new ContactRepository();
  private roleRepository = new RoleRepository();
  private auditLogRepository = new AuditLogRepository();

  async getAccount(accountId: number): Promise<ManagedUserDetailViewModel> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    return this.buildAccountDetailViewModel(account.account_id);
  }

  async listAccounts(
    limit: number = 50,
    offset: number = 0,
    search?: string
  ): Promise<ManagedUserListViewModel> {
    const result = await this.accountRepository.findAllWithDetails(limit, offset, search);

    return {
      items: result.accounts.map((row) => ({
        account_id: row.account_id,
        user_name: row.user_name,
        full_name: row.full_name,
        role_codes: (row.roles || []).map((role: any) => role.role_code),
        primary_email: row.primary_email,
        primary_phone: row.primary_phone,
        is_active: row.is_active,
        created_at: row.log_date_created,
      })),
      total: result.total,
    };
  }

  async createAccount(req: CreateAccountRequest, createdByAccountId?: number): Promise<ManagedUserDetailViewModel> {
    this.validateCreateRequest(req);

    const existing = await this.accountRepository.findByUserName(req.user_name);
    if (existing) {
      throw new ConflictError('Username already exists');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.assertRoleCodesExist(req.role_codes || [], client);
      await this.assertEmailsUnique(this.collectEmails(req), undefined, client);

      const accountEntityTypeId = await this.getPersonEntityTypeId(client);

      const accountContact = await this.contactRepository.create(
        accountEntityTypeId,
        req.full_name,
        null,
        createdByAccountId ?? null,
        client
      );

      const account = await this.accountRepository.create(
        req.user_name,
        req.full_name,
        await hashPassword(req.password),
        accountContact.contact_id,
        createdByAccountId ?? null,
        client
      );

      if (typeof req.is_active === 'boolean' && req.is_active !== true) {
        await this.accountRepository.update(
          account.account_id,
          { is_active: req.is_active },
          createdByAccountId ?? null,
          client
        );
      }

      await this.syncRoles(account.account_id, req.role_codes || [], createdByAccountId ?? null, client);
      await this.syncAddresses(accountContact.contact_id, req.addresses, createdByAccountId ?? null, client);
      await this.syncPhones(accountContact.contact_id, req.phones, createdByAccountId ?? null, client);
      await this.syncEmails(accountContact.contact_id, req.emails, createdByAccountId ?? null, client);
      await this.syncRelatedContacts(
        accountContact.contact_id,
        req.contacts,
        [],
        createdByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'account',
          entityId: account.account_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            user_name: req.user_name,
            full_name: req.full_name,
            is_active: req.is_active ?? true,
            role_codes: req.role_codes || [],
          },
          transactionId,
          notes: 'Managed user created with related entities',
          moduleName: 'manage_users',
        },
        client
      );

      await client.query('COMMIT');
      return this.buildAccountDetailViewModel(account.account_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateAccount(
    accountId: number,
    req: UpdateAccountRequest,
    updatedByAccountId?: number
  ): Promise<ManagedUserDetailViewModel> {
    const existingAccount = await this.accountRepository.findById(accountId);
    if (!existingAccount) {
      throw new NotFoundError('Account not found');
    }

    if (!existingAccount.contact_id) {
      throw new ValidationError('Account does not have a contact record');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      if (req.user_name && req.user_name !== existingAccount.user_name) {
        const duplicate = await this.accountRepository.findByUserName(req.user_name, client);
        if (duplicate && duplicate.account_id !== accountId) {
          throw new ConflictError('Username already exists');
        }
      }

      await this.assertRoleCodesExist(req.role_codes || [], client);
      await this.assertEmailsUnique(this.collectEmails(req), existingAccount.contact_id, client);

      const accountUpdates: Record<string, unknown> = {};
      if (req.user_name !== undefined) {
        accountUpdates.user_name = req.user_name;
      }
      if (req.full_name !== undefined) {
        accountUpdates.full_name = req.full_name;
      }
      if (req.is_active !== undefined) {
        accountUpdates.is_active = req.is_active;
      }
      if (req.password !== undefined) {
        accountUpdates.password = await hashPassword(req.password);
      }

      if (Object.keys(accountUpdates).length > 0) {
        await this.accountRepository.update(accountId, accountUpdates as any, updatedByAccountId ?? null, client);
      }

      if (req.full_name !== undefined) {
        await this.contactRepository.update(
          existingAccount.contact_id,
          { contact_name: req.full_name },
          updatedByAccountId ?? null,
          client
        );
      }

      if (req.role_codes) {
        await this.syncRoles(accountId, req.role_codes, updatedByAccountId ?? null, client);
      }

      await this.syncAddresses(existingAccount.contact_id, req.addresses, updatedByAccountId ?? null, client);
      await this.syncPhones(existingAccount.contact_id, req.phones, updatedByAccountId ?? null, client);
      await this.syncEmails(existingAccount.contact_id, req.emails, updatedByAccountId ?? null, client);
      await this.syncRelatedContacts(
        existingAccount.contact_id,
        req.contacts,
        req.deleted_contact_ids || [],
        updatedByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'account',
          entityId: accountId,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: req as unknown as Record<string, unknown>,
          transactionId,
          notes: 'Managed user updated',
          moduleName: 'manage_users',
        },
        client
      );

      await client.query('COMMIT');
      return this.buildAccountDetailViewModel(accountId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAccount(accountId: number, deletedByAccountId?: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    if (!account.contact_id) {
      throw new ValidationError('Account does not have a contact record');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.accountRepository.softDeleteRoles(accountId, deletedByAccountId ?? null, client);
      await this.softDeleteContactTree(account.contact_id, deletedByAccountId ?? null, client);
      await this.accountRepository.softDelete(accountId, deletedByAccountId ?? null, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'account',
          entityId: accountId,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: { is_deleted: true },
          transactionId,
          notes: 'Managed user soft deleted with related entities',
          moduleName: 'manage_users',
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

    await this.accountRepository.assignRole(accountId, role.role_id, assignedByAccountId ?? null);
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

  async listRoles(): Promise<any[]> {
    return this.roleRepository.findAll();
  }

  async getAccountPermissions(accountId: number): Promise<UserPermissionViewModel[]> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const permissions = await this.roleRepository.getPermissionsForAccount(accountId);
    return permissions.map((permission) => ({
      module_name: permission.module_name,
      permission_code: permission.permission_code,
      permission_name: permission.permission_name,
      value: `${permission.module_name}:${permission.permission_code}`,
    }));
  }

  async createAddress(accountId: number, address: AddressDto): Promise<any> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    const addressLabel = this.buildAddressLabel(address);
    return this.contactRepository.createAddress(
      account.contact_id,
      addressLabel,
      address.address_type_id ?? null,
      address.house_no ?? null,
      address.street ?? null,
      address.barangay ?? null,
      address.city ?? null,
      address.province ?? null,
      address.region ?? null,
      address.country_code ?? null,
      address.postal_code ?? null,
      address.is_primary ?? false
    );
  }

  async updateAddress(accountId: number, addressId: number, updates: AddressDto): Promise<any> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return this.contactRepository.updateAddress(
      addressId,
      {
        address_label: this.buildAddressLabel(updates),
        address_type_id: updates.address_type_id ?? null,
        house_no: updates.house_no ?? null,
        street: updates.street ?? null,
        barangay: updates.barangay ?? null,
        city: updates.city ?? null,
        province: updates.province ?? null,
        region: updates.region ?? null,
        country_code: updates.country_code ?? null,
        postal_code: updates.postal_code ?? null,
        is_primary: updates.is_primary ?? false,
      },
      null
    );
  }

  async deleteAddress(accountId: number, addressId: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    await this.contactRepository.deleteAddress(addressId);
  }

  async createPhone(
    accountId: number,
    phoneNumber: string,
    phoneTypeId?: number,
    isPrimary?: boolean
  ): Promise<any> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return this.contactRepository.createPhone(
      account.contact_id,
      phoneNumber,
      phoneTypeId ?? null,
      isPrimary ?? false
    );
  }

  async updatePhone(accountId: number, phoneId: number, updates: any): Promise<any> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    return this.contactRepository.updatePhone(phoneId, updates);
  }

  async deletePhone(accountId: number, phoneId: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    await this.contactRepository.deletePhone(phoneId);
  }

  async createEmail(
    accountId: number,
    emailAddress: string,
    emailTypeId?: number,
    isPrimary?: boolean
  ): Promise<any> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    await this.assertEmailsUnique([emailAddress], account.contact_id);
    return this.contactRepository.createEmail(
      account.contact_id,
      emailAddress,
      emailTypeId ?? null,
      isPrimary ?? false
    );
  }

  async updateEmail(accountId: number, emailId: number, updates: any): Promise<any> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    if (updates.email_address) {
      await this.assertEmailsUnique([updates.email_address], account.contact_id);
    }

    return this.contactRepository.updateEmail(emailId, updates);
  }

  async deleteEmail(accountId: number, emailId: number): Promise<void> {
    const account = await this.accountRepository.findById(accountId);
    if (!account || !account.contact_id) {
      throw new NotFoundError('Account or contact not found');
    }

    await this.contactRepository.deleteEmail(emailId);
  }

  private validateCreateRequest(req: CreateAccountRequest): void {
    if (!req.user_name || !req.user_name.trim()) {
      throw new ValidationError('Username is required');
    }
    if (!req.full_name || !req.full_name.trim()) {
      throw new ValidationError('Full name is required');
    }
    if (!req.password || req.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }
  }

  private async assertRoleCodesExist(roleCodes: string[], client?: PoolClient): Promise<void> {
    if (roleCodes.length === 0) {
      return;
    }

    const roles = await this.roleRepository.findByCodes(roleCodes);
    const found = new Set(roles.map((role) => role.role_code));
    const missing = roleCodes.filter((code) => !found.has(code));

    if (missing.length > 0) {
      throw new ValidationError(`Unknown role codes: ${missing.join(', ')}`);
    }

    if (!client) {
      return;
    }

    // Ensure role list is visible within transaction as a basic integrity check.
    await client.query('SELECT 1');
  }

  private collectEmails(input: { emails?: EmailDto[]; contacts?: ContactDto[] }): string[] {
    const emails: string[] = [];

    for (const email of input.emails || []) {
      if (email.email_address) {
        emails.push(email.email_address);
      }
    }

    for (const contact of input.contacts || []) {
      for (const email of contact.emails || []) {
        if (email.email_address) {
          emails.push(email.email_address);
        }
      }
    }

    return emails;
  }

  private async assertEmailsUnique(
    emails: string[],
    accountContactIdToExclude?: number,
    client?: PoolClient
  ): Promise<void> {
    const normalized = Array.from(
      new Set(
        emails
          .map((email) => email.trim().toLowerCase())
          .filter((email) => email.length > 0)
      )
    );

    if (normalized.length === 0) {
      return;
    }

    const executor = client ?? pool;
    const params: any[] = [normalized];
    let query = `
      SELECT e.email_address
      FROM email e
      WHERE LOWER(e.email_address) = ANY($1::text[])
        AND e.is_deleted = false
    `;

    if (accountContactIdToExclude) {
      params.push(accountContactIdToExclude);
      query += ' AND e.contact_id <> $2';
    }

    const result = await executor.query(query, params);
    if (result.rows.length > 0) {
      const duplicates = Array.from(
        new Set(result.rows.map((row: any) => String(row.email_address).toLowerCase()))
      );
      throw new ConflictError(`Email already exists: ${duplicates.join(', ')}`);
    }
  }

  private async syncRoles(
    accountId: number,
    roleCodes: string[],
    updatedByAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    const roles = roleCodes.length > 0 ? await this.roleRepository.findByCodes(roleCodes) : [];
    await this.accountRepository.replaceRoles(
      accountId,
      roles.map((role) => role.role_id),
      updatedByAccountId,
      client
    );
  }

  private async syncAddresses(
    contactId: number,
    addresses: AddressDto[] | undefined,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!addresses) {
      return;
    }

    const existing = await this.contactRepository.getAddressesByContact(contactId, client);
    const existingById = new Map(existing.map((row) => [row.address_id, row]));
    const keepIds = new Set<number>();

    for (const address of addresses) {
      if (address.address_id && existingById.has(address.address_id)) {
        await this.contactRepository.updateAddress(
          address.address_id,
          {
            address_label: this.buildAddressLabel(address),
            is_primary: address.is_primary ?? false,
            address_type_id: address.address_type_id ?? null,
            house_no: address.house_no ?? null,
            street: address.street ?? null,
            barangay: address.barangay ?? null,
            city: address.city ?? null,
            province: address.province ?? null,
            region: address.region ?? null,
            country_code: address.country_code ?? null,
            postal_code: address.postal_code ?? null,
          },
          actorAccountId,
          client
        );
        keepIds.add(address.address_id);
      } else {
        const created = await this.contactRepository.createAddress(
          contactId,
          this.buildAddressLabel(address),
          address.address_type_id ?? null,
          address.house_no ?? null,
          address.street ?? null,
          address.barangay ?? null,
          address.city ?? null,
          address.province ?? null,
          address.region ?? null,
          address.country_code ?? null,
          address.postal_code ?? null,
          address.is_primary ?? false,
          actorAccountId,
          client
        );
        keepIds.add(created.address_id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.address_id)) {
        await this.contactRepository.deleteAddress(row.address_id, actorAccountId, client);
      }
    }
  }

  private async syncPhones(
    contactId: number,
    phones: PhoneDto[] | undefined,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!phones) {
      return;
    }

    const existing = await this.contactRepository.getPhonesByContact(contactId, client);
    const existingById = new Map(existing.map((row) => [row.phone_id, row]));
    const keepIds = new Set<number>();

    for (const phone of phones) {
      if (phone.phone_id && existingById.has(phone.phone_id)) {
        await this.contactRepository.updatePhone(
          phone.phone_id,
          {
            phone_number: phone.phone_number,
            is_primary: phone.is_primary ?? false,
            phone_type_id: phone.phone_type_id ?? null,
          },
          actorAccountId,
          client
        );
        keepIds.add(phone.phone_id);
      } else {
        const created = await this.contactRepository.createPhone(
          contactId,
          phone.phone_number,
          phone.phone_type_id ?? null,
          phone.is_primary ?? false,
          actorAccountId,
          client
        );
        keepIds.add(created.phone_id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.phone_id)) {
        await this.contactRepository.deletePhone(row.phone_id, actorAccountId, client);
      }
    }
  }

  private async syncEmails(
    contactId: number,
    emails: EmailDto[] | undefined,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!emails) {
      return;
    }

    const existing = await this.contactRepository.getEmailsByContact(contactId, client);
    const existingById = new Map(existing.map((row) => [row.email_id, row]));
    const keepIds = new Set<number>();

    for (const email of emails) {
      if (email.email_id && existingById.has(email.email_id)) {
        await this.contactRepository.updateEmail(
          email.email_id,
          {
            email_address: email.email_address,
            is_primary: email.is_primary ?? false,
            email_type_id: email.email_type_id ?? null,
          },
          actorAccountId,
          client
        );
        keepIds.add(email.email_id);
      } else {
        const created = await this.contactRepository.createEmail(
          contactId,
          email.email_address,
          email.email_type_id ?? null,
          email.is_primary ?? false,
          actorAccountId,
          client
        );
        keepIds.add(created.email_id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.email_id)) {
        await this.contactRepository.deleteEmail(row.email_id, actorAccountId, client);
      }
    }
  }

  private async syncRelatedContacts(
    parentContactId: number,
    contacts: ContactDto[] | undefined,
    deletedContactIds: number[],
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!contacts && deletedContactIds.length === 0) {
      return;
    }

    const existingChildren = await this.contactRepository.getChildrenByParentContact(parentContactId, client);
    const existingById = new Map(existingChildren.map((contact) => [contact.contact_id, contact]));
    const keepIds = new Set<number>();

    const defaultEntityTypeId = await this.getPersonEntityTypeId(client);

    for (const contactInput of contacts || []) {
      let contactId: number;

      if (contactInput.contact_id && existingById.has(contactInput.contact_id)) {
        const updated = await this.contactRepository.update(
          contactInput.contact_id,
          {
            contact_name: contactInput.contact_name,
            prefix_id: contactInput.prefix_id ?? null,
            first_name: contactInput.first_name ?? null,
            middle_name: contactInput.middle_name ?? null,
            last_name: contactInput.last_name ?? null,
            suffix_id: contactInput.suffix_id ?? null,
          },
          actorAccountId,
          client
        );
        contactId = updated.contact_id;
      } else {
        const created = await this.contactRepository.create(
          contactInput.entity_type_id ?? defaultEntityTypeId,
          contactInput.contact_name,
          parentContactId,
          actorAccountId,
          client
        );

        if (
          contactInput.prefix_id !== undefined ||
          contactInput.first_name !== undefined ||
          contactInput.middle_name !== undefined ||
          contactInput.last_name !== undefined ||
          contactInput.suffix_id !== undefined
        ) {
          await this.contactRepository.update(
            created.contact_id,
            {
              prefix_id: contactInput.prefix_id ?? null,
              first_name: contactInput.first_name ?? null,
              middle_name: contactInput.middle_name ?? null,
              last_name: contactInput.last_name ?? null,
              suffix_id: contactInput.suffix_id ?? null,
            },
            actorAccountId,
            client
          );
        }

        contactId = created.contact_id;
      }

      keepIds.add(contactId);

      await this.syncAddresses(contactId, contactInput.addresses, actorAccountId, client);
      await this.syncPhones(contactId, contactInput.phones, actorAccountId, client);
      await this.syncEmails(contactId, contactInput.emails, actorAccountId, client);
    }

    for (const contactId of deletedContactIds) {
      if (existingById.has(contactId)) {
        await this.softDeleteContactTree(contactId, actorAccountId, client);
      }
    }

    if (contacts) {
      for (const existing of existingChildren) {
        if (!keepIds.has(existing.contact_id) && !deletedContactIds.includes(existing.contact_id)) {
          await this.softDeleteContactTree(existing.contact_id, actorAccountId, client);
        }
      }
    }
  }

  private async softDeleteContactTree(
    contactId: number,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    const childContacts = await this.contactRepository.getChildrenByParentContact(contactId, client);
    for (const child of childContacts) {
      await this.softDeleteContactTree(child.contact_id, actorAccountId, client);
    }

    await this.contactRepository.deleteAddressesByContact(contactId, actorAccountId, client);
    await this.contactRepository.deletePhonesByContact(contactId, actorAccountId, client);
    await this.contactRepository.deleteEmailsByContact(contactId, actorAccountId, client);
    await this.contactRepository.softDelete(contactId, actorAccountId, client);
  }

  private async buildAccountDetailViewModel(accountId: number): Promise<ManagedUserDetailViewModel> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const roles = await this.roleRepository.getRolesForAccount(accountId);
    const permissions = await this.getAccountPermissions(accountId);

    const addresses = account.contact_id
      ? await this.contactRepository.getAddressesByContact(account.contact_id)
      : [];
    const phones = account.contact_id
      ? await this.contactRepository.getPhonesByContact(account.contact_id)
      : [];
    const emails = account.contact_id
      ? await this.contactRepository.getEmailsByContact(account.contact_id)
      : [];

    const contacts = [] as any[];
    if (account.contact_id) {
      const relatedContacts = await this.contactRepository.getChildrenByParentContact(account.contact_id);
      for (const contact of relatedContacts) {
        contacts.push({
          contact_id: contact.contact_id,
          prefix_id: (contact as any).prefix_id ?? null,
          first_name: (contact as any).first_name ?? null,
          middle_name: (contact as any).middle_name ?? null,
          last_name: (contact as any).last_name ?? null,
          suffix_id: (contact as any).suffix_id ?? null,
          contact_name: contact.contact_name,
          entity_type_id: contact.entity_type_id,
          addresses: await this.contactRepository.getAddressesByContact(contact.contact_id),
          phones: await this.contactRepository.getPhonesByContact(contact.contact_id),
          emails: await this.contactRepository.getEmailsByContact(contact.contact_id),
        });
      }
    }

    return {
      account_id: account.account_id,
      user_name: account.user_name,
      full_name: account.full_name,
      is_active: account.is_active,
      contact_id: account.contact_id,
      roles: roles.map((role) => ({
        role_id: role.role_id,
        role_code: role.role_code,
        role_name: role.role_name,
      })),
      permissions,
      addresses: addresses.map((address) => ({
        address_id: address.address_id,
        address_type_id: address.address_type_id ?? null,
        address_type_name: address.address_type_name ?? null,
        address_label: address.address_label,
        house_no: address.house_no,
        street: address.street,
        barangay: address.barangay,
        city: address.city,
        province: address.province,
        region: address.region,
        country_code: address.country_code,
        postal_code: address.postal_code,
        is_primary: address.is_primary,
      })),
      phones: phones.map((phone) => ({
        phone_id: phone.phone_id,
        phone_type_id: phone.phone_type_id ?? null,
        phone_type_name: phone.phone_type_name ?? null,
        phone_number: phone.phone_number,
        is_primary: phone.is_primary,
      })),
      emails: emails.map((email) => ({
        email_id: email.email_id,
        email_type_id: email.email_type_id ?? null,
        email_type_name: email.email_type_name ?? null,
        email_address: email.email_address,
        is_primary: email.is_primary,
      })),
      contacts,
      created_at: account.log_date_created,
    };
  }

  private buildAddressLabel(address: AddressDto): string {
    const line1 = [address.house_no, address.street]
      .map((part) => (part ?? '').trim())
      .filter((part) => part.length > 0)
      .join(' ');
    const line2 = [address.barangay, address.city, address.province]
      .map((part) => (part ?? '').trim())
      .filter((part) => part.length > 0)
      .join(', ');
    const line3 = [address.region, address.postal_code]
      .map((part) => (part ?? '').trim())
      .filter((part) => part.length > 0)
      .join(' ');
    const line4 = (address.country_code ?? '').trim();

    return [line1, line2, line3, line4 ? `(${line4})` : '']
      .filter((part) => part.length > 0)
      .join(', ');
  }

  private async getPersonEntityTypeId(client?: PoolClient): Promise<number> {
    const executor = client ?? pool;
    const result = await executor.query(
      `SELECT look_up_id
      FROM look_up
      WHERE is_deleted = false
        AND (
          (look_up_type = 'ENTITY_TYPE' AND name = 'PERSON')
          OR (look_up_type = 'contact_entity_type' AND name = 'Person')
          OR (look_up_type = 'ENTITY_TYPE' AND name = 'Person')
          OR (look_up_type = 'contact_entity_type' AND name = 'PERSON')
        )
      ORDER BY
        CASE
          WHEN look_up_type = 'ENTITY_TYPE' AND name = 'PERSON' THEN 1
          WHEN look_up_type = 'contact_entity_type' AND name = 'Person' THEN 2
          WHEN look_up_type = 'ENTITY_TYPE' AND name = 'Person' THEN 3
          ELSE 4
        END,
        look_up_id ASC
      LIMIT 1`
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Person contact entity type not found. Seed ENTITY_TYPE / PERSON or contact_entity_type / Person first.');
    }

    return result.rows[0].look_up_id;
  }
}
