import http from 'http';
import https from 'https';
import { URL } from 'url';
import { config } from '../config/env.js';
import { ReportRepository, ReportCatalogRow, ReportParameterRow } from '../repositories/report.js';
import { RoleRepository } from '../repositories/role.js';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';

type ReportFormat = 'pdf' | 'xlsx' | 'docx';

export interface ReportParameterDefinition {
  report_parameter_id: number;
  parameter_name: string;
  display_name: string;
  data_type_code: string;
  control_type_code: string;
  lookup_table: string | null;
  default_value: string | null;
  is_required: boolean;
  display_order: number;
}

export interface ReportDefinitionViewModel {
  report: {
    report_id: number;
    report_code: string;
    report_name: string;
    description: string | null;
    category_name: string | null;
    report_type_name: string | null;
    requires_parameter: boolean;
    default_export_format: string | null;
    paper_size: string | null;
    page_orientation: string | null;
  };
  parameters: ReportParameterDefinition[];
}

export interface GenerateReportInput {
  parameters?: Record<string, unknown>;
  format?: string;
}

export interface GeneratedReportResult {
  data: Buffer;
  contentType: string;
  fileName: string;
  reportHistoryId: number;
  executionTimeMs: number;
}

interface RenderServiceResponse {
  data: Buffer;
  contentType: string;
}

export class ReportService {
  private reportRepository = new ReportRepository();
  private roleRepository = new RoleRepository();

  async listReports(accountId: number): Promise<ReportCatalogRow[]> {
    return this.reportRepository.findAccessibleCatalog(accountId);
  }

  async getReportDefinition(reportCode: string, accountId: number): Promise<ReportDefinitionViewModel> {
    const report = await this.getAccessibleReport(reportCode, accountId);
    const parameters = await this.reportRepository.findParametersByReportId(report.report_id);

    return {
      report: {
        report_id: report.report_id,
        report_code: report.report_code,
        report_name: report.report_name,
        description: report.description,
        category_name: report.category_name,
        report_type_name: report.report_type_name,
        requires_parameter: report.requires_parameter,
        default_export_format: report.default_export_format,
        paper_size: report.paper_size,
        page_orientation: report.page_orientation,
      },
      parameters: parameters.map((parameter) => this.toParameterDefinition(parameter)),
    };
  }

  async generateReport(
    reportCode: string,
    accountId: number,
    input: GenerateReportInput
  ): Promise<GeneratedReportResult> {
    const report = await this.getAccessibleReport(reportCode, accountId);
    const parameters = await this.reportRepository.findParametersByReportId(report.report_id);
    const parameterValues = input.parameters || {};

    this.validateRequiredParameters(parameters, parameterValues);

    const normalizedFormat = this.normalizeFormat(input.format, report.default_export_format);
    const extension = this.extensionByFormat(normalizedFormat);
    const generatedFileName = `${report.report_code.toLowerCase()}_${Date.now()}.${extension}`;
    const reportPath = report.jrxml_report_path || report.report_file;

    if (!reportPath) {
      throw new ValidationError('Report is not configured with a JRXML path');
    }

    const runningStatusLookupId = await this.reportRepository.findReportStatusLookupId('RUNNING');
    const reportHistoryId = await this.reportRepository.createHistoryEntry(
      report.report_id,
      accountId,
      parameterValues,
      runningStatusLookupId
    );

    const startedAt = Date.now();

    try {
      const payload = {
        reportPath,
        parameters: parameterValues,
        format: normalizedFormat,
        paperSize: report.paper_size,
        pageOrientation: report.page_orientation,
      };

      const endpoint = this.resolveRenderEndpoint(report.report_service_endpoint);
      const rendered = await this.callRenderService(endpoint, payload);
      const executionTimeMs = Date.now() - startedAt;
      const successStatusLookupId = await this.reportRepository.findReportStatusLookupId('SUCCESS');

      await this.reportRepository.updateHistoryEntry(
        reportHistoryId,
        successStatusLookupId,
        executionTimeMs,
        generatedFileName
      );

      return {
        data: rendered.data,
        contentType: rendered.contentType,
        fileName: generatedFileName,
        reportHistoryId,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startedAt;
      const failedStatusLookupId = await this.reportRepository.findReportStatusLookupId('FAILED');

      await this.reportRepository.updateHistoryEntry(
        reportHistoryId,
        failedStatusLookupId,
        executionTimeMs,
        null
      );

      throw error;
    }
  }

  private async getAccessibleReport(reportCode: string, accountId: number): Promise<ReportCatalogRow> {
    const report = await this.reportRepository.findActiveByCode(reportCode);
    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const permissionCode = `REPORT_${report.report_code.toUpperCase()}`;
    const hasPermission = await this.roleRepository.hasPermission(accountId, 'Report Catalog', permissionCode);
    if (!hasPermission) {
      throw new ForbiddenError(`Missing permission Report Catalog:${permissionCode}`);
    }

    return report;
  }

  private toParameterDefinition(parameter: ReportParameterRow): ReportParameterDefinition {
    return {
      report_parameter_id: parameter.report_parameter_id,
      parameter_name: parameter.parameter_name,
      display_name: parameter.display_name,
      data_type_code: parameter.data_type_code,
      control_type_code: parameter.control_type_code,
      lookup_table: parameter.lookup_table,
      default_value: parameter.default_value,
      is_required: parameter.is_required,
      display_order: parameter.display_order,
    };
  }

  private validateRequiredParameters(
    definitions: ReportParameterRow[],
    values: Record<string, unknown>
  ): void {
    const missing = definitions
      .filter((parameter) => parameter.is_required)
      .filter((parameter) => {
        const rawValue = values[parameter.parameter_name];
        if (rawValue === undefined || rawValue === null) {
          return true;
        }

        if (typeof rawValue === 'string' && rawValue.trim().length === 0) {
          return true;
        }

        return false;
      })
      .map((parameter) => parameter.display_name || parameter.parameter_name);

    if (missing.length > 0) {
      throw new ValidationError(`Missing required report parameters: ${missing.join(', ')}`);
    }
  }

  private normalizeFormat(format?: string, fallback?: string | null): ReportFormat {
    const candidate = (format || fallback || 'pdf').toLowerCase();
    if (candidate === 'pdf') {
      return 'pdf';
    }

    if (candidate === 'xlsx' || candidate === 'excel') {
      return 'xlsx';
    }

    if (candidate === 'docx' || candidate === 'doc') {
      return 'docx';
    }

    throw new ValidationError('Unsupported export format. Allowed formats are pdf, xlsx, docx');
  }

  private extensionByFormat(format: ReportFormat): string {
    if (format === 'pdf') {
      return 'pdf';
    }

    if (format === 'xlsx') {
      return 'xlsx';
    }

    return 'docx';
  }

  private resolveRenderEndpoint(reportSpecificEndpoint: string | null): string {
    if (reportSpecificEndpoint) {
      return reportSpecificEndpoint;
    }

    if (config.reporting.serviceUrl) {
      return config.reporting.serviceUrl;
    }

    const base = config.reporting.serviceBaseUrl.replace(/\/$/, '');
    const path = config.reporting.renderPath.startsWith('/')
      ? config.reporting.renderPath
      : `/${config.reporting.renderPath}`;

    return `${base}${path}`;
  }

  private async callRenderService(
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<RenderServiceResponse> {
    return new Promise((resolve, reject) => {
      const targetUrl = new URL(endpoint);
      const requestBody = JSON.stringify(payload);
      const transport = targetUrl.protocol === 'https:' ? https : http;

      const request = transport.request(
        {
          protocol: targetUrl.protocol,
          hostname: targetUrl.hostname,
          port: targetUrl.port,
          path: `${targetUrl.pathname}${targetUrl.search}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
          },
          timeout: config.reporting.timeoutMs,
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on('data', (chunk: Buffer) => chunks.push(chunk));

          response.on('end', () => {
            const bodyBuffer = Buffer.concat(chunks);
            const statusCode = response.statusCode || 500;

            if (statusCode < 200 || statusCode >= 300) {
              const bodyText = bodyBuffer.toString('utf-8');
              reject(
                new AppError(
                  502,
                  `Reporting service request failed with status ${statusCode}: ${bodyText || 'no response body'}`,
                  'REPORT_RENDER_FAILED'
                )
              );
              return;
            }

            resolve({
              data: bodyBuffer,
              contentType: response.headers['content-type'] || 'application/octet-stream',
            });
          });
        }
      );

      request.on('timeout', () => {
        request.destroy(new Error('Reporting service request timed out'));
      });

      request.on('error', (error) => {
        reject(new AppError(502, `Reporting service unavailable: ${error.message}`, 'REPORT_SERVICE_UNAVAILABLE'));
      });

      request.write(requestBody);
      request.end();
    });
  }
}