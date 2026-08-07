import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

type QueryExecutor = PoolClient | typeof pool;

export interface StockTransferListRow {
  stock_transfer_id: number;
  stock_transfer_number: string;
  transfer_type_id: number;
  transfer_type_code: string;
  transfer_type_name: string;
  source_id: number;
  source_code: string;
  source_name: string;
  destination_id: number;
  destination_code: string;
  destination_name: string;
  project_id: number | null;
  project_code: string | null;
  project_name: string | null;
  purchase_order_id: number | null;
  po_number: string | null;
  delivery_advice_id: number | null;
  da_number: string | null;
  material_request_id: number | null;
  mr_number: string | null;
  status_id: number;
  status_code: string;
  status_name: string;
  transfer_date: string;
  reference_code: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface StockTransferItemRow {
  stock_transfer_item_id: number;
  purchase_order_item_id: number | null;
  material_request_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  quantity: string;
  notes: string | null;
  updated_at: string | null;
}

export class StockTransferRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<StockTransferListRow | null> {
    const result = await this.getExecutor(client).query(this.baseSelectQuery(`st.stock_transfer_id = $1`), [id]);
    return result.rows[0] ?? null;
  }

  async findAllPaginated(params: {
    limit: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    transferTypeId?: number;
    sourceId?: number;
    destinationId?: number;
    statusId?: number;
  }, client?: PoolClient): Promise<{ rows: StockTransferListRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['st.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        st.stock_transfer_number ILIKE $${queryParams.length}
        OR st.reference_code ILIKE $${queryParams.length}
        OR src.party_code ILIKE $${queryParams.length}
        OR src.party_name ILIKE $${queryParams.length}
        OR dst.party_code ILIKE $${queryParams.length}
        OR dst.party_name ILIKE $${queryParams.length}
        OR st.notes ILIKE $${queryParams.length}
      )`);
    }

    if (params.transferTypeId) {
      queryParams.push(params.transferTypeId);
      where.push(`st.transfer_type_id = $${queryParams.length}`);
    }

    if (params.sourceId) {
      queryParams.push(params.sourceId);
      where.push(`st.source_id = $${queryParams.length}`);
    }

    if (params.destinationId) {
      queryParams.push(params.destinationId);
      where.push(`st.destination_id = $${queryParams.length}`);
    }

    if (params.statusId) {
      queryParams.push(params.statusId);
      where.push(`st.status_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM stock_transfer st
       JOIN party src ON src.party_id = st.source_id AND src.is_deleted = false
       JOIN party dst ON dst.party_id = st.destination_id AND dst.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      stock_transfer_number: 'st.stock_transfer_number',
      transfer_type_name: 'tt.name',
      source_name: 'src.party_name',
      destination_name: 'dst.party_name',
      status_name: 'stt.name',
      transfer_date: 'st.transfer_date',
      created_at: 'st.log_date_created',
      item_count: 'item_count',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'st.transfer_date';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `${this.baseSelectQuery(where.join(' AND '))}
       ORDER BY ${orderBy} ${orderDir}, st.stock_transfer_id DESC
       LIMIT $${dataParams.length - 1}
       OFFSET $${dataParams.length}`,
      dataParams
    );

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async findItemsByTransferId(stockTransferId: number, client?: PoolClient): Promise<StockTransferItemRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sti.stock_transfer_item_id,
        sti.purchase_order_item_id,
        sti.material_request_item_id,
        sti.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        sti.material_brand_id,
        b.brand_name AS material_brand_name,
        sti.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        sti.quantity::TEXT AS quantity,
        sti.notes,
        sti.log_date_updated AS updated_at
      FROM stock_transfer_item sti
      JOIN material m ON m.material_id = sti.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = sti.uom_id AND u.is_deleted = false
      LEFT JOIN material_brand mb ON mb.material_brand_id = sti.material_brand_id AND mb.is_deleted = false
      LEFT JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
      WHERE sti.stock_transfer_id = $1
        AND sti.is_deleted = false
      ORDER BY sti.stock_transfer_item_id ASC`,
      [stockTransferId]
    );

    return result.rows;
  }

  async getNextSequenceNumber(year: number, client?: PoolClient): Promise<number> {
    const result = await this.getExecutor(client).query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING(stock_transfer_number FROM '^[A-Z]+-[0-9]{4}-([0-9]+)$') AS INTEGER)),
        0
      ) AS max_sequence
      FROM stock_transfer
      WHERE stock_transfer_number LIKE $1
        AND is_deleted = false`,
      [`ST-${year}-%`]
    );

    return Number(result.rows[0]?.max_sequence ?? 0);
  }

  async createHeader(data: {
    stock_transfer_number: string;
    transfer_type_id: number;
    source_id: number;
    destination_id: number;
    project_id?: number | null;
    purchase_order_id?: number | null;
    delivery_advice_id?: number | null;
    material_request_id?: number | null;
    job_order_id?: number | null;
    prepared_by_account_id?: number | null;
    transfer_date: string;
    status_id: number;
    reference_code?: string | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ stock_transfer_id: number; stock_transfer_number: string }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO stock_transfer (
        stock_transfer_number,
        transfer_type_id,
        source_id,
        destination_id,
        project_id,
        purchase_order_id,
        delivery_advice_id,
        material_request_id,
        job_order_id,
        prepared_by_account_id,
        transfer_date,
        status_id,
        reference_code,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15, $16)
      RETURNING stock_transfer_id, stock_transfer_number`,
      [
        data.stock_transfer_number,
        data.transfer_type_id,
        data.source_id,
        data.destination_id,
        data.project_id ?? null,
        data.purchase_order_id ?? null,
        data.delivery_advice_id ?? null,
        data.material_request_id ?? null,
        data.job_order_id ?? null,
        data.prepared_by_account_id ?? null,
        data.transfer_date,
        data.status_id,
        data.reference_code ?? null,
        data.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateHeader(id: number, data: {
    transfer_type_id?: number;
    source_id?: number;
    destination_id?: number;
    project_id?: number | null;
    purchase_order_id?: number | null;
    delivery_advice_id?: number | null;
    material_request_id?: number | null;
    job_order_id?: number | null;
    prepared_by_account_id?: number | null;
    transfer_date?: string | null;
    status_id?: number;
    reference_code?: string | null;
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

    setField('transfer_type_id', data.transfer_type_id);
    setField('source_id', data.source_id);
    setField('destination_id', data.destination_id);
    setField('project_id', data.project_id);
    setField('purchase_order_id', data.purchase_order_id);
    setField('delivery_advice_id', data.delivery_advice_id);
    setField('material_request_id', data.material_request_id);
    setField('job_order_id', data.job_order_id);
    setField('prepared_by_account_id', data.prepared_by_account_id);
    setField('transfer_date', data.transfer_date);
    setField('status_id', data.status_id);
    setField('reference_code', data.reference_code);
    setField('notes', data.notes);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(actorAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE stock_transfer
       SET ${sets.join(', ')}
       WHERE stock_transfer_id = $1
         AND is_deleted = false`,
      params
    );
  }

  async replaceItems(stockTransferId: number, items: Array<{
    purchase_order_item_id?: number | null;
    material_request_item_id?: number | null;
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    quantity: number;
    notes?: string | null;
  }>, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE stock_transfer_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE stock_transfer_id = $1
         AND is_deleted = false`,
      [stockTransferId, actorAccountId, moduleName]
    );

    for (const item of items) {
      await this.getExecutor(client).query(
        `INSERT INTO stock_transfer_item (
          stock_transfer_id,
          purchase_order_item_id,
          material_request_item_id,
          material_id,
          material_brand_id,
          uom_id,
          quantity,
          notes,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)`,
        [
          stockTransferId,
          item.purchase_order_item_id ?? null,
          item.material_request_item_id ?? null,
          item.material_id,
          item.material_brand_id ?? null,
          item.uom_id,
          item.quantity,
          item.notes ?? null,
          actorAccountId,
          moduleName,
        ]
      );
    }
  }

  async findItemById(itemId: number, client?: PoolClient): Promise<StockTransferItemRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sti.stock_transfer_item_id,
        sti.purchase_order_item_id,
        sti.material_request_item_id,
        sti.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        sti.material_brand_id,
        b.brand_name AS material_brand_name,
        sti.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        sti.quantity::TEXT AS quantity,
        sti.notes,
        sti.log_date_updated AS updated_at
      FROM stock_transfer_item sti
      JOIN material m ON m.material_id = sti.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = sti.uom_id AND u.is_deleted = false
      LEFT JOIN material_brand mb ON mb.material_brand_id = sti.material_brand_id AND mb.is_deleted = false
      LEFT JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
      WHERE sti.stock_transfer_item_id = $1
        AND sti.is_deleted = false`,
      [itemId]
    );

    return result.rows[0] ?? null;
  }

  async createItem(stockTransferId: number, item: {
    purchase_order_item_id?: number | null;
    material_request_item_id?: number | null;
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    quantity: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ stock_transfer_item_id: number }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO stock_transfer_item (
        stock_transfer_id,
        purchase_order_item_id,
        material_request_item_id,
        material_id,
        material_brand_id,
        uom_id,
        quantity,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      RETURNING stock_transfer_item_id`,
      [
        stockTransferId,
        item.purchase_order_item_id ?? null,
        item.material_request_item_id ?? null,
        item.material_id,
        item.material_brand_id ?? null,
        item.uom_id,
        item.quantity,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateItem(itemId: number, item: {
    purchase_order_item_id?: number | null;
    material_request_item_id?: number | null;
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    quantity: number;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE stock_transfer_item
       SET purchase_order_item_id = $2,
           material_request_item_id = $3,
           material_id = $4,
           material_brand_id = $5,
           uom_id = $6,
           quantity = $7,
           notes = $8,
           log_date_updated = NOW(),
           log_updated_by_account_id = $9,
           log_module_updated = $10
       WHERE stock_transfer_item_id = $1
         AND is_deleted = false`,
      [
        itemId,
        item.purchase_order_item_id ?? null,
        item.material_request_item_id ?? null,
        item.material_id,
        item.material_brand_id ?? null,
        item.uom_id,
        item.quantity,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );
  }

  async softDeleteItem(itemId: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE stock_transfer_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE stock_transfer_item_id = $1
         AND is_deleted = false`,
      [itemId, actorAccountId, moduleName]
    );
  }

  async softDelete(id: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE stock_transfer
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE stock_transfer_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE stock_transfer_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE stock_transfer_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );
  }

  private baseSelectQuery(whereClause: string): string {
    return `SELECT
      st.stock_transfer_id,
      st.stock_transfer_number,
      st.transfer_type_id,
      tt.code AS transfer_type_code,
      tt.name AS transfer_type_name,
      st.source_id,
      src.party_code AS source_code,
      src.party_name AS source_name,
      st.destination_id,
      dst.party_code AS destination_code,
      dst.party_name AS destination_name,
      st.project_id,
      prj.party_code AS project_code,
      prj.party_name AS project_name,
      st.purchase_order_id,
      po.po_number,
      st.delivery_advice_id,
      da.da_number,
      st.material_request_id,
      mr.mr_number,
      st.status_id,
      stt.code AS status_code,
      stt.name AS status_name,
      st.transfer_date,
      st.reference_code,
      st.notes,
      (
        SELECT COUNT(*)::INT
        FROM stock_transfer_item sti
        WHERE sti.stock_transfer_id = st.stock_transfer_id
          AND sti.is_deleted = false
      ) AS item_count,
      st.log_date_created AS created_at,
      st.log_date_updated AS updated_at
    FROM stock_transfer st
    JOIN look_up tt ON tt.look_up_id = st.transfer_type_id AND tt.is_deleted = false
    JOIN look_up stt ON stt.look_up_id = st.status_id AND stt.is_deleted = false
    JOIN party src ON src.party_id = st.source_id AND src.is_deleted = false
    JOIN party dst ON dst.party_id = st.destination_id AND dst.is_deleted = false
    LEFT JOIN party prj ON prj.party_id = st.project_id AND prj.is_deleted = false
    LEFT JOIN purchase_order po ON po.purchase_order_id = st.purchase_order_id AND po.is_deleted = false
    LEFT JOIN delivery_advice da ON da.delivery_advice_id = st.delivery_advice_id AND da.is_deleted = false
    LEFT JOIN material_request mr ON mr.material_request_id = st.material_request_id AND mr.is_deleted = false
    WHERE ${whereClause}`;
  }
}
