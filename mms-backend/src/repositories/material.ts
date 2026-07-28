import { pool } from '../config/database.js';

export interface Material {
  material_id: string;
  product_code: string;
  product_name: string;
  source_description?: string;
  category_id: string;
  sub_category_id?: string;
  stock_uom_id: string;
  status_id: string;
  notes?: string;
  is_deleted: boolean;
}

export interface MaterialWithDetails extends Material {
  category_name?: string;
  sub_category_name?: string;
  uom_name?: string;
  uom_abbreviation?: string;
  status_name?: string;
}

export class MaterialRepository {
  async findById(id: number): Promise<MaterialWithDetails | null> {
    const result = await pool.query(
      `SELECT 
        m.*,
        c.category_name,
        sc.sub_category_name,
        u.uom_name,
        u.abbreviation as uom_abbreviation,
        l.name as status_name
       FROM material m
       LEFT JOIN category c ON m.category_id = c.category_id
       LEFT JOIN sub_category sc ON m.sub_category_id = sc.sub_category_id
       LEFT JOIN unit_of_measure u ON m.stock_uom_id = u.uom_id
       LEFT JOIN look_up l ON m.status_id = l.look_up_id
       WHERE m.material_id = $1 AND m.is_deleted = false`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code: string): Promise<MaterialWithDetails | null> {
    const result = await pool.query(
      `SELECT 
        m.*,
        c.category_name,
        sc.sub_category_name,
        u.uom_name,
        u.abbreviation as uom_abbreviation,
        l.name as status_name
       FROM material m
       LEFT JOIN category c ON m.category_id = c.category_id
       LEFT JOIN sub_category sc ON m.sub_category_id = sc.sub_category_id
       LEFT JOIN unit_of_measure u ON m.stock_uom_id = u.uom_id
       LEFT JOIN look_up l ON m.status_id = l.look_up_id
       WHERE m.product_code = $1 AND m.is_deleted = false`,
      [code]
    );
    return result.rows[0] || null;
  }

  async findAll(limit?: number, offset?: number, filters?: {
    search?: string;
    category_id?: number;
    sub_category_id?: number;
    status_id?: number;
    uom_id?: number;
    brand_id?: number;
  }): Promise<MaterialWithDetails[]> {
    let query = `SELECT 
      m.*,
      c.category_name,
      sc.sub_category_name,
      u.uom_name,
      u.abbreviation as uom_abbreviation,
      l.name as status_name
     FROM material m
     LEFT JOIN category c ON m.category_id = c.category_id
     LEFT JOIN sub_category sc ON m.sub_category_id = sc.sub_category_id
     LEFT JOIN unit_of_measure u ON m.stock_uom_id = u.uom_id
     LEFT JOIN look_up l ON m.status_id = l.look_up_id
     WHERE m.is_deleted = false`;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.search) {
      query += ` AND (m.product_code ILIKE $${paramIndex} OR m.product_name ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.category_id) {
      query += ` AND m.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters?.sub_category_id) {
      query += ` AND m.sub_category_id = $${paramIndex}`;
      params.push(filters.sub_category_id);
      paramIndex++;
    }

    if (filters?.status_id) {
      query += ` AND m.status_id = $${paramIndex}`;
      params.push(filters.status_id);
      paramIndex++;
    }

    if (filters?.uom_id) {
      query += ` AND m.stock_uom_id = $${paramIndex}`;
      params.push(filters.uom_id);
      paramIndex++;
    }

    query += ' ORDER BY m.product_name ASC';

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
    product_code: string;
    product_name: string;
    source_description?: string;
    category_id: number;
    sub_category_id?: number;
    stock_uom_id: number;
    status_id: number;
    notes?: string;
  }): Promise<MaterialWithDetails> {
    const result = await pool.query(
      `INSERT INTO material (
        product_code, product_name, source_description, category_id, sub_category_id,
        stock_uom_id, status_id, notes, log_date_created
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        data.product_code,
        data.product_name,
        data.source_description || null,
        data.category_id,
        data.sub_category_id || null,
        data.stock_uom_id,
        data.status_id,
        data.notes || null,
      ]
    );

    return this.findById(result.rows[0].material_id) as Promise<MaterialWithDetails>;
  }

  async update(
    id: number,
    data: {
      product_name?: string;
      source_description?: string;
      category_id?: number;
      sub_category_id?: number;
      stock_uom_id?: number;
      status_id?: number;
      notes?: string;
    }
  ): Promise<MaterialWithDetails> {
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (data.product_name !== undefined) {
      updates.push(`product_name = $${paramIndex}`);
      params.push(data.product_name);
      paramIndex++;
    }

    if (data.source_description !== undefined) {
      updates.push(`source_description = $${paramIndex}`);
      params.push(data.source_description);
      paramIndex++;
    }

    if (data.category_id !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      params.push(data.category_id);
      paramIndex++;
    }

    if (data.sub_category_id !== undefined) {
      updates.push(`sub_category_id = $${paramIndex}`);
      params.push(data.sub_category_id);
      paramIndex++;
    }

    if (data.stock_uom_id !== undefined) {
      updates.push(`stock_uom_id = $${paramIndex}`);
      params.push(data.stock_uom_id);
      paramIndex++;
    }

    if (data.status_id !== undefined) {
      updates.push(`status_id = $${paramIndex}`);
      params.push(data.status_id);
      paramIndex++;
    }

    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(data.notes);
      paramIndex++;
    }

    updates.push(`log_date_updated = NOW()`);

    const result = await pool.query(
      `UPDATE material SET ${updates.join(', ')} WHERE material_id = $1 RETURNING *`,
      params
    );

    return this.findById(result.rows[0].material_id) as Promise<MaterialWithDetails>;
  }

  async softDelete(id: number): Promise<void> {
    await pool.query(
      `UPDATE material SET is_deleted = true, log_date_deleted = NOW() WHERE material_id = $1`,
      [id]
    );
  }
}
