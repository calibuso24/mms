import { Request, Response, NextFunction } from 'express';
import { NavigationService } from '../services/navigation.js';

export class NavigationController {
  private navigationService = new NavigationService();

  async getMainNavigation(req: Request, res: Response, next: NextFunction) {
    try {
      const navigation = await this.navigationService.getMainNavigation(req.accountId);
      res.json(navigation);
    } catch (error) {
      next(error);
    }
  }

  async getReportsNavigation(req: Request, res: Response, next: NextFunction) {
    try {
      const navigation = await this.navigationService.getReportsNavigation(req.accountId);
      res.json(navigation);
    } catch (error) {
      next(error);
    }
  }

  async getNavigationByContext(req: Request, res: Response, next: NextFunction) {
    try {
      const { context } = req.params;
      if (!context) {
        return res.status(400).json({ error: { message: 'Context is required' } });
      }

      const navigation = await this.navigationService.getNavigationByContext(
        context.toUpperCase(),
        req.accountId
      );
      res.json(navigation);
    } catch (error) {
      next(error);
    }
  }

  async getReportCatalogSidebar(req: Request, res: Response, next: NextFunction) {
    try {
      const reportGroups = await this.navigationService.getReportCatalogSidebar(req.accountId);
      res.json(reportGroups);
    } catch (error) {
      next(error);
    }
  }
}
