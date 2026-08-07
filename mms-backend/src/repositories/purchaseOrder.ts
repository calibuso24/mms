import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

export interface PurchaseOrderListRow {
  purchase_order_id: number;
  po_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  material_request_id: number | null;
  material_request_number: string | null;
  supplier_party_id: number;
  supplier_party_code: string;
  supplier_party_name: string;
  requested_by_account_id: number | null;
  requested_by_account_name: string | null;
  prepared_at: string | null;
  expected_delivery_date: string | null;
  order_type_id: number;
  order_type_code: string;
  order_type_name: string;
  status_id: number;
  status_code: string;
  status_name: string;
  total_amount: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PurchaseOrderItemRow {
  purchase_order_item_id: number;
  material_request_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  requested_quantity: string;
  ordered_quantity: string;
  received_quantity: string;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  unit_price: string | null;
  line_total: string | null;
  supplier_reference: string | null;
  notes: string | null;
  updated_at: string | null;
}

type QueryExecutor = PoolClient | typeof pool;

export class PurchaseOrderRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<PurchaseOrderListRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        po.purchase_order_id,
        po.po_number,
        po.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        po.material_request_id,
        mr.mr_number AS material_request_number,
        po.supplier_party_id,
        sp.party_code AS supplier_party_code,
        sp.party_name AS supplier_party_name,
        po.requested_by_account_id,
        COALESCE(req.full_name, req.user_name) AS requested_by_account_name,
        po.prepared_at,
        po.expected_delivery_date,
        po.order_type_id,
        ot.code AS order_type_code,
        ot.name AS order_type_name,
        po.status_id,
        st.code AS status_code,
        st.name AS status_name,
        po.total_amount::TEXT AS total_amount,
        po.notes,
        (
          SELECT COUNT(*)::INT
          FROM purchase_order_item poi
          WHERE poi.purchase_order_id = po.purchase_order_id
            AND poi.is_deleted = false
        ) AS item_count,
        po.log_date_created AS created_at,
        po.log_date_updated AS updated_at
      FROM purchase_order po
      JOIN party p ON p.party_id = po.project_id AND p.is_deleted = false
      JOIN party sp ON sp.party_id = po.supplier_party_id AND sp.is_deleted = false
      JOIN look_up ot ON ot.look_up_id = po.order_type_id AND ot.is_deleted = false
      JOIN look_up st ON st.look_up_id = po.status_id AND st.is_deleted = false
      LEFT JOIN material_request mr ON mr.material_request_id = po.material_request_id AND mr.is_deleted = false
      LEFT JOIN account req ON req.account_id = po.requested_by_account_id AND req.is_deleted = false
      WHERE po.purchase_order_id = $1
        AND po.is_deleted = false`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async findAllPaginated(params: {
    limit: number;
    offset: number;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    projectId?: number;
    supplierPartyId?: number;
    statusId?: number;
    orderTypeId?: number;
  }, client?: PoolClient): Promise<{ rows: PurchaseOrderListRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['po.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        po.po_number ILIKE $${queryParams.length}
        OR p.party_code ILIKE $${queryParams.length}
        OR p.party_name ILIKE $${queryParams.length}
        OR sp.party_code ILIKE $${queryParams.length}
        OR sp.party_name ILIKE $${queryParams.length}
        OR mr.mr_number ILIKE $${queryParams.length}
        OR po.notes ILIKE $${queryParams.length}
      )`);
    }

    if (params.projectId) {
      queryParams.push(params.projectId);
      where.push(`po.project_id = $${queryParams.length}`);
    }

    if (params.supplierPartyId) {
      queryParams.push(params.supplierPartyId);
      where.push(`po.supplier_party_id = $${queryParams.length}`);
    }

    if (params.statusId) {
      queryParams.push(params.statusId);
      where.push(`po.status_id = $${queryParams.length}`);
    }

    if (params.orderTypeId) {
      queryParams.push(params.orderTypeId);
      where.push(`po.order_type_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM purchase_order po
       JOIN party p ON p.party_id = po.project_id AND p.is_deleted = false
       JOIN party sp ON sp.party_id = po.supplier_party_id AND sp.is_deleted = false
       LEFT JOIN material_request mr ON mr.material_request_id = po.material_request_id AND mr.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      po_number: 'po.po_number',
      project_code: 'p.party_code',
      project_name: 'p.party_name',
      supplier_party_code: 'sp.party_code',
      supplier_party_name: 'sp.party_name',
      material_request_number: 'mr.mr_number',
      order_type_name: 'ot.name',
      status_name: 'st.name',
      prepared_at: 'po.prepared_at',
      expected_delivery_date: 'po.expected_delivery_date',
      total_amount: 'po.total_amount',
      item_count: 'item_count',
      created_at: 'po.log_date_created',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'po.log_date_created';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `SELECT
        po.purchase_order_id,
        po.po_number,
        po.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        po.material_request_id,
        mr.mr_number AS material_request_number,
        po.supplier_party_id,
        sp.party_code AS supplier_party_code,
        sp.party_name AS supplier_party_name,
        po.requested_by_account_id,
        COALESCE(req.full_name, req.user_name) AS requested_by_account_name,
        po.prepared_at,
        po.expected_delivery_date,
        po.order_type_id,
        ot.code AS order_type_code,
        ot.name AS order_type_name,
        po.status_id,
        st.code AS status_code,
        st.name AS status_name,
        po.total_amount::TEXT AS total_amount,
        po.notes,
        (
          SELECT COUNT(*)::INT
          FROM purchase_order_item poi
          WHERE poi.purchase_order_id = po.purchase_order_id
            AND poi.is_deleted = false
        ) AS item_count,
        po.log_date_created AS created_at,
        po.log_date_updated AS updated_at
      FROM purchase_order po
      JOIN party p ON p.party_id = po.project_id AND p.is_deleted = false
      JOIN party sp ON sp.party_id = po.supplier_party_id AND sp.is_deleted = false
      JOIN look_up ot ON ot.look_up_id = po.order_type_id AND ot.is_deleted = false
      JOIN look_up st ON st.look_up_id = po.status_id AND st.is_deleted = false
      LEFT JOIN material_request mr ON mr.material_request_id = po.material_request_id AND mr.is_deleted = false
      LEFT JOIN account req ON req.account_id = po.requested_by_account_id AND req.is_deleted = false
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}, po.purchase_order_id DESC
      LIMIT $${dataParams.length - 1}
      OFFSET $${dataParams.length}`,
      dataParams
    );

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async findItemsByOrderId(orderId: number, client?: PoolClient): Promise<PurchaseOrderItemRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        poi.purchase_order_item_id,
        poi.material_request_item_id,
        poi.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        poi.requested_quantity::TEXT AS requested_quantity,
        poi.ordered_quantity::TEXT AS ordered_quantity,
        poi.received_quantity::TEXT AS received_quantity,
        poi.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        poi.unit_price::TEXT AS unit_price,
        poi.line_total::TEXT AS line_total,
        poi.supplier_reference,
        poi.notes,
        poi.log_date_updated AS updated_at
      FROM purchase_order_item poi
      JOIN material m ON m.material_id = poi.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = poi.uom_id AND u.is_deleted = false
      WHERE poi.purchase_order_id = $1
        AND poi.is_deleted = false
      ORDER BY poi.purchase_order_item_id ASC`,
      [orderId]
    );

    return result.rows;
  }

  async getNextSequenceNumber(year: number, client?: PoolClient): Promise<number> {
    const result = await this.getExecutor(client).query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING(po_number FROM '^[A-Z]+-[0-9]{4}-([0-9]+)$') AS INTEGER)),
        0
      ) AS max_sequence
      FROM purchase_order
      WHERE po_number LIKE $1
        AND is_deleted = false`,
      [`PO-${year}-%`]
    );

    return Number(result.rows[0]?.max_sequence ?? 0);
  }

  async createHeader(data: {
    po_number: string;
    project_id: number;
    material_request_id?: number | null;
    supplier_party_id: number;
    requested_by_account_id?: number | null;
    prepared_at: string;
    expected_delivery_date?: string | null;
    order_type_id: number;
    status_id: number;
    total_amount?: number | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ purchase_order_id: number; po_number: string }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO purchase_order (
        po_number,
        project_id,
        material_request_id,
        supplier_party_id,
        requested_by_account_id,
        prepared_at,
        expected_delivery_date,
        order_type_id,
        status_id,
        total_amount,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13)
      RETURNING purchase_order_id, po_number`,
      [
        data.po_number,
        data.project_id,
        data.material_request_id ?? null,
        data.supplier_party_id,
        data.requested_by_account_id ?? null,
        data.prepared_at,
        data.expected_delivery_date ?? null,
        data.order_type_id,
        data.status_id,
        data.total_amount ?? null,
        data.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateHeader(id: number, data: {
    project_id?: number;
    material_request_id?: number | null;
    supplier_party_id?: number;
    prepared_at?: string | null;
    expected_delivery_date?: string | null;
    order_type_id?: number;
    total_amount?: number | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    const sets: string[] = [];
    const params: Array<string | number | boolean | null> = [id];
    let idx = 2;

    const setField = (field: string, value: string | number | boolean | null | undefined) => {
      if (value !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(value as string | number | boolean | null);
      }
    };

    setField('project_id', data.project_id);
    setField('material_request_id', data.material_request_id);
    setField('supplier_party_id', data.supplier_party_id);
    setField('prepared_at', data.prepared_at);
    setField('expected_delivery_date', data.expected_delivery_date);
    setField('order_type_id', data.order_type_id);
    setField('total_amount', data.total_amount);
    setField('notes', data.notes);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(actorAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE purchase_order
       SET ${sets.join(', ')}
       WHERE purchase_order_id = $1
         AND is_deleted = false`,
      params
    );
  }

  async replaceItems(orderId: number, items: Array<{
    material_request_item_id?: number | null;
    material_id: number;
    requested_quantity: number;
    ordered_quantity: number;
    received_quantity?: number;
    uom_id: number;
    unit_price?: number | null;
    line_total?: number | null;
    supplier_reference?: string | null;
    notes?: string | null;
  }>, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE purchase_order_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE purchase_order_id = $1
         AND is_deleted = false`,
      [orderId, actorAccountId, moduleName]
    );

    for (const item of items) {
      await this.getExecutor(client).query(
        `INSERT INTO purchase_order_item (
          purchase_order_id,
          material_request_item_id,
          material_id,
          requested_quantity,
          ordered_quantity,
          received_quantity,
          uom_id,
          unit_price,
          line_total,
          supplier_reference,
          notes,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13)`,
        [
          orderId,
          item.material_request_item_id ?? null,
          item.material_id,
          item.requested_quantity,
          item.ordered_quantity,
          item.received_quantity ?? 0,
          item.uom_id,
          item.unit_price ?? null,
          item.line_total ?? null,
          item.supplier_reference ?? null,
          item.notes ?? null,
          actorAccountId,
          moduleName,
        ]
      );
    }
  }

  async findItemById(itemId: number, client?: PoolClient): Promise<PurchaseOrderItemRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        poi.purchase_order_item_id,
        poi.material_request_item_id,
        poi.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        poi.requested_quantity::TEXT AS requested_quantity,
        poi.ordered_quantity::TEXT AS ordered_quantity,
        poi.received_quantity::TEXT AS received_quantity,
        poi.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        poi.unit_price::TEXT AS unit_price,
        poi.line_total::TEXT AS line_total,
        poi.supplier_reference,
        poi.notes,
        poi.log_date_updated AS updated_at
      FROM purchase_order_item poi
      JOIN material m ON m.material_id = poi.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = poi.uom_id AND u.is_deleted = false
      WHERE poi.purchase_order_item_id = $1
        AND poi.is_deleted = false`,
      [itemId]
    );

    return result.rows[0] ?? null;
  }

  async createItem(orderId: number, item: {
    material_request_item_id?: number | null;
    material_id: number;
    requested_quantity: number;
    ordered_quantity: number;
    received_quantity?: number;
    uom_id: number;
    unit_price?: number | null;
    line_total?: number | null;
    supplier_reference?: string | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ purchase_order_item_id: number }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO purchase_order_item (
        purchase_order_id,
        material_request_item_id,
        material_id,
        requested_quantity,
        ordered_quantity,
        received_quantity,
        uom_id,
        unit_price,
        line_total,
        supplier_reference,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13
      ) RETURNING purchase_order_item_id`,
      [
        orderId,
        item.material_request_item_id ?? null,
        item.material_id,
        item.requested_quantity,
        item.ordered_quantity,
        item.received_quantity ?? 0,
        item.uom_id,
        item.unit_price ?? null,
        item.line_total ?? null,
        item.supplier_reference ?? null,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    return result.rows[0];
  }

  async updateItem(itemId: number, item: {
    material_request_item_id?: number | null;
    material_id: number;
    requested_quantity: number;
    ordered_quantity: number;
    received_quantity?: number;
    uom_id: number;
    unit_price?: number | null;
    line_total?: number | null;
    supplier_reference?: string | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE purchase_order_item
       SET material_request_item_id = $2,
           material_id = $3,
           requested_quantity = $4,
           ordered_quantity = $5,
           received_quantity = $6,
           uom_id = $7,
           unit_price = $8,
           line_total = $9,
           supplier_reference = $10,
           notes = $11,
           log_date_updated = NOW(),
           log_updated_by_account_id = $12,
           log_module_updated = $13
       WHERE purchase_order_item_id = $1
         AND is_deleted = false`,
      [
        itemId,
        item.material_request_item_id ?? null,
        item.material_id,
        item.requested_quantity,
        item.ordered_quantity,
        item.received_quantity ?? 0,
        item.uom_id,
        item.unit_price ?? null,
        item.line_total ?? null,
        item.supplier_reference ?? null,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );
  }

  async softDeleteItem(itemId: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE purchase_order_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE purchase_order_item_id = $1
         AND is_deleted = false`,
      [itemId, actorAccountId, moduleName]
    );
  }

  async softDelete(id: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE purchase_order
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE purchase_order_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE purchase_order_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE purchase_order_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );
  }
}