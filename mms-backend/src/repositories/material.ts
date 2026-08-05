import { pool } from '../config/database.js';

export interface Material {
  material_id: string;
  product_code: string;
  product_name: string;
  category_id: string;
  sub_category_id?: string;
  stock_uom_id: string;
  material_type_id?: string;
  status_id: string;
  notes?: string;
  is_deleted: boolean;
}

export interface MaterialWithDetails extends Material {
  category_code?: string;
  category_name?: string;
  sub_category_code?: string;
  sub_category_name?: string;
  brand_name?: string;
  specification_name?: string;
  uom_name?: string;
  uom_abbreviation?: string;
  material_type_name?: string;
  status_name?: string;
  full_description?: string;
}

const FULL_DESCRIPTION_SQL = `NULLIF(
  TRIM(BOTH ' -' FROM CONCAT_WS(' - ',
    NULLIF(m.product_name, ''),
    NULLIF(ms.primary_size, ''),
    NULLIF(ms.secondary_size, ''),
    NULLIF(ms.alternate_size, ''),
    NULLIF(ms.thickness_or_gauge, ''),
    NULLIF(ms.width, ''),
    NULLIF(ms.length, ''),
    NULLIF(ms.schedule, ''),
    NULLIF(ms.pressure_or_load_rating, ''),
    NULLIF(ms.standard, ''),
    NULLIF(ms.pack_size, ''),
    NULLIF(ms.additional_specification, '')
  )),
  ''
)`;

export class MaterialRepository {
  async findById(id: number): Promise<MaterialWithDetails | null> {
    const result = await pool.query(
      `SELECT 
        m.*,
        c.category_code,
        c.category_name,
        sc.sub_category_code,
        sc.sub_category_name,
        mt.material_type_name,
        ms.primary_size,
        ms.secondary_size,
        ms.alternate_size,
        ms.thickness_or_gauge,
        ms.width,
        ms.length,
        ms.schedule,
        ms.pressure_or_load_rating,
        ms.standard,
        ms.pack_size,
        ms.additional_specification,
        ${FULL_DESCRIPTION_SQL} AS full_description,
        u.uom_name,
        u.abbreviation as uom_abbreviation,
        l.name as status_name,
        mb.brand_name,
        TRIM(BOTH ' -' FROM CONCAT_WS(' - ',
          NULLIF(ms.primary_size, ''),
          NULLIF(ms.secondary_size, ''),
          NULLIF(ms.alternate_size, ''),
          NULLIF(ms.thickness_or_gauge, ''),
          NULLIF(ms.width, ''),
          NULLIF(ms.length, ''),
          NULLIF(ms.schedule, ''),
          NULLIF(ms.pressure_or_load_rating, ''),
          NULLIF(ms.standard, ''),
          NULLIF(ms.pack_size, ''),
          NULLIF(ms.additional_specification, '')
        )) AS specification_name
       FROM material m
       LEFT JOIN category c ON m.category_id = c.category_id
       LEFT JOIN sub_category sc ON m.sub_category_id = sc.sub_category_id
       LEFT JOIN material_type mt ON m.material_type_id = mt.material_type_id
       LEFT JOIN material_specification ms ON ms.material_id = m.material_id AND ms.is_deleted = false
       LEFT JOIN unit_of_measure u ON m.stock_uom_id = u.uom_id
       LEFT JOIN look_up l ON m.status_id = l.look_up_id
       LEFT JOIN LATERAL (
         SELECT b.brand_name
         FROM material_brand mb
         JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
         WHERE mb.material_id = m.material_id
           AND mb.is_deleted = false
         ORDER BY b.brand_name ASC
         LIMIT 1
       ) mb ON true
       WHERE m.material_id = $1 AND m.is_deleted = false`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code: string): Promise<MaterialWithDetails | null> {
    const result = await pool.query(
      `SELECT 
        m.*,
        c.category_code,
        c.category_name,
        sc.sub_category_code,
        sc.sub_category_name,
        mt.material_type_name,
        ${FULL_DESCRIPTION_SQL} AS full_description,
        u.uom_name,
        u.abbreviation as uom_abbreviation,
        l.name as status_name,
        mb.brand_name,
        TRIM(BOTH ' -' FROM CONCAT_WS(' - ',
          NULLIF(ms.primary_size, ''),
          NULLIF(ms.secondary_size, ''),
          NULLIF(ms.alternate_size, ''),
          NULLIF(ms.thickness_or_gauge, ''),
          NULLIF(ms.width, ''),
          NULLIF(ms.length, ''),
          NULLIF(ms.schedule, ''),
          NULLIF(ms.pressure_or_load_rating, ''),
          NULLIF(ms.standard, ''),
          NULLIF(ms.pack_size, ''),
          NULLIF(ms.additional_specification, '')
        )) AS specification_name
       FROM material m
       LEFT JOIN category c ON m.category_id = c.category_id
       LEFT JOIN sub_category sc ON m.sub_category_id = sc.sub_category_id
       LEFT JOIN material_type mt ON m.material_type_id = mt.material_type_id
       LEFT JOIN material_specification ms ON ms.material_id = m.material_id AND ms.is_deleted = false
       LEFT JOIN unit_of_measure u ON m.stock_uom_id = u.uom_id
       LEFT JOIN look_up l ON m.status_id = l.look_up_id
       LEFT JOIN LATERAL (
         SELECT b.brand_name
         FROM material_brand mb
         JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
         WHERE mb.material_id = m.material_id
           AND mb.is_deleted = false
         ORDER BY b.brand_name ASC
         LIMIT 1
       ) mb ON true
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
    material_type_id?: number;
    uom_id?: number;
    brand_id?: number;
  }): Promise<MaterialWithDetails[]> {
    let query = `SELECT 
      m.*,
        c.category_code,
      c.category_name,
        sc.sub_category_code,
      sc.sub_category_name,
        mt.material_type_name,
        ${FULL_DESCRIPTION_SQL} AS full_description,
      u.uom_name,
      u.abbreviation as uom_abbreviation,
        l.name as status_name,
        mb.brand_name,
        TRIM(BOTH ' -' FROM CONCAT_WS(' - ',
          NULLIF(ms.primary_size, ''),
          NULLIF(ms.secondary_size, ''),
          NULLIF(ms.alternate_size, ''),
          NULLIF(ms.thickness_or_gauge, ''),
          NULLIF(ms.width, ''),
          NULLIF(ms.length, ''),
          NULLIF(ms.schedule, ''),
          NULLIF(ms.pressure_or_load_rating, ''),
          NULLIF(ms.standard, ''),
          NULLIF(ms.pack_size, ''),
          NULLIF(ms.additional_specification, '')
        )) AS specification_name
     FROM material m
     LEFT JOIN category c ON m.category_id = c.category_id
     LEFT JOIN sub_category sc ON m.sub_category_id = sc.sub_category_id
       LEFT JOIN material_type mt ON m.material_type_id = mt.material_type_id
       LEFT JOIN material_specification ms ON ms.material_id = m.material_id AND ms.is_deleted = false
     LEFT JOIN unit_of_measure u ON m.stock_uom_id = u.uom_id
     LEFT JOIN look_up l ON m.status_id = l.look_up_id
       LEFT JOIN LATERAL (
         SELECT b.brand_name
         FROM material_brand mb
         JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
         WHERE mb.material_id = m.material_id
           AND mb.is_deleted = false
         ORDER BY b.brand_name ASC
         LIMIT 1
       ) mb ON true
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

    if (filters?.material_type_id) {
      query += ` AND m.material_type_id = $${paramIndex}`;
      params.push(filters.material_type_id);
      paramIndex++;
    }

    if (filters?.uom_id) {
      query += ` AND m.stock_uom_id = $${paramIndex}`;
      params.push(filters.uom_id);
      paramIndex++;
    }

    if (filters?.brand_id) {
      query += `
        AND EXISTS (
          SELECT 1
          FROM material_brand mbf
          WHERE mbf.material_id = m.material_id
            AND mbf.brand_id = $${paramIndex}
            AND mbf.is_deleted = false
        )
      `;
      params.push(filters.brand_id);
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

  async countAll(filters?: {
    search?: string;
    category_id?: number;
    sub_category_id?: number;
    status_id?: number;
    material_type_id?: number;
    uom_id?: number;
    brand_id?: number;
  }): Promise<number> {
    let query = `
      SELECT COUNT(*)::int AS total
      FROM material m
      WHERE m.is_deleted = false
    `;

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

    if (filters?.material_type_id) {
      query += ` AND m.material_type_id = $${paramIndex}`;
      params.push(filters.material_type_id);
      paramIndex++;
    }

    if (filters?.uom_id) {
      query += ` AND m.stock_uom_id = $${paramIndex}`;
      params.push(filters.uom_id);
      paramIndex++;
    }

    if (filters?.brand_id) {
      query += `
        AND EXISTS (
          SELECT 1
          FROM material_brand mbf
          WHERE mbf.material_id = m.material_id
            AND mbf.brand_id = $${paramIndex}
            AND mbf.is_deleted = false
        )
      `;
      params.push(filters.brand_id);
    }

    const result = await pool.query(query, params);
    return Number(result.rows[0]?.total || 0);
  }

  async create(data: {
    product_code: string;
    product_name: string;
    category_id: number;
    sub_category_id?: number;
    stock_uom_id: number;
    material_type_id?: number;
    status_id: number;
    notes?: string;
  }): Promise<MaterialWithDetails> {
    const result = await pool.query(
      `INSERT INTO material (
        product_code, product_name, category_id, sub_category_id,
        stock_uom_id, material_type_id, status_id, notes, log_date_created
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        data.product_code,
        data.product_name,
        data.category_id,
        data.sub_category_id || null,
        data.stock_uom_id,
        data.material_type_id || null,
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
      category_id?: number;
      sub_category_id?: number;
      stock_uom_id?: number;
      material_type_id?: number;
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

    if (data.material_type_id !== undefined) {
      updates.push(`material_type_id = $${paramIndex}`);
      params.push(data.material_type_id);
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

  async getCategoryCodes(categoryId: number, subCategoryId?: number): Promise<{ category_code: string; sub_category_code: string }> {
    const result = await pool.query(
      `SELECT
        c.category_code,
        COALESCE(sc.sub_category_code, 'GEN') AS sub_category_code
      FROM category c
      LEFT JOIN sub_category sc
        ON sc.sub_category_id = $2
       AND sc.category_id = c.category_id
       AND sc.is_deleted = false
      WHERE c.category_id = $1
        AND c.is_deleted = false`,
      [categoryId, subCategoryId || null]
    );

    return result.rows[0] || { category_code: '', sub_category_code: 'GEN' };
  }

  async getNextProductCodeSequence(
    categoryCode: string,
    subCategoryCode: string,
    client?: { query: (text: string, params?: any[]) => Promise<any> }
  ): Promise<number> {
    const executor = client ?? pool;
    const prefix = `${categoryCode}${subCategoryCode}`;
    const result = await executor.query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING(product_code FROM $2) AS INTEGER)),
        0
      ) AS max_sequence
      FROM material
      WHERE product_code LIKE $1
        AND is_deleted = false`,
      [`${prefix}%`, `^${prefix}([0-9]+)$`]
    );

    return Number(result.rows[0]?.max_sequence ?? 0);
  }
}
