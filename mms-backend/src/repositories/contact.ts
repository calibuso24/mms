import { pool } from '../config/database.js';

export interface Contact {
  contact_id: number;
  parent_contact_id: number | null;
  entity_type_id: number;
  contact_name: string;
  is_deleted: boolean;
  log_date_created: string;
  log_date_updated: string | null;
}

export interface Address {
  address_id: number;
  contact_id: number;
  address_label: string | null;
  address: string;
  is_primary: boolean;
  is_deleted: boolean;
}

export interface Phone {
  phone_id: number;
  contact_id: number;
  phone_label: string | null;
  phone_number: string;
  is_primary: boolean;
  is_deleted: boolean;
}

export interface Email {
  email_id: number;
  contact_id: number;
  email_label: string | null;
  email_address: string;
  is_primary: boolean;
  is_deleted: boolean;
}

export class ContactRepository {
  async findById(contactId: number): Promise<Contact | null> {
    const result = await pool.query(
      'SELECT * FROM contact WHERE contact_id = $1 AND is_deleted = false',
      [contactId]
    );
    return result.rows[0] || null;
  }

  async create(
    entityTypeId: number,
    contactName: string,
    parentContactId: number | null = null
  ): Promise<Contact> {
    const result = await pool.query(
      `INSERT INTO contact (entity_type_id, contact_name, parent_contact_id, log_date_created)
       VALUES ($1, $2, $3, now())
       RETURNING *`,
      [entityTypeId, contactName, parentContactId]
    );
    return result.rows[0];
  }

  async update(contactId: number, contactName: string): Promise<Contact> {
    const result = await pool.query(
      `UPDATE contact SET contact_name = $1, log_date_updated = now() 
       WHERE contact_id = $2 AND is_deleted = false
       RETURNING *`,
      [contactName, contactId]
    );
    if (result.rows.length === 0) throw new Error('Contact not found');
    return result.rows[0];
  }

  // Address methods
  async createAddress(
    contactId: number,
    address: string,
    addressLabel: string | null = null,
    isPrimary: boolean = false
  ): Promise<Address> {
    const result = await pool.query(
      `INSERT INTO address (contact_id, address, address_label, is_primary, log_date_created)
       VALUES ($1, $2, $3, $4, now())
       RETURNING *`,
      [contactId, address, addressLabel, isPrimary]
    );
    return result.rows[0];
  }

  async updateAddress(addressId: number, updates: Partial<Pick<Address, 'address' | 'address_label' | 'is_primary'>>): Promise<Address> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(updates.address);
    }
    if (updates.address_label !== undefined) {
      fields.push(`address_label = $${paramCount++}`);
      values.push(updates.address_label);
    }
    if (updates.is_primary !== undefined) {
      fields.push(`is_primary = $${paramCount++}`);
      values.push(updates.is_primary);
    }

    fields.push(`log_date_updated = now()`);
    values.push(addressId);

    const result = await pool.query(
      `UPDATE address SET ${fields.join(', ')} WHERE address_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) throw new Error('Address not found');
    return result.rows[0];
  }

  async getAddressesByContact(contactId: number): Promise<Address[]> {
    const result = await pool.query(
      'SELECT * FROM address WHERE contact_id = $1 AND is_deleted = false ORDER BY is_primary DESC',
      [contactId]
    );
    return result.rows;
  }

  async deleteAddress(addressId: number): Promise<void> {
    await pool.query(
      'UPDATE address SET is_deleted = true WHERE address_id = $1',
      [addressId]
    );
  }

  // Phone methods
  async createPhone(
    contactId: number,
    phoneNumber: string,
    phoneLabel: string | null = null,
    isPrimary: boolean = false
  ): Promise<Phone> {
    const result = await pool.query(
      `INSERT INTO phone (contact_id, phone_number, phone_label, is_primary, log_date_created)
       VALUES ($1, $2, $3, $4, now())
       RETURNING *`,
      [contactId, phoneNumber, phoneLabel, isPrimary]
    );
    return result.rows[0];
  }

  async updatePhone(phoneId: number, updates: Partial<Pick<Phone, 'phone_number' | 'phone_label' | 'is_primary'>>): Promise<Phone> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.phone_number !== undefined) {
      fields.push(`phone_number = $${paramCount++}`);
      values.push(updates.phone_number);
    }
    if (updates.phone_label !== undefined) {
      fields.push(`phone_label = $${paramCount++}`);
      values.push(updates.phone_label);
    }
    if (updates.is_primary !== undefined) {
      fields.push(`is_primary = $${paramCount++}`);
      values.push(updates.is_primary);
    }

    fields.push(`log_date_updated = now()`);
    values.push(phoneId);

    const result = await pool.query(
      `UPDATE phone SET ${fields.join(', ')} WHERE phone_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) throw new Error('Phone not found');
    return result.rows[0];
  }

  async getPhonesByContact(contactId: number): Promise<Phone[]> {
    const result = await pool.query(
      'SELECT * FROM phone WHERE contact_id = $1 AND is_deleted = false ORDER BY is_primary DESC',
      [contactId]
    );
    return result.rows;
  }

  async deletePhone(phoneId: number): Promise<void> {
    await pool.query(
      'UPDATE phone SET is_deleted = true WHERE phone_id = $1',
      [phoneId]
    );
  }

  // Email methods
  async createEmail(
    contactId: number,
    emailAddress: string,
    emailLabel: string | null = null,
    isPrimary: boolean = false
  ): Promise<Email> {
    const result = await pool.query(
      `INSERT INTO email (contact_id, email_address, email_label, is_primary, log_date_created)
       VALUES ($1, $2, $3, $4, now())
       RETURNING *`,
      [contactId, emailAddress, emailLabel, isPrimary]
    );
    return result.rows[0];
  }

  async updateEmail(emailId: number, updates: Partial<Pick<Email, 'email_address' | 'email_label' | 'is_primary'>>): Promise<Email> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.email_address !== undefined) {
      fields.push(`email_address = $${paramCount++}`);
      values.push(updates.email_address);
    }
    if (updates.email_label !== undefined) {
      fields.push(`email_label = $${paramCount++}`);
      values.push(updates.email_label);
    }
    if (updates.is_primary !== undefined) {
      fields.push(`is_primary = $${paramCount++}`);
      values.push(updates.is_primary);
    }

    fields.push(`log_date_updated = now()`);
    values.push(emailId);

    const result = await pool.query(
      `UPDATE email SET ${fields.join(', ')} WHERE email_id = $${paramCount} AND is_deleted = false RETURNING *`,
      [...values]
    );

    if (result.rows.length === 0) throw new Error('Email not found');
    return result.rows[0];
  }

  async getEmailsByContact(contactId: number): Promise<Email[]> {
    const result = await pool.query(
      'SELECT * FROM email WHERE contact_id = $1 AND is_deleted = false ORDER BY is_primary DESC',
      [contactId]
    );
    return result.rows;
  }

  async deleteEmail(emailId: number): Promise<void> {
    await pool.query(
      'UPDATE email SET is_deleted = true WHERE email_id = $1',
      [emailId]
    );
  }
}
