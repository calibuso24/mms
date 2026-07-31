import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import {
  SystemSettingBulkUpdateItemDto,
  SystemSettingCategoryCreateDto,
  SystemSettingCategoryUpdateDto,
  SystemSettingCreateDto,
  SystemSettingUpdateDto,
} from '../modules/system_settings/dtos.js';
import {
  SystemSettingCategoryDetailViewModel,
  SystemSettingCategoryViewModel,
  SystemSettingViewModel,
} from '../modules/system_settings/viewModels.js';
import {
  validateBulkUpdateSettings,
  validateCreateCategory,
  validateCreateSetting,
  validateUpdateCategory,
  validateUpdateSetting,
} from '../modules/system_settings/validators.js';
import { SystemSettingsRepository } from '../repositories/systemSettings.js';

const ALLOWED_SETTING_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'boolean',
  'select',
  'multi_select',
  'email',
  'url',
  'color',
  'date',
  'time',
  'file',
]);

export class SystemSettingsService {
  private systemSettingsRepository = new SystemSettingsRepository();
  private auditLogRepository = new AuditLogRepository();

  async listCategories(): Promise<SystemSettingCategoryViewModel[]> {
    return this.systemSettingsRepository.findCategories();
  }

  async getCategory(categoryCode: string): Promise<SystemSettingCategoryDetailViewModel> {
    const category = await this.systemSettingsRepository.findCategoryByCode(categoryCode);
    if (!category) {
      throw new NotFoundError('System setting category not found');
    }

    const settings = await this.systemSettingsRepository.findSettingsByCategoryCode(categoryCode);
    return {
      ...category,
      settings,
    };
  }

  async getCategorySettings(categoryCode: string): Promise<SystemSettingViewModel[]> {
    const category = await this.systemSettingsRepository.findCategoryByCode(categoryCode);
    if (!category) {
      throw new NotFoundError('System setting category not found');
    }

    return this.systemSettingsRepository.findSettingsByCategoryCode(categoryCode);
  }

  async createCategory(dto: SystemSettingCategoryCreateDto, createdByAccountId?: number): Promise<SystemSettingCategoryViewModel> {
    const payload = validateCreateCategory(dto) as SystemSettingCategoryCreateDto;
    const existing = await this.systemSettingsRepository.findCategoryByCode(payload.category_code);
    if (existing) {
      throw new ConflictError('Category code already exists');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      const category = await this.systemSettingsRepository.createCategory(
        payload,
        createdByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'system_setting_category',
          entityId: category.system_setting_category_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            category_code: payload.category_code,
            category_name: payload.category_name,
            description: payload.description ?? null,
            display_order: payload.display_order ?? 0,
            is_visible: payload.is_visible ?? true,
          },
          transactionId,
          notes: `Created system setting category ${payload.category_code}`,
          moduleName: 'system_settings',
        },
        client
      );

      await client.query('COMMIT');
      return category;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCategory(
    categoryId: number,
    dto: SystemSettingCategoryUpdateDto,
    updatedByAccountId?: number
  ): Promise<SystemSettingCategoryViewModel> {
    const payload = validateUpdateCategory(dto) as SystemSettingCategoryUpdateDto;
    const existing = await this.systemSettingsRepository.findCategoryById(categoryId);
    if (!existing) {
      throw new NotFoundError('System setting category not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      const category = await this.systemSettingsRepository.updateCategory(
        categoryId,
        payload,
        updatedByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'system_setting_category',
          entityId: categoryId,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: {
            previous_value: existing,
            new_value: category,
          },
          transactionId,
          notes: `Updated system setting category ${existing.category_code}`,
          moduleName: 'system_settings',
        },
        client
      );

      await client.query('COMMIT');
      return category;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteCategory(categoryId: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.systemSettingsRepository.findCategoryById(categoryId);
    if (!existing) {
      throw new NotFoundError('System setting category not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      await this.systemSettingsRepository.softDeleteCategory(categoryId, deletedByAccountId ?? null, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'system_setting_category',
          entityId: categoryId,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: { previous_value: existing, new_value: { is_deleted: true } },
          transactionId,
          notes: `Soft deleted system setting category ${existing.category_code}`,
          moduleName: 'system_settings',
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createSetting(
    categoryCode: string,
    dto: SystemSettingCreateDto,
    createdByAccountId?: number
  ): Promise<SystemSettingViewModel> {
    const payload = validateCreateSetting(dto) as SystemSettingCreateDto;
    const category = await this.systemSettingsRepository.findCategoryByCode(categoryCode);
    if (!category) {
      throw new NotFoundError('System setting category not found');
    }

    if (!ALLOWED_SETTING_TYPES.has(payload.setting_type)) {
      throw new ValidationError('Invalid setting type');
    }

    const existing = await this.systemSettingsRepository.findSettingByCategoryAndKey(
      category.system_setting_category_id,
      payload.setting_key
    );
    if (existing) {
      throw new ConflictError('Setting key already exists in this category');
    }

    this.validateSettingValue(
      payload.setting_type,
      payload.setting_value,
      payload.options,
      payload.validation_rules,
      payload.is_required ?? false
    );
    this.validateSettingValue(
      payload.setting_type,
      payload.default_value,
      payload.options,
      payload.validation_rules,
      payload.is_required ?? false
    );

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      const setting = await this.systemSettingsRepository.createSetting(
        category.system_setting_category_id,
        payload,
        createdByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'system_setting',
          entityId: setting.system_setting_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            category_code: categoryCode,
            setting_key: payload.setting_key,
            setting_name: payload.setting_name,
            new_value: setting.setting_value,
            default_value: setting.default_value,
          },
          transactionId,
          notes: `Created setting ${payload.setting_key} in ${categoryCode}`,
          moduleName: 'system_settings',
        },
        client
      );

      await client.query('COMMIT');
      return setting;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSetting(settingId: number, dto: SystemSettingUpdateDto, updatedByAccountId?: number): Promise<SystemSettingViewModel> {
    const payload = validateUpdateSetting(dto) as SystemSettingUpdateDto;
    const existing = await this.systemSettingsRepository.findSettingById(settingId);
    if (!existing) {
      throw new NotFoundError('System setting not found');
    }

    const nextType = payload.setting_type ?? existing.setting_type;
    if (!ALLOWED_SETTING_TYPES.has(nextType)) {
      throw new ValidationError('Invalid setting type');
    }

    this.validateSettingValue(
      nextType,
      payload.setting_value ?? existing.setting_value,
      payload.options ?? existing.options,
      payload.validation_rules ?? existing.validation_rules,
      payload.is_required ?? existing.is_required
    );
    this.validateSettingValue(
      nextType,
      payload.default_value ?? existing.default_value,
      payload.options ?? existing.options,
      payload.validation_rules ?? existing.validation_rules,
      payload.is_required ?? existing.is_required
    );

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      const setting = await this.systemSettingsRepository.updateSetting(
        settingId,
        payload,
        updatedByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'system_setting',
          entityId: settingId,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: {
            previous_value: existing,
            new_value: setting,
          },
          transactionId,
          notes: `Updated setting ${existing.setting_key}`,
          moduleName: 'system_settings',
        },
        client
      );

      await client.query('COMMIT');
      return setting;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSetting(settingId: number, deletedByAccountId?: number): Promise<void> {
    const existing = await this.systemSettingsRepository.findSettingById(settingId);
    if (!existing) {
      throw new NotFoundError('System setting not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      await this.systemSettingsRepository.softDeleteSetting(settingId, deletedByAccountId ?? null, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'system_setting',
          entityId: settingId,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            previous_value: existing,
            new_value: { is_deleted: true },
          },
          transactionId,
          notes: `Soft deleted setting ${existing.setting_key}`,
          moduleName: 'system_settings',
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async saveCategorySettings(
    categoryCode: string,
    settings: SystemSettingBulkUpdateItemDto[],
    updatedByAccountId?: number
  ): Promise<SystemSettingViewModel[]> {
    const payload = validateBulkUpdateSettings({ settings }) as { settings: SystemSettingBulkUpdateItemDto[] };
    const category = await this.systemSettingsRepository.findCategoryByCode(categoryCode);
    if (!category) {
      throw new NotFoundError('System setting category not found');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();
    const updatedSettings: SystemSettingViewModel[] = [];

    try {
      await client.query('BEGIN');

      for (const item of payload.settings) {
        const current = await this.systemSettingsRepository.findSettingById(item.system_setting_id, client);
        if (!current || current.system_setting_category_id !== category.system_setting_category_id) {
          throw new NotFoundError(`Setting ${item.system_setting_id} not found in ${categoryCode}`);
        }

        const nextType = current.setting_type;
        this.validateSettingValue(
          nextType,
          item.setting_value === undefined ? current.setting_value : item.setting_value,
          item.options ?? current.options,
          item.validation_rules ?? current.validation_rules,
          item.is_required ?? current.is_required
        );
        this.validateSettingValue(
          nextType,
          item.default_value === undefined ? current.default_value : item.default_value,
          item.options ?? current.options,
          item.validation_rules ?? current.validation_rules,
          item.is_required ?? current.is_required
        );

        const updated = await this.systemSettingsRepository.updateSetting(
          current.system_setting_id,
          {
            setting_value: item.setting_value,
            default_value: item.default_value,
            setting_name: item.setting_name,
            description: item.description,
            options: item.options,
            validation_rules: item.validation_rules,
            is_required: item.is_required,
            is_sensitive: item.is_sensitive,
            display_order: item.display_order,
            is_editable: item.is_editable,
            is_resettable: item.is_resettable,
          },
          updatedByAccountId ?? null,
          client
        );

        await this.auditLogRepository.create(
          {
            entityTable: 'system_setting',
            entityId: updated.system_setting_id,
            operation: 'UPDATE',
            changedBy: updatedByAccountId ?? null,
            changes: {
              category_code: categoryCode,
              setting_key: updated.setting_key,
              setting_name: updated.setting_name,
              previous_value: current.setting_value,
              new_value: updated.setting_value,
            },
            transactionId,
            notes: `Saved setting ${updated.setting_key} in ${categoryCode}`,
            moduleName: 'system_settings',
          },
          client
        );

        updatedSettings.push(updated);
      }

      await client.query('COMMIT');
      return updatedSettings;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async resetCategory(categoryCode: string, updatedByAccountId?: number): Promise<SystemSettingViewModel[]> {
    const category = await this.systemSettingsRepository.findCategoryByCode(categoryCode);
    if (!category) {
      throw new NotFoundError('System setting category not found');
    }

    const currentSettings = await this.systemSettingsRepository.findSettingsByCategoryCode(categoryCode);
    const resettable = currentSettings.filter((setting) => setting.is_resettable);

    const client = await pool.connect();
    const transactionId = randomUUID();
    try {
      await client.query('BEGIN');

      const updated = await this.systemSettingsRepository.resetCategorySettings(
        category.system_setting_category_id,
        updatedByAccountId ?? null,
        client
      );

      for (const setting of updated) {
        const previous = resettable.find((item) => item.system_setting_id === setting.system_setting_id);
        if (!previous) {
          continue;
        }

        await this.auditLogRepository.create(
          {
            entityTable: 'system_setting',
            entityId: setting.system_setting_id,
            operation: 'UPDATE',
            changedBy: updatedByAccountId ?? null,
            changes: {
              category_code: categoryCode,
              setting_key: setting.setting_key,
              previous_value: previous.setting_value,
              new_value: setting.setting_value,
            },
            transactionId,
            notes: `Reset setting ${setting.setting_key} in ${categoryCode}`,
            moduleName: 'system_settings',
          },
          client
        );
      }

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private validateSettingValue(
    settingType: string,
    value: unknown,
    options: Array<{ label: string; value: string }> = [],
    validationRules: Record<string, unknown> = {},
    isRequired: boolean = false
  ): void {
    if (value === null || value === undefined || value === '') {
      if (isRequired) {
        throw new ValidationError('Setting value is required');
      }

      return;
    }

    if (settingType === 'boolean') {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        throw new ValidationError('Boolean settings must be true or false');
      }
      return;
    }

    if (settingType === 'number') {
      const numericValue = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(numericValue)) {
        throw new ValidationError('Number settings must contain a valid number');
      }

      const min = typeof validationRules.min === 'number' ? validationRules.min : undefined;
      const max = typeof validationRules.max === 'number' ? validationRules.max : undefined;
      if (min !== undefined && numericValue < min) {
        throw new ValidationError(`Setting value must be at least ${min}`);
      }
      if (max !== undefined && numericValue > max) {
        throw new ValidationError(`Setting value must not exceed ${max}`);
      }
      return;
    }

    if (settingType === 'email') {
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new ValidationError('Email settings must contain a valid email address');
      }
      return;
    }

    if (settingType === 'url') {
      if (typeof value !== 'string') {
        throw new ValidationError('URL settings must contain a valid URL');
      }
      try {
        new URL(value);
      } catch {
        throw new ValidationError('URL settings must contain a valid URL');
      }
      return;
    }

    if (settingType === 'select') {
      if (typeof value !== 'string') {
        throw new ValidationError('Select settings must contain a valid value');
      }
      if (options.length > 0 && !options.some((option) => option.value === value)) {
        throw new ValidationError('Selected value is not valid for this setting');
      }
      return;
    }

    if (settingType === 'multi_select') {
      let values: unknown = value;
      if (!Array.isArray(values) && typeof values === 'string') {
        const stringValue = values;
        try {
          values = JSON.parse(stringValue);
        } catch {
          values = stringValue.split(',').map((item: string) => item.trim()).filter(Boolean);
        }
      }

      if (!Array.isArray(values)) {
        throw new ValidationError('Multi-select settings must contain an array of values');
      }
      if (options.length > 0 && values.some((item) => !options.some((option) => option.value === String(item)))) {
        throw new ValidationError('One or more selected values are not valid');
      }
      return;
    }

    if (settingType === 'date') {
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        throw new ValidationError('Date settings must contain a valid date');
      }
      return;
    }

    if (settingType === 'time') {
      if (typeof value !== 'string' || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
        throw new ValidationError('Time settings must be in HH:MM format');
      }
      return;
    }

    if (settingType === 'color') {
      if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
        throw new ValidationError('Color settings must be a valid hex color');
      }
      return;
    }

    if (settingType === 'file') {
      if (typeof value !== 'string') {
        throw new ValidationError('File settings must contain a file reference');
      }
      return;
    }

    if (typeof value !== 'string') {
      throw new ValidationError('Setting value must be a string');
    }
  }
}
