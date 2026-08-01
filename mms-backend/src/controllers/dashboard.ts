import { NextFunction, Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.js';
import { DashboardType, DashboardWidgetQuery } from '../modules/dashboard/types.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

const DASHBOARD_TYPES = new Set<DashboardType>([
  'coordinating',
  'purchasing',
  'inventory',
  'administrator',
]);

export class DashboardController {
  private dashboardService = new DashboardService();

  async listDashboardTypes(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new UnauthorizedError();
      }

      const types = await this.dashboardService.getAllowedDashboardTypes(req.accountId);
      res.json(types);
    } catch (error) {
      next(error);
    }
  }

  async listWidgets(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new UnauthorizedError();
      }

      const dashboardType = this.parseDashboardType(req.params.dashboardType);
      const widgets = await this.dashboardService.getWidgetsForType(req.accountId, dashboardType);
      res.json(widgets);
    } catch (error) {
      next(error);
    }
  }

  async getWidgetData(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new UnauthorizedError();
      }

      const dashboardType = this.parseDashboardType(req.params.dashboardType);
      const widgetKey = (req.params.widgetKey || '').trim();
      if (!widgetKey) {
        throw new ValidationError('widgetKey is required');
      }

      const limit = this.parseQueryInt(req.query.limit as string | undefined, 6, 1, 50);
      const offset = this.parseQueryInt(req.query.offset as string | undefined, 0, 0, 10000);
      const fromDate = this.parseOptionalDate(req.query.from as string | undefined);
      const toDate = this.parseOptionalDate(req.query.to as string | undefined);

      const query: DashboardWidgetQuery = {
        accountId: req.accountId,
        dashboardType,
        widgetKey,
        limit,
        offset,
        fromDate,
        toDate,
      };

      const payload = await this.dashboardService.getWidgetData(query);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  }

  private parseDashboardType(rawValue: string): DashboardType {
    const normalized = (rawValue || '').toLowerCase() as DashboardType;
    if (!DASHBOARD_TYPES.has(normalized)) {
      throw new ValidationError(`Unsupported dashboardType: ${rawValue}`);
    }
    return normalized;
  }

  private parseQueryInt(rawValue: string | undefined, fallback: number, min: number, max: number): number {
    if (!rawValue) {
      return fallback;
    }

    const value = parseInt(rawValue, 10);
    if (Number.isNaN(value)) {
      return fallback;
    }

    return Math.max(min, Math.min(max, value));
  }

  private parseOptionalDate(rawValue: string | undefined): string | undefined {
    if (!rawValue) {
      return undefined;
    }

    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError(`Invalid date value: ${rawValue}`);
    }

    return parsed.toISOString();
  }
}
