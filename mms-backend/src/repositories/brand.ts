import { pool } from '../config/database.js';

export interface Brand {
  brand_id: string;
  brand_name: string;
  is_active: boolean;
  is_deleted: boolean;
}

export class BrandRepository {
  async findById(id: number): Promise<Brand | null> {
    const result = await pool.query(
      'SELECT * FROM brand WHERE brand_id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByName(name: string): Promise<Brand | null> {
    const result = await pool.query(
      'SELECT * FROM brand WHERE brand_name = $1 AND is_deleted = false',
      [name]
    );
    return result.rows[0] || null;
  }

  async findAll(limit?: number, offset?: number): Promise<Brand[]> {
    let query = 'SELECT * FROM brand WHERE is_deleted = false ORDER BY brand_name ASC';
    const params: any[] = [];

    if (limit) {
      query += ' LIMIT $1';
      params.push(limit);
      if (offset) {
        query += ' OFFSET $2';
        params.push(offset);
      }
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async create(data: { brand_name: string }): Promise<Brand> {
    const result = await pool.query(
      `INSERT INTO brand (brand_name, is_active, log_date_created)
       VALUES ($1, true, NOW())
       RETURNING *`,
      [data.brand_name]
    );
    return result.rows[0];
  }

  async update(
    id: number,
    data: {
      brand_name?: string;
      is_active?: boolean;
    }
  ): Promise<Brand> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.brand_name !== undefined) {
      updates.push(`brand_name = $${paramIndex}`);
      params.push(data.brand_name);
      paramIndex++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE brand SET ${updates.join(', ')} WHERE brand_id = $1 RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async softDelete(id: number): Promise<void> {
    await pool.query(
      `UPDATE brand SET is_deleted = true, log_date_deleted = NOW() WHERE brand_id = $1`,
      [id]
    );
  }
}
