import { PoolClient } from 'pg';
import { pool } from '../config/database.js';
import { SystemSettingCategoryCreateDto, SystemSettingCategoryUpdateDto, SystemSettingCreateDto, SystemSettingUpdateDto } from '../modules/system_settings/dtos.js';
import { SystemSettingCategoryViewModel, SystemSettingViewModel } from '../modules/system_settings/viewModels.js';
import { SystemSettingType } from '../modules/system_settings/dtos.js';

type QueryExecutor = {
  query: (text: string, params?: any[]) => Promise<any>;
};

type SystemSettingRow = {
  system_setting_id: number;
  system_setting_category_id: number;
  category_code: string;
  category_name: string;
  setting_key: string;
  setting_name: string;
  description: string | null;
  setting_type: string;
  setting_value: string | null;
  default_value: string | null;
  options_json: unknown;
  validation_rules: unknown;
  is_required: boolean;
  is_sensitive: boolean;
  display_order: number;
  is_editable: boolean;
  is_resettable: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export class SystemSettingsRepository {
  private getExecutor(client?: PoolClient): QueryExecutor {
    return client ?? pool;
  }

  async findCategories(): Promise<SystemSettingCategoryViewModel[]> {
    const result = await pool.query(
      `SELECT
        c.system_setting_category_id,
        c.category_code,
        c.category_name,
        c.description,
        c.display_order,
        c.is_visible,
        c.log_date_created AS created_at,
        c.log_date_updated AS updated_at,
        COUNT(s.system_setting_id) FILTER (WHERE s.is_deleted = false) AS setting_count
      FROM system_setting_category c
      LEFT JOIN system_setting s
        ON s.system_setting_category_id = c.system_setting_category_id
       AND s.is_deleted = false
      WHERE c.is_deleted = false
      GROUP BY c.system_setting_category_id
      ORDER BY c.display_order ASC, c.category_name ASC`
    );

    return result.rows.map((row) => ({
      system_setting_category_id: row.system_setting_category_id,
      category_code: row.category_code,
      category_name: row.category_name,
      description: row.description,
      display_order: row.display_order,
      is_visible: row.is_visible,
      setting_count: parseInt(row.setting_count ?? '0', 10),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async findCategoryByCode(categoryCode: string, client?: PoolClient): Promise<SystemSettingCategoryViewModel | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        c.system_setting_category_id,
        c.category_code,
        c.category_name,
        c.description,
        c.display_order,
        c.is_visible,
        c.log_date_created AS created_at,
        c.log_date_updated AS updated_at,
        COUNT(s.system_setting_id) FILTER (WHERE s.is_deleted = false) AS setting_count
      FROM system_setting_category c
      LEFT JOIN system_setting s
        ON s.system_setting_category_id = c.system_setting_category_id
       AND s.is_deleted = false
      WHERE c.category_code = $1
        AND c.is_deleted = false
      GROUP BY c.system_setting_category_id
      LIMIT 1`,
      [categoryCode]
    );

    return result.rows[0]
      ? {
          ...result.rows[0],
          setting_count: parseInt(result.rows[0].setting_count ?? '0', 10),
        }
      : null;
  }

  async findCategoryById(categoryId: number, client?: PoolClient): Promise<SystemSettingCategoryViewModel | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        c.system_setting_category_id,
        c.category_code,
        c.category_name,
        c.description,
        c.display_order,
        c.is_visible,
        c.log_date_created AS created_at,
        c.log_date_updated AS updated_at,
        COUNT(s.system_setting_id) FILTER (WHERE s.is_deleted = false) AS setting_count
      FROM system_setting_category c
      LEFT JOIN system_setting s
        ON s.system_setting_category_id = c.system_setting_category_id
       AND s.is_deleted = false
      WHERE c.system_setting_category_id = $1
        AND c.is_deleted = false
      GROUP BY c.system_setting_category_id
      LIMIT 1`,
      [categoryId]
    );

    return result.rows[0]
      ? {
          ...result.rows[0],
          setting_count: parseInt(result.rows[0].setting_count ?? '0', 10),
        }
      : null;
  }

  async findSettingsByCategoryCode(categoryCode: string, client?: PoolClient): Promise<SystemSettingViewModel[]> {
    const result = await this.getExecutor(client).query(
      `SELECT
        s.system_setting_id,
        s.system_setting_category_id,
        c.category_code,
        c.category_name,
        s.setting_key,
        s.setting_name,
        s.description,
        s.setting_type,
        s.setting_value,
        s.default_value,
        s.options_json,
        s.validation_rules,
        s.is_required,
        s.is_sensitive,
        s.display_order,
        s.is_editable,
        s.is_resettable,
        s.log_date_created AS created_at,
        s.log_date_updated AS updated_at
      FROM system_setting s
      JOIN system_setting_category c
        ON c.system_setting_category_id = s.system_setting_category_id
      WHERE c.category_code = $1
        AND c.is_deleted = false
        AND s.is_deleted = false
      ORDER BY s.display_order ASC, s.setting_name ASC`,
      [categoryCode]
    );

    return result.rows.map((row: SystemSettingRow) => this.mapSettingRow(row));
  }

  async findSettingById(settingId: number, client?: PoolClient): Promise<SystemSettingViewModel | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        s.system_setting_id,
        s.system_setting_category_id,
        c.category_code,
        c.category_name,
        s.setting_key,
        s.setting_name,
        s.description,
        s.setting_type,
        s.setting_value,
        s.default_value,
        s.options_json,
        s.validation_rules,
        s.is_required,
        s.is_sensitive,
        s.display_order,
        s.is_editable,
        s.is_resettable,
        s.log_date_created AS created_at,
        s.log_date_updated AS updated_at
      FROM system_setting s
      JOIN system_setting_category c
        ON c.system_setting_category_id = s.system_setting_category_id
      WHERE s.system_setting_id = $1
        AND s.is_deleted = false
        AND c.is_deleted = false
      LIMIT 1`,
      [settingId]
    );

    return result.rows[0] ? this.mapSettingRow(result.rows[0]) : null;
  }

  async findSettingByCategoryAndKey(
    categoryId: number,
    settingKey: string,
    client?: PoolClient
  ): Promise<SystemSettingViewModel | null> {
    const result = await this.getExecutor(client).query(
      `SELECT
        s.system_setting_id,
        s.system_setting_category_id,
        c.category_code,
        c.category_name,
        s.setting_key,
        s.setting_name,
        s.description,
        s.setting_type,
        s.setting_value,
        s.default_value,
        s.options_json,
        s.validation_rules,
        s.is_required,
        s.is_sensitive,
        s.display_order,
        s.is_editable,
        s.is_resettable,
        s.log_date_created AS created_at,
        s.log_date_updated AS updated_at
      FROM system_setting s
      JOIN system_setting_category c
        ON c.system_setting_category_id = s.system_setting_category_id
      WHERE s.system_setting_category_id = $1
        AND s.setting_key = $2
        AND s.is_deleted = false
        AND c.is_deleted = false
      LIMIT 1`,
      [categoryId, settingKey]
    );

    return result.rows[0] ? this.mapSettingRow(result.rows[0]) : null;
  }

  async createCategory(
    dto: SystemSettingCategoryCreateDto,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<SystemSettingCategoryViewModel> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO system_setting_category (
        category_code,
        category_name,
        description,
        display_order,
        is_visible,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'system_settings')
      RETURNING *`,
      [
        dto.category_code,
        dto.category_name,
        dto.description ?? null,
        dto.display_order ?? 0,
        dto.is_visible ?? true,
        createdByAccountId,
      ]
    );

    const row = result.rows[0];
    return {
      system_setting_category_id: row.system_setting_category_id,
      category_code: row.category_code,
      category_name: row.category_name,
      description: row.description,
      display_order: row.display_order,
      is_visible: row.is_visible,
      setting_count: 0,
      created_at: row.log_date_created,
      updated_at: row.log_date_updated,
    };
  }

  async updateCategory(
    categoryId: number,
    dto: SystemSettingCategoryUpdateDto,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<SystemSettingCategoryViewModel> {
    const sets: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.category_name !== undefined) {
      sets.push(`category_name = $${paramIndex++}`);
      params.push(dto.category_name);
    }
    if (dto.description !== undefined) {
      sets.push(`description = $${paramIndex++}`);
      params.push(dto.description);
    }
    if (dto.display_order !== undefined) {
      sets.push(`display_order = $${paramIndex++}`);
      params.push(dto.display_order);
    }
    if (dto.is_visible !== undefined) {
      sets.push(`is_visible = $${paramIndex++}`);
      params.push(dto.is_visible);
    }

    sets.push(`log_date_updated = NOW()`);
    sets.push(`log_updated_by_account_id = $${paramIndex++}`);
    params.push(updatedByAccountId);
    params.push(categoryId);

    const result = await this.getExecutor(client).query(
      `UPDATE system_setting_category
       SET ${sets.join(', ')}
       WHERE system_setting_category_id = $${paramIndex}
         AND is_deleted = false
       RETURNING *`,
      params
    );

    const row = result.rows[0];
    return {
      system_setting_category_id: row.system_setting_category_id,
      category_code: row.category_code,
      category_name: row.category_name,
      description: row.description,
      display_order: row.display_order,
      is_visible: row.is_visible,
      setting_count: 0,
      created_at: row.log_date_created,
      updated_at: row.log_date_updated,
    };
  }

  async softDeleteCategory(categoryId: number, deletedByAccountId: number | null = null, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE system_setting_category
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $1,
           log_module_updated = 'system_settings'
       WHERE system_setting_category_id = $2`,
      [deletedByAccountId, categoryId]
    );
  }

  async createSetting(
    categoryId: number,
    dto: SystemSettingCreateDto,
    createdByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<SystemSettingViewModel> {
    const result = await this.getExecutor(client).query(
      `INSERT INTO system_setting (
        system_setting_category_id,
        setting_key,
        setting_name,
        description,
        setting_type,
        setting_value,
        default_value,
        options_json,
        validation_rules,
        is_required,
        is_sensitive,
        display_order,
        is_editable,
        is_resettable,
        log_date_created,
        log_created_by_account_id,
        log_module_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, NOW(), $15, 'system_settings')
      RETURNING *`,
      [
        categoryId,
        dto.setting_key,
        dto.setting_name,
        dto.description ?? null,
        dto.setting_type,
        dto.setting_value === undefined ? null : this.coerceValue(dto.setting_value),
        dto.default_value === undefined ? null : this.coerceValue(dto.default_value),
        JSON.stringify(dto.options ?? []),
        JSON.stringify(dto.validation_rules ?? {}),
        dto.is_required ?? false,
        dto.is_sensitive ?? false,
        dto.display_order ?? 0,
        dto.is_editable ?? true,
        dto.is_resettable ?? true,
        createdByAccountId,
      ]
    );

    const row = result.rows[0];
    const category = await this.findCategoryById(categoryId, client);
    return this.mapSettingRow({
      ...row,
      category_code: category?.category_code ?? '',
      category_name: category?.category_name ?? '',
    });
  }

  async updateSetting(
    settingId: number,
    dto: SystemSettingUpdateDto,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<SystemSettingViewModel> {
    const sets: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.setting_key !== undefined) {
      sets.push(`setting_key = $${paramIndex++}`);
      params.push(dto.setting_key);
    }
    if (dto.setting_name !== undefined) {
      sets.push(`setting_name = $${paramIndex++}`);
      params.push(dto.setting_name);
    }
    if (dto.description !== undefined) {
      sets.push(`description = $${paramIndex++}`);
      params.push(dto.description);
    }
    if (dto.setting_type !== undefined) {
      sets.push(`setting_type = $${paramIndex++}`);
      params.push(dto.setting_type);
    }
    if (dto.setting_value !== undefined) {
      sets.push(`setting_value = $${paramIndex++}`);
      params.push(dto.setting_value === null ? null : this.coerceValue(dto.setting_value));
    }
    if (dto.default_value !== undefined) {
      sets.push(`default_value = $${paramIndex++}`);
      params.push(dto.default_value === null ? null : this.coerceValue(dto.default_value));
    }
    if (dto.options !== undefined) {
      sets.push(`options_json = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(dto.options));
    }
    if (dto.validation_rules !== undefined) {
      sets.push(`validation_rules = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(dto.validation_rules));
    }
    if (dto.is_required !== undefined) {
      sets.push(`is_required = $${paramIndex++}`);
      params.push(dto.is_required);
    }
    if (dto.is_sensitive !== undefined) {
      sets.push(`is_sensitive = $${paramIndex++}`);
      params.push(dto.is_sensitive);
    }
    if (dto.display_order !== undefined) {
      sets.push(`display_order = $${paramIndex++}`);
      params.push(dto.display_order);
    }
    if (dto.is_editable !== undefined) {
      sets.push(`is_editable = $${paramIndex++}`);
      params.push(dto.is_editable);
    }
    if (dto.is_resettable !== undefined) {
      sets.push(`is_resettable = $${paramIndex++}`);
      params.push(dto.is_resettable);
    }

    sets.push(`log_date_updated = NOW()`);
    sets.push(`log_updated_by_account_id = $${paramIndex++}`);
    params.push(updatedByAccountId);
    params.push(settingId);

    const result = await this.getExecutor(client).query(
      `UPDATE system_setting
       SET ${sets.join(', ')}
       WHERE system_setting_id = $${paramIndex}
         AND is_deleted = false
       RETURNING *`,
      params
    );

    return this.findSettingById(settingId, client).then((setting) => {
      if (!setting) {
        throw new Error('System setting not found');
      }
      return setting;
    });
  }

  async softDeleteSetting(settingId: number, deletedByAccountId: number | null = null, client?: PoolClient): Promise<void> {
    await this.getExecutor(client).query(
      `UPDATE system_setting
       SET is_deleted = true,
           log_date_deleted = NOW(),
           log_deleted_by_account_id = $1,
           log_module_updated = 'system_settings'
       WHERE system_setting_id = $2`,
      [deletedByAccountId, settingId]
    );
  }

  async resetCategorySettings(categoryId: number, updatedByAccountId: number | null = null, client?: PoolClient): Promise<SystemSettingViewModel[]> {
    const result = await this.getExecutor(client).query(
      `UPDATE system_setting
       SET setting_value = default_value,
           log_date_updated = NOW(),
           log_updated_by_account_id = $1,
           log_module_updated = 'system_settings'
       WHERE system_setting_category_id = $2
         AND is_deleted = false
         AND is_resettable = true
       RETURNING system_setting_id`,
      [updatedByAccountId, categoryId]
    );

    const settingIds = result.rows.map((row: { system_setting_id: number }) => row.system_setting_id);
    if (settingIds.length === 0) {
      return [];
    }

    const rows = await Promise.all(settingIds.map((settingId: number) => this.findSettingById(settingId, client)));
    return rows.filter((row): row is SystemSettingViewModel => !!row);
  }

  async updateSettingValuesInCategory(
    categoryId: number,
    updates: Array<{ system_setting_id: number; setting_value?: unknown; default_value?: unknown }>,
    updatedByAccountId: number | null = null,
    client?: PoolClient
  ): Promise<void> {
    for (const update of updates) {
      const setting = await this.findSettingById(update.system_setting_id, client);
      if (!setting || setting.system_setting_category_id !== categoryId) {
        continue;
      }

      const params: any[] = [
        update.setting_value === undefined ? setting.setting_value : this.coerceValue(update.setting_value),
        updatedByAccountId,
        update.system_setting_id,
      ];

      await this.getExecutor(client).query(
        `UPDATE system_setting
         SET setting_value = $1,
             log_date_updated = NOW(),
             log_updated_by_account_id = $2,
             log_module_updated = 'system_settings'
         WHERE system_setting_id = $3
           AND is_deleted = false`,
        params
      );
    }
  }

  private mapSettingRow(row: SystemSettingRow): SystemSettingViewModel {
    return {
      system_setting_id: row.system_setting_id,
      system_setting_category_id: row.system_setting_category_id,
      category_code: row.category_code,
      category_name: row.category_name,
      setting_key: row.setting_key,
      setting_name: row.setting_name,
      description: row.description,
      setting_type: row.setting_type as SystemSettingType,
      setting_value: row.setting_value,
      default_value: row.default_value,
      options: this.parseJsonArray(row.options_json),
      validation_rules: this.parseJsonObject(row.validation_rules),
      is_required: row.is_required,
      is_sensitive: row.is_sensitive,
      display_order: row.display_order,
      is_editable: row.is_editable,
      is_resettable: row.is_resettable,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private coerceValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private parseJsonArray(value: unknown): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private parseJsonObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }
}
