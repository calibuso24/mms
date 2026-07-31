import { Box, Button, Checkbox, FormControl, FormControlLabel, FormHelperText, InputLabel, ListItemText, MenuItem, Select, Stack, Switch, TextField, Typography } from '@mui/material';
import { SystemSettingItem, SystemSettingOption } from '../../types/systemSettings.js';

interface SettingsFieldProps {
  setting: SystemSettingItem;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function parseMultiSelect(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      // fall through
    }

    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export function SettingsField({ setting, value, onChange, disabled }: SettingsFieldProps) {
  const label = setting.is_sensitive ? `${setting.setting_name} (sensitive)` : setting.setting_name;
  const helperText = setting.description || (setting.is_required ? 'Required' : undefined);

  if (setting.setting_type === 'boolean') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={value === true || value === 'true'}
            onChange={(event) => onChange(event.target.checked)}
            disabled={disabled}
          />
        }
        label={label}
      />
    );
  }

  if (setting.setting_type === 'select') {
    return (
      <TextField
        select
        fullWidth
        label={label}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        helperText={helperText}
      >
        {setting.options.length === 0 ? (
          <MenuItem value="">No options configured</MenuItem>
        ) : (
          setting.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))
        )}
      </TextField>
    );
  }

  if (setting.setting_type === 'multi_select') {
    const selectedValues = parseMultiSelect(value);

    return (
      <FormControl fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select
          multiple
          value={selectedValues}
          label={label}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          renderValue={(selected) => (Array.isArray(selected) ? selected.join(', ') : '')}
        >
          {setting.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox checked={selectedValues.includes(option.value)} />
              <ListItemText primary={option.label} secondary={option.description ?? undefined} />
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{helperText}</FormHelperText>
      </FormControl>
    );
  }

  if (setting.setting_type === 'file') {
    return (
      <Stack spacing={1}>
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
        <Button variant="outlined" component="label" disabled={disabled}>
          Upload File
          <input
            hidden
            type="file"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                onChange('');
                return;
              }

              const reader = new FileReader();
              reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : file.name);
              reader.readAsDataURL(file);
            }}
          />
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          {typeof value === 'string' && value.length > 0 ? 'File selected' : helperText || 'No file selected'}
        </Typography>
      </Stack>
    );
  }

  const textType = setting.setting_type === 'text' ? 'text' : setting.setting_type;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
      <TextField
        fullWidth
        multiline={setting.setting_type === 'textarea'}
        minRows={setting.setting_type === 'textarea' ? 3 : undefined}
        type={textType}
        label={setting.setting_type === 'textarea' ? undefined : label}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        helperText={helperText}
        InputLabelProps={setting.setting_type === 'date' || setting.setting_type === 'time' ? { shrink: true } : undefined}
      />
    </Box>
  );
}
