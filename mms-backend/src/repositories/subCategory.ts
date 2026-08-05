import { pool } from '../config/database.js';

export interface SubCategory {
  sub_category_id: string;
  category_id: string;
  sub_category_code: string;
  sub_category_name: string;
  is_active: boolean;
  is_deleted: boolean;
}

export class SubCategoryRepository {
  async findById(id: number): Promise<SubCategory | null> {
    const result = await pool.query(
      'SELECT * FROM sub_category WHERE sub_category_id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code: string): Promise<SubCategory | null> {
    const result = await pool.query(
      'SELECT * FROM sub_category WHERE sub_category_code = $1 AND is_deleted = false',
      [code]
    );
    return result.rows[0] || null;
  }

  async findByCategory(categoryId: number, limit?: number, offset?: number, search?: string): Promise<SubCategory[]> {
    let query = `SELECT * FROM sub_category WHERE category_id = $1 AND is_deleted = false`;
    const params: any[] = [categoryId];
    let paramIndex = 2;

    if (search && search.trim().length > 0) {
      query += ` AND (sub_category_code ILIKE $${paramIndex} OR sub_category_name ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ' ORDER BY sub_category_name ASC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
      if (offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findAll(limit?: number, offset?: number, search?: string): Promise<SubCategory[]> {
    let query = 'SELECT * FROM sub_category WHERE is_deleted = false';
    const params: any[] = [];
    let paramIndex = 1;

    if (search && search.trim().length > 0) {
      query += ` AND (sub_category_code ILIKE $${paramIndex} OR sub_category_name ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ' ORDER BY sub_category_name ASC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
      if (offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(offset);
      }
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async create(data: {
    category_id: number;
    sub_category_code: string;
    sub_category_name: string;
  }): Promise<SubCategory> {
    const result = await pool.query(
      `INSERT INTO sub_category (category_id, sub_category_code, sub_category_name, is_active, log_date_created)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING *`,
      [data.category_id, data.sub_category_code, data.sub_category_name]
    );
    return result.rows[0];
  }

  async update(
    id: number,
    data: {
      sub_category_name?: string;
      is_active?: boolean;
    }
  ): Promise<SubCategory> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.sub_category_name !== undefined) {
      updates.push(`sub_category_name = $${paramIndex}`);
      params.push(data.sub_category_name);
      paramIndex++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE sub_category SET ${updates.join(', ')} WHERE sub_category_id = $1 RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async softDelete(id: number): Promise<void> {
    await pool.query(
      `UPDATE sub_category SET is_deleted = true, log_date_deleted = NOW() WHERE sub_category_id = $1`,
      [id]
    );
  }
}
