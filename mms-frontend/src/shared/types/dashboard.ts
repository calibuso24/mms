export type DashboardType = 'coordinating' | 'purchasing' | 'inventory' | 'administrator';

export interface DashboardTypeDescriptor {
  key: DashboardType;
  label: string;
  description: string;
}

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
  data: any;
  meta: DashboardWidgetMeta;
}
