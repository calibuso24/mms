import { pool } from '../config/database.js';

export interface ReportCatalogRow {
  report_id: number;
  report_code: string;
  report_name: string;
  description: string | null;
  report_url: string | null;
  report_file: string | null;
  jrxml_report_path: string | null;
  paper_size: string | null;
  page_orientation: string | null;
  default_export_format: string | null;
  report_service_endpoint: string | null;
  requires_parameter: boolean;
  is_active: boolean;
  category_name: string | null;
  report_type_name: string | null;
}

export interface ReportParameterRow {
  report_parameter_id: number;
  report_id: number;
  parameter_name: string;
  display_name: string;
  data_type_lookup_id: number;
  control_type_lookup_id: number;
  data_type_code: string;
  control_type_code: string;
  lookup_table: string | null;
  default_value: string | null;
  is_required: boolean;
  display_order: number;
}

export class ReportRepository {
  async findAccessibleCatalog(accountId: number): Promise<ReportCatalogRow[]> {
    const query = `
      SELECT
        rc.report_id,
        rc.report_code,
        rc.report_name,
        rc.description,
        rc.report_url,
        rc.report_file,
        rc.jrxml_report_path,
        rc.paper_size,
        rc.page_orientation,
        rc.default_export_format,
        rc.report_service_endpoint,
        rc.requires_parameter,
        rc.is_active,
        category_lu.name AS category_name,
        type_lu.name AS report_type_name
      FROM report_catalog rc
      LEFT JOIN look_up category_lu ON category_lu.look_up_id = rc.report_category_lookup_id
      LEFT JOIN look_up type_lu ON type_lu.look_up_id = rc.report_type_lookup_id
      WHERE rc.is_deleted = FALSE
        AND rc.is_active = TRUE
        AND EXISTS (
          SELECT 1
          FROM account a
          JOIN account_role ar ON ar.account_id = a.account_id
          JOIN role r ON r.role_id = ar.role_id
          JOIN role_permission rp ON rp.role_id = r.role_id
          JOIN permission p ON p.permission_id = rp.permission_id
          WHERE a.account_id = $1
            AND a.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND p.is_deleted = FALSE
            AND p.module_name = 'Report Catalog'
            AND p.permission_code = 'REPORT_' || rc.report_code
        )
      ORDER BY rc.display_order ASC, rc.report_name ASC
    `;

    const result = await pool.query(query, [accountId]);
    return result.rows;
  }

  async findActiveByCode(reportCode: string): Promise<ReportCatalogRow | null> {
    const query = `
      SELECT
        rc.report_id,
        rc.report_code,
        rc.report_name,
        rc.description,
        rc.report_url,
        rc.report_file,
        rc.jrxml_report_path,
        rc.paper_size,
        rc.page_orientation,
        rc.default_export_format,
        rc.report_service_endpoint,
        rc.requires_parameter,
        rc.is_active,
        category_lu.name AS category_name,
        type_lu.name AS report_type_name
      FROM report_catalog rc
      LEFT JOIN look_up category_lu ON category_lu.look_up_id = rc.report_category_lookup_id
      LEFT JOIN look_up type_lu ON type_lu.look_up_id = rc.report_type_lookup_id
      WHERE LOWER(rc.report_code) = LOWER($1)
        AND rc.is_deleted = FALSE
        AND rc.is_active = TRUE
      LIMIT 1
    `;

    const result = await pool.query(query, [reportCode]);
    return result.rows[0] || null;
  }

  async findParametersByReportId(reportId: number): Promise<ReportParameterRow[]> {
    const query = `
      SELECT
        rp.report_parameter_id,
        rp.report_id,
        rp.parameter_name,
        rp.display_name,
        rp.data_type_lookup_id,
        rp.control_type_lookup_id,
        data_type_lu.code AS data_type_code,
        control_type_lu.code AS control_type_code,
        rp.lookup_table,
        rp.default_value,
        rp.is_required,
        rp.display_order
      FROM report_parameter rp
      JOIN look_up data_type_lu ON data_type_lu.look_up_id = rp.data_type_lookup_id
      JOIN look_up control_type_lu ON control_type_lu.look_up_id = rp.control_type_lookup_id
      WHERE rp.report_id = $1
        AND rp.is_deleted = FALSE
      ORDER BY rp.display_order ASC, rp.parameter_name ASC
    `;

    const result = await pool.query(query, [reportId]);
    return result.rows;
  }

  async findReportStatusLookupId(statusCode: string): Promise<number | null> {
    const query = `
      SELECT look_up_id
      FROM look_up
      WHERE look_up_type = 'REPORT_STATUS'
        AND UPPER(code) = UPPER($1)
        AND is_deleted = FALSE
      LIMIT 1
    `;

    const result = await pool.query(query, [statusCode]);
    return result.rows[0]?.look_up_id || null;
  }

  async createHistoryEntry(
    reportId: number,
    accountId: number,
    parameters: Record<string, unknown>,
    statusLookupId: number | null
  ): Promise<number> {
    const query = `
      INSERT INTO report_history (
        report_id,
        account_id,
        parameters,
        status_lookup_id
      ) VALUES ($1, $2, $3::jsonb, $4)
      RETURNING report_history_id
    `;

    const result = await pool.query(query, [reportId, accountId, JSON.stringify(parameters || {}), statusLookupId]);
    return result.rows[0].report_history_id;
  }

  async updateHistoryEntry(
    reportHistoryId: number,
    statusLookupId: number | null,
    executionTimeMs: number,
    generatedFile: string | null
  ): Promise<void> {
    const query = `
      UPDATE report_history
      SET
        status_lookup_id = $2,
        execution_time_ms = $3,
        generated_file = $4
      WHERE report_history_id = $1
    `;

    await pool.query(query, [reportHistoryId, statusLookupId, executionTimeMs, generatedFile]);
  }
}