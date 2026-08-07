import { PoolClient } from 'pg';
import { pool } from '../config/database.js';

type QueryExecutor = PoolClient | typeof pool;

export interface SupplierDeliveryListRow {
  supplier_delivery_id: number;
  supplier_delivery_number: string;
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  project_id: number;
  project_code: string;
  project_name: string;
  received_by_account_id: number | null;
  received_by_account_name: string | null;
  delivery_date: string;
  status_id: number;
  status_code: string;
  status_name: string;
  posted_at: string | null;
  posted_by_account_id: number | null;
  posted_by_account_name: string | null;
  reference_code: string | null;
  notes: string | null;
  item_count: number;
  purchase_order_numbers: string[];
  delivery_advice_numbers: string[];
  material_request_numbers: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface SupplierDeliveryItemRow {
  supplier_delivery_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  material_brand_name: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  delivered_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  stock_movement_id: number | null;
  notes: string | null;
  updated_at: string | null;
}

export interface SupplierDeliveryItemReferenceRow {
  supplier_delivery_item_reference_id: number;
  supplier_delivery_item_id: number;
  reference_type_lookup_id: number;
  reference_type_code: string;
  reference_type_name: string;
  reference_id: number;
  reference_line_id: number;
  quantity: string;
  reference_number: string;
  reference_line_number: string;
}

export interface SupplierDeliveryPurchaseOrderRow {
  supplier_delivery_purchase_order_id: number;
  purchase_order_id: number;
  po_number: string;
}

export interface SupplierDeliveryAdviceRow {
  supplier_delivery_delivery_advice_id: number;
  delivery_advice_id: number;
  da_number: string;
  notes: string | null;
}

export interface SupplierDeliveryMaterialRequestRow {
  supplier_delivery_material_request_id: number;
  material_request_id: number;
  mr_number: string;
}

export class SupplierDeliveryRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findById(id: number, client?: PoolClient): Promise<SupplierDeliveryListRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sd.supplier_delivery_id,
        sd.supplier_delivery_number,
        sd.supplier_id,
        s.party_code AS supplier_code,
        s.party_name AS supplier_name,
        sd.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        sd.received_by_account_id,
        COALESCE(rcv.full_name, rcv.user_name) AS received_by_account_name,
        sd.delivery_date,
        sd.status_id,
        st.code AS status_code,
        st.name AS status_name,
        sd.posted_at,
        sd.posted_by_account_id,
        COALESCE(pby.full_name, pby.user_name) AS posted_by_account_name,
        sd.reference_code,
        sd.notes,
        (
          SELECT COUNT(*)::INT
          FROM supplier_delivery_item sdi
          WHERE sdi.supplier_delivery_id = sd.supplier_delivery_id
            AND sdi.is_deleted = false
        ) AS item_count,
        COALESCE((
          SELECT ARRAY_AGG(po.po_number ORDER BY po.po_number)
          FROM supplier_delivery_purchase_order sdpo
          JOIN purchase_order po ON po.purchase_order_id = sdpo.purchase_order_id AND po.is_deleted = false
          WHERE sdpo.supplier_delivery_id = sd.supplier_delivery_id
            AND sdpo.is_deleted = false
        ), ARRAY[]::TEXT[]) AS purchase_order_numbers,
        COALESCE((
          SELECT ARRAY_AGG(da.da_number ORDER BY da.da_number)
          FROM supplier_delivery_delivery_advice sdda
          JOIN delivery_advice da ON da.delivery_advice_id = sdda.delivery_advice_id AND da.is_deleted = false
          WHERE sdda.supplier_delivery_id = sd.supplier_delivery_id
            AND sdda.is_deleted = false
        ), ARRAY[]::TEXT[]) AS delivery_advice_numbers,
        COALESCE((
          SELECT ARRAY_AGG(mr.mr_number ORDER BY mr.mr_number)
          FROM supplier_delivery_material_request sdmr
          JOIN material_request mr ON mr.material_request_id = sdmr.material_request_id AND mr.is_deleted = false
          WHERE sdmr.supplier_delivery_id = sd.supplier_delivery_id
            AND sdmr.is_deleted = false
        ), ARRAY[]::TEXT[]) AS material_request_numbers,
        sd.log_date_created AS created_at,
        sd.log_date_updated AS updated_at
      FROM supplier_delivery sd
      JOIN party s ON s.party_id = sd.supplier_id AND s.is_deleted = false
      JOIN party p ON p.party_id = sd.project_id AND p.is_deleted = false
      JOIN look_up st ON st.look_up_id = sd.status_id AND st.is_deleted = false
      LEFT JOIN account rcv ON rcv.account_id = sd.received_by_account_id AND rcv.is_deleted = false
      LEFT JOIN account pby ON pby.account_id = sd.posted_by_account_id AND pby.is_deleted = false
      WHERE sd.supplier_delivery_id = $1
        AND sd.is_deleted = false`,
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
    purchaseOrderId?: number;
    supplierId?: number;
    projectId?: number;
    statusId?: number;
  }, client?: PoolClient): Promise<{ rows: SupplierDeliveryListRow[]; total: number }> {
    const executor = this.getExecutor(client);
    const where: string[] = ['sd.is_deleted = false'];
    const queryParams: Array<string | number> = [];

    if (params.search?.trim()) {
      queryParams.push(`%${params.search.trim()}%`);
      where.push(`(
        sd.supplier_delivery_number ILIKE $${queryParams.length}
        OR s.party_code ILIKE $${queryParams.length}
        OR s.party_name ILIKE $${queryParams.length}
        OR p.party_code ILIKE $${queryParams.length}
        OR p.party_name ILIKE $${queryParams.length}
        OR sd.reference_code ILIKE $${queryParams.length}
        OR sd.notes ILIKE $${queryParams.length}
        OR EXISTS (
          SELECT 1
          FROM supplier_delivery_purchase_order sdpo
          JOIN purchase_order po ON po.purchase_order_id = sdpo.purchase_order_id AND po.is_deleted = false
          WHERE sdpo.supplier_delivery_id = sd.supplier_delivery_id
            AND sdpo.is_deleted = false
            AND po.po_number ILIKE $${queryParams.length}
        )
        OR EXISTS (
          SELECT 1
          FROM supplier_delivery_delivery_advice sdda
          JOIN delivery_advice da ON da.delivery_advice_id = sdda.delivery_advice_id AND da.is_deleted = false
          WHERE sdda.supplier_delivery_id = sd.supplier_delivery_id
            AND sdda.is_deleted = false
            AND da.da_number ILIKE $${queryParams.length}
        )
        OR EXISTS (
          SELECT 1
          FROM supplier_delivery_material_request sdmr
          JOIN material_request mr ON mr.material_request_id = sdmr.material_request_id AND mr.is_deleted = false
          WHERE sdmr.supplier_delivery_id = sd.supplier_delivery_id
            AND sdmr.is_deleted = false
            AND mr.mr_number ILIKE $${queryParams.length}
        )
      )`);
    }

    if (params.purchaseOrderId) {
      queryParams.push(params.purchaseOrderId);
      where.push(`EXISTS (
        SELECT 1
        FROM supplier_delivery_purchase_order sdpo
        WHERE sdpo.supplier_delivery_id = sd.supplier_delivery_id
          AND sdpo.purchase_order_id = $${queryParams.length}
          AND sdpo.is_deleted = false
      )`);
    }

    if (params.supplierId) {
      queryParams.push(params.supplierId);
      where.push(`sd.supplier_id = $${queryParams.length}`);
    }

    if (params.projectId) {
      queryParams.push(params.projectId);
      where.push(`sd.project_id = $${queryParams.length}`);
    }

    if (params.statusId) {
      queryParams.push(params.statusId);
      where.push(`sd.status_id = $${queryParams.length}`);
    }

    const countResult = await executor.query(
      `SELECT COUNT(*)::INT AS total
       FROM supplier_delivery sd
       JOIN party s ON s.party_id = sd.supplier_id AND s.is_deleted = false
       JOIN party p ON p.party_id = sd.project_id AND p.is_deleted = false
       WHERE ${where.join(' AND ')}`,
      queryParams
    );

    const sortFields: Record<string, string> = {
      supplier_delivery_number: 'sd.supplier_delivery_number',
      supplier_code: 's.party_code',
      supplier_name: 's.party_name',
      project_code: 'p.party_code',
      project_name: 'p.party_name',
      status_name: 'st.name',
      delivery_date: 'sd.delivery_date',
      created_at: 'sd.log_date_created',
      item_count: 'item_count',
    };
    const orderBy = sortFields[params.sortBy ?? ''] ?? 'sd.delivery_date';
    const orderDir = params.sortDir === 'desc' ? 'DESC' : 'ASC';

    const dataParams = [...queryParams, params.limit, params.offset];
    const dataResult = await executor.query(
      `SELECT
        sd.supplier_delivery_id,
        sd.supplier_delivery_number,
        sd.supplier_id,
        s.party_code AS supplier_code,
        s.party_name AS supplier_name,
        sd.project_id,
        p.party_code AS project_code,
        p.party_name AS project_name,
        sd.received_by_account_id,
        COALESCE(rcv.full_name, rcv.user_name) AS received_by_account_name,
        sd.delivery_date,
        sd.status_id,
        st.code AS status_code,
        st.name AS status_name,
        sd.posted_at,
        sd.posted_by_account_id,
        COALESCE(pby.full_name, pby.user_name) AS posted_by_account_name,
        sd.reference_code,
        sd.notes,
        (
          SELECT COUNT(*)::INT
          FROM supplier_delivery_item sdi
          WHERE sdi.supplier_delivery_id = sd.supplier_delivery_id
            AND sdi.is_deleted = false
        ) AS item_count,
        COALESCE((
          SELECT ARRAY_AGG(po.po_number ORDER BY po.po_number)
          FROM supplier_delivery_purchase_order sdpo
          JOIN purchase_order po ON po.purchase_order_id = sdpo.purchase_order_id AND po.is_deleted = false
          WHERE sdpo.supplier_delivery_id = sd.supplier_delivery_id
            AND sdpo.is_deleted = false
        ), ARRAY[]::TEXT[]) AS purchase_order_numbers,
        COALESCE((
          SELECT ARRAY_AGG(da.da_number ORDER BY da.da_number)
          FROM supplier_delivery_delivery_advice sdda
          JOIN delivery_advice da ON da.delivery_advice_id = sdda.delivery_advice_id AND da.is_deleted = false
          WHERE sdda.supplier_delivery_id = sd.supplier_delivery_id
            AND sdda.is_deleted = false
        ), ARRAY[]::TEXT[]) AS delivery_advice_numbers,
        COALESCE((
          SELECT ARRAY_AGG(mr.mr_number ORDER BY mr.mr_number)
          FROM supplier_delivery_material_request sdmr
          JOIN material_request mr ON mr.material_request_id = sdmr.material_request_id AND mr.is_deleted = false
          WHERE sdmr.supplier_delivery_id = sd.supplier_delivery_id
            AND sdmr.is_deleted = false
        ), ARRAY[]::TEXT[]) AS material_request_numbers,
        sd.log_date_created AS created_at,
        sd.log_date_updated AS updated_at
      FROM supplier_delivery sd
      JOIN party s ON s.party_id = sd.supplier_id AND s.is_deleted = false
      JOIN party p ON p.party_id = sd.project_id AND p.is_deleted = false
      JOIN look_up st ON st.look_up_id = sd.status_id AND st.is_deleted = false
      LEFT JOIN account rcv ON rcv.account_id = sd.received_by_account_id AND rcv.is_deleted = false
      LEFT JOIN account pby ON pby.account_id = sd.posted_by_account_id AND pby.is_deleted = false
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}, sd.supplier_delivery_id DESC
      LIMIT $${dataParams.length - 1}
      OFFSET $${dataParams.length}`,
      dataParams
    );

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async findItemsByDeliveryId(deliveryId: number, client?: PoolClient): Promise<SupplierDeliveryItemRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sdi.supplier_delivery_item_id,
        sdi.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        sdi.material_brand_id,
        b.brand_name AS material_brand_name,
        sdi.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        sdi.delivered_quantity::TEXT AS delivered_quantity,
        sdi.accepted_quantity::TEXT AS accepted_quantity,
        sdi.rejected_quantity::TEXT AS rejected_quantity,
        sdi.stock_movement_id,
        sdi.notes,
        sdi.log_date_updated AS updated_at
      FROM supplier_delivery_item sdi
      JOIN material m ON m.material_id = sdi.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = sdi.uom_id AND u.is_deleted = false
      LEFT JOIN material_brand mb ON mb.material_brand_id = sdi.material_brand_id AND mb.is_deleted = false
      LEFT JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
      WHERE sdi.supplier_delivery_id = $1
        AND sdi.is_deleted = false
      ORDER BY sdi.supplier_delivery_item_id ASC`,
      [deliveryId]
    );

    return result.rows;
  }

  async findItemReferencesByDeliveryId(deliveryId: number, client?: PoolClient): Promise<SupplierDeliveryItemReferenceRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sdir.supplier_delivery_item_reference_id,
        sdir.supplier_delivery_item_id,
        sdir.reference_type_lookup_id,
        rt.code AS reference_type_code,
        rt.name AS reference_type_name,
        sdir.reference_id,
        sdir.reference_line_id,
        sdir.quantity::TEXT AS quantity,
        CASE
          WHEN rt.code = 'po' THEN COALESCE(po.po_number, CONCAT('PO#', sdir.reference_id::TEXT))
          WHEN rt.code = 'delivery_advice' THEN COALESCE(da.da_number, CONCAT('DA#', sdir.reference_id::TEXT))
          WHEN rt.code = 'material_request' THEN COALESCE(mr.mr_number, CONCAT('MR#', sdir.reference_id::TEXT))
          ELSE sdir.reference_id::TEXT
        END AS reference_number,
        CASE
          WHEN rt.code = 'po' THEN COALESCE(poi.purchase_order_item_id::TEXT, sdir.reference_line_id::TEXT)
          WHEN rt.code = 'delivery_advice' THEN COALESCE(dai.delivery_advice_item_id::TEXT, sdir.reference_line_id::TEXT)
          WHEN rt.code = 'material_request' THEN COALESCE(mri.material_request_item_id::TEXT, sdir.reference_line_id::TEXT)
          ELSE sdir.reference_line_id::TEXT
        END AS reference_line_number
      FROM supplier_delivery_item_reference sdir
      JOIN supplier_delivery_item sdi ON sdi.supplier_delivery_item_id = sdir.supplier_delivery_item_id AND sdi.is_deleted = false
      JOIN look_up rt ON rt.look_up_id = sdir.reference_type_lookup_id AND rt.is_deleted = false
      LEFT JOIN purchase_order po ON rt.code = 'po' AND po.purchase_order_id = sdir.reference_id AND po.is_deleted = false
      LEFT JOIN delivery_advice da ON rt.code = 'delivery_advice' AND da.delivery_advice_id = sdir.reference_id AND da.is_deleted = false
      LEFT JOIN material_request mr ON rt.code = 'material_request' AND mr.material_request_id = sdir.reference_id AND mr.is_deleted = false
      LEFT JOIN purchase_order_item poi ON rt.code = 'po' AND poi.purchase_order_item_id = sdir.reference_line_id AND poi.is_deleted = false
      LEFT JOIN delivery_advice_item dai ON rt.code = 'delivery_advice' AND dai.delivery_advice_item_id = sdir.reference_line_id AND dai.is_deleted = false
      LEFT JOIN material_request_item mri ON rt.code = 'material_request' AND mri.material_request_item_id = sdir.reference_line_id AND mri.is_deleted = false
      WHERE sdi.supplier_delivery_id = $1
        AND sdir.is_deleted = false
      ORDER BY sdir.supplier_delivery_item_reference_id ASC`,
      [deliveryId]
    );

    return result.rows;
  }

  async findPurchaseOrdersByDeliveryId(deliveryId: number, client?: PoolClient): Promise<SupplierDeliveryPurchaseOrderRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sdpo.supplier_delivery_purchase_order_id,
        sdpo.purchase_order_id,
        po.po_number
      FROM supplier_delivery_purchase_order sdpo
      JOIN purchase_order po ON po.purchase_order_id = sdpo.purchase_order_id AND po.is_deleted = false
      WHERE sdpo.supplier_delivery_id = $1
        AND sdpo.is_deleted = false
      ORDER BY sdpo.supplier_delivery_purchase_order_id ASC`,
      [deliveryId]
    );

    return result.rows;
  }

  async findAdviceByDeliveryId(deliveryId: number, client?: PoolClient): Promise<SupplierDeliveryAdviceRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sdda.supplier_delivery_delivery_advice_id,
        sdda.delivery_advice_id,
        da.da_number,
        sdda.notes
      FROM supplier_delivery_delivery_advice sdda
      JOIN delivery_advice da ON da.delivery_advice_id = sdda.delivery_advice_id AND da.is_deleted = false
      WHERE sdda.supplier_delivery_id = $1
        AND sdda.is_deleted = false
      ORDER BY sdda.supplier_delivery_delivery_advice_id ASC`,
      [deliveryId]
    );

    return result.rows;
  }

  async findMaterialRequestsByDeliveryId(deliveryId: number, client?: PoolClient): Promise<SupplierDeliveryMaterialRequestRow[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sdmr.supplier_delivery_material_request_id,
        sdmr.material_request_id,
        mr.mr_number
      FROM supplier_delivery_material_request sdmr
      JOIN material_request mr ON mr.material_request_id = sdmr.material_request_id AND mr.is_deleted = false
      WHERE sdmr.supplier_delivery_id = $1
        AND sdmr.is_deleted = false
      ORDER BY sdmr.supplier_delivery_material_request_id ASC`,
      [deliveryId]
    );

    return result.rows;
  }

  async getNextSequenceNumber(year: number, client?: PoolClient): Promise<number> {
    const result = await this.getExecutor(client).query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING(supplier_delivery_number FROM '^[A-Z]+-[0-9]{4}-([0-9]+)$') AS INTEGER)),
        0
      ) AS max_sequence
      FROM supplier_delivery
      WHERE supplier_delivery_number LIKE $1
        AND is_deleted = false`,
      [`SD-${year}-%`]
    );

    return Number(result.rows[0]?.max_sequence ?? 0);
  }

  async createHeader(data: {
    supplier_delivery_number: string;
    supplier_id: number;
    project_id: number;
    received_by_account_id?: number | null;
    delivery_date: string;
    status_id: number;
    reference_code?: string | null;
    notes?: string | null;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ supplier_delivery_id: number; supplier_delivery_number: string }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO supplier_delivery (
        supplier_delivery_number,
        supplier_id,
        project_id,
        received_by_account_id,
        delivery_date,
        status_id,
        reference_code,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      RETURNING supplier_delivery_id, supplier_delivery_number`,
      [
        data.supplier_delivery_number,
        data.supplier_id,
        data.project_id,
        data.received_by_account_id ?? null,
        data.delivery_date,
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
    supplier_id?: number;
    project_id?: number;
    received_by_account_id?: number | null;
    delivery_date?: string | null;
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

    setField('supplier_id', data.supplier_id);
    setField('project_id', data.project_id);
    setField('received_by_account_id', data.received_by_account_id);
    setField('delivery_date', data.delivery_date);
    setField('reference_code', data.reference_code);
    setField('notes', data.notes);

    sets.push('log_date_updated = NOW()');
    sets.push(`log_updated_by_account_id = $${idx++}`);
    params.push(actorAccountId);
    sets.push(`log_module_updated = $${idx++}`);
    params.push(moduleName);

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery
       SET ${sets.join(', ')}
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      params
    );
  }

  async replaceItems(deliveryId: number, items: Array<{
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    delivered_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
    notes?: string | null;
    references: Array<{
      reference_type_lookup_id: number;
      reference_id: number;
      reference_line_id: number;
      quantity: number;
    }>;
  }>, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item_reference sdir
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE sdir.supplier_delivery_item_id IN (
         SELECT supplier_delivery_item_id
         FROM supplier_delivery_item
         WHERE supplier_delivery_id = $1
           AND is_deleted = false
       )
         AND sdir.is_deleted = false`,
      [deliveryId, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [deliveryId, actorAccountId, moduleName]
    );

    for (const item of items) {
      const itemResult = await this.getExecutor(client).query(
        `INSERT INTO supplier_delivery_item (
          supplier_delivery_id,
          material_id,
          material_brand_id,
          uom_id,
          delivered_quantity,
          accepted_quantity,
          rejected_quantity,
          notes,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
        RETURNING supplier_delivery_item_id`,
        [
          deliveryId,
          item.material_id,
          item.material_brand_id ?? null,
          item.uom_id,
          item.delivered_quantity,
          item.accepted_quantity,
          item.rejected_quantity,
          item.notes ?? null,
          actorAccountId,
          moduleName,
        ]
      );

      const supplierDeliveryItemId = itemResult.rows[0].supplier_delivery_item_id as number;
      for (const reference of item.references) {
        await this.getExecutor(client).query(
          `INSERT INTO supplier_delivery_item_reference (
            supplier_delivery_item_id,
            reference_type_lookup_id,
            reference_id,
            reference_line_id,
            quantity,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
          [
            supplierDeliveryItemId,
            reference.reference_type_lookup_id,
            reference.reference_id,
            reference.reference_line_id,
            reference.quantity,
            actorAccountId,
            moduleName,
          ]
        );
      }
    }
  }

  async findItemById(itemId: number, client?: PoolClient): Promise<SupplierDeliveryItemRow | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        sdi.supplier_delivery_item_id,
        sdi.material_id,
        m.product_code AS material_code,
        m.product_name AS material_name,
        sdi.material_brand_id,
        b.brand_name AS material_brand_name,
        sdi.uom_id,
        u.uom_name,
        u.abbreviation AS uom_abbreviation,
        sdi.delivered_quantity::TEXT AS delivered_quantity,
        sdi.accepted_quantity::TEXT AS accepted_quantity,
        sdi.rejected_quantity::TEXT AS rejected_quantity,
        sdi.stock_movement_id,
        sdi.notes,
        sdi.log_date_updated AS updated_at
      FROM supplier_delivery_item sdi
      JOIN material m ON m.material_id = sdi.material_id AND m.is_deleted = false
      JOIN unit_of_measure u ON u.uom_id = sdi.uom_id AND u.is_deleted = false
      LEFT JOIN material_brand mb ON mb.material_brand_id = sdi.material_brand_id AND mb.is_deleted = false
      LEFT JOIN brand b ON b.brand_id = mb.brand_id AND b.is_deleted = false
      WHERE sdi.supplier_delivery_item_id = $1
        AND sdi.is_deleted = false`,
      [itemId]
    );

    return result.rows[0] ?? null;
  }

  async createItem(deliveryId: number, item: {
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    delivered_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
    notes?: string | null;
    references: Array<{
      reference_type_lookup_id: number;
      reference_id: number;
      reference_line_id: number;
      quantity: number;
    }>;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<{ supplier_delivery_item_id: number }> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO supplier_delivery_item (
        supplier_delivery_id,
        material_id,
        material_brand_id,
        uom_id,
        delivered_quantity,
        accepted_quantity,
        rejected_quantity,
        notes,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
      RETURNING supplier_delivery_item_id`,
      [
        deliveryId,
        item.material_id,
        item.material_brand_id ?? null,
        item.uom_id,
        item.delivered_quantity,
        item.accepted_quantity,
        item.rejected_quantity,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    const supplierDeliveryItemId = result.rows[0].supplier_delivery_item_id as number;
    for (const reference of item.references) {
      await this.getExecutor(client).query(
        `INSERT INTO supplier_delivery_item_reference (
          supplier_delivery_item_id,
          reference_type_lookup_id,
          reference_id,
          reference_line_id,
          quantity,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
        [
          supplierDeliveryItemId,
          reference.reference_type_lookup_id,
          reference.reference_id,
          reference.reference_line_id,
          reference.quantity,
          actorAccountId,
          moduleName,
        ]
      );
    }

    return result.rows[0];
  }

  async updateItem(itemId: number, item: {
    material_id: number;
    material_brand_id?: number | null;
    uom_id: number;
    delivered_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
    notes?: string | null;
    references: Array<{
      reference_type_lookup_id: number;
      reference_id: number;
      reference_line_id: number;
      quantity: number;
    }>;
  }, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item
       SET material_id = $2,
           material_brand_id = $3,
           uom_id = $4,
           delivered_quantity = $5,
           accepted_quantity = $6,
           rejected_quantity = $7,
           notes = $8,
           log_date_updated = NOW(),
           log_updated_by_account_id = $9,
           log_module_updated = $10
       WHERE supplier_delivery_item_id = $1
         AND is_deleted = false`,
      [
        itemId,
        item.material_id,
        item.material_brand_id ?? null,
        item.uom_id,
        item.delivered_quantity,
        item.accepted_quantity,
        item.rejected_quantity,
        item.notes ?? null,
        actorAccountId,
        moduleName,
      ]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item_reference
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE supplier_delivery_item_id = $1
         AND is_deleted = false`,
      [itemId, actorAccountId, moduleName]
    );

    for (const reference of item.references) {
      await this.getExecutor(client).query(
        `INSERT INTO supplier_delivery_item_reference (
          supplier_delivery_item_id,
          reference_type_lookup_id,
          reference_id,
          reference_line_id,
          quantity,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
        [
          itemId,
          reference.reference_type_lookup_id,
          reference.reference_id,
          reference.reference_line_id,
          reference.quantity,
          actorAccountId,
          moduleName,
        ]
      );
    }
  }

  async softDeleteItem(itemId: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item_reference
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE supplier_delivery_item_id = $1
         AND is_deleted = false`,
      [itemId, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE supplier_delivery_item_id = $1
         AND is_deleted = false`,
      [itemId, actorAccountId, moduleName]
    );
  }

  async replacePurchaseOrders(deliveryId: number, purchaseOrderIds: number[], actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_purchase_order
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [deliveryId, actorAccountId, moduleName]
    );

    for (const purchaseOrderId of purchaseOrderIds) {
      await this.getExecutor(client).query(
        `INSERT INTO supplier_delivery_purchase_order (
          supplier_delivery_id,
          purchase_order_id,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, NOW(), $3, $4)`,
        [deliveryId, purchaseOrderId, actorAccountId, moduleName]
      );
    }
  }

  async replaceAdvices(deliveryId: number, deliveryAdviceIds: number[], actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_delivery_advice
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [deliveryId, actorAccountId, moduleName]
    );

    for (const deliveryAdviceId of deliveryAdviceIds) {
      await this.getExecutor(client).query(
        `INSERT INTO supplier_delivery_delivery_advice (
          supplier_delivery_id,
          delivery_advice_id,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, NOW(), $3, $4)`,
        [deliveryId, deliveryAdviceId, actorAccountId, moduleName]
      );
    }
  }

  async replaceMaterialRequests(deliveryId: number, materialRequestIds: number[], actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_material_request
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_module_updated = $3,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [deliveryId, actorAccountId, moduleName]
    );

    for (const materialRequestId of materialRequestIds) {
      await this.getExecutor(client).query(
        `INSERT INTO supplier_delivery_material_request (
          supplier_delivery_id,
          material_request_id,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        ) VALUES ($1, $2, NOW(), $3, $4)`,
        [deliveryId, materialRequestId, actorAccountId, moduleName]
      );
    }
  }

  async softDelete(id: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item_reference sdir
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE sdir.supplier_delivery_item_id IN (
         SELECT supplier_delivery_item_id
         FROM supplier_delivery_item
         WHERE supplier_delivery_id = $1
           AND is_deleted = false
       )
         AND sdir.is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_item
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_purchase_order
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_delivery_advice
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );

    await this.getExecutor(client).query(
      `UPDATE supplier_delivery_material_request
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $2,
           log_module_updated = $3
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [id, actorAccountId, moduleName]
    );
  }

  async post(id: number, postedByAccountId: number | null, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query('SELECT post_supplier_delivery($1, $2)', [id, postedByAccountId]);
  }

  async updateStatus(id: number, statusId: number, actorAccountId: number | null, moduleName: string, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE supplier_delivery
       SET status_id = $2,
           log_date_updated = NOW(),
           log_updated_by_account_id = $3,
           log_module_updated = $4
       WHERE supplier_delivery_id = $1
         AND is_deleted = false`,
      [id, statusId, actorAccountId, moduleName]
    );
  }
}
