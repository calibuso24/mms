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

export interface SystemSettingOption {
  label: string;
  value: string;
  description?: string | null;
}

export interface SystemSettingCategorySummary {
  system_setting_category_id: number;
  category_code: string;
  category_name: string;
  description: string | null;
  display_order: number;
  is_visible: boolean;
  setting_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SystemSettingItem {
  system_setting_id: number;
  system_setting_category_id: number;
  category_code: string;
  category_name: string;
  setting_key: string;
  setting_name: string;
  description: string | null;
  setting_type: SystemSettingType;
  setting_value: string | null;
  default_value: string | null;
  options: SystemSettingOption[];
  validation_rules: Record<string, unknown>;
  is_required: boolean;
  is_sensitive: boolean;
  display_order: number;
  is_editable: boolean;
  is_resettable: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface SystemSettingCategoryDetail extends SystemSettingCategorySummary {
  settings: SystemSettingItem[];
}
