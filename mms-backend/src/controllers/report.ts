import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';
import { GenerateReportInput, ReportService } from '../services/report.js';

export class ReportController {
  private reportService = new ReportService();

  async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new UnauthorizedError();
      }

      const reports = await this.reportService.listReports(req.accountId);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }

  async getReportParameters(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new UnauthorizedError();
      }

      const { reportCode } = req.params;
      if (!reportCode) {
        throw new ValidationError('Report code is required');
      }

      const definition = await this.reportService.getReportDefinition(reportCode, req.accountId);
      res.json(definition);
    } catch (error) {
      next(error);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.accountId) {
        throw new UnauthorizedError();
      }

      const { reportCode } = req.params;
      if (!reportCode) {
        throw new ValidationError('Report code is required');
      }

      const requestBody = (req.body || {}) as GenerateReportInput;
      const result = await this.reportService.generateReport(reportCode, req.accountId, requestBody);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('X-Report-History-Id', result.reportHistoryId.toString());
      res.setHeader('X-Report-Execution-Time-Ms', result.executionTimeMs.toString());
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
}