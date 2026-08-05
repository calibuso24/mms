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
}
