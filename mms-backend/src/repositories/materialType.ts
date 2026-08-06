import { pool } from '../config/database.js';

export interface MaterialType {
  material_type_id: number;
  material_type_code: string | null;
  material_type_name: string;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
}

export class MaterialTypeRepository {
  async findById(id: number): Promise<MaterialType | null> {
    const result = await pool.query(
      `SELECT *
       FROM material_type
       WHERE material_type_id = $1
         AND is_deleted = false`,
      [id]
    );

    return result.rows[0] || null;
  }

  async findAll(limit?: number, offset?: number, search?: string): Promise<MaterialType[]> {
    let query = `
      SELECT *
      FROM material_type
      WHERE is_deleted = false
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (search && search.trim().length > 0) {
      query += `
        AND (
          material_type_name ILIKE $${paramIndex}
          OR COALESCE(material_type_code, '') ILIKE $${paramIndex}
        )
      `;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ' ORDER BY material_type_name ASC';

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

  async findByCode(code: string): Promise<MaterialType | null> {
    const result = await pool.query(
      `SELECT *
       FROM material_type
       WHERE material_type_code = $1
         AND is_deleted = false`,
      [code]
    );

    return result.rows[0] || null;
  }

  async findByName(name: string): Promise<MaterialType | null> {
    const result = await pool.query(
      `SELECT *
       FROM material_type
       WHERE material_type_name = $1
         AND is_deleted = false`,
      [name]
    );

    return result.rows[0] || null;
  }

  async create(data: {
    material_type_code?: string | null;
    material_type_name: string;
    description?: string | null;
  }): Promise<MaterialType> {
    const result = await pool.query(
      `INSERT INTO material_type (
         material_type_code,
         material_type_name,
         description,
         is_active,
         log_date_created
       )
       VALUES ($1, $2, $3, true, NOW())
       RETURNING *`,
      [
        data.material_type_code || null,
        data.material_type_name,
        data.description || null,
      ]
    );

    return result.rows[0];
  }

  async update(
    id: number,
    data: {
      material_type_code?: string | null;
      material_type_name?: string;
      description?: string | null;
      is_active?: boolean;
    }
  ): Promise<MaterialType> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.material_type_code !== undefined) {
      updates.push(`material_type_code = $${paramIndex}`);
      params.push(data.material_type_code || null);
      paramIndex++;
    }

    if (data.material_type_name !== undefined) {
      updates.push(`material_type_name = $${paramIndex}`);
      params.push(data.material_type_name);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description || null);
      paramIndex++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE material_type
       SET ${updates.join(', ')}
       WHERE material_type_id = $1
       RETURNING *`,
      params
    );

    return result.rows[0];
  }
}
