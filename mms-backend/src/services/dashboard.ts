import { DashboardRepository } from '../repositories/dashboard.js';
import {
  DashboardType,
  DashboardTypeDescriptor,
  DashboardWidgetPayload,
  DashboardWidgetQuery,
} from '../modules/dashboard/types.js';
import { RoleRepository } from '../repositories/role.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

const DASHBOARD_TYPES: DashboardTypeDescriptor[] = [
  {
    key: 'coordinating',
    label: 'Coordinating Transactions',
    description: 'Project coordination and request lifecycle visibility.',
  },
  {
    key: 'purchasing',
    label: 'Purchasing Transactions',
    description: 'Procurement throughput, supplier trends, and PO execution.',
  },
  {
    key: 'inventory',
    label: 'Inventory Transactions',
    description: 'Stock health, movement, valuation, and warehouse execution.',
  },
  {
    key: 'administrator',
    label: 'Administrator',
    description: 'User, activity, storage, and platform-level health insights.',
  },
];

const WIDGETS_BY_DASHBOARD: Record<DashboardType, string[]> = {
  coordinating: [
    'active_projects',
    'pending_material_requests',
    'pending_purchase_orders',
    'pending_deliveries',
    'overdue_requests',
    'completed_transactions_today',
    'material_request_trend',
    'requests_by_project',
    'transaction_status',
    'monthly_project_consumption',
    'recent_activities',
    'pending_requests',
    'recent_transactions',
    'pending_approval_lists',
    'notifications',
    'quick_actions',
    'calendar',
  ],
  purchasing: [
    'pending_rfqs',
    'pending_purchase_orders',
    'purchase_amount_this_month',
    'supplier_performance',
    'purchase_trend',
    'purchase_status',
    'upcoming_deliveries',
    'late_suppliers',
    'latest_purchase_orders',
    'recent_transactions',
    'pending_approval_lists',
    'notifications',
    'quick_actions',
    'calendar',
  ],
  inventory: [
    'total_inventory_value',
    'available_items',
    'low_stock',
    'out_of_stock',
    'incoming_deliveries',
    'stock_transfers',
    'material_adjustments',
    'inventory_by_category',
    'monthly_stock_movement',
    'top_consumed_materials',
    'stock_value_by_category',
    'recently_received_materials',
    'recent_transfers',
    'low_stock_alerts',
    'overdue_transactions',
    'latest_activities',
    'notifications',
    'quick_actions',
    'calendar',
  ],
  administrator: [
    'total_users',
    'online_users',
    'active_projects',
    'suppliers',
    'products',
    'transactions_today',
    'database_health',
    'storage_usage',
    'transactions_by_module',
    'user_activity',
    'module_usage',
    'audit_logs',
    'failed_logins',
    'system_errors',
    'recent_transactions',
    'pending_approval_lists',
    'notifications',
    'quick_actions',
    'calendar',
  ],
};

interface CachedWidgetValue {
  expiresAt: number;
  payload: DashboardWidgetPayload;
}

export class DashboardService {
  private dashboardRepository = new DashboardRepository();
  private roleRepository = new RoleRepository();
  private cache = new Map<string, CachedWidgetValue>();
  private readonly cacheTtlMs = 30_000;

  async getAllowedDashboardTypes(accountId: number): Promise<DashboardTypeDescriptor[]> {
    const permissions = new Set(await this.roleRepository.getPermissionCodesForAccount(accountId));
    const allowedKeys: DashboardType[] = [];

    if (
      permissions.has('Material Request:VIEW') ||
      permissions.has('Project Management:VIEW') ||
      permissions.has('Material Control:VIEW')
    ) {
      allowedKeys.push('coordinating');
    }

    if (
      permissions.has('Purchase Order:VIEW') ||
      permissions.has('Supplier:VIEW') ||
      permissions.has('Purchase Request:VIEW')
    ) {
      allowedKeys.push('purchasing');
    }

    if (
      permissions.has('Inventory Adjustment:VIEW') ||
      permissions.has('Stock Transfer:VIEW') ||
      permissions.has('Supplier Delivery:VIEW') ||
      permissions.has('Product:VIEW')
    ) {
      allowedKeys.push('inventory');
    }

    if (
      permissions.has('User Management:VIEW') ||
      permissions.has('Manage Roles:VIEW') ||
      permissions.has('System Settings:VIEW') ||
      permissions.has('Audit Log:VIEW')
    ) {
      allowedKeys.push('administrator');
    }

    if (allowedKeys.length === 0) {
      if (permissions.has('Dashboard:VIEW')) {
        allowedKeys.push('coordinating');
      }
    }

    return DASHBOARD_TYPES.filter((type) => allowedKeys.includes(type.key));
  }

  async getWidgetsForType(accountId: number, dashboardType: DashboardType): Promise<string[]> {
    await this.assertDashboardAccess(accountId, dashboardType);
    return WIDGETS_BY_DASHBOARD[dashboardType];
  }

  async getWidgetData(query: DashboardWidgetQuery): Promise<DashboardWidgetPayload> {
    await this.assertDashboardAccess(query.accountId, query.dashboardType);

    const widgets = WIDGETS_BY_DASHBOARD[query.dashboardType];
    if (!widgets.includes(query.widgetKey)) {
      throw new ValidationError(`Widget ${query.widgetKey} is not supported for ${query.dashboardType}`);
    }

    const cacheKey = this.buildCacheKey(query);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const payload = await this.dashboardRepository.getWidgetData(query);

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.cacheTtlMs,
      payload,
    });

    return payload;
  }

  private async assertDashboardAccess(accountId: number, dashboardType: DashboardType): Promise<void> {
    const allowed = await this.getAllowedDashboardTypes(accountId);
    if (!allowed.some((type) => type.key === dashboardType)) {
      throw new ForbiddenError(`You do not have access to the ${dashboardType} dashboard`);
    }
  }

  private buildCacheKey(query: DashboardWidgetQuery): string {
    return [
      query.accountId,
      query.dashboardType,
      query.widgetKey,
      query.limit,
      query.offset,
      query.fromDate ?? '',
      query.toDate ?? '',
    ].join(':');
  }
}
