import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../shared/api/client.js';
import { useNavigation } from '../shared/contexts/navigation.js';
import { KPICard } from '../shared/components/KPICard.js';
import type { DashboardType, DashboardTypeDescriptor, DashboardWidgetPayload } from '../shared/types/dashboard.js';

const WidgetCharts = lazy(() => import('../shared/components/dashboard/WidgetCharts.js'));

type WidgetSize = 3 | 4 | 6 | 8 | 12;

interface WidgetSpec {
  key: string;
  title: string;
  size: WidgetSize;
}

const DASHBOARD_LAYOUTS: Record<DashboardType, WidgetSpec[]> = {
  coordinating: [
    { key: 'active_projects', title: 'Active Projects', size: 3 },
    { key: 'pending_material_requests', title: 'Pending Material Requests', size: 3 },
    { key: 'pending_purchase_orders', title: 'Pending Purchase Orders', size: 3 },
    { key: 'pending_deliveries', title: 'Pending Deliveries', size: 3 },
    { key: 'overdue_requests', title: 'Overdue Requests', size: 3 },
    { key: 'completed_transactions_today', title: 'Completed Transactions Today', size: 3 },
    { key: 'material_request_trend', title: 'Material Request Trend', size: 6 },
    { key: 'requests_by_project', title: 'Requests by Project', size: 6 },
    { key: 'transaction_status', title: 'Transaction Status', size: 6 },
    { key: 'monthly_project_consumption', title: 'Monthly Project Consumption', size: 6 },
    { key: 'pending_requests', title: 'Pending Requests', size: 6 },
    { key: 'recent_activities', title: 'Recent Activities', size: 6 },
    { key: 'pending_approval_lists', title: 'Pending Approvals', size: 6 },
    { key: 'recent_transactions', title: 'Recent Transactions', size: 6 },
    { key: 'notifications', title: 'Notifications', size: 6 },
    { key: 'quick_actions', title: 'Quick Actions', size: 6 },
    { key: 'calendar', title: 'Calendar', size: 12 },
  ],
  purchasing: [
    { key: 'pending_rfqs', title: 'Pending RFQs', size: 3 },
    { key: 'pending_purchase_orders', title: 'Pending Purchase Orders', size: 3 },
    { key: 'purchase_amount_this_month', title: 'Purchase Amount This Month', size: 3 },
    { key: 'late_suppliers', title: 'Late Suppliers', size: 3 },
    { key: 'purchase_trend', title: 'Purchase Trend', size: 6 },
    { key: 'purchase_status', title: 'Purchase Status', size: 6 },
    { key: 'supplier_performance', title: 'Supplier Performance', size: 6 },
    { key: 'upcoming_deliveries', title: 'Upcoming Deliveries', size: 6 },
    { key: 'latest_purchase_orders', title: 'Latest Purchase Orders', size: 6 },
    { key: 'pending_approval_lists', title: 'Pending Approvals', size: 6 },
    { key: 'recent_transactions', title: 'Recent Transactions', size: 6 },
    { key: 'notifications', title: 'Notifications', size: 6 },
    { key: 'quick_actions', title: 'Quick Actions', size: 6 },
    { key: 'calendar', title: 'Calendar', size: 12 },
  ],
  inventory: [
    { key: 'total_inventory_value', title: 'Total Inventory Value', size: 3 },
    { key: 'available_items', title: 'Available Items', size: 3 },
    { key: 'low_stock', title: 'Low Stock', size: 3 },
    { key: 'out_of_stock', title: 'Out of Stock', size: 3 },
    { key: 'incoming_deliveries', title: 'Incoming Deliveries', size: 3 },
    { key: 'stock_transfers', title: 'Stock Transfers', size: 3 },
    { key: 'material_adjustments', title: 'Material Adjustments', size: 3 },
    { key: 'low_stock_alerts', title: 'Low Stock Alerts', size: 3 },
    { key: 'inventory_by_category', title: 'Inventory by Category', size: 6 },
    { key: 'monthly_stock_movement', title: 'Monthly Stock Movement', size: 6 },
    { key: 'top_consumed_materials', title: 'Top Consumed Materials', size: 6 },
    { key: 'stock_value_by_category', title: 'Stock Value by Category', size: 6 },
    { key: 'recently_received_materials', title: 'Recently Received Materials', size: 6 },
    { key: 'recent_transfers', title: 'Recent Transfers', size: 6 },
    { key: 'overdue_transactions', title: 'Overdue Transactions', size: 6 },
    { key: 'latest_activities', title: 'Latest Activities', size: 6 },
    { key: 'pending_approval_lists', title: 'Pending Approvals', size: 6 },
    { key: 'recent_transactions', title: 'Recent Transactions', size: 6 },
    { key: 'notifications', title: 'Notifications', size: 6 },
    { key: 'quick_actions', title: 'Quick Actions', size: 6 },
    { key: 'calendar', title: 'Calendar', size: 12 },
  ],
  administrator: [
    { key: 'total_users', title: 'Total Users', size: 3 },
    { key: 'online_users', title: 'Online Users', size: 3 },
    { key: 'active_projects', title: 'Active Projects', size: 3 },
    { key: 'suppliers', title: 'Suppliers', size: 3 },
    { key: 'products', title: 'Products', size: 3 },
    { key: 'transactions_today', title: 'Transactions Today', size: 3 },
    { key: 'failed_logins', title: 'Failed Logins', size: 3 },
    { key: 'system_errors', title: 'System Errors', size: 3 },
    { key: 'database_health', title: 'Database Health', size: 6 },
    { key: 'storage_usage', title: 'Storage Usage', size: 6 },
    { key: 'transactions_by_module', title: 'Transactions by Module', size: 6 },
    { key: 'module_usage', title: 'Module Usage', size: 6 },
    { key: 'user_activity', title: 'User Activity', size: 6 },
    { key: 'audit_logs', title: 'Audit Logs', size: 6 },
    { key: 'pending_approval_lists', title: 'Pending Approvals', size: 6 },
    { key: 'recent_transactions', title: 'Recent Transactions', size: 6 },
    { key: 'notifications', title: 'Notifications', size: 6 },
    { key: 'quick_actions', title: 'Quick Actions', size: 6 },
    { key: 'calendar', title: 'Calendar', size: 12 },
  ],
};

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isChartWidget(type: DashboardWidgetPayload['widget_type']): boolean {
  return (
    type === 'line_chart' ||
    type === 'bar_chart' ||
    type === 'horizontal_bar_chart' ||
    type === 'pie_chart' ||
    type === 'area_chart' ||
    type === 'gauge'
  );
}

function WidgetDataView({
  payload,
  onNavigate,
}: {
  payload: DashboardWidgetPayload;
  onNavigate: (route: string) => void;
}) {
  if (payload.widget_type === 'kpi') {
    return <KPICard label={payload.title} value={Number(payload.data?.value ?? 0).toLocaleString()} color="info" />;
  }

  if (isChartWidget(payload.widget_type)) {
    return (
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        }
      >
        <WidgetCharts payload={payload} />
      </Suspense>
    );
  }

  if (payload.widget_type === 'quick_actions') {
    const actions = Array.isArray(payload.data) ? payload.data : [];
    return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {actions.map((action: any) => (
          <Button key={String(action.route)} variant="outlined" onClick={() => onNavigate(String(action.route))}>
            {String(action.title)}
          </Button>
        ))}
      </Stack>
    );
  }

  if (payload.widget_type === 'notifications') {
    const notifications = Array.isArray(payload.data) ? payload.data : [];
    return (
      <Stack spacing={1}>
        {notifications.map((item: any, index: number) => (
          <Alert key={`${item.title}-${index}`} severity={item.severity ?? 'info'}>
            {item.title}: <strong>{Number(item.value ?? 0).toLocaleString()}</strong>
          </Alert>
        ))}
      </Stack>
    );
  }

  if (payload.widget_type === 'calendar') {
    const events = Array.isArray(payload.data) ? payload.data : [];
    return (
      <Stack spacing={1}>
        {events.map((event: any) => (
          <Paper key={String(event.id)} variant="outlined" sx={{ p: 1.25 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {String(event.title)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(String(event.date)).toLocaleString()}
                </Typography>
              </Box>
              {event.route ? (
                <Button size="small" onClick={() => onNavigate(String(event.route))}>
                  Open
                </Button>
              ) : null}
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  const rows = Array.isArray(payload.data) ? payload.data : [];

  if (rows.length === 0) {
    return <Typography color="text.secondary">No records found.</Typography>;
  }

  const keys = Object.keys(rows[0]);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {keys.map((key) => (
              <th
                key={key}
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid #E1DFDD',
                  padding: '8px 6px',
                  fontSize: '0.8rem',
                  color: '#444',
                  whiteSpace: 'nowrap',
                }}
              >
                {key.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any, rowIndex: number) => (
            <tr key={rowIndex}>
              {keys.map((key) => (
                <td key={key} style={{ borderBottom: '1px solid #F0F2F5', padding: '8px 6px', fontSize: '0.85rem' }}>
                  {row[key] === null || row[key] === undefined ? '-' : String(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

function WidgetPanel({
  dashboardType,
  widget,
  from,
  to,
  refreshToken,
  onNavigate,
}: {
  dashboardType: DashboardType;
  widget: WidgetSpec;
  from: string;
  to: string;
  refreshToken: number;
  onNavigate: (route: string) => void;
}) {
  const [payload, setPayload] = useState<DashboardWidgetPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 6;

  useEffect(() => {
    setOffset(0);
  }, [dashboardType, widget.key, from, to]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    dashboardApi
      .getWidget(dashboardType, widget.key, { limit, offset, from, to })
      .then((data) => {
        if (!mounted) return;
        setPayload(data as DashboardWidgetPayload);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load widget');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dashboardType, widget.key, from, to, offset, refreshToken]);

  const total = Number(payload?.meta.total ?? 0);
  const canPage = total > limit;

  if (loading) {
    return (
      <Card sx={{ minHeight: 180 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {widget.title}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ minHeight: 180 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {widget.title}
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!payload) {
    return (
      <Card sx={{ minHeight: 180 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {widget.title}
          </Typography>
          <Typography color="text.secondary">No data returned.</Typography>
        </CardContent>
      </Card>
    );
  }

  if (payload.widget_type === 'kpi') {
    return <WidgetDataView payload={payload} onNavigate={onNavigate} />;
  }

  return (
    <Card sx={{ minHeight: 180 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {payload.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Updated {new Date(payload.meta.generated_at).toLocaleTimeString()}
          </Typography>
        </Stack>

        <WidgetDataView payload={payload} onNavigate={onNavigate} />

        {canPage && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} of {total}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                  Previous
                </Button>
                <Button
                  size="small"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { setPageTitle } = useNavigation();
  const [types, setTypes] = useState<DashboardTypeDescriptor[]>([]);
  const [activeType, setActiveType] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState(dateInputValue(new Date(new Date().setMonth(new Date().getMonth() - 6))));
  const [to, setTo] = useState(dateInputValue(new Date()));
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setPageTitle('Dashboard');
  }, [setPageTitle]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    dashboardApi
      .listTypes()
      .then((items) => {
        if (!mounted) return;
        const normalized = Array.isArray(items) ? (items as DashboardTypeDescriptor[]) : [];
        setTypes(normalized);
        setActiveType((current) => current || normalized[0]?.key || null);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load dashboard types');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const layouts = useMemo(() => {
    if (!activeType) {
      return [];
    }
    return DASHBOARD_LAYOUTS[activeType] || [];
  }, [activeType]);

  const handleNavigate = (route: string) => {
    navigate(`/app${route}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!activeType || types.length === 0) {
    return <Alert severity="warning">No dashboard is available for your account.</Alert>;
  }

  const activeDescriptor = types.find((item) => item.key === activeType);

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.5}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {activeDescriptor?.label ?? 'Dashboard'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeDescriptor?.description}
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setRefreshToken((value) => value + 1)}>
              Refresh Widgets
            </Button>
          </Stack>

          <Tabs
            value={activeType}
            onChange={(_, value) => setActiveType(value as DashboardType)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {types.map((item) => (
              <Tab key={item.key} label={item.label} value={item.key} />
            ))}
          </Tabs>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="From"
              type="date"
              size="small"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: { xs: '100%', md: 190 } }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: { xs: '100%', md: 190 } }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {layouts.map((widget) => (
          <Grid key={widget.key} item xs={12} md={widget.size}>
            <WidgetPanel
              dashboardType={activeType}
              widget={widget}
              from={from}
              to={to}
              refreshToken={refreshToken}
              onNavigate={handleNavigate}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
