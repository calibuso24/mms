import { pool } from '../config/database.js';

export interface UnitOfMeasure {
  uom_id: string;
  uom_name: string;
  abbreviation: string;
  is_active: boolean;
  is_deleted: boolean;
}

export class UnitOfMeasureRepository {
  async findById(id: number): Promise<UnitOfMeasure | null> {
    const result = await pool.query(
      'SELECT * FROM unit_of_measure WHERE uom_id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByName(name: string): Promise<UnitOfMeasure | null> {
    const result = await pool.query(
      'SELECT * FROM unit_of_measure WHERE uom_name = $1 AND is_deleted = false',
      [name]
    );
    return result.rows[0] || null;
  }

  async findByAbbreviation(abbr: string): Promise<UnitOfMeasure | null> {
    const result = await pool.query(
      'SELECT * FROM unit_of_measure WHERE abbreviation = $1 AND is_deleted = false',
      [abbr]
    );
    return result.rows[0] || null;
  }

  async findAll(limit?: number, offset?: number, search?: string): Promise<UnitOfMeasure[]> {
    let query = 'SELECT * FROM unit_of_measure WHERE is_deleted = false';
    const params: any[] = [];
    let paramIndex = 1;

    if (search && search.trim().length > 0) {
      query += ` AND (uom_name ILIKE $${paramIndex} OR abbreviation ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ' ORDER BY uom_name ASC';

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
    uom_name: string;
    abbreviation: string;
  }): Promise<UnitOfMeasure> {
    const result = await pool.query(
      `INSERT INTO unit_of_measure (uom_name, abbreviation, is_active, log_date_created)
       VALUES ($1, $2, true, NOW())
       RETURNING *`,
      [data.uom_name, data.abbreviation]
    );
    return result.rows[0];
  }

  async update(
    id: number,
    data: {
      uom_name?: string;
      abbreviation?: string;
      is_active?: boolean;
    }
  ): Promise<UnitOfMeasure> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.uom_name !== undefined) {
      updates.push(`uom_name = $${paramIndex}`);
      params.push(data.uom_name);
      paramIndex++;
    }

    if (data.abbreviation !== undefined) {
      updates.push(`abbreviation = $${paramIndex}`);
      params.push(data.abbreviation);
      paramIndex++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE unit_of_measure SET ${updates.join(', ')} WHERE uom_id = $1 RETURNING *`,
      params
    );
    return result.rows[0];
  }

  async softDelete(id: number): Promise<void> {
    await pool.query(
      `UPDATE unit_of_measure SET is_deleted = true, log_date_deleted = NOW() WHERE uom_id = $1`,
      [id]
    );
  }
}
