export type DashboardType = 'coordinating' | 'purchasing' | 'inventory' | 'administrator';

export type DashboardWidgetType =
  | 'kpi'
  | 'line_chart'
  | 'bar_chart'
  | 'horizontal_bar_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'gauge'
  | 'list'
  | 'table'
  | 'notifications'
  | 'quick_actions'
  | 'calendar';

export interface DashboardWidgetMeta {
  total?: number;
  limit?: number;
  offset?: number;
  generated_at: string;
}

export interface DashboardWidgetPayload {
  dashboard_type: DashboardType;
  widget_key: string;
  title: string;
  widget_type: DashboardWidgetType;
  data: unknown;
  meta: DashboardWidgetMeta;
}

export interface DashboardWidgetQuery {
  accountId: number;
  dashboardType: DashboardType;
  widgetKey: string;
  limit: number;
  offset: number;
  fromDate?: string;
  toDate?: string;
}

export interface DashboardListItem {
  label: string;
  value: number;
}

export interface DashboardTrendPoint {
  label: string;
  value: number;
}

export interface DashboardDistributionItem {
  label: string;
  value: number;
}

export interface DashboardCalendarItem {
  id: string;
  title: string;
  date: string;
  route?: string | null;
  status?: string | null;
}

export interface DashboardQuickActionItem {
  title: string;
  route: string;
}

export interface DashboardNotificationItem {
  title: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  value: number;
}

export interface DashboardTypeDescriptor {
  key: DashboardType;
  label: string;
  description: string;
}
