import { pool } from '../config/database.js';

export interface MaterialSpecification {
  material_specification_id: number;
  material_id: number;
  primary_size?: string;
  secondary_size?: string;
  alternate_size?: string;
  thickness_or_gauge?: string;
  width?: string;
  length?: string;
  schedule?: string;
  pressure_or_load_rating?: string;
  standard?: string;
  pack_size?: string;
  additional_specification?: string;
  is_deleted: boolean;
}

export class MaterialSpecificationRepository {
  async findByMaterialId(materialId: number): Promise<MaterialSpecification | null> {
    const result = await pool.query(
      'SELECT * FROM material_specification WHERE material_id = $1 AND is_deleted = false',
      [materialId]
    );
    return result.rows[0] || null;
  }

  async create(data: {
    material_id: number;
    primary_size?: string;
    secondary_size?: string;
    alternate_size?: string;
    thickness_or_gauge?: string;
    width?: string;
    length?: string;
    schedule?: string;
    pressure_or_load_rating?: string;
    standard?: string;
    pack_size?: string;
    additional_specification?: string;
  }): Promise<MaterialSpecification> {
    const result = await pool.query(
      `INSERT INTO material_specification (
        material_id, primary_size, secondary_size, alternate_size, thickness_or_gauge,
        width, length, schedule, pressure_or_load_rating, standard, pack_size,
        additional_specification, log_date_created
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [
        data.material_id,
        data.primary_size || null,
        data.secondary_size || null,
        data.alternate_size || null,
        data.thickness_or_gauge || null,
        data.width || null,
        data.length || null,
        data.schedule || null,
        data.pressure_or_load_rating || null,
        data.standard || null,
        data.pack_size || null,
        data.additional_specification || null,
      ]
    );

    return result.rows[0];
  }

  async update(
    materialId: number,
    data: {
      primary_size?: string;
      secondary_size?: string;
      alternate_size?: string;
      thickness_or_gauge?: string;
      width?: string;
      length?: string;
      schedule?: string;
      pressure_or_load_rating?: string;
      standard?: string;
      pack_size?: string;
      additional_specification?: string;
    }
  ): Promise<MaterialSpecification> {
    const updates: string[] = [];
    const params: any[] = [materialId];
    let paramIndex = 2;

    if (data.primary_size !== undefined) {
      updates.push(`primary_size = $${paramIndex}`);
      params.push(data.primary_size);
      paramIndex++;
    }
    if (data.secondary_size !== undefined) {
      updates.push(`secondary_size = $${paramIndex}`);
      params.push(data.secondary_size);
      paramIndex++;
    }
    if (data.alternate_size !== undefined) {
      updates.push(`alternate_size = $${paramIndex}`);
      params.push(data.alternate_size);
      paramIndex++;
    }
    if (data.thickness_or_gauge !== undefined) {
      updates.push(`thickness_or_gauge = $${paramIndex}`);
      params.push(data.thickness_or_gauge);
      paramIndex++;
    }
    if (data.width !== undefined) {
      updates.push(`width = $${paramIndex}`);
      params.push(data.width);
      paramIndex++;
    }
    if (data.length !== undefined) {
      updates.push(`length = $${paramIndex}`);
      params.push(data.length);
      paramIndex++;
    }
    if (data.schedule !== undefined) {
      updates.push(`schedule = $${paramIndex}`);
      params.push(data.schedule);
      paramIndex++;
    }
    if (data.pressure_or_load_rating !== undefined) {
      updates.push(`pressure_or_load_rating = $${paramIndex}`);
      params.push(data.pressure_or_load_rating);
      paramIndex++;
    }
    if (data.standard !== undefined) {
      updates.push(`standard = $${paramIndex}`);
      params.push(data.standard);
      paramIndex++;
    }
    if (data.pack_size !== undefined) {
      updates.push(`pack_size = $${paramIndex}`);
      params.push(data.pack_size);
      paramIndex++;
    }
    if (data.additional_specification !== undefined) {
      updates.push(`additional_specification = $${paramIndex}`);
      params.push(data.additional_specification);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findByMaterialId(materialId) as Promise<MaterialSpecification>;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE material_specification SET ${updates.join(', ')} WHERE material_id = $1 RETURNING *`,
      params
    );

    return result.rows[0];
  }
}
