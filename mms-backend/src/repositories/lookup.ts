import { pool } from '../config/database.js';

export interface LookupEntry {
  look_up_id: number;
  look_up_type: string;
  code: string;
  name: string;
  description?: string;
  display_order?: number;
}

export class LookupRepository {
  async findByType(type: string, limit?: number, offset?: number): Promise<LookupEntry[]> {
    const params: any[] = [type];
    let query = `SELECT * FROM look_up WHERE look_up_type = $1 AND is_deleted = false ORDER BY display_order ASC`;
    
    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
      if (offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findById(id: number): Promise<LookupEntry | null> {
    const result = await pool.query(
      'SELECT * FROM look_up WHERE look_up_id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByTypeAndCode(type: string, code: string): Promise<LookupEntry | null> {
    const result = await pool.query(
      `SELECT *
       FROM look_up
       WHERE look_up_type = $1
         AND code = $2
         AND is_deleted = false`,
      [type, code]
    );

    return result.rows[0] || null;
  }
}
