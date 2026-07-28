import { pool } from '../config/database.js';

export interface MaterialOption {
  material_option_id: number;
  material_id: number;
  option_code: string;
  option_name: string;
  option_type_id: number;
  requires_approval: boolean;
  is_active: boolean;
  is_deleted: boolean;
  notes?: string;
  option_type_name?: string;
}

export interface MaterialOptionWithType extends MaterialOption {
  option_type_name?: string;
}

export class MaterialOptionRepository {
  async findByMaterialId(materialId: number): Promise<MaterialOptionWithType[]> {
    const result = await pool.query(
      `SELECT mo.*, l.name as option_type_name
       FROM material_option mo
       LEFT JOIN look_up l ON mo.option_type_id = l.look_up_id
       WHERE mo.material_id = $1 AND mo.is_deleted = false`,
      [materialId]
    );
    return result.rows;
  }

  async findById(id: number): Promise<MaterialOptionWithType | null> {
    const result = await pool.query(
      `SELECT mo.*, l.name as option_type_name
       FROM material_option mo
       LEFT JOIN look_up l ON mo.option_type_id = l.look_up_id
       WHERE mo.material_option_id = $1 AND mo.is_deleted = false`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code: string): Promise<MaterialOptionWithType | null> {
    const result = await pool.query(
      `SELECT mo.*, l.name as option_type_name
       FROM material_option mo
       LEFT JOIN look_up l ON mo.option_type_id = l.look_up_id
       WHERE mo.option_code = $1 AND mo.is_deleted = false`,
      [code]
    );
    return result.rows[0] || null;
  }

  async create(data: {
    material_id: number;
    option_code: string;
    option_name: string;
    option_type_id: number;
    requires_approval?: boolean;
    is_active?: boolean;
    notes?: string;
  }): Promise<MaterialOptionWithType> {
    const result = await pool.query(
      `INSERT INTO material_option (
        material_id, option_code, option_name, option_type_id,
        requires_approval, is_active, notes, log_date_created
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        data.material_id,
        data.option_code,
        data.option_name,
        data.option_type_id,
        data.requires_approval ?? true,
        data.is_active ?? true,
        data.notes || null,
      ]
    );

    return this.findById(result.rows[0].material_option_id) as Promise<MaterialOptionWithType>;
  }

  async update(
    id: number,
    data: {
      option_name?: string;
      option_type_id?: number;
      requires_approval?: boolean;
      is_active?: boolean;
      notes?: string;
    }
  ): Promise<MaterialOptionWithType> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.option_name !== undefined) {
      updates.push(`option_name = $${paramIndex}`);
      params.push(data.option_name);
      paramIndex++;
    }
    if (data.option_type_id !== undefined) {
      updates.push(`option_type_id = $${paramIndex}`);
      params.push(data.option_type_id);
      paramIndex++;
    }
    if (data.requires_approval !== undefined) {
      updates.push(`requires_approval = $${paramIndex}`);
      params.push(data.requires_approval);
      paramIndex++;
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex++;
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(data.notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<MaterialOptionWithType>;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE material_option SET ${updates.join(', ')} WHERE material_option_id = $1 RETURNING *`,
      params
    );

    return this.findById(result.rows[0].material_option_id) as Promise<MaterialOptionWithType>;
  }

  async softDelete(id: number): Promise<void> {
    await pool.query(
      `UPDATE material_option SET is_deleted = true, log_date_deleted = NOW() WHERE material_option_id = $1`,
      [id]
    );
  }
}
