import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

type QueryExecutor = PoolClient | typeof pool;

export interface DeliveryAdviceListRow {
  delivery_advice_id: number;
  purchase_order_id: number;
  po_number: string;
  da_number: string;
  reference_code: string;
  issued_at: string;
  received_at: string | null;
  status_id: number;
  status_code: string;
  status_name: string;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface DeliveryAdviceItemRow {
  delivery_advice_item_id: number;
  purchase_order_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  advised_quantity: string;
  received_quantity: string;
  notes: string | null;
}

export class DeliveryAdviceRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<DeliveryAdviceListRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        da.delivery_advice_id,
        da.purchase_order_id,
        po.po_number,
        da.da_number,
        da.reference_code,
        da.issued_at,
        da.received_at,
        da.status_id,
        st.code AS status_code,
        st.name AS status_name,
        da.notes,
        (
          SELECT COUNT(*)::INT
          FROM delivery_advice_item dai
          WHERE dai.delivery_advice_id = da.delivery_advice_id
            AND dai.is_deleted = false
        ) AS item_count,
        da.log_date_created AS created_at,
        da.log_date_updated AS updated_at
      FROM delivery_advice da
      JOIN purchase_order po ON po.purchase_order_id = da.purchase_order_id AND po.is_deleted = false
      JOIN look_up st ON st.look_up_id = da.status_id AND st.is_deleted = false
      WHERE da.delivery_advice_id = $1
        AND da.is_deleted = false`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findByReferenceCode(referenceCode: string, excludeId?: number, client?: PoolClient): Promise<DeliveryAdviceListRow | null> {
    const params: Array<string | number> = [referenceCode];
    let sql = `SELECT delivery_advice_id, reference_code
      FROM delivery_advice
      WHERE reference_code = $1
        AND is_deleted = false`;

    if (excludeId !== undefined) {
      params.push(excludeId);
      sql += ' AND delivery_advice_id <> $2';
    }

    const result = await this.getExecutor(client).query(sql, params);
    return result.rows[0] ?? null;
  }

  async findAllPaginated(params: {
    limit: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    purchaseOrderId?: number;
    statusId?: number;
  }, client?: PoolClient): Promise<{ rows: DeliveryAdviceListRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['da.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        da.da_number ILIKE $${queryParams.length}
        OR da.reference_code ILIKE $${queryParams.length}
        OR po.po_number ILIKE $${queryParams.length}
        OR da.notes ILIKE $${queryParams.length}
      )`);
    }

    if (params.purchaseOrderId) {
      queryParams.push(params.purchaseOrderId);
      where.push(`da.purchase_order_id = $${queryParams.length}`);
    }

    if (params.statusId) {
      queryParams.push(params.statusId);
      where.push(`da.status_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM delivery_advice da
       JOIN purchase_order po ON po.purchase_order_id = da.purchase_order_id AND po.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      da_number: 'da.da_number',
      reference_code: 'da.reference_code',
      po_number: 'po.po_number',
      status_name: 'st.name',
      issued_at: 'da.issued_at',
      received_at: 'da.received_at',
      created_at: 'da.log_date_created',
      item_count: 'item_count',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'da.issued_at';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `SELECT
        da.delivery_advice_id,
        da.purchase_order_id,
        po.po_number,
        da.da_number,
        da.reference_code,
        da.issued_at,
        da.received_at,
        da.status_id,
        st.code AS status_code,
        st.name AS status_name,
        da.notes,
        (
          SELECT COUNT(*)::INT
          FROM delivery_advice_item dai
          WHERE dai.delivery_advice_id = da.delivery_advice_id
            AND dai.is_deleted = false
        ) AS item_count,
        da.log_date_created AS created_at,
        da.log_date_updated AS updated_at
      FROM delivery_advice da
      JOIN purchase_order po ON po.purchase_order_id = da.purchase_order_id AND po.is_deleted = false
      JOIN look_up st ON st.look_up_id = da.status_id AND st.is_deleted = false
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}, da.delivery_advice_id DESC
      LIMIT $${dataParams.length - 1}
      OFFSET $${dataParams.length}`,
      dataParams
    );

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async findItemsByAdviceId(deliveryAdviceId: number, client?: PoolClient): Promise<DeliveryAdviceItemRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        dai.delivery_advice_item_id,
        dai.purchase_order_item_id,
        dai.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        dai.material_brand_id,
        b.brand_name AS material_brand_name,
        dai.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        dai.advised_quantity::TEXT AS advised_quantity,
        dai.received_quantity::TEXT AS received_quantity,
        dai.notes
      FROM delivery_advice_item dai
      JOIN material m ON m.material_id = dai.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = dai.uom_id AND u.is_deleted = false
      LEFT JOIN material_brand mb ON mb.material_brand_id = dai.material_brand_id AND mb.is_deleted = false
      LEFT JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
      WHERE dai.delivery_advice_id = $1
        AND dai.is_deleted = false
      ORDER BY dai.delivery_advice_item_id ASC`,
      [deliveryAdviceId]
    );

    return result.rows;
  }

  async getNextSequenceNumber(year: number, client?: PoolClient): Promise<number> {
    const result = await this.getExecutor(client).query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING(da_number FROM '^[A-Z]+-[0-9]{4}-([0-9]+)$') AS INTEGER)),
        0
      ) AS max_sequence
      FROM delivery_advice
      WHERE da_number LIKE $1
        AND is_deleted = false`,
      [`DA-${year}-%`]
    );

    return Number(result.rows[0]?.max_sequence ?? 0);
  }

  async createHeader(data: {
    purchase_order_id: number;
    da_number: string;
    reference_code: string;
    issued_at: string;
    received_at?: string | null;
    status_id: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ delivery_advice_id: number; da_number: string }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO delivery_advice (
        purchase_order_id,
        da_number,
        reference_code,
        issued_at,
        received_at,
        status_id,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
      RETURNING delivery_advice_id, da_number`,
      [
        data.purchase_order_id,
        data.da_number,
        data.reference_code,
        data.issued_at,
        data.received_at ?? null,
        data.status_id,
        data.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateHeader(id: number, data: {
    purchase_order_id?: number;
    reference_code?: string;
    issued_at?: string | null;
    received_at?: string | null;
    status_id?: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    const sets: string[] = [];
    const params: Array<string | number | null> = [id];
    let idx = 2;

    const setField = (field: string, value: string | number | null | undefined) => {
      if (value !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(value);
      }
    };

    setField('purchase_order_id', data.purchase_order_id);
    setField('reference_code', data.reference_code);
    setField('issued_at', data.issued_at);
    setField('received_at', data.received_at);
    setField('status_id', data.status_id);
    setField('notes', data.notes);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(actorAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE delivery_advice
       SET ${sets.join(', ')}
       WHERE delivery_advice_id = $1
         AND is_deleted = false`,
      params
    );
  }

  async replaceItems(deliveryAdviceId: number, items: Array<{
    purchase_order_item_id?: number | null;
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    advised_quantity: number;
    received_quantity: number;
    notes?: string | null;
  }>, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE delivery_advice_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE delivery_advice_id = $1
         AND is_deleted = false`,
      [deliveryAdviceId, actorAccountId, moduleName]
    );

    for (const item of items) {
      await this.getExecutor(client).query(
        `INSERT INTO delivery_advice_item (
          delivery_advice_id,
          purchase_order_item_id,
          material_id,
          material_brand_id,
          uom_id,
          advised_quantity,
          received_quantity,
          notes,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
        [
          deliveryAdviceId,
          item.purchase_order_item_id ?? null,
          item.material_id,
          item.material_brand_id ?? null,
          item.uom_id,
          item.advised_quantity,
          item.received_quantity,
          item.notes ?? null,
          actorAccountId,
          moduleName,
        ]
      );
    }
  }

  async softDelete(id: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE delivery_advice
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE delivery_advice_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE delivery_advice_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE delivery_advice_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );
  }
}
