import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface Contact {
  contact_id: number;
  parent_contact_id: number | null;
  entity_type_id: number;
  prefix_id: number | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix_id: number | null;
  contact_name: string;
  is_deleted: boolean;
  log_date_created: string;
  log_date_updated: string | null;
}

export interface Address {
  address_id: number;
  contact_id: number;
  address_type_id: number | null;
  address_type_name?: string | null;
  address_label: string;
  house_no: string | null;
  street: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country_code: string | null;
  postal_code: string | null;
  is_primary: boolean;
  is_deleted: boolean;
}

export interface Phone {
  phone_id: number;
  contact_id: number;
  phone_type_id: number | null;
  phone_type_name?: string | null;
  phone_number: string;
  is_primary: boolean;
  is_deleted: boolean;
}

export interface Email {
  email_id: number;
  contact_id: number;
  email_type_id: number | null;
  email_type_name?: string | null;
  email_address: string;
  is_primary: boolean;
  is_deleted: boolean;
}

type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<any>;
};

export class ContactRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(contactId: number, client?: PoolClient): Promise<Contact | null> {
    const result = await this.getExecutor(client).query(
      'SELECT * FROM contact WHERE contact_id = $1 AND is_deleted = false',
      [contactId]
    );
    return result.rows[0] || null;
  }

  async getChildrenByParentContact(parentContactId: number, client?: PoolClient): Promise<Contact[]> {
    const result = await this.getExecutor(client).query(
      `SELECT *
       FROM contact
       WHERE parent_contact_id = $1 AND is_deleted = false
       ORDER BY contact_name ASC`,
      [parentContactId]
    );
    return result.rows;
  }

  async create(
    entityTypeId: number,
    contactName: string,
    parentContactId: number | null = null,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Contact> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO contact (
        entity_type_id,
        contact_name,
        parent_contact_id,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      )
       VALUES ($1, $2, $3, now(), $4, 'manage_users')
       RETURNING *`,
      [entityTypeId, contactName, parentContactId, createdByAccountId]
    );
    return result.rows[0];
  }

  async update(
    contactId: number,
    contactNameOrUpdates:
      | string
      | Partial<
          Pick<
            Contact,
            'contact_name' | 'prefix_id' | 'first_name' | 'middle_name' | 'last_name' | 'suffix_id'
          >
        >,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Contact> {
    const updates =
      typeof contactNameOrUpdates === 'string'
        ? ({ contact_name: contactNameOrUpdates } as any)
        : contactNameOrUpdates;

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.contact_name !== undefined) {
      fields.push(`contact_name = $${paramCount++}`);
      values.push(updates.contact_name);
    }
    if ((updates as any).prefix_id !== undefined) {
      fields.push(`prefix_id = $${paramCount++}`);
      values.push((updates as any).prefix_id);
    }
    if ((updates as any).first_name !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push((updates as any).first_name);
    }
    if ((updates as any).middle_name !== undefined) {
      fields.push(`middle_name = $${paramCount++}`);
      values.push((updates as any).middle_name);
    }
    if ((updates as any).last_name !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push((updates as any).last_name);
    }
    if ((updates as any).suffix_id !== undefined) {
      fields.push(`suffix_id = $${paramCount++}`);
      values.push((updates as any).suffix_id);
    }

    fields.push('log_date_updated = now()');
    fields.push(`log_updated_by_account_id = $${paramCount++}`);
    fields.push("log_module_updated = 'manage_users'");
    values.push(updatedByAccountId);
    values.push(contactId);

    const result = await this.getExecutor(client).query(
      `UPDATE contact SET ${fields.join(', ')}
       WHERE contact_id = $${paramCount} AND is_deleted = false
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) throw new Error('Contact not found');
    return result.rows[0];
  }

  async softDelete(
    contactId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE contact
       SET is_deleted = true,
           log_date_deleted = now(),
           log_deleted_by_account_id = $2,
           log_module_updated = 'manage_users'
       WHERE contact_id = $1 AND is_deleted = false`,
      [contactId, deletedByAccountId]
    );
  }

  // Address methods
  async createAddress(
    contactId: number,
    addressLabel: string,
    addressTypeId: number | null = null,
    houseNo: string | null = null,
    street: string | null = null,
    barangay: string | null = null,
    city: string | null = null,
    province: string | null = null,
    region: string | null = null,
    countryCode: string | null = null,
    postalCode: string | null = null,
    isPrimary: boolean = false,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Address> {
    if (isPrimary) {
      await this.getExecutor(client).query(
        `UPDATE address
         SET is_primary = false, log_date_updated = now()
         WHERE contact_id = $1 AND is_deleted = false`,
        [contactId]
      );
    }

    const result = await this.getExecutor(client).query(
      `INSERT INTO address (
        contact_id,
        address_label,
        is_primary,
        address_type_id,
        house_no,
        street,
        barangay,
        city,
        province,
        region,
        country_code,
        postal_code,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), $13, 'manage_users')
       RETURNING *`,
      [
        contactId,
        addressLabel,
        isPrimary,
        addressTypeId,
        houseNo,
        street,
        barangay,
        city,
        province,
        region,
        countryCode,
        postalCode,
        createdByAccountId,
      ]
    );
    return result.rows[0];
  }

  async updateAddress(
    addressId: number,
    updates: Partial<Pick<Address, 'address_label' | 'is_primary' | 'address_type_id' | 'house_no' | 'street' | 'barangay' | 'city' | 'province' | 'region' | 'country_code' | 'postal_code'>>,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Address> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const executor = this.getExecutor(client);

    if (updates.is_primary) {
      const contactResult = await executor.query(
        'SELECT contact_id FROM address WHERE address_id = $1 AND is_deleted = false',
        [addressId]
      );
      if (contactResult.rows.length > 0) {
        await executor.query(
          `UPDATE address
           SET is_primary = false, log_date_updated = now()
           WHERE contact_id = $1 AND is_deleted = false`,
          [contactResult.rows[0].contact_id]
        );
      }
    }

    if (updates.address_label !== undefined) {
      fields.push(`address_label = $${paramCount++}`);
      values.push(updates.address_label);
    }
    if (updates.is_primary !== undefined) {
      fields.push(`is_primary = $${paramCount++}`);
      values.push(updates.is_primary);
    }
    if (updates.address_type_id !== undefined) {
      fields.push(`address_type_id = $${paramCount++}`);
      values.push(updates.address_type_id);
    }
    if (updates.house_no !== undefined) {
      fields.push(`house_no = $${paramCount++}`);
      values.push(updates.house_no);
    }
    if (updates.street !== undefined) {
      fields.push(`street = $${paramCount++}`);
      values.push(updates.street);
    }
    if (updates.barangay !== undefined) {
      fields.push(`barangay = $${paramCount++}`);
      values.push(updates.barangay);
    }
    if (updates.city !== undefined) {
      fields.push(`city = $${paramCount++}`);
      values.push(updates.city);
    }
    if (updates.province !== undefined) {
      fields.push(`province = $${paramCount++}`);
      values.push(updates.province);
    }
    if (updates.region !== undefined) {
      fields.push(`region = $${paramCount++}`);
      values.push(updates.region);
    }
    if (updates.country_code !== undefined) {
      fields.push(`country_code = $${paramCount++}`);
      values.push(updates.country_code);
    }
    if (updates.postal_code !== undefined) {
      fields.push(`postal_code = $${paramCount++}`);
      values.push(updates.postal_code);
    }

    fields.push(`log_date_updated = now()`);
    fields.push(`log_updated_by_account_id = $${paramCount++}`);
    fields.push(`log_module_updated = 'manage_users'`);
    values.push(updatedByAccountId);
    values.push(addressId);

    const result = await executor.query(
      `UPDATE address SET ${fields.join(', ')} WHERE address_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) throw new Error('Address not found');
    return result.rows[0];
  }

  async getAddressesByContact(contactId: number, client?: PoolClient): Promise<Address[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        a.*,
        lu.name AS address_type_name
      FROM address a
      LEFT JOIN look_up lu ON a.address_type_id = lu.look_up_id AND lu.is_deleted = false
      WHERE a.contact_id = $1 AND a.is_deleted = false
      ORDER BY a.is_primary DESC, a.address_id ASC`,
      [contactId]
    );
    return result.rows;
  }

  async deleteAddress(
    addressId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE address
       SET is_deleted = true,
           log_date_deleted = now(),
           log_deleted_by_account_id = $2,
           log_module_updated = 'manage_users'
       WHERE address_id = $1`,
      [addressId, deletedByAccountId]
    );
  }

  async deleteAddressesByContact(
    contactId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE address
       SET is_deleted = true,
           log_date_deleted = now(),
           log_deleted_by_account_id = $2,
           log_module_updated = 'manage_users'
       WHERE contact_id = $1 AND is_deleted = false`,
      [contactId, deletedByAccountId]
    );
  }

  // Phone methods
  async createPhone(
    contactId: number,
    phoneNumber: string,
    phoneTypeId: number | null = null,
    isPrimary: boolean = false,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Phone> {
    if (isPrimary) {
      await this.getExecutor(client).query(
        `UPDATE phone
         SET is_primary = false, log_date_updated = now()
         WHERE contact_id = $1 AND is_deleted = false`,
        [contactId]
      );
    }

    const result = await this.getExecutor(client).query(
      `INSERT INTO phone (
        contact_id,
        phone_number,
        is_primary,
        phone_type_id,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      )
       VALUES ($1, $2, $3, $4, now(), $5, 'manage_users')
       RETURNING *`,
      [contactId, phoneNumber, isPrimary, phoneTypeId, createdByAccountId]
    );
    return result.rows[0];
  }

  async updatePhone(
    phoneId: number,
    updates: Partial<Pick<Phone, 'phone_number' | 'is_primary' | 'phone_type_id'>>,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Phone> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const executor = this.getExecutor(client);

    if (updates.is_primary) {
      const contactResult = await executor.query(
        'SELECT contact_id FROM phone WHERE phone_id = $1 AND is_deleted = false',
        [phoneId]
      );
      if (contactResult.rows.length > 0) {
        await executor.query(
          `UPDATE phone
           SET is_primary = false, log_date_updated = now()
           WHERE contact_id = $1 AND is_deleted = false`,
          [contactResult.rows[0].contact_id]
        );
      }
    }

    if (updates.phone_number !== undefined) {
      fields.push(`phone_number = $${paramCount++}`);
      values.push(updates.phone_number);
    }
    if (updates.is_primary !== undefined) {
      fields.push(`is_primary = $${paramCount++}`);
      values.push(updates.is_primary);
    }
    if (updates.phone_type_id !== undefined) {
      fields.push(`phone_type_id = $${paramCount++}`);
      values.push(updates.phone_type_id);
    }

    fields.push(`log_date_updated = now()`);
    fields.push(`log_updated_by_account_id = $${paramCount++}`);
    fields.push(`log_module_updated = 'manage_users'`);
    values.push(updatedByAccountId);
    values.push(phoneId);

    const result = await executor.query(
      `UPDATE phone SET ${fields.join(', ')} WHERE phone_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) throw new Error('Phone not found');
    return result.rows[0];
  }

  async getPhonesByContact(contactId: number, client?: PoolClient): Promise<Phone[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        p.*,
        lu.name AS phone_type_name
      FROM phone p
      LEFT JOIN look_up lu ON p.phone_type_id = lu.look_up_id AND lu.is_deleted = false
      WHERE p.contact_id = $1 AND p.is_deleted = false
      ORDER BY p.is_primary DESC, p.phone_id ASC`,
      [contactId]
    );
    return result.rows;
  }

  async deletePhone(
    phoneId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE phone
       SET is_deleted = true,
           log_date_deleted = now(),
           log_deleted_by_account_id = $2,
           log_module_updated = 'manage_users'
       WHERE phone_id = $1`,
      [phoneId, deletedByAccountId]
    );
  }

  async deletePhonesByContact(
    contactId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE phone
       SET is_deleted = true,
           log_date_deleted = now(),
           log_deleted_by_account_id = $2,
           log_module_updated = 'manage_users'
       WHERE contact_id = $1 AND is_deleted = false`,
      [contactId, deletedByAccountId]
    );
  }

  // Email methods
  async createEmail(
    contactId: number,
    emailAddress: string,
    emailTypeId: number | null = null,
    isPrimary: boolean = false,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Email> {
    if (isPrimary) {
      await this.getExecutor(client).query(
        `UPDATE email
         SET is_primary = false, log_date_updated = now()
         WHERE contact_id = $1 AND is_deleted = false`,
        [contactId]
      );
    }

    const result = await this.getExecutor(client).query(
      `INSERT INTO email (
        contact_id,
        email_address,
        is_primary,
        email_type_id,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      )
       VALUES ($1, $2, $3, $4, now(), $5, 'manage_users')
       RETURNING *`,
      [contactId, emailAddress, isPrimary, emailTypeId, createdByAccountId]
    );
    return result.rows[0];
  }

  async updateEmail(
    emailId: number,
    updates: Partial<Pick<Email, 'email_address' | 'is_primary' | 'email_type_id'>>,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<Email> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const executor = this.getExecutor(client);

    if (updates.is_primary) {
      const contactResult = await executor.query(
        'SELECT contact_id FROM email WHERE email_id = $1 AND is_deleted = false',
        [emailId]
      );
      if (contactResult.rows.length > 0) {
        await executor.query(
          `UPDATE email
           SET is_primary = false, log_date_updated = now()
           WHERE contact_id = $1 AND is_deleted = false`,
          [contactResult.rows[0].contact_id]
        );
      }
    }

    if (updates.email_address !== undefined) {
      fields.push(`email_address = $${paramCount++}`);
      values.push(updates.email_address);
    }
    if (updates.is_primary !== undefined) {
      fields.push(`is_primary = $${paramCount++}`);
      values.push(updates.is_primary);
    }
    if (updates.email_type_id !== undefined) {
      fields.push(`email_type_id = $${paramCount++}`);
      values.push(updates.email_type_id);
    }

    fields.push(`log_date_updated = now()`);
    fields.push(`log_updated_by_account_id = $${paramCount++}`);
    fields.push(`log_module_updated = 'manage_users'`);
    values.push(updatedByAccountId);
    values.push(emailId);

    const result = await executor.query(
      `UPDATE email SET ${fields.join(', ')} WHERE email_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) throw new Error('Email not found');
    return result.rows[0];
  }

  async getEmailsByContact(contactId: number, client?: PoolClient): Promise<Email[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        e.*,
        lu.name AS email_type_name
      FROM email e
      LEFT JOIN look_up lu ON e.email_type_id = lu.look_up_id AND lu.is_deleted = false
      WHERE e.contact_id = $1 AND e.is_deleted = false
      ORDER BY e.is_primary DESC, e.email_id ASC`,
      [contactId]
    );
    return result.rows;
  }

  async deleteEmail(
    emailId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE email
       SET is_deleted = true,
           log_date_deleted = now(),
           log_deleted_by_account_id = $2,
           log_module_updated = 'manage_users'
       WHERE email_id = $1`,
      [emailId, deletedByAccountId]
    );
  }

  async deleteEmailsByContact(
    contactId: number,
    deletedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE email
       SET is_deleted = true,
           log_date_deleted = now(),
           log_deleted_by_account_id = $2,
           log_module_updated = 'manage_users'
       WHERE contact_id = $1 AND is_deleted = false`,
      [contactId, deletedByAccountId]
    );
  }
}
