export type SystemSettingType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'email'
  | 'url'
  | 'color'
  | 'date'
  | 'time'
  | 'file';

export interface SystemSettingOptionDto {
  label: string;
  value: string;
  description?: string | null;
}

export interface SystemSettingCategoryCreateDto {
  category_code: string;
  category_name: string;
  description?: string | null;
  display_order?: number;
  is_visible?: boolean;
}

export interface SystemSettingCategoryUpdateDto {
  category_name?: string;
  description?: string | null;
  display_order?: number;
  is_visible?: boolean;
}

export interface SystemSettingCreateDto {
  setting_key: string;
  setting_name: string;
  description?: string | null;
  setting_type: SystemSettingType;
  setting_value?: unknown;
  default_value?: unknown;
  options?: SystemSettingOptionDto[];
  validation_rules?: Record<string, unknown>;
  is_required?: boolean;
  is_sensitive?: boolean;
  display_order?: number;
  is_editable?: boolean;
  is_resettable?: boolean;
}

export interface SystemSettingUpdateDto {
  setting_key?: string;
  setting_name?: string;
  description?: string | null;
  setting_type?: SystemSettingType;
  setting_value?: unknown;
  default_value?: unknown;
  options?: SystemSettingOptionDto[];
  validation_rules?: Record<string, unknown>;
  is_required?: boolean;
  is_sensitive?: boolean;
  display_order?: number;
  is_editable?: boolean;
  is_resettable?: boolean;
}

export interface SystemSettingBulkUpdateItemDto {
  system_setting_id: number;
  setting_value?: unknown;
  default_value?: unknown;
  setting_name?: string;
  description?: string | null;
  options?: SystemSettingOptionDto[];
  validation_rules?: Record<string, unknown>;
  is_required?: boolean;
  is_sensitive?: boolean;
  display_order?: number;
  is_editable?: boolean;
  is_resettable?: boolean;
}
