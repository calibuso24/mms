import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

export type LookupDialogMode = 'category' | 'subCategory' | 'uom' | 'materialType' | 'brand';

type LookupForm = Record<string, string>;

interface CategoryOption {
  category_id: number;
  category_code?: string;
  category_name: string;
}

interface LookupAutocompleteProps<T> {
  label: string;
  options: T[];
  value: T | T[] | null;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  mode: LookupDialogMode;
  getOptionId: (option: T) => number;
  getOptionLabel: (option: T) => string;
  onChange: (value: T | T[] | null) => void;
  onSearchChange?: (value: string) => void;
  onOptionsChange: (nextOptions: T[]) => void;
  onCreate: (payload: any) => Promise<T>;
  onUpdate: (id: number, payload: any) => Promise<T>;
  onSavedSelect: (saved: T) => void;
  categoryOptions?: CategoryOption[];
  defaultCategoryId?: string;
}

const getDefaultForm = (mode: LookupDialogMode, defaultCategoryId?: string): LookupForm => {
  if (mode === 'category') {
    return { category_code: '', category_name: '', description: '' };
  }
  if (mode === 'subCategory') {
    return {
      category_id: defaultCategoryId || '',
      sub_category_code: '',
      sub_category_name: '',
    };
  }
  if (mode === 'uom') {
    return { uom_name: '', abbreviation: '' };
  }
  if (mode === 'materialType') {
    return { material_type_code: '', material_type_name: '', description: '' };
  }
  return { brand_name: '' };
};

const getEditForm = (mode: LookupDialogMode, option: any): LookupForm => {
  if (mode === 'category') {
    return {
      category_code: option?.category_code || '',
      category_name: option?.category_name || '',
      description: option?.description || '',
    };
  }
  if (mode === 'subCategory') {
    return {
      category_id: option?.category_id ? String(option.category_id) : '',
      sub_category_code: option?.sub_category_code || '',
      sub_category_name: option?.sub_category_name || '',
    };
  }
  if (mode === 'uom') {
    return {
      uom_name: option?.uom_name || '',
      abbreviation: option?.abbreviation || '',
    };
  }
  if (mode === 'materialType') {
    return {
      material_type_code: option?.material_type_code || '',
      material_type_name: option?.material_type_name || '',
      description: option?.description || '',
    };
  }
  return {
    brand_name: option?.brand_name || '',
  };
};

const getDialogTitle = (mode: LookupDialogMode, isEdit: boolean): string => {
  const action = isEdit ? 'Edit' : 'Add';
  if (mode === 'category') return `${action} Category`;
  if (mode === 'subCategory') return `${action} Sub Category`;
  if (mode === 'uom') return `${action} Unit of Measure`;
  if (mode === 'materialType') return `${action} Material Type`;
  return `${action} Brand`;
};

const buildPayload = (mode: LookupDialogMode, form: LookupForm): any => {
  if (mode === 'category') {
    return {
      category_code: form.category_code?.trim(),
      category_name: form.category_name?.trim(),
      description: form.description?.trim() || undefined,
    };
  }
  if (mode === 'subCategory') {
    return {
      category_id: Number(form.category_id),
      sub_category_code: form.sub_category_code?.trim(),
      sub_category_name: form.sub_category_name?.trim(),
    };
  }
  if (mode === 'uom') {
    return {
      uom_name: form.uom_name?.trim(),
      abbreviation: form.abbreviation?.trim(),
    };
  }
  if (mode === 'materialType') {
    return {
      material_type_code: form.material_type_code?.trim() || null,
      material_type_name: form.material_type_name?.trim(),
      description: form.description?.trim() || null,
    };
  }
  return {
    brand_name: form.brand_name?.trim(),
  };
};

const validateForm = (mode: LookupDialogMode, form: LookupForm): string => {
  if (mode === 'category') {
    if (!form.category_code?.trim()) return 'Category code is required';
    if (!form.category_name?.trim()) return 'Category name is required';
  }
  if (mode === 'subCategory') {
    if (!form.category_id) return 'Category is required';
    if (!form.sub_category_code?.trim()) return 'Sub category code is required';
    if (!form.sub_category_name?.trim()) return 'Sub category name is required';
  }
  if (mode === 'uom') {
    if (!form.uom_name?.trim()) return 'UOM name is required';
    if (!form.abbreviation?.trim()) return 'Abbreviation is required';
  }
  if (mode === 'materialType') {
    if (!form.material_type_name?.trim()) return 'Material type name is required';
  }
  if (mode === 'brand') {
    if (!form.brand_name?.trim()) return 'Brand name is required';
  }
  return '';
};

export default function LookupAutocomplete<T>(props: LookupAutocompleteProps<T>) {
  const {
    label,
    options,
    value,
    multiple,
    disabled,
    required,
    mode,
    getOptionId,
    getOptionLabel,
    onChange,
    onSearchChange,
    onOptionsChange,
    onCreate,
    onUpdate,
    onSavedSelect,
    categoryOptions,
    defaultCategoryId,
  } = props;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogForm, setDialogForm] = useState<LookupForm>(getDefaultForm(mode, defaultCategoryId));
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);

  const editableTarget = useMemo(() => {
    if (multiple) {
      const selected = Array.isArray(value) ? value : [];
      return selected.length === 1 ? selected[0] : null;
    }
    return (value as T | null) || null;
  }, [multiple, value]);

  const openCreate = () => {
    setDialogMode('create');
    setDialogForm(getDefaultForm(mode, defaultCategoryId));
    setDialogError('');
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (!editableTarget) return;
    setDialogMode('edit');
    setDialogForm(getEditForm(mode, editableTarget));
    setDialogError('');
    setDialogOpen(true);
  };

  const onSave = async () => {
    const validationError = validateForm(mode, dialogForm);
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    setSaving(true);
    setDialogError('');

    try {
      const payload = buildPayload(mode, dialogForm);
      const saved = dialogMode === 'create'
        ? await onCreate(payload)
        : await onUpdate(getOptionId(editableTarget as T), payload);

      const savedId = getOptionId(saved);
      const updatedOptions = [
        ...options.filter((option) => getOptionId(option) !== savedId),
        saved,
      ].sort((a, b) => getOptionLabel(a).localeCompare(getOptionLabel(b)));

      onOptionsChange(updatedOptions);
      onSavedSelect(saved);
      setDialogOpen(false);
    } catch (err: any) {
      setDialogError(err?.message || 'Failed to save lookup');
    } finally {
      setSaving(false);
    }
  };

  const renderDialogFields = () => {
    if (mode === 'category') {
      return (
        <Stack spacing={2}>
          <TextField
            label="Category Code"
            value={dialogForm.category_code || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, category_code: event.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Category Name"
            value={dialogForm.category_name || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, category_name: event.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Description"
            value={dialogForm.description || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, description: event.target.value }))}
            size="small"
          />
        </Stack>
      );
    }

    if (mode === 'subCategory') {
      return (
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <Typography variant="caption" color="text.secondary">Category</Typography>
            <Select
              value={dialogForm.category_id || ''}
              onChange={(event) => setDialogForm((current) => ({ ...current, category_id: event.target.value }))}
            >
              <MenuItem value="">Select Category</MenuItem>
              {(categoryOptions || []).map((category) => (
                <MenuItem key={category.category_id} value={String(category.category_id)}>
                  {category.category_code ? `${category.category_code} - ${category.category_name}` : category.category_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Sub Category Code"
            value={dialogForm.sub_category_code || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, sub_category_code: event.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Sub Category Name"
            value={dialogForm.sub_category_name || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, sub_category_name: event.target.value }))}
            required
            size="small"
          />
        </Stack>
      );
    }

    if (mode === 'uom') {
      return (
        <Stack spacing={2}>
          <TextField
            label="UOM Name"
            value={dialogForm.uom_name || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, uom_name: event.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Abbreviation"
            value={dialogForm.abbreviation || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, abbreviation: event.target.value }))}
            required
            size="small"
          />
        </Stack>
      );
    }

    if (mode === 'materialType') {
      return (
        <Stack spacing={2}>
          <TextField
            label="Material Type Code"
            value={dialogForm.material_type_code || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, material_type_code: event.target.value }))}
            size="small"
          />
          <TextField
            label="Material Type Name"
            value={dialogForm.material_type_name || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, material_type_name: event.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Description"
            value={dialogForm.description || ''}
            onChange={(event) => setDialogForm((current) => ({ ...current, description: event.target.value }))}
            size="small"
          />
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        <TextField
          label="Brand Name"
          value={dialogForm.brand_name || ''}
          onChange={(event) => setDialogForm((current) => ({ ...current, brand_name: event.target.value }))}
          required
          size="small"
        />
      </Stack>
    );
  };

  const editDisabled = !editableTarget;

  return (
    <>
      <Autocomplete
        multiple={multiple}
        size="small"
        options={options}
        value={value as any}
        disabled={disabled}
        onChange={(_, nextValue) => onChange(nextValue as any)}
        onInputChange={(_, nextValue, reason) => {
          if ((reason === 'input' || reason === 'clear') && onSearchChange) {
            onSearchChange(nextValue);
          }
        }}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(option, selected) => getOptionId(option) === getOptionId(selected)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  <Tooltip title={`Add ${label}`}>
                    <span>
                      <IconButton size="small" onClick={openCreate} disabled={disabled}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={editDisabled ? `Select ${multiple ? 'exactly one' : 'a'} ${label.toLowerCase()} to edit` : `Edit ${label}`}>
                    <span>
                      <IconButton size="small" onClick={openEdit} disabled={disabled || editDisabled}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{getDialogTitle(mode, dialogMode === 'edit')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {dialogError && (
              <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
                {dialogError}
              </Typography>
            )}
            {renderDialogFields()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Saving...' : dialogMode === 'edit' ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
