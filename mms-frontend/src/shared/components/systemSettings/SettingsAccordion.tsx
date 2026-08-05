import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import { systemSettingsApi } from '../../api/client.js';
import BrandingEditor from './BrandingEditor.js';
import { useBranding } from '../../contexts/branding.js';
import {
  SystemSettingCategorySummary,
  SystemSettingItem,
  SystemSettingOption,
  SystemSettingType,
} from '../../types/systemSettings.js';
import { SettingsField } from './SettingsField.js';

interface SettingsAccordionProps {
  category: SystemSettingCategorySummary;
  expanded: boolean;
  canEdit: boolean;
  canSave: boolean;
  canReset: boolean;
  onToggle: (categoryCode: string) => void;
  onDirtyChange?: (categoryCode: string, dirty: boolean) => void;
}

interface CreateSettingFormState {
  setting_key: string;
  setting_name: string;
  description: string;
  setting_type: SystemSettingType;
  setting_value: string;
  default_value: string;
  options_json: string;
  validation_rules_json: string;
  is_required: boolean;
  is_sensitive: boolean;
  display_order: number;
  is_editable: boolean;
  is_resettable: boolean;
}

const settingTypes: SystemSettingType[] = [
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

function emptyCreateForm(): CreateSettingFormState {
  return {
    setting_key: '',
    setting_name: '',
    description: '',
    setting_type: 'text',
    setting_value: '',
    default_value: '',
    options_json: '[]',
    validation_rules_json: '{}',
    is_required: false,
    is_sensitive: false,
    display_order: 0,
    is_editable: true,
    is_resettable: true,
  };
}

function parseSettingValue(setting: SystemSettingItem): unknown {
  const sourceValue = setting.setting_value ?? setting.default_value ?? '';

  if (setting.setting_type === 'boolean') {
    return sourceValue === 'true' || sourceValue === true;
  }

  if (setting.setting_type === 'number') {
    return sourceValue === '' || sourceValue === null ? '' : Number(sourceValue);
  }

  if (setting.setting_type === 'multi_select') {
    if (Array.isArray(sourceValue)) {
      return sourceValue;
    }

    if (typeof sourceValue === 'string' && sourceValue.trim().length > 0) {
      try {
        const parsed = JSON.parse(sourceValue);
        return Array.isArray(parsed) ? parsed : sourceValue.split(',').map((item) => item.trim()).filter(Boolean);
      } catch {
        return sourceValue.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }

    return [];
  }

  return sourceValue;
}

function toSerializableValue(setting: SystemSettingItem, value: unknown): unknown {
  if (setting.setting_type === 'multi_select') {
    return Array.isArray(value) ? value : [];
  }

  if (setting.setting_type === 'boolean') {
    return Boolean(value);
  }

  return value === '' ? null : value;
}

export function SettingsAccordion({
  category,
  expanded,
  canEdit,
  canSave,
  canReset,
  onToggle,
  onDirtyChange,
}: SettingsAccordionProps) {
  const { reload } = useBranding();
  const [settings, setSettings] = useState<SystemSettingItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, unknown>>({});
  const [initialDrafts, setInitialDrafts] = useState<Record<number, unknown>>({});
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SystemSettingItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState<CreateSettingFormState>(emptyCreateForm());

  const dirty = useMemo(() => {
    const draftIds = Object.keys(drafts);
    const initialIds = Object.keys(initialDrafts);
    if (draftIds.length !== initialIds.length) {
      return true;
    }

    return draftIds.some((key) => {
      const settingId = Number(key);
      return JSON.stringify(drafts[settingId]) !== JSON.stringify(initialDrafts[settingId]);
    });
  }, [drafts, initialDrafts]);

  useEffect(() => {
    onDirtyChange?.(category.category_code, dirty);
  }, [category.category_code, dirty, onDirtyChange]);

  useEffect(() => {
    if (!expanded || loaded) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await systemSettingsApi.listCategorySettings(category.category_code);
        const items: SystemSettingItem[] = Array.isArray(result) ? result : [];
        setSettings(items);

        const nextDrafts: Record<number, unknown> = {};
        items.forEach((item) => {
          nextDrafts[item.system_setting_id] = parseSettingValue(item);
        });
        setDrafts(nextDrafts);
        setInitialDrafts(nextDrafts);
        setLoaded(true);
      } catch (err: any) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [category.category_code, expanded, loaded]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = settings.map((setting) => ({
        system_setting_id: setting.system_setting_id,
        setting_value: toSerializableValue(setting, drafts[setting.system_setting_id]),
      }));

      const updated = await systemSettingsApi.saveCategorySettings(category.category_code, payload);
      const nextSettings: SystemSettingItem[] = Array.isArray(updated) ? updated : settings;
      setSettings(nextSettings);

      const nextDrafts: Record<number, unknown> = {};
      nextSettings.forEach((item) => {
        nextDrafts[item.system_setting_id] = parseSettingValue(item);
      });
      setDrafts(nextDrafts);
      setInitialDrafts(nextDrafts);
      setSuccess('Settings saved successfully');
      try {
        // If this is the branding category, reload persisted branding from server
        // so the global theme matches saved values.
        if (category.category_code === 'branding') {
          await reload();
        }
      } catch (e) {
        // ignore reload errors
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset all settings in ${category.category_name} to their default values?`)) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await systemSettingsApi.resetCategory(category.category_code);
      const items: SystemSettingItem[] = Array.isArray(updated) ? updated : [];
      setSettings(items);

      const nextDrafts: Record<number, unknown> = {};
      items.forEach((item) => {
        nextDrafts[item.system_setting_id] = parseSettingValue(item);
      });
      setDrafts(nextDrafts);
      setInitialDrafts(nextDrafts);
      setSuccess('Category reset to defaults');
    } catch (err: any) {
      setError(err.message || 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setCreateSaving(true);
    setCreateError('');
    try {
      const options = JSON.parse(createForm.options_json || '[]') as SystemSettingOption[];
      const validationRules = JSON.parse(createForm.validation_rules_json || '{}') as Record<string, unknown>;

      await systemSettingsApi.createSetting(category.category_code, {
        setting_key: createForm.setting_key.trim(),
        setting_name: createForm.setting_name.trim(),
        description: createForm.description.trim() || null,
        setting_type: createForm.setting_type,
        setting_value: createForm.setting_value,
        default_value: createForm.default_value,
        options,
        validation_rules: validationRules,
        is_required: createForm.is_required,
        is_sensitive: createForm.is_sensitive,
        display_order: createForm.display_order,
        is_editable: createForm.is_editable,
        is_resettable: createForm.is_resettable,
      });

      setCreateOpen(false);
      setLoaded(false);
      setSuccess('Setting created successfully');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create setting');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await systemSettingsApi.deleteSetting(deleteTarget.system_setting_id);
      setSettings((current) => current.filter((item) => item.system_setting_id !== deleteTarget.system_setting_id));
      setDrafts((current) => {
        const next = { ...current };
        delete next[deleteTarget.system_setting_id];
        return next;
      });
      setInitialDrafts((current) => {
        const next = { ...current };
        delete next[deleteTarget.system_setting_id];
        return next;
      });
      setDeleteTarget(null);
      setSuccess('Setting deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Accordion expanded={expanded} onChange={() => onToggle(category.category_code)} disableGutters sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
          <Typography variant="h6" fontWeight={600}>
            {category.category_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {category.description || 'Configuration options for this area of the system.'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {category.setting_count} setting{category.setting_count === 1 ? '' : 's'}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Section Controls
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Update values, add settings, or reset this section to the defaults stored in the database.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {canEdit && (
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                      Add Setting
                    </Button>
                  )}
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!canSave || saving || !dirty}>
                    Save
                  </Button>
                  <Button variant="outlined" color="warning" startIcon={<RestartAltIcon />} onClick={handleReset} disabled={!canReset || saving}>
                    Reset
                  </Button>
                </Stack>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {category.category_code === 'branding' ? (
                <Card variant="outlined">
                  <CardContent>
                    {settings[0] ? (
                      <BrandingEditor
                        setting={settings[0]}
                        value={drafts[settings[0].system_setting_id]}
                        onChange={(nextValue) => setDrafts((current) => ({ ...current, [settings[0].system_setting_id]: nextValue }))}
                      />
                    ) : (
                      <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>No branding setting found.</Box>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Grid container spacing={2}>
                  {settings.map((setting) => (
                    <Grid item xs={12} md={6} lg={4} key={setting.system_setting_id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {setting.setting_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {setting.setting_key} | {setting.setting_type}
                              </Typography>
                            </Box>
                            {canEdit && (
                              <IconButton size="small" color="error" aria-label={`Delete ${setting.setting_name}`} onClick={() => setDeleteTarget(setting)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>

                          <SettingsField
                            setting={setting}
                            value={drafts[setting.system_setting_id]}
                            onChange={(nextValue) => setDrafts((current) => ({ ...current, [setting.system_setting_id]: nextValue }))}
                            disabled={!canSave || saving || !setting.is_editable}
                          />

                          <Typography variant="caption" color="text.secondary">
                            Default: {setting.default_value ?? 'Not configured'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {settings.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  No settings are configured for this category yet.
                </Box>
              )}
            </>
          )}
        </Paper>
      </AccordionDetails>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Setting</DialogTitle>
        <DialogContent dividers>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Setting Key" value={createForm.setting_key} onChange={(event) => setCreateForm((current) => ({ ...current, setting_key: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Setting Name" value={createForm.setting_name} onChange={(event) => setCreateForm((current) => ({ ...current, setting_name: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Setting Type" value={createForm.setting_type} onChange={(event) => setCreateForm((current) => ({ ...current, setting_type: event.target.value as SystemSettingType }))}>
                {settingTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Display Order" value={createForm.display_order} onChange={(event) => setCreateForm((current) => ({ ...current, display_order: Number(event.target.value) }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" multiline minRows={2} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Setting Value"
                value={createForm.setting_value}
                onChange={(event) => setCreateForm((current) => ({ ...current, setting_value: event.target.value }))}
                helperText={'For multi-select, enter a JSON array such as ["A","B"]'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Default Value" value={createForm.default_value} onChange={(event) => setCreateForm((current) => ({ ...current, default_value: event.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Options JSON" value={createForm.options_json} onChange={(event) => setCreateForm((current) => ({ ...current, options_json: event.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Validation Rules JSON" value={createForm.validation_rules_json} onChange={(event) => setCreateForm((current) => ({ ...current, validation_rules_json: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Switch checked={createForm.is_required} onChange={(event) => setCreateForm((current) => ({ ...current, is_required: event.target.checked }))} />} label="Required" />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Switch checked={createForm.is_sensitive} onChange={(event) => setCreateForm((current) => ({ ...current, is_sensitive: event.target.checked }))} />} label="Sensitive" />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Switch checked={createForm.is_editable} onChange={(event) => setCreateForm((current) => ({ ...current, is_editable: event.target.checked }))} />} label="Editable" />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Switch checked={createForm.is_resettable} onChange={(event) => setCreateForm((current) => ({ ...current, is_resettable: event.target.checked }))} />} label="Resettable" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createSaving}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Setting</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Delete {deleteTarget?.setting_name}? This will soft delete the setting and preserve audit history.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(success)} autoHideDuration={2500} onClose={() => setSuccess('')}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Accordion>
  );
}
