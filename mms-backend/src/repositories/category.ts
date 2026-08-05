import { pool } from '../config/database.js';

export interface Category {
  category_id: string;
  category_code: string;
  category_name: string;
  description?: string;
  is_active: boolean;
  is_deleted: boolean;
}

export class CategoryRepository {
  async findById(id: number): Promise<Category | null> {
    const result = await pool.query(
      'SELECT * FROM category WHERE category_id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code: string): Promise<Category | null> {
    const result = await pool.query(
      'SELECT * FROM category WHERE category_code = $1 AND is_deleted = false',
      [code]
    );
    return result.rows[0] || null;
  }

  async findAll(limit?: number, offset?: number, search?: string): Promise<Category[]> {
    let query = 'SELECT * FROM category WHERE is_deleted = false';
    const params: any[] = [];
    let paramIndex = 1;

    if (search && search.trim().length > 0) {
      query += ` AND (category_code ILIKE $${paramIndex} OR category_name ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ' ORDER BY category_name ASC';

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
    category_code: string;
    category_name: string;
    description?: string;
  }): Promise<Category> {
    const result = await pool.query(
      `INSERT INTO category (category_code, category_name, description, is_active, log_date_created)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING *`,
      [data.category_code, data.category_name, data.description || null]
    );
    return result.rows[0];
  }

  async update(
    id: number,
    data: {
      category_name?: string;
      description?: string;
      is_active?: boolean;
    }
  ): Promise<Category> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.category_name !== undefined) {
      updates.push(`category_name = $${paramIndex}`);
      params.push(data.category_name);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE category SET ${updates.join(', ')} WHERE category_id = $1 RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async softDelete(id: number): Promise<void> {
    await pool.query(
      `UPDATE category SET is_deleted = true, log_date_deleted = NOW() WHERE category_id = $1`,
      [id]
    );
  }
}
