import Joi from 'joi';
import { ValidationError } from '../../utils/errors.js';
import { SystemSettingType } from './dtos.js';

const systemSettingTypeValues: SystemSettingType[] = [
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
];

const optionSchema = Joi.object({
  label: Joi.string().trim().min(1).max(255).required(),
  value: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().allow('').max(255).optional().allow(null),
});

const categoryCreateSchema = Joi.object({
  category_code: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]+$/).min(2).max(100).required(),
  category_name: Joi.string().trim().min(2).max(255).required(),
  description: Joi.string().allow('').max(1000).optional().allow(null),
  display_order: Joi.number().integer().min(0).optional(),
  is_visible: Joi.boolean().optional(),
});

const categoryUpdateSchema = Joi.object({
  category_name: Joi.string().trim().min(2).max(255).optional(),
  description: Joi.string().allow('').max(1000).optional().allow(null),
  display_order: Joi.number().integer().min(0).optional(),
  is_visible: Joi.boolean().optional(),
}).min(1);

const settingBaseSchema = {
  setting_key: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]+$/).min(2).max(150),
  setting_name: Joi.string().trim().min(2).max(255),
  description: Joi.string().allow('').max(2000).optional().allow(null),
  setting_type: Joi.string().valid(...systemSettingTypeValues),
  setting_value: Joi.any().optional().allow(null),
  default_value: Joi.any().optional().allow(null),
  options: Joi.array().items(optionSchema).optional(),
  validation_rules: Joi.object().unknown(true).optional(),
  is_required: Joi.boolean().optional(),
  is_sensitive: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_editable: Joi.boolean().optional(),
  is_resettable: Joi.boolean().optional(),
};

const settingCreateSchema = Joi.object({
  ...settingBaseSchema,
  setting_key: settingBaseSchema.setting_key.required(),
  setting_name: settingBaseSchema.setting_name.required(),
  setting_type: settingBaseSchema.setting_type.required(),
}).required();

const settingUpdateSchema = Joi.object(settingBaseSchema).min(1);

const bulkUpdateItemSchema = Joi.object({
  system_setting_id: Joi.number().integer().positive().required(),
  setting_value: Joi.any().optional().allow(null),
  default_value: Joi.any().optional().allow(null),
  setting_name: Joi.string().trim().min(2).max(255).optional(),
  description: Joi.string().allow('').max(2000).optional().allow(null),
  options: Joi.array().items(optionSchema).optional(),
  validation_rules: Joi.object().unknown(true).optional(),
  is_required: Joi.boolean().optional(),
  is_sensitive: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_editable: Joi.boolean().optional(),
  is_resettable: Joi.boolean().optional(),
}).required();

const bulkUpdateSchema = Joi.object({
  settings: Joi.array().items(bulkUpdateItemSchema).min(1).required(),
}).required();

export function validateCreateCategory(input: unknown) {
  const { error, value } = categoryCreateSchema.validate(input, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ValidationError(error.details.map((detail) => detail.message).join('; '));
  }
  return value;
}

export function validateUpdateCategory(input: unknown) {
  const { error, value } = categoryUpdateSchema.validate(input, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ValidationError(error.details.map((detail) => detail.message).join('; '));
  }
  return value;
}

export function validateCreateSetting(input: unknown) {
  const { error, value } = settingCreateSchema.validate(input, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ValidationError(error.details.map((detail) => detail.message).join('; '));
  }
  return value;
}

export function validateUpdateSetting(input: unknown) {
  const { error, value } = settingUpdateSchema.validate(input, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ValidationError(error.details.map((detail) => detail.message).join('; '));
  }
  return value;
}

export function validateBulkUpdateSettings(input: unknown) {
  const { error, value } = bulkUpdateSchema.validate(input, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ValidationError(error.details.map((detail) => detail.message).join('; '));
  }
  return value;
}
