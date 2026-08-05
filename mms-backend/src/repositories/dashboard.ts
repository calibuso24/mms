import { pool } from '../config/database.js';
import {
  DashboardWidgetPayload,
  DashboardWidgetQuery,
  DashboardNotificationItem,
  DashboardQuickActionItem,
  DashboardCalendarItem,
} from '../modules/dashboard/types.js';

type ListResult<T> = { items: T[]; total: number };

export class DashboardRepository {
  async getWidgetData(query: DashboardWidgetQuery): Promise<DashboardWidgetPayload> {
    const key = `${query.dashboardType}:${query.widgetKey}`;

    switch (key) {
      case 'coordinating:active_projects':
        return this.kpi(query, 'Active Projects', await this.activeProjects());
      case 'coordinating:pending_material_requests':
        return this.kpi(query, 'Pending Material Requests', await this.countByStatus('material_request', 'material_request_status', ['draft', 'submitted']));
      case 'coordinating:pending_purchase_orders':
        return this.kpi(query, 'Pending Purchase Orders', await this.countByStatus('purchase_order', 'purchase_order_status', ['draft']));
      case 'coordinating:pending_deliveries':
        return this.kpi(query, 'Pending Deliveries', await this.countByStatus('delivery_advice', 'delivery_advice_status', ['draft', 'submitted']));
      case 'coordinating:overdue_requests':
        return this.kpi(query, 'Overdue Requests', await this.overdueRequests());
      case 'coordinating:completed_transactions_today':
        return this.kpi(query, 'Completed Transactions Today', await this.completedToday());
      case 'coordinating:material_request_trend':
        return this.chart(query, 'Material Request Trend', 'line_chart', await this.monthTrend('material_request', 'requested_at', query));
      case 'coordinating:requests_by_project':
        return this.chart(query, 'Requests by Project', 'bar_chart', await this.requestsByProject());
      case 'coordinating:transaction_status':
        return this.chart(query, 'Transaction Status', 'pie_chart', await this.statusDistribution('material_request', 'material_request_status'));
      case 'coordinating:monthly_project_consumption':
        return this.chart(query, 'Monthly Project Consumption', 'area_chart', await this.monthlyConsumption(query));
      case 'coordinating:recent_activities':
        return this.list(query, 'Recent Activities', 'list', await this.auditList(query, ['material_request', 'material_control', 'purchase_order']));
      case 'coordinating:pending_requests':
        return this.list(query, 'Pending Requests', 'table', await this.pendingRequests(query));

      case 'purchasing:pending_rfqs':
        return this.kpi(query, 'Pending RFQs', await this.pendingRfqs());
      case 'purchasing:pending_purchase_orders':
        return this.kpi(query, 'Pending Purchase Orders', await this.countByStatus('purchase_order', 'purchase_order_status', ['draft', 'approved']));
      case 'purchasing:purchase_amount_this_month':
        return this.kpi(query, 'Purchase Amount This Month', await this.purchaseAmountMonth());
      case 'purchasing:supplier_performance':
        return this.chart(query, 'Supplier Performance', 'horizontal_bar_chart', await this.supplierPerformance());
      case 'purchasing:purchase_trend':
        return this.chart(query, 'Purchase Trend', 'line_chart', await this.monthTrend('purchase_order', 'prepared_at', query, 'total_amount'));
      case 'purchasing:purchase_status':
        return this.chart(query, 'Purchase Status', 'pie_chart', await this.statusDistribution('purchase_order', 'purchase_order_status'));
      case 'purchasing:upcoming_deliveries':
        return this.list(query, 'Upcoming Deliveries', 'table', await this.upcomingDeliveries(query));
      case 'purchasing:late_suppliers':
        return this.list(query, 'Late Suppliers', 'table', await this.lateSuppliers(query));
      case 'purchasing:latest_purchase_orders':
        return this.list(query, 'Latest Purchase Orders', 'table', await this.latestPurchaseOrders(query));

      case 'inventory:total_inventory_value':
        return this.kpi(query, 'Total Inventory Value', await this.inventoryValue());
      case 'inventory:available_items':
        return this.kpi(query, 'Available Items', await this.scalar('SELECT COUNT(*) FROM stock_balance WHERE is_deleted = false AND quantity_on_hand > 0'));
      case 'inventory:low_stock':
        return this.kpi(query, 'Low Stock', await this.scalar('SELECT COUNT(*) FROM stock_balance WHERE is_deleted = false AND quantity_on_hand > 0 AND quantity_on_hand <= 10'));
      case 'inventory:out_of_stock':
        return this.kpi(query, 'Out of Stock', await this.scalar('SELECT COUNT(*) FROM stock_balance WHERE is_deleted = false AND quantity_on_hand <= 0'));
      case 'inventory:incoming_deliveries':
        return this.kpi(query, 'Incoming Deliveries', await this.scalar(`SELECT COUNT(*) FROM purchase_order po JOIN look_up s ON s.look_up_id = po.status_id WHERE po.is_deleted = false AND s.look_up_type='purchase_order_status' AND s.code IN ('approved','partially_delivered') AND po.expected_delivery_date >= NOW()`));
      case 'inventory:stock_transfers':
        return this.kpi(query, 'Stock Transfers', await this.scalar(`SELECT COUNT(*) FROM stock_transfer WHERE is_deleted = false AND transfer_date >= date_trunc('month', NOW())`));
      case 'inventory:material_adjustments':
        return this.kpi(query, 'Material Adjustments', await this.scalar(`SELECT COUNT(*) FROM material_adjustment WHERE is_deleted = false AND requested_at >= date_trunc('month', NOW())`));
      case 'inventory:inventory_by_category':
        return this.chart(query, 'Inventory by Category', 'bar_chart', await this.inventoryByCategory());
      case 'inventory:monthly_stock_movement':
        return this.chart(query, 'Monthly Stock Movement', 'line_chart', await this.monthTrend('stock_movement', 'movement_date', query, 'quantity'));
      case 'inventory:top_consumed_materials':
        return this.chart(query, 'Top Consumed Materials', 'horizontal_bar_chart', await this.topConsumed());
      case 'inventory:stock_value_by_category':
        return this.chart(query, 'Stock Value by Category', 'pie_chart', await this.stockValueByCategory());
      case 'inventory:recently_received_materials':
        return this.list(query, 'Recently Received Materials', 'table', await this.receivedMaterials(query));
      case 'inventory:recent_transfers':
        return this.list(query, 'Recent Transfers', 'table', await this.recentTransfers(query));
      case 'inventory:low_stock_alerts':
        return this.list(query, 'Low Stock Alerts', 'table', await this.lowStockAlerts(query));
      case 'inventory:overdue_transactions':
        return this.list(query, 'Overdue Transactions', 'table', await this.overdueTransactions(query));
      case 'inventory:latest_activities':
        return this.list(query, 'Latest Activities', 'list', await this.auditList(query, ['stock_transfer', 'material_adjustment', 'supplier_delivery']));

      case 'administrator:total_users':
        return this.kpi(query, 'Total Users', await this.scalar('SELECT COUNT(*) FROM account WHERE is_deleted = false'));
      case 'administrator:online_users':
        return this.kpi(query, 'Online Users', await this.scalar(`SELECT COUNT(DISTINCT changed_by) FROM audit_log WHERE is_deleted = false AND changed_at >= NOW() - INTERVAL '15 minutes' AND changed_by IS NOT NULL`));
      case 'administrator:active_projects':
        return this.kpi(query, 'Active Projects', await this.activeProjects());
      case 'administrator:suppliers':
        return this.kpi(query, 'Suppliers', await this.partyTypeCount('supplier'));
      case 'administrator:products':
        return this.kpi(query, 'Products', await this.scalar('SELECT COUNT(*) FROM material WHERE is_deleted = false'));
      case 'administrator:transactions_today':
        return this.kpi(query, 'Transactions Today', await this.scalar(`SELECT COUNT(*) FROM audit_log WHERE is_deleted = false AND changed_at::date = CURRENT_DATE`));
      case 'administrator:database_health':
        return this.chart(query, 'Database Health', 'gauge', await this.databaseHealth());
      case 'administrator:storage_usage':
        return this.chart(query, 'Storage Usage', 'bar_chart', await this.storageUsage());
      case 'administrator:transactions_by_module':
        return this.chart(query, 'Transactions by Module', 'bar_chart', await this.transactionsByModule(query));
      case 'administrator:user_activity':
        return this.list(query, 'User Activity', 'table', await this.userActivity(query));
      case 'administrator:module_usage':
        return this.chart(query, 'Module Usage', 'horizontal_bar_chart', await this.transactionsByModule(query));
      case 'administrator:audit_logs':
        return this.list(query, 'Audit Logs', 'table', await this.auditList(query));
      case 'administrator:failed_logins':
        return this.kpi(query, 'Failed Logins', await this.failedLogins(query));
      case 'administrator:system_errors':
        return this.list(query, 'System Errors', 'table', await this.systemErrors(query));

      case 'coordinating:recent_transactions':
      case 'purchasing:recent_transactions':
      case 'inventory:recent_transactions':
      case 'administrator:recent_transactions':
        return this.list(query, 'Recent Transactions', 'table', await this.recentTransactions(query));

      case 'coordinating:pending_approval_lists':
      case 'purchasing:pending_approval_lists':
      case 'inventory:pending_approval_lists':
      case 'administrator:pending_approval_lists':
        return this.list(query, 'Pending Approval Lists', 'table', await this.pendingApprovals(query));

      case 'coordinating:notifications':
      case 'purchasing:notifications':
      case 'inventory:notifications':
      case 'administrator:notifications':
        return this.chart(query, 'Notifications', 'notifications', await this.notifications(query.dashboardType));

      case 'coordinating:quick_actions':
      case 'purchasing:quick_actions':
      case 'inventory:quick_actions':
      case 'administrator:quick_actions':
        return this.chart(query, 'Quick Actions', 'quick_actions', await this.quickActions(query.accountId));

      case 'coordinating:calendar':
      case 'purchasing:calendar':
      case 'inventory:calendar':
      case 'administrator:calendar':
        return this.chart(query, 'Calendar', 'calendar', await this.calendar(query));

      default:
        throw new Error(`Unsupported dashboard widget: ${key}`);
    }
  }

  private kpi(query: DashboardWidgetQuery, title: string, value: number): DashboardWidgetPayload {
    return {
      dashboard_type: query.dashboardType,
      widget_key: query.widgetKey,
      title,
      widget_type: 'kpi',
      data: { value },
      meta: { generated_at: new Date().toISOString() },
    };
  }

  private chart(query: DashboardWidgetQuery, title: string, widget_type: DashboardWidgetPayload['widget_type'], data: unknown): DashboardWidgetPayload {
    return {
      dashboard_type: query.dashboardType,
      widget_key: query.widgetKey,
      title,
      widget_type,
      data,
      meta: { generated_at: new Date().toISOString() },
    };
  }

  private list<T>(query: DashboardWidgetQuery, title: string, widget_type: DashboardWidgetPayload['widget_type'], result: ListResult<T>): DashboardWidgetPayload {
    return {
      dashboard_type: query.dashboardType,
      widget_key: query.widgetKey,
      title,
      widget_type,
      data: result.items,
      meta: {
        generated_at: new Date().toISOString(),
        total: result.total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  private range(query: DashboardWidgetQuery): { from: string; to: string } {
    const to = query.toDate ?? new Date().toISOString();
    const from = query.fromDate ?? new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString();
    return { from, to };
  }

  private async scalar(sql: string, params: unknown[] = []): Promise<number> {
    const result = await pool.query(sql, params);
    const row = result.rows[0] ?? {};
    const first = row[Object.keys(row)[0]];
    return Number(first ?? 0);
  }

  private async rows(sql: string, params: unknown[] = []): Promise<any[]> {
    const result = await pool.query(sql, params);
    return result.rows;
  }

  private async activeProjects(): Promise<number> {
    return this.scalar(`SELECT COUNT(*) FROM party p JOIN look_up t ON t.look_up_id = p.party_type_id WHERE p.is_deleted = false AND t.look_up_type='party_type' AND t.code='project'`);
  }

  private async partyTypeCount(code: string): Promise<number> {
    return this.scalar(`SELECT COUNT(*) FROM party p JOIN look_up t ON t.look_up_id = p.party_type_id WHERE p.is_deleted = false AND t.look_up_type='party_type' AND t.code = $1`, [code]);
  }

  private async countByStatus(tableName: string, lookupType: string, codes: string[]): Promise<number> {
    return this.scalar(`SELECT COUNT(*) FROM ${tableName} t JOIN look_up s ON s.look_up_id = t.status_id WHERE t.is_deleted = false AND s.look_up_type = $1 AND s.code = ANY($2::text[])`, [lookupType, codes]);
  }

  private async overdueRequests(): Promise<number> {
    return this.scalar(`SELECT COUNT(*) FROM material_request mr JOIN look_up s ON s.look_up_id = mr.status_id WHERE mr.is_deleted = false AND s.look_up_type='material_request_status' AND s.code IN ('draft','submitted') AND mr.requested_at < NOW() - INTERVAL '7 days'`);
  }

  private async completedToday(): Promise<number> {
    return this.scalar(`SELECT COUNT(*) FROM audit_log WHERE is_deleted = false AND changed_at::date = CURRENT_DATE AND entity_table IN ('material_request','purchase_order','supplier_delivery','stock_transfer','material_adjustment')`);
  }

  private async monthTrend(tableName: string, dateColumn: string, query: DashboardWidgetQuery, valueColumn?: string): Promise<Array<{ label: string; value: number }>> {
    const r = this.range(query);
    const agg = valueColumn ? `COALESCE(SUM(${valueColumn}),0)::numeric` : `COUNT(*)::int`;
    const rows = await this.rows(
      `SELECT TO_CHAR(date_trunc('month', ${dateColumn}), 'YYYY-MM') AS label, ${agg} AS value
       FROM ${tableName}
       WHERE is_deleted = false AND ${dateColumn} >= $1::timestamptz AND ${dateColumn} <= $2::timestamptz
       GROUP BY date_trunc('month', ${dateColumn})
       ORDER BY date_trunc('month', ${dateColumn})`,
      [r.from, r.to]
    );
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value ?? 0) }));
  }

  private async requestsByProject(): Promise<Array<{ label: string; value: number }>> {
    const rows = await this.rows(`SELECT p.party_name AS label, COUNT(*)::int AS value FROM material_request mr JOIN party p ON p.party_id = mr.project_id WHERE mr.is_deleted = false GROUP BY p.party_name ORDER BY value DESC LIMIT 10`);
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value) }));
  }

  private async statusDistribution(tableName: string, lookupType: string): Promise<Array<{ label: string; value: number }>> {
    const rows = await this.rows(`SELECT s.name AS label, COUNT(*)::int AS value FROM ${tableName} t JOIN look_up s ON s.look_up_id = t.status_id WHERE t.is_deleted = false AND s.look_up_type = $1 GROUP BY s.name ORDER BY value DESC`, [lookupType]);
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value) }));
  }

  private async monthlyConsumption(query: DashboardWidgetQuery): Promise<Array<{ label: string; value: number }>> {
    const r = this.range(query);
    const rows = await this.rows(
      `SELECT TO_CHAR(date_trunc('month', movement_date), 'YYYY-MM') AS label, COALESCE(SUM(quantity),0)::numeric AS value
       FROM stock_movement sm
       JOIN look_up mt ON mt.look_up_id = sm.movement_type_id
       WHERE sm.is_deleted = false AND mt.look_up_type = 'stock_movement_type' AND mt.code IN ('issuance','consume','transfer_out') AND movement_date >= $1::timestamptz AND movement_date <= $2::timestamptz
       GROUP BY date_trunc('month', movement_date)
       ORDER BY date_trunc('month', movement_date)`,
      [r.from, r.to]
    );
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value ?? 0) }));
  }

  private async pendingRequests(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(
      `SELECT mr.material_request_id, mr.mr_number, p.party_name, s.name AS status_name, mr.requested_at, COUNT(*) OVER()::int AS total_count
       FROM material_request mr
       JOIN party p ON p.party_id = mr.project_id
       JOIN look_up s ON s.look_up_id = mr.status_id
       WHERE mr.is_deleted = false AND s.look_up_type='material_request_status' AND s.code IN ('draft','submitted')
       ORDER BY mr.requested_at ASC
       LIMIT $1 OFFSET $2`,
      [query.limit, query.offset]
    );
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.material_request_id, code: x.mr_number, project: x.party_name, status: x.status_name, requested_at: x.requested_at })), total };
  }

  private async pendingRfqs(): Promise<number> {
    return this.scalar(`SELECT COUNT(*) FROM material_request mr LEFT JOIN purchase_order po ON po.material_request_id = mr.material_request_id AND po.is_deleted = false JOIN look_up s ON s.look_up_id = mr.status_id WHERE mr.is_deleted = false AND s.look_up_type='material_request_status' AND s.code='approved' AND po.purchase_order_id IS NULL`);
  }

  private async purchaseAmountMonth(): Promise<number> {
    return this.scalar(`SELECT COALESCE(SUM(total_amount),0) FROM purchase_order WHERE is_deleted = false AND prepared_at >= date_trunc('month', NOW())`);
  }

  private async supplierPerformance(): Promise<Array<{ label: string; value: number }>> {
    const rows = await this.rows(`SELECT sp.party_name AS label, ROUND(100 * AVG(CASE WHEN po.expected_delivery_date IS NULL OR sd.delivery_date <= po.expected_delivery_date THEN 1 ELSE 0 END))::int AS value FROM supplier_delivery sd JOIN purchase_order po ON po.purchase_order_id = sd.purchase_order_id JOIN party sp ON sp.party_id = sd.supplier_id WHERE sd.is_deleted = false AND po.is_deleted = false GROUP BY sp.party_name ORDER BY value DESC LIMIT 10`);
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value ?? 0) }));
  }

  private async upcomingDeliveries(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT po.purchase_order_id, po.po_number, p.party_name AS supplier_name, po.expected_delivery_date, COUNT(*) OVER()::int AS total_count FROM purchase_order po JOIN party p ON p.party_id = po.supplier_party_id JOIN look_up s ON s.look_up_id = po.status_id WHERE po.is_deleted=false AND s.look_up_type='purchase_order_status' AND s.code IN ('approved','partially_delivered') AND po.expected_delivery_date >= NOW() ORDER BY po.expected_delivery_date ASC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.purchase_order_id, po_number: x.po_number, supplier: x.supplier_name, expected_delivery_date: x.expected_delivery_date })), total };
  }

  private async lateSuppliers(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT sd.supplier_delivery_id, po.po_number, p.party_name AS supplier_name, po.expected_delivery_date, sd.delivery_date, COUNT(*) OVER()::int AS total_count FROM supplier_delivery sd JOIN purchase_order po ON po.purchase_order_id = sd.purchase_order_id JOIN party p ON p.party_id = sd.supplier_id WHERE sd.is_deleted=false AND po.is_deleted=false AND po.expected_delivery_date IS NOT NULL AND sd.delivery_date > po.expected_delivery_date ORDER BY sd.delivery_date DESC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.supplier_delivery_id, po_number: x.po_number, supplier: x.supplier_name, expected_delivery_date: x.expected_delivery_date, actual_delivery_date: x.delivery_date })), total };
  }

  private async latestPurchaseOrders(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT po.purchase_order_id, po.po_number, p.party_name AS supplier_name, po.total_amount, s.name AS status_name, po.prepared_at, COUNT(*) OVER()::int AS total_count FROM purchase_order po JOIN party p ON p.party_id = po.supplier_party_id JOIN look_up s ON s.look_up_id = po.status_id WHERE po.is_deleted=false ORDER BY po.prepared_at DESC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.purchase_order_id, po_number: x.po_number, supplier: x.supplier_name, amount: Number(x.total_amount ?? 0), status: x.status_name, prepared_at: x.prepared_at })), total };
  }

  private async inventoryValue(): Promise<number> {
    return this.scalar(`SELECT COALESCE(SUM(sb.quantity_on_hand * COALESCE(cost.unit_price, 0)), 0) FROM stock_balance sb LEFT JOIN LATERAL (SELECT poi.unit_price FROM purchase_order_item poi WHERE poi.material_id = sb.material_id AND poi.uom_id = sb.uom_id AND poi.is_deleted = false AND poi.unit_price IS NOT NULL ORDER BY poi.log_date_created DESC LIMIT 1) cost ON TRUE WHERE sb.is_deleted = false`);
  }

  private async inventoryByCategory(): Promise<Array<{ label: string; value: number }>> {
    const rows = await this.rows(`SELECT c.category_name AS label, COUNT(*)::int AS value FROM stock_balance sb JOIN material m ON m.material_id = sb.material_id AND m.is_deleted = false JOIN category c ON c.category_id = m.category_id AND c.is_deleted = false WHERE sb.is_deleted = false GROUP BY c.category_name ORDER BY value DESC`);
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value) }));
  }

  private async topConsumed(): Promise<Array<{ label: string; value: number }>> {
    const rows = await this.rows(`SELECT m.product_name AS label, COALESCE(SUM(ABS(sm.quantity)),0)::int AS value FROM stock_movement sm JOIN material m ON m.material_id = sm.material_id JOIN look_up mt ON mt.look_up_id = sm.movement_type_id WHERE sm.is_deleted = false AND m.is_deleted = false AND mt.look_up_type='stock_movement_type' AND mt.code IN ('issuance','consume','transfer_out') GROUP BY m.product_name ORDER BY value DESC LIMIT 10`);
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value) }));
  }

  private async stockValueByCategory(): Promise<Array<{ label: string; value: number }>> {
    const rows = await this.rows(`SELECT c.category_name AS label, COALESCE(SUM(sb.quantity_on_hand * COALESCE(cost.unit_price, 0)), 0)::numeric AS value FROM stock_balance sb JOIN material m ON m.material_id = sb.material_id AND m.is_deleted = false JOIN category c ON c.category_id = m.category_id AND c.is_deleted = false LEFT JOIN LATERAL (SELECT poi.unit_price FROM purchase_order_item poi WHERE poi.material_id = sb.material_id AND poi.uom_id = sb.uom_id AND poi.is_deleted = false AND poi.unit_price IS NOT NULL ORDER BY poi.log_date_created DESC LIMIT 1) cost ON TRUE WHERE sb.is_deleted = false GROUP BY c.category_name ORDER BY value DESC`);
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value) }));
  }

  private async receivedMaterials(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT sdi.supplier_delivery_item_id, m.product_name, sdi.accepted_quantity, u.uom_name, sd.delivery_date, COUNT(*) OVER()::int AS total_count FROM supplier_delivery_item sdi JOIN supplier_delivery sd ON sd.supplier_delivery_id = sdi.supplier_delivery_id JOIN material m ON m.material_id = sdi.material_id JOIN unit_of_measure u ON u.uom_id = sdi.uom_id WHERE sdi.is_deleted=false AND sd.is_deleted=false ORDER BY sd.delivery_date DESC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.supplier_delivery_item_id, material: x.product_name, quantity: Number(x.accepted_quantity), uom: x.uom_name, date: x.delivery_date })), total };
  }

  private async recentTransfers(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT st.stock_transfer_id, st.stock_transfer_number, src.party_name AS source_name, dst.party_name AS destination_name, st.transfer_date, s.name AS status_name, COUNT(*) OVER()::int AS total_count FROM stock_transfer st JOIN party src ON src.party_id = st.source_id JOIN party dst ON dst.party_id = st.destination_id JOIN look_up s ON s.look_up_id = st.status_id WHERE st.is_deleted=false ORDER BY st.transfer_date DESC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.stock_transfer_id, number: x.stock_transfer_number, source: x.source_name, destination: x.destination_name, status: x.status_name, date: x.transfer_date })), total };
  }

  private async lowStockAlerts(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT sb.stock_balance_id, m.product_code, m.product_name, sb.quantity_on_hand, u.uom_name, COUNT(*) OVER()::int AS total_count FROM stock_balance sb JOIN material m ON m.material_id = sb.material_id JOIN unit_of_measure u ON u.uom_id = sb.uom_id WHERE sb.is_deleted = false AND sb.quantity_on_hand <= 10 ORDER BY sb.quantity_on_hand ASC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.stock_balance_id, material_code: x.product_code, material_name: x.product_name, quantity_on_hand: Number(x.quantity_on_hand), uom: x.uom_name })), total };
  }

  private async overdueTransactions(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT po.purchase_order_id::text AS id, 'Purchase Order' AS transaction_type, po.po_number AS code, po.expected_delivery_date AS due_date, COUNT(*) OVER()::int AS total_count FROM purchase_order po JOIN look_up s ON s.look_up_id = po.status_id WHERE po.is_deleted = false AND s.look_up_type='purchase_order_status' AND s.code IN ('approved','partially_delivered') AND po.expected_delivery_date < NOW() ORDER BY po.expected_delivery_date ASC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.id, type: x.transaction_type, code: x.code, due_date: x.due_date })), total };
  }

  private async databaseHealth(): Promise<Record<string, number>> {
    const rows = await this.rows(`SELECT numbackends, xact_commit, xact_rollback, blks_hit, blks_read, CASE WHEN (blks_hit + blks_read)=0 THEN 0 ELSE ROUND((blks_hit::numeric/(blks_hit+blks_read)::numeric)*100,2) END AS cache_hit_ratio FROM pg_stat_database WHERE datname = current_database()`);
    const row = rows[0] ?? {};
    return {
      connections: Number(row.numbackends ?? 0),
      commits: Number(row.xact_commit ?? 0),
      rollbacks: Number(row.xact_rollback ?? 0),
      cache_hit_ratio: Number(row.cache_hit_ratio ?? 0),
    };
  }

  private async storageUsage(): Promise<Array<{ label: string; value: number }>> {
    const rows = await this.rows(`SELECT pg_database_size(current_database()) AS db_size, pg_total_relation_size('audit_log') AS audit_log_size, pg_total_relation_size('stock_movement') AS stock_movement_size, pg_total_relation_size('stock_balance') AS stock_balance_size`);
    const row = rows[0] ?? {};
    return [
      { label: 'Database', value: Number(row.db_size ?? 0) },
      { label: 'Audit Log', value: Number(row.audit_log_size ?? 0) },
      { label: 'Stock Movement', value: Number(row.stock_movement_size ?? 0) },
      { label: 'Stock Balance', value: Number(row.stock_balance_size ?? 0) },
    ];
  }

  private async transactionsByModule(query: DashboardWidgetQuery): Promise<Array<{ label: string; value: number }>> {
    const r = this.range(query);
    const rows = await this.rows(`SELECT COALESCE(log_module_created, entity_table) AS label, COUNT(*)::int AS value FROM audit_log WHERE is_deleted = false AND changed_at >= $1::timestamptz AND changed_at <= $2::timestamptz GROUP BY COALESCE(log_module_created, entity_table) ORDER BY value DESC LIMIT 12`, [r.from, r.to]);
    return rows.map((x) => ({ label: x.label as string, value: Number(x.value) }));
  }

  private async userActivity(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(`SELECT COALESCE(a.full_name, a.user_name, 'System') AS user_name, COUNT(*)::int AS action_count, MAX(al.changed_at) AS last_activity, COUNT(*) OVER()::int AS total_count FROM audit_log al LEFT JOIN account a ON a.account_id = al.changed_by WHERE al.is_deleted = false GROUP BY COALESCE(a.full_name, a.user_name, 'System') ORDER BY action_count DESC LIMIT $1 OFFSET $2`, [query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ user: x.user_name, actions: Number(x.action_count), last_activity: x.last_activity })), total };
  }

  private async auditList(query: DashboardWidgetQuery, modules?: string[]): Promise<ListResult<Record<string, unknown>>> {
    const hasFilter = Array.isArray(modules) && modules.length > 0;
    const rows = await this.rows(
      `SELECT al.audit_log_id, al.entity_table, al.operation, COALESCE(a.full_name, a.user_name, 'System') AS changed_by, al.changed_at, al.notes, COUNT(*) OVER()::int AS total_count
       FROM audit_log al
       LEFT JOIN account a ON a.account_id = al.changed_by
       WHERE al.is_deleted = false
         AND ($1::boolean = false OR COALESCE(al.log_module_created,'') = ANY($2::text[]))
       ORDER BY al.changed_at DESC
       LIMIT $3 OFFSET $4`,
      [hasFilter, modules ?? [], query.limit, query.offset]
    );
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.audit_log_id, entity: x.entity_table, operation: x.operation, changed_by: x.changed_by, changed_at: x.changed_at, notes: x.notes })), total };
  }

  private async failedLogins(query: DashboardWidgetQuery): Promise<number> {
    const r = this.range(query);
    return this.scalar(`SELECT COUNT(*) FROM audit_log WHERE is_deleted = false AND changed_at >= $1::timestamptz AND changed_at <= $2::timestamptz AND (operation = 'LOGIN_FAILED' OR COALESCE(notes,'') ILIKE '%login failed%')`, [r.from, r.to]);
  }

  private async systemErrors(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const r = this.range(query);
    const rows = await this.rows(`SELECT audit_log_id, entity_table, operation, changed_at, notes, COUNT(*) OVER()::int AS total_count FROM audit_log WHERE is_deleted = false AND changed_at >= $1::timestamptz AND changed_at <= $2::timestamptz AND (operation IN ('ERROR','FAILED') OR COALESCE(notes,'') ILIKE '%error%' OR COALESCE(notes,'') ILIKE '%exception%') ORDER BY changed_at DESC LIMIT $3 OFFSET $4`, [r.from, r.to, query.limit, query.offset]);
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ id: x.audit_log_id, entity: x.entity_table, operation: x.operation, occurred_at: x.changed_at, notes: x.notes })), total };
  }

  private async recentTransactions(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(
      `SELECT t.*, COUNT(*) OVER()::int AS total_count
       FROM (
         SELECT 'Material Request' AS transaction_type, mr.material_request_id::text AS transaction_id, mr.mr_number AS transaction_number, mr.requested_at AS transaction_date, ls.name AS status_name
         FROM material_request mr JOIN look_up ls ON ls.look_up_id = mr.status_id WHERE mr.is_deleted = false
         UNION ALL
         SELECT 'Purchase Order', po.purchase_order_id::text, po.po_number, po.prepared_at, ls.name
         FROM purchase_order po JOIN look_up ls ON ls.look_up_id = po.status_id WHERE po.is_deleted = false
         UNION ALL
         SELECT 'Stock Transfer', st.stock_transfer_id::text, st.stock_transfer_number, st.transfer_date, ls.name
         FROM stock_transfer st JOIN look_up ls ON ls.look_up_id = st.status_id WHERE st.is_deleted = false
       ) t
       ORDER BY t.transaction_date DESC
       LIMIT $1 OFFSET $2`,
      [query.limit, query.offset]
    );
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ type: x.transaction_type, id: x.transaction_id, number: x.transaction_number, date: x.transaction_date, status: x.status_name })), total };
  }

  private async pendingApprovals(query: DashboardWidgetQuery): Promise<ListResult<Record<string, unknown>>> {
    const rows = await this.rows(
      `SELECT t.*, COUNT(*) OVER()::int AS total_count
       FROM (
         SELECT 'Material Request' AS transaction_type, mr.material_request_id::text AS transaction_id, mr.mr_number AS transaction_number, mr.requested_at AS transaction_date, ls.name AS status_name
         FROM material_request mr JOIN look_up ls ON ls.look_up_id = mr.status_id WHERE mr.is_deleted = false AND ls.look_up_type='material_request_status' AND ls.code IN ('submitted')
         UNION ALL
         SELECT 'Purchase Order', po.purchase_order_id::text, po.po_number, po.prepared_at, ls.name
         FROM purchase_order po JOIN look_up ls ON ls.look_up_id = po.status_id WHERE po.is_deleted = false AND ls.look_up_type='purchase_order_status' AND ls.code IN ('draft')
         UNION ALL
         SELECT 'Material Adjustment', ma.material_adjustment_id::text, ma.material_adjustment_number, ma.requested_at, ls.name
         FROM material_adjustment ma JOIN look_up ls ON ls.look_up_id = ma.status_id WHERE ma.is_deleted = false AND ls.look_up_type='material_adjustment_status' AND ls.code IN ('pending')
       ) t
       ORDER BY t.transaction_date ASC
       LIMIT $1 OFFSET $2`,
      [query.limit, query.offset]
    );
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    return { items: rows.map((x) => ({ type: x.transaction_type, id: x.transaction_id, number: x.transaction_number, date: x.transaction_date, status: x.status_name })), total };
  }

  private async notifications(dashboardType: DashboardWidgetQuery['dashboardType']): Promise<DashboardNotificationItem[]> {
    const items: DashboardNotificationItem[] = [];

    if (dashboardType === 'coordinating' || dashboardType === 'administrator') {
      items.push({ title: 'Overdue Material Requests', severity: 'warning', value: await this.overdueRequests() });
    }

    if (dashboardType === 'purchasing' || dashboardType === 'administrator') {
      items.push({ title: 'Late Supplier Deliveries', severity: 'error', value: await this.scalar(`SELECT COUNT(*) FROM supplier_delivery sd JOIN purchase_order po ON po.purchase_order_id = sd.purchase_order_id WHERE sd.is_deleted = false AND po.is_deleted = false AND po.expected_delivery_date IS NOT NULL AND sd.delivery_date > po.expected_delivery_date`) });
    }

    if (dashboardType === 'inventory' || dashboardType === 'administrator') {
      items.push({ title: 'Low Stock Materials', severity: 'warning', value: await this.scalar(`SELECT COUNT(*) FROM stock_balance WHERE is_deleted = false AND quantity_on_hand > 0 AND quantity_on_hand <= 10`) });
      items.push({ title: 'Out of Stock Materials', severity: 'error', value: await this.scalar(`SELECT COUNT(*) FROM stock_balance WHERE is_deleted = false AND quantity_on_hand <= 0`) });
    }

    if (dashboardType === 'administrator') {
      items.push({ title: 'System Error Events (Range)', severity: 'error', value: await this.scalar(`SELECT COUNT(*) FROM audit_log WHERE is_deleted = false AND (operation IN ('ERROR', 'FAILED') OR COALESCE(notes, '') ILIKE '%error%')`) });
    }

    return items;
  }

  private async quickActions(accountId: number): Promise<DashboardQuickActionItem[]> {
    const rows = await this.rows(
      `SELECT DISTINCT n.title, n.route
       , n.display_order
       FROM navigation n
       WHERE n.context='MAIN' AND n.navigation_type='MENU' AND n.route IS NOT NULL AND n.route <> '/dashboard' AND n.is_deleted = false AND n.is_visible = true
         AND (
           n.permission_code IS NULL OR n.permission_code IN (
             SELECT p.permission_code
             FROM account_role ar
             JOIN role_permission rp ON rp.role_id = ar.role_id
             JOIN permission p ON p.permission_id = rp.permission_id
             WHERE ar.account_id = $1 AND ar.is_deleted = false AND rp.is_deleted = false AND p.is_deleted = false
           )
         )
       ORDER BY n.display_order ASC, n.title ASC
       LIMIT 8`,
      [accountId]
    );

    return rows.map((x) => ({ title: x.title as string, route: x.route as string }));
  }

  private async calendar(query: DashboardWidgetQuery): Promise<DashboardCalendarItem[]> {
    const rows = await this.rows(
      `WITH events AS (
         SELECT CONCAT('mr-', mr.material_request_id)::text AS id, CONCAT('Material Request ', mr.mr_number)::text AS title, mr.requested_at AS event_date, '/coordinating/material-request'::text AS route, ls.name AS status_name
         FROM material_request mr JOIN look_up ls ON ls.look_up_id = mr.status_id WHERE mr.is_deleted = false
         UNION ALL
         SELECT CONCAT('po-', po.purchase_order_id)::text, CONCAT('PO ', po.po_number)::text, po.expected_delivery_date, '/purchasing/purchase-order'::text, ls.name
         FROM purchase_order po JOIN look_up ls ON ls.look_up_id = po.status_id WHERE po.is_deleted = false AND po.expected_delivery_date IS NOT NULL
         UNION ALL
         SELECT CONCAT('st-', st.stock_transfer_id)::text, CONCAT('Transfer ', st.stock_transfer_number)::text, st.transfer_date, '/inventory/stock-transfer'::text, ls.name
         FROM stock_transfer st JOIN look_up ls ON ls.look_up_id = st.status_id WHERE st.is_deleted = false
       )
       SELECT id, title, event_date, route, status_name
       FROM events
       WHERE event_date >= NOW() - INTERVAL '7 days'
       ORDER BY event_date ASC
       LIMIT $1`,
      [Math.max(10, query.limit)]
    );

    return rows.map((x) => ({ id: x.id as string, title: x.title as string, date: x.event_date as string, route: x.route as string, status: x.status_name as string }));
  }
}
