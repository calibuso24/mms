import test from 'node:test';
import assert from 'node:assert/strict';
import { DashboardService } from './dashboard.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

test('getAllowedDashboardTypes returns department dashboards from permission set', async () => {
  const service = new DashboardService() as any;

  service.roleRepository = {
    getPermissionCodesForAccount: async () => [
      'Material Request:VIEW',
      'Purchase Order:VIEW',
      'Inventory Adjustment:VIEW',
      'User Management:VIEW',
    ],
  };

  const types = await service.getAllowedDashboardTypes(1);
  const keys = types.map((type: any) => type.key).sort();

  assert.deepEqual(keys, ['administrator', 'coordinating', 'inventory', 'purchasing']);
});

test('getWidgetsForType rejects access when dashboard is not allowed', async () => {
  const service = new DashboardService() as any;

  service.roleRepository = {
    getPermissionCodesForAccount: async () => ['Dashboard:VIEW'],
  };

  await assert.rejects(
    () => service.getWidgetsForType(1, 'administrator'),
    (error: any) => {
      assert.ok(error instanceof ForbiddenError);
      return true;
    }
  );
});

test('getWidgetData validates widget key against dashboard type', async () => {
  const service = new DashboardService() as any;

  service.roleRepository = {
    getPermissionCodesForAccount: async () => ['Material Request:VIEW'],
  };

  await assert.rejects(
    () =>
      service.getWidgetData({
        accountId: 1,
        dashboardType: 'coordinating',
        widgetKey: 'not_supported',
        limit: 6,
        offset: 0,
      }),
    (error: any) => {
      assert.ok(error instanceof ValidationError);
      return true;
    }
  );
});

test('getWidgetData returns cached payload for identical key', async () => {
  const service = new DashboardService() as any;

  service.roleRepository = {
    getPermissionCodesForAccount: async () => ['Material Request:VIEW'],
  };

  let callCount = 0;
  service.dashboardRepository = {
    getWidgetData: async () => {
      callCount += 1;
      return {
        dashboard_type: 'coordinating',
        widget_key: 'active_projects',
        title: 'Active Projects',
        widget_type: 'kpi',
        data: { value: 7 },
        meta: { generated_at: new Date().toISOString() },
      };
    },
  };

  const query = {
    accountId: 1,
    dashboardType: 'coordinating',
    widgetKey: 'active_projects',
    limit: 6,
    offset: 0,
  } as const;

  const first = await service.getWidgetData(query);
  const second = await service.getWidgetData(query);

  assert.equal(first.data.value, 7);
  assert.equal(second.data.value, 7);
  assert.equal(callCount, 1);
});
