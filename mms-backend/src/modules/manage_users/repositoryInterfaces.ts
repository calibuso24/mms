import {
  AccountEntity,
  ContactEntity,
  AddressEntity,
  PhoneEntity,
  EmailEntity,
  RoleEntity,
  PermissionEntity,
} from './entities.js';

export interface IAccountRepository {
  findById(accountId: number): Promise<AccountEntity | null>;
  findByUserName(userName: string): Promise<AccountEntity | null>;
  create(
    userName: string,
    fullName: string,
    password: string | null,
    contactId?: number | null,
    createdByAccountId?: number | null
  ): Promise<AccountEntity>;
  update(
    accountId: number,
    updates: Partial<Pick<AccountEntity, 'user_name' | 'full_name' | 'is_active' | 'password'>>,
    updatedByAccountId?: number | null
  ): Promise<AccountEntity>;
  softDelete(accountId: number, deletedByAccountId?: number | null): Promise<void>;
}

export interface IRoleRepository {
  findByCode(roleCode: string): Promise<RoleEntity | null>;
  findAll(): Promise<RoleEntity[]>;
  getPermissionsForAccount(accountId: number): Promise<PermissionEntity[]>;
  getPermissionCodesForAccount(accountId: number): Promise<string[]>;
}

export interface IContactRepository {
  findById(contactId: number): Promise<ContactEntity | null>;
  create(entityTypeId: number, contactName: string, parentContactId?: number | null): Promise<ContactEntity>;
  update(
    contactId: number,
    updates: Partial<
      Pick<
        ContactEntity,
        'contact_name' | 'prefix_id' | 'first_name' | 'middle_name' | 'last_name' | 'suffix_id'
      >
    >
  ): Promise<ContactEntity>;
  softDelete(contactId: number, deletedByAccountId?: number | null): Promise<void>;
  getChildrenByParentContact(parentContactId: number): Promise<ContactEntity[]>;

  createAddress(
    contactId: number,
    address: string,
    addressTypeId?: number | null,
    isPrimary?: boolean,
    createdByAccountId?: number | null
  ): Promise<AddressEntity>;
  updateAddress(
    addressId: number,
    updates: Partial<Pick<AddressEntity, 'address' | 'is_primary' | 'address_type_id'>>,
    updatedByAccountId?: number | null
  ): Promise<AddressEntity>;
  getAddressesByContact(contactId: number): Promise<AddressEntity[]>;
  deleteAddress(addressId: number, deletedByAccountId?: number | null): Promise<void>;

  createPhone(
    contactId: number,
    phoneNumber: string,
    phoneTypeId?: number | null,
    isPrimary?: boolean,
    createdByAccountId?: number | null
  ): Promise<PhoneEntity>;
  updatePhone(
    phoneId: number,
    updates: Partial<Pick<PhoneEntity, 'phone_number' | 'is_primary' | 'phone_type_id'>>,
    updatedByAccountId?: number | null
  ): Promise<PhoneEntity>;
  getPhonesByContact(contactId: number): Promise<PhoneEntity[]>;
  deletePhone(phoneId: number, deletedByAccountId?: number | null): Promise<void>;

  createEmail(
    contactId: number,
    emailAddress: string,
    emailTypeId?: number | null,
    isPrimary?: boolean,
    createdByAccountId?: number | null
  ): Promise<EmailEntity>;
  updateEmail(
    emailId: number,
    updates: Partial<Pick<EmailEntity, 'email_address' | 'is_primary' | 'email_type_id'>>,
    updatedByAccountId?: number | null
  ): Promise<EmailEntity>;
  getEmailsByContact(contactId: number): Promise<EmailEntity[]>;
  deleteEmail(emailId: number, deletedByAccountId?: number | null): Promise<void>;
}
