import { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  Chip,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import { GridColDef, GridRenderEditCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { materialApi, materialTypeApi, categoryApi, subCategoryApi, brandApi, uomApi, lookupApi, materialOptionApi } from '../shared/api/client.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

interface Material {
  material_id: string;
  product_code: string;
  product_name: string;
  full_description?: string;
  category_name: string;
  sub_category_name: string;
  material_type_name?: string;
  uom_name: string;
  status_name: string;
}

interface FormData {
  product_code: string;
  product_name: string;
  category_id: string;
  sub_category_id: string;
  stock_uom_id: string;
  material_type_id: string;
  brand_ids: string[];
  status_id: string;
  notes: string;
  material_specification: {
    primary_size: string;
    secondary_size: string;
    alternate_size: string;
    thickness_or_gauge: string;
    width: string;
    length: string;
    schedule: string;
    pressure_or_load_rating: string;
  };
}

interface MaterialOptionComponentFormRow {
  row_id: string;
  material_option_detail_id?: number;
  component_material_id: string;
  required_quantity: string;
  uom_id: string;
  notes: string;
}

interface MaterialOptionForm {
  row_id: string;
  material_option_id?: number;
  option_code: string;
  option_name: string;
  option_type_id: string;
  requires_approval: boolean;
  is_active: boolean;
  notes: string;
  components: MaterialOptionComponentFormRow[];
}

const createComponentRow = (): MaterialOptionComponentFormRow => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  component_material_id: '',
  required_quantity: '',
  uom_id: '',
  notes: '',
});

const createOptionRow = (): MaterialOptionForm => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  option_code: '',
  option_name: '',
  option_type_id: '',
  requires_approval: true,
  is_active: true,
  notes: '',
  components: [createComponentRow()],
});

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [optionTypes, setOptionTypes] = useState<any[]>([]);
  const [materialOptions, setMaterialOptions] = useState<MaterialOptionForm[]>([]);
  const [selectedOptionRowId, setSelectedOptionRowId] = useState<string>('');
  const [removedOptionIds, setRemovedOptionIds] = useState<number[]>([]);
  const [componentMaterialQuery, setComponentMaterialQuery] = useState('');
  const [componentMaterialOptions, setComponentMaterialOptions] = useState<any[]>([]);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [subCategoryQuery, setSubCategoryQuery] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [materialTypeQuery, setMaterialTypeQuery] = useState('');
  const [uomQuery, setUomQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  
  const [basicSearch, setBasicSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category_id: '',
    sub_category_id: '',
    status_id: '',
    uom_id: '',
  });
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [expandedSpecSection, setExpandedSpecSection] = useState(false);
  const [expandedOptionSection, setExpandedOptionSection] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    product_code: '',
    product_name: '',
    category_id: '',
    sub_category_id: '',
    stock_uom_id: '',
    material_type_id: '',
    brand_ids: [],
    status_id: '',
    notes: '',
    material_specification: {
      primary_size: '',
      secondary_size: '',
      alternate_size: '',
      thickness_or_gauge: '',
      width: '',
      length: '',
      schedule: '',
      pressure_or_load_rating: '',
    },
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [basicSearch, showAdvancedFilters, advancedFilters, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [basicSearch, showAdvancedFilters, advancedFilters]);

  useEffect(() => {
    if (advancedFilters.category_id) {
      loadSubCategories(advancedFilters.category_id);
    } else {
      setSubCategories([]);
    }
  }, [advancedFilters.category_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void categoryApi.list(100, 0, categoryQuery).then(setCategories).catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [categoryQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void brandApi.list(100, 0, brandQuery).then(setBrands).catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [brandQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void materialTypeApi.list(100, 0, materialTypeQuery).then(setMaterialTypes).catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [materialTypeQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void uomApi.list(100, 0, uomQuery).then(setUoms).catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [uomQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!formData.category_id) return;
      void subCategoryApi
        .list(parseInt(formData.category_id, 10), 100, 0, subCategoryQuery)
        .then(setSubCategories)
        .catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.category_id, subCategoryQuery]);

  useEffect(() => {
    if (!editingMaterialId) {
      setComponentMaterialOptions([]);
      return;
    }

    const timer = setTimeout(() => {
      const search = componentMaterialQuery.trim();
      void materialApi
        .list(50, 0, search ? { search } : undefined)
        .then((result: any) => {
          const options = Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result)
              ? result
              : [];
          setComponentMaterialOptions(options);
        })
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [componentMaterialQuery, editingMaterialId]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, brandsData, materialTypesData, uomsData, statusesData, optionTypesData] = await Promise.all([
        categoryApi.list(100),
        brandApi.list(100),
        materialTypeApi.list(100),
        uomApi.list(100),
        lookupApi.listByType('material_status', 100),
        lookupApi.listByType('material_option_type', 100),
      ]);
      setCategories(categoriesData);
      setBrands(brandsData);
      setMaterialTypes(materialTypesData);
      setUoms(uomsData);
      setStatuses(statusesData);
      setOptionTypes(optionTypesData);
      loadMaterials();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadMaterials = async () => {
    setLoading(true);
    setError('');
    try {
      const filters: any = {};
      if (basicSearch) {
        filters.search = basicSearch;
      }
      if (advancedFilters.category_id) {
        filters.category_id = parseInt(advancedFilters.category_id);
      }
      if (advancedFilters.sub_category_id) {
        filters.sub_category_id = parseInt(advancedFilters.sub_category_id);
      }
      if (advancedFilters.status_id) {
        filters.status_id = parseInt(advancedFilters.status_id);
      }
      if (advancedFilters.uom_id) {
        filters.uom_id = parseInt(advancedFilters.uom_id);
      }

      const data = await materialApi.listPaged(rowsPerPage, page * rowsPerPage, filters);
      setMaterials(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
    } catch (err: any) {
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const loadSubCategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubCategories([]);
      return;
    }
    try {
      const data = await subCategoryApi.list(parseInt(categoryId), 100);
      setSubCategories(data);
    } catch (err) {
      console.error('Failed to load sub-categories:', err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('spec_')) {
      const specField = name.replace('spec_', '');
      setFormData({
        ...formData,
        material_specification: {
          ...formData.material_specification,
          [specField]: value,
        },
      });
    } else {
      const nextValue = type === 'checkbox' ? checked : value;
      setFormData({ ...formData, [name]: nextValue });
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, category_id: value, sub_category_id: '' });
    loadSubCategories(value);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const submitData: any = {
        product_name: formData.product_name,
        category_id: parseInt(formData.category_id),
        stock_uom_id: parseInt(formData.stock_uom_id),
      };
      if (formData.sub_category_id) {
        submitData.sub_category_id = parseInt(formData.sub_category_id);
      }
      if (formData.material_type_id) {
        submitData.material_type_id = parseInt(formData.material_type_id);
      }
      submitData.brand_ids = formData.brand_ids.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0);

      if (Object.values(formData.material_specification).some(v => v)) {
        submitData.material_specification = formData.material_specification;
      }

      await materialApi.create(submitData);
      resetForm();
      setShowDialog(false);
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to create material');
    }
  };

  const handleEditMaterial = async (materialId: string) => {
    setEditingMaterialId(materialId);
    setShowDialog(true);
    try {
      const numericMaterialId = parseInt(materialId, 10);
      const [material, options] = await Promise.all([
        materialApi.get(numericMaterialId),
        materialOptionApi.listByMaterial(numericMaterialId).catch(() => []),
      ]);

      setFormData({
        product_code: material.product_code,
        product_name: material.product_name,
        category_id: material.category_id,
        sub_category_id: material.sub_category_id || '',
        stock_uom_id: material.stock_uom_id,
        material_type_id: material.material_type_id || '',
        brand_ids: Array.isArray(material.brand_ids)
          ? material.brand_ids.map((id: number | string) => String(id))
          : (material.brand_id ? [String(material.brand_id)] : []),
        status_id: material.status_id,
        notes: material.notes || '',
        material_specification: material.material_specification || {
          primary_size: '',
          secondary_size: '',
          alternate_size: '',
          thickness_or_gauge: '',
          width: '',
          length: '',
          schedule: '',
          pressure_or_load_rating: '',
        },
      });

      const normalizedOptions: MaterialOptionForm[] = (Array.isArray(options) ? options : []).map((option: any) => ({
        row_id: `option-${option.material_option_id}`,
        material_option_id: option.material_option_id,
        option_code: option.option_code || '',
        option_name: option.option_name || '',
        option_type_id: option.option_type_id ? String(option.option_type_id) : '',
        requires_approval: option.requires_approval ?? true,
        is_active: option.is_active ?? true,
        notes: option.notes || '',
        components: Array.isArray(option.components) && option.components.length > 0
          ? option.components.map((component: any) => ({
              row_id: `component-${component.material_option_detail_id || Math.random().toString(36).slice(2, 8)}`,
              material_option_detail_id: component.material_option_detail_id,
              component_material_id: String(component.component_material_id),
              required_quantity: String(component.required_quantity ?? ''),
              uom_id: String(component.uom_id ?? ''),
              notes: component.notes || '',
            }))
          : [createComponentRow()],
      }));

      const seededComponentMaterials = (Array.isArray(options) ? options : []).flatMap((option: any) =>
        Array.isArray(option.components)
          ? option.components.map((component: any) => ({
              material_id: component.component_material_id,
              product_code: component.component_material_code,
              product_name: component.component_material_name,
              full_description: component.component_full_description,
              stock_uom_id: component.component_stock_uom_id,
            }))
          : []
      );
      setComponentMaterialOptions((current) => {
        const map = new Map<string, any>();
        for (const item of [...seededComponentMaterials, ...current]) {
          if (item?.material_id !== undefined && item?.material_id !== null) {
            map.set(String(item.material_id), item);
          }
        }
        return Array.from(map.values());
      });

      const resolvedOptions = normalizedOptions.length > 0 ? normalizedOptions : [createOptionRow()];
      setMaterialOptions(resolvedOptions);
      setSelectedOptionRowId(resolvedOptions[0].row_id);
      setRemovedOptionIds([]);
      setComponentMaterialQuery('');
      loadSubCategories(material.category_id);
    } catch (err: any) {
      setError(err.message || 'Failed to load material');
    }
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterialId) return;

    setError('');
    try {
      const submitData: any = {
        product_name: formData.product_name,
        category_id: parseInt(formData.category_id),
        stock_uom_id: parseInt(formData.stock_uom_id),
        status_id: parseInt(formData.status_id),
      };
      if (formData.sub_category_id) {
        submitData.sub_category_id = parseInt(formData.sub_category_id);
      }
      if (formData.material_type_id) {
        submitData.material_type_id = parseInt(formData.material_type_id);
      }
      submitData.brand_ids = formData.brand_ids.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0);
      if (formData.notes) {
        submitData.notes = formData.notes;
      }

      if (Object.values(formData.material_specification).some(v => v)) {
        submitData.material_specification = formData.material_specification;
      }

      const materialId = parseInt(editingMaterialId, 10);
      await materialApi.update(materialId, submitData);
      await syncMaterialOptions(materialId);

      resetForm();
      setEditingMaterialId(null);
      setShowDialog(false);
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to update material');
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    setError('');
    try {
      await materialApi.delete(parseInt(materialId));
      loadMaterials();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material');
    }
  };

  const selectedOptionIndex = useMemo(
    () => materialOptions.findIndex((option) => option.row_id === selectedOptionRowId),
    [materialOptions, selectedOptionRowId]
  );

  const selectedOption = selectedOptionIndex >= 0 ? materialOptions[selectedOptionIndex] : null;

  const setSelectedOptionPatch = (patch: Partial<MaterialOptionForm>) => {
    if (selectedOptionIndex < 0) return;
    setMaterialOptions((current) =>
      current.map((option, index) => (index === selectedOptionIndex ? { ...option, ...patch } : option))
    );
  };

  const setSelectedOptionComponents = (
    updater:
      | MaterialOptionComponentFormRow[]
      | ((rows: MaterialOptionComponentFormRow[]) => MaterialOptionComponentFormRow[])
  ) => {
    if (selectedOptionIndex < 0) return;
    setMaterialOptions((current) =>
      current.map((option, index) => {
        if (index !== selectedOptionIndex) return option;
        const nextRows = typeof updater === 'function' ? updater(option.components) : updater;
        return { ...option, components: nextRows };
      })
    );
  };

  const addMaterialOption = () => {
    const next = createOptionRow();
    setMaterialOptions((current) => [...current, next]);
    setSelectedOptionRowId(next.row_id);
  };

  const removeSelectedMaterialOption = () => {
    if (selectedOptionIndex < 0) return;
    const option = materialOptions[selectedOptionIndex];
    if (option.material_option_id) {
      setRemovedOptionIds((current) => [...current, option.material_option_id as number]);
    }

    const nextOptions = materialOptions.filter((_, index) => index !== selectedOptionIndex);
    if (nextOptions.length === 0) {
      const empty = createOptionRow();
      setMaterialOptions([empty]);
      setSelectedOptionRowId(empty.row_id);
      return;
    }

    setMaterialOptions(nextOptions);
    setSelectedOptionRowId(nextOptions[Math.max(0, selectedOptionIndex - 1)].row_id);
  };

  const validateMaterialOptionBeforeSave = (option: MaterialOptionForm, parentMaterialId: number): string | null => {
    if (!option.option_code.trim()) return 'Option code is required';
    if (!option.option_name.trim()) return 'Option name is required';
    if (!option.option_type_id) return 'Option type is required';
    if (!option.components.length) return 'At least one component is required';

    const seen = new Set<string>();
    for (const component of option.components) {
      if (!component.component_material_id) return 'Component material is required';
      if (Number(component.component_material_id) === parentMaterialId) {
        return 'Component material cannot be the same as parent material';
      }
      if (seen.has(component.component_material_id)) {
        return 'Duplicate component materials are not allowed';
      }
      seen.add(component.component_material_id);

      const qty = Number(component.required_quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return 'Component quantity must be greater than zero';
      }
      if (!component.uom_id) {
        return 'Component UOM is required';
      }
    }

    return null;
  };

  const syncMaterialOptions = async (materialId: number) => {
    for (const optionId of removedOptionIds) {
      await materialOptionApi.delete(materialId, optionId);
    }

    for (const option of materialOptions) {
      const hasMeaningfulData =
        option.option_code.trim() ||
        option.option_name.trim() ||
        option.option_type_id ||
        option.components.some((component) => component.component_material_id || component.required_quantity || component.uom_id || component.notes);

      if (!hasMeaningfulData) {
        continue;
      }

      const validationError = validateMaterialOptionBeforeSave(option, materialId);
      if (validationError) {
        throw new Error(`Material option ${option.option_code || option.option_name || 'draft'}: ${validationError}`);
      }

      const payload = {
        option_code: option.option_code.trim(),
        option_name: option.option_name.trim(),
        option_type_id: parseInt(option.option_type_id, 10),
        requires_approval: option.requires_approval,
        is_active: option.is_active,
        notes: option.notes || null,
        components: option.components.map((component) => {
          const detailId = Number(component.material_option_detail_id);
          return {
            ...(Number.isInteger(detailId) && detailId > 0
              ? { material_option_detail_id: detailId }
              : {}),
            component_material_id: parseInt(component.component_material_id, 10),
            required_quantity: Number(component.required_quantity),
            uom_id: parseInt(component.uom_id, 10),
            notes: component.notes || null,
          };
        }),
      };

      if (option.material_option_id) {
        await materialOptionApi.update(materialId, option.material_option_id, payload);
      } else {
        await materialOptionApi.create(materialId, payload);
      }
    }
  };

  const componentMaterialChoices = useMemo(() => {
    const editingIdNum = editingMaterialId ? Number(editingMaterialId) : null;
    return componentMaterialOptions
      .filter((material) => (editingIdNum ? Number(material.material_id) !== editingIdNum : true))
      .map((material) => ({
        value: String(material.material_id),
        label: `${material.product_code} - ${material.product_name}${material.full_description ? ` - ${material.full_description}` : ''}`,
        stock_uom_id: material.stock_uom_id ? String(material.stock_uom_id) : '',
      }));
  }, [componentMaterialOptions, editingMaterialId]);

  const renderComponentMaterialEditCell = (params: GridRenderEditCellParams<MaterialOptionComponentFormRow>) => {
    const selected = componentMaterialChoices.find((item) => item.value === String(params.value || '')) || null;

    return (
      <Autocomplete
        size="small"
        options={componentMaterialChoices}
        value={selected}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        getOptionLabel={(option) => option.label}
        onInputChange={(_, value, reason) => {
          if (reason === 'input' || reason === 'clear') {
            setComponentMaterialQuery(value);
          }
        }}
        onChange={async (_, option) => {
          await params.api.setEditCellValue({
            id: params.id,
            field: params.field,
            value: option ? option.value : '',
          });

          if (option?.stock_uom_id) {
            await params.api.setEditCellValue({
              id: params.id,
              field: 'uom_id',
              value: option.stock_uom_id,
            });
          }

          params.api.stopCellEditMode({ id: params.id, field: params.field });
        }}
        renderInput={(inputParams) => (
          <TextField
            {...inputParams}
            autoFocus
            variant="standard"
            placeholder="Search component material"
          />
        )}
        sx={{ width: '100%' }}
      />
    );
  };

  const optionComponentColumns = useMemo<GridColDef<MaterialOptionComponentFormRow>[]>(() => {
    const uomChoices = uoms.map((uom) => ({
      value: String(uom.uom_id),
      label: `${uom.uom_name}${uom.abbreviation ? ` (${uom.abbreviation})` : ''}`,
    }));

    return [
      {
        field: 'component_material_id',
        headerName: 'Component Material',
        minWidth: 360,
        flex: 1.6,
        editable: true,
        renderCell: (params) => {
          const match = componentMaterialChoices.find((item) => item.value === String(params.value || ''));
          return <>{match?.label || ''}</>;
        },
        renderEditCell: renderComponentMaterialEditCell,
      },
      {
        field: 'required_quantity',
        headerName: 'Required Qty',
        minWidth: 140,
        flex: 0.6,
        editable: true,
      },
      {
        field: 'uom_id',
        headerName: 'UOM',
        minWidth: 180,
        flex: 0.8,
        editable: true,
        type: 'singleSelect',
        valueOptions: uomChoices,
      },
      {
        field: 'notes',
        headerName: 'Notes',
        minWidth: 220,
        flex: 1,
        editable: true,
      },
    ];
  }, [uoms, componentMaterialChoices]);

  const validateOptionComponentRow = (
    row: MaterialOptionComponentFormRow,
    rows: MaterialOptionComponentFormRow[]
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    const parentMaterialId = editingMaterialId ? Number(editingMaterialId) : null;

    if (!row.component_material_id) {
      errors.component_material_id = 'Component material is required';
    }

    if (parentMaterialId && Number(row.component_material_id) === parentMaterialId) {
      errors.component_material_id = 'Parent material cannot be used as its own component';
    }

    const duplicateCount = rows.filter(
      (candidate) =>
        candidate.component_material_id && candidate.component_material_id === row.component_material_id
    ).length;
    if (row.component_material_id && duplicateCount > 1) {
      errors.component_material_id = 'Duplicate component material is not allowed';
    }

    const qty = Number(row.required_quantity);
    if (!row.required_quantity || Number.isNaN(qty) || qty <= 0) {
      errors.required_quantity = 'Quantity must be greater than zero';
    }

    if (!row.uom_id) {
      errors.uom_id = 'UOM is required';
    }

    return errors;
  };

  const resetForm = () => {
    setFormData({
      product_code: '',
      product_name: '',
      category_id: '',
      sub_category_id: '',
      stock_uom_id: '',
      material_type_id: '',
      brand_ids: [],
      status_id: '',
      notes: '',
      material_specification: {
        primary_size: '',
        secondary_size: '',
        alternate_size: '',
        thickness_or_gauge: '',
        width: '',
        length: '',
        schedule: '',
        pressure_or_load_rating: '',
      },
    });
    setMaterialOptions([]);
    setSelectedOptionRowId('');
    setRemovedOptionIds([]);
    setComponentMaterialQuery('');
    setComponentMaterialOptions([]);
    setSubCategories([]);
    setExpandedSpecSection(false);
    setExpandedOptionSection(false);
  };

  const handleDialogClose = () => {
    resetForm();
    setShowDialog(false);
    setEditingMaterialId(null);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setEditingMaterialId(null);
    setShowDialog(true);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#0b2748' }}>
          Materials Catalog
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Add Material
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }} />}

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by code or name..."
            value={basicSearch}
            onChange={(e) => setBasicSearch(e.target.value)}
            size="small"
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#666' }} /> }}
            sx={{ flex: 1, minWidth: 250 }}
          />
          <Button
            variant={showAdvancedFilters ? 'contained' : 'outlined'}
            startIcon={<FilterAltIcon />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            Filters
          </Button>
        </Box>

        {showAdvancedFilters && (
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Autocomplete
              size="small"
              options={categories}
              value={categories.find((c) => String(c.category_id) === String(advancedFilters.category_id)) || null}
              onChange={(_, value) =>
                setAdvancedFilters({
                  ...advancedFilters,
                  category_id: value ? String(value.category_id) : '',
                  sub_category_id: '',
                })
              }
              onInputChange={(_, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  setCategoryQuery(value);
                }
              }}
              getOptionLabel={(option) => option?.category_code ? `${option.category_code} - ${option.category_name}` : (option?.category_name || '')}
              renderInput={(params) => <TextField {...params} placeholder="Category" />}
            />

            <Autocomplete
              size="small"
              options={subCategories}
              value={subCategories.find((s) => String(s.sub_category_id) === String(advancedFilters.sub_category_id)) || null}
              onChange={(_, value) =>
                setAdvancedFilters({ ...advancedFilters, sub_category_id: value ? String(value.sub_category_id) : '' })
              }
              onInputChange={(_, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  setSubCategoryQuery(value);
                }
              }}
              getOptionLabel={(option) => option?.sub_category_code ? `${option.sub_category_code} - ${option.sub_category_name}` : (option?.sub_category_name || '')}
              renderInput={(params) => <TextField {...params} placeholder="Sub Category" />}
              disabled={!advancedFilters.category_id}
            />

            <Select
              value={advancedFilters.status_id}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, status_id: e.target.value })}
              size="small"
              displayEmpty
              renderValue={(value) => value ? statuses.find(s => s.look_up_id === value)?.name || 'Status' : 'Status'}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {statuses.map((status) => (
                <MenuItem key={status.look_up_id} value={status.look_up_id}>
                  {status.name}
                </MenuItem>
              ))}
            </Select>

            <Autocomplete
              size="small"
              options={uoms}
              value={uoms.find((u) => String(u.uom_id) === String(advancedFilters.uom_id)) || null}
              onChange={(_, value) => setAdvancedFilters({ ...advancedFilters, uom_id: value ? String(value.uom_id) : '' })}
              onInputChange={(_, value, reason) => {
                if (reason === 'input' || reason === 'clear') {
                  setUomQuery(value);
                }
              }}
              getOptionLabel={(option) => option?.uom_name || ''}
              renderInput={(params) => <TextField {...params} placeholder="UOM" />}
            />
          </Box>
        )}
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : materials.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            No materials found
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #E1DFDD' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F5F7FA' }}>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Product Code</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Full Description</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Sub Category</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Unit</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#0b2748' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.map((material) => (
                <TableRow key={material.material_id} sx={{ '&:hover': { backgroundColor: '#F5F7FA' } }}>
                  <TableCell>{material.product_code}</TableCell>
                  <TableCell>{material.product_name}</TableCell>
                  <TableCell>{material.full_description || '-'}</TableCell>
                  <TableCell>{material.category_name}</TableCell>
                  <TableCell>{material.sub_category_name || '-'}</TableCell>
                  <TableCell>{material.uom_name}</TableCell>
                  <TableCell>
                    <Chip label={material.status_name} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditMaterial(material.material_id)}
                          aria-label="Edit material"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteMaterial(material.material_id)}
                          aria-label="Delete material"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#0b2748' }}>
          {editingMaterialId ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }} />}
          
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Basic Information */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
              Basic Information
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Product Code"
                name="product_code"
                value={formData.product_code}
                onChange={handleFormChange}
                disabled
                helperText={editingMaterialId ? 'Generated product code' : 'Product code will be generated after save'}
                size="small"
              />
              <TextField
                label="Product Name"
                name="product_name"
                value={formData.product_name}
                onChange={handleFormChange}
                required
                size="small"
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Autocomplete
                size="small"
                options={categories}
                value={categories.find((c) => String(c.category_id) === String(formData.category_id)) || null}
                onChange={(_, value) => handleCategoryChange(value ? String(value.category_id) : '')}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setCategoryQuery(value);
                  }
                }}
                getOptionLabel={(option) => option?.category_code ? `${option.category_code} - ${option.category_name}` : (option?.category_name || '')}
                renderInput={(params) => <TextField {...params} label="Category" required />}
              />
              <Autocomplete
                size="small"
                options={subCategories}
                value={subCategories.find((s) => String(s.sub_category_id) === String(formData.sub_category_id)) || null}
                onChange={(_, value) => setFormData({ ...formData, sub_category_id: value ? String(value.sub_category_id) : '' })}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setSubCategoryQuery(value);
                  }
                }}
                getOptionLabel={(option) => option?.sub_category_code ? `${option.sub_category_code} - ${option.sub_category_name}` : (option?.sub_category_name || '')}
                renderInput={(params) => <TextField {...params} label="Sub Category" />}
                disabled={!formData.category_id}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Autocomplete
                size="small"
                options={uoms}
                value={uoms.find((u) => String(u.uom_id) === String(formData.stock_uom_id)) || null}
                onChange={(_, value) => setFormData({ ...formData, stock_uom_id: value ? String(value.uom_id) : '' })}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setUomQuery(value);
                  }
                }}
                getOptionLabel={(option) => option?.uom_name ? `${option.uom_name}${option.abbreviation ? ` (${option.abbreviation})` : ''}` : ''}
                renderInput={(params) => <TextField {...params} label="UOM" required />}
              />
              <Autocomplete
                size="small"
                options={materialTypes}
                value={materialTypes.find((mt) => String(mt.material_type_id) === String(formData.material_type_id)) || null}
                onChange={(_, value) => setFormData({ ...formData, material_type_id: value ? String(value.material_type_id) : '' })}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setMaterialTypeQuery(value);
                  }
                }}
                getOptionLabel={(option) => option?.material_type_name || ''}
                renderInput={(params) => <TextField {...params} label="Material Type" />}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Autocomplete
                multiple
                size="small"
                options={brands}
                value={brands.filter((b) => formData.brand_ids.includes(String(b.brand_id)))}
                onChange={(_, value) =>
                  setFormData({
                    ...formData,
                    brand_ids: (value || []).map((item) => String(item.brand_id)),
                  })
                }
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setBrandQuery(value);
                  }
                }}
                getOptionLabel={(option) => option?.brand_name || ''}
                isOptionEqualToValue={(option, value) => String(option.brand_id) === String(value.brand_id)}
                renderInput={(params) => <TextField {...params} label="Brands" />}
              />
            </Box>

            {editingMaterialId && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Select
                  value={formData.status_id}
                  onChange={(e) => setFormData({ ...formData, status_id: e.target.value })}
                  displayEmpty
                  required
                  size="small"
                  renderValue={(value) => value ? statuses.find(s => s.look_up_id === value)?.name || 'Select' : 'Status *'}
                >
                  <MenuItem value="">Select a status</MenuItem>
                  {statuses.map((status) => (
                    <MenuItem key={status.look_up_id} value={status.look_up_id}>
                      {status.name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            <TextField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              multiline
              rows={2}
              size="small"
            />

            {/* Material Specification Section */}
            <Button
              onClick={() => setExpandedSpecSection(!expandedSpecSection)}
              sx={{ justifyContent: 'flex-start', fontWeight: 600, color: '#0b2748' }}
            >
              {expandedSpecSection ? '▼' : '▶'} Material Specification
            </Button>

            {expandedSpecSection && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pl: 2, pt: 1, borderLeft: '2px solid #E1DFDD' }}>
                <TextField
                  label="Primary Size"
                  name="spec_primary_size"
                  value={formData.material_specification.primary_size}
                  onChange={handleFormChange}
                  size="small"
                />
                <TextField
                  label="Secondary Size"
                  name="spec_secondary_size"
                  value={formData.material_specification.secondary_size}
                  onChange={handleFormChange}
                  size="small"
                />
                <TextField
                  label="Alternate Size"
                  name="spec_alternate_size"
                  value={formData.material_specification.alternate_size}
                  onChange={handleFormChange}
                  size="small"
                />
                <TextField
                  label="Thickness/Gauge"
                  name="spec_thickness_or_gauge"
                  value={formData.material_specification.thickness_or_gauge}
                  onChange={handleFormChange}
                  size="small"
                />
                <TextField
                  label="Width"
                  name="spec_width"
                  value={formData.material_specification.width}
                  onChange={handleFormChange}
                  size="small"
                />
                <TextField
                  label="Length"
                  name="spec_length"
                  value={formData.material_specification.length}
                  onChange={handleFormChange}
                  size="small"
                />
                <TextField
                  label="Schedule"
                  name="spec_schedule"
                  value={formData.material_specification.schedule}
                  onChange={handleFormChange}
                  size="small"
                />
                <TextField
                  label="Pressure/Load Rating"
                  name="spec_pressure_or_load_rating"
                  value={formData.material_specification.pressure_or_load_rating}
                  onChange={handleFormChange}
                  size="small"
                />
              </Box>
            )}

            {/* Material Option Section - Only in Edit Mode */}
            {editingMaterialId && (
              <>
                <Button
                  onClick={() => setExpandedOptionSection(!expandedOptionSection)}
                  sx={{ justifyContent: 'flex-start', fontWeight: 600, color: '#0b2748' }}
                >
                  {expandedOptionSection ? '▼' : '▶'} Material Options
                </Button>

                {expandedOptionSection && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2, pt: 1, borderLeft: '2px solid #E1DFDD' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Select
                        value={selectedOptionRowId}
                        onChange={(e) => setSelectedOptionRowId(String(e.target.value))}
                        size="small"
                        sx={{ minWidth: 320 }}
                      >
                        {materialOptions.map((option, index) => (
                          <MenuItem key={option.row_id} value={option.row_id}>
                            {(option.option_code || `Option ${index + 1}`) + (option.option_name ? ` - ${option.option_name}` : '')}
                          </MenuItem>
                        ))}
                      </Select>
                      <Button variant="outlined" size="small" onClick={addMaterialOption}>
                        Add Option
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={removeSelectedMaterialOption}
                        disabled={!selectedOption}
                      >
                        Remove Option
                      </Button>
                    </Box>

                    {selectedOption && (
                      <>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <TextField
                            label="Option Code"
                            value={selectedOption.option_code}
                            onChange={(e) => setSelectedOptionPatch({ option_code: e.target.value })}
                            size="small"
                          />
                          <TextField
                            label="Option Name"
                            value={selectedOption.option_name}
                            onChange={(e) => setSelectedOptionPatch({ option_name: e.target.value })}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <Select
                            value={selectedOption.option_type_id}
                            onChange={(e) => setSelectedOptionPatch({ option_type_id: String(e.target.value) })}
                            displayEmpty
                            size="small"
                            renderValue={(value) => value ? optionTypes.find(o => String(o.look_up_id) === String(value))?.name || 'Select' : 'Option Type'}
                          >
                            <MenuItem value="">Select type</MenuItem>
                            {optionTypes.map((type) => (
                              <MenuItem key={type.look_up_id} value={type.look_up_id}>
                                {type.name}
                              </MenuItem>
                            ))}
                          </Select>
                          <TextField
                            label="Option Notes"
                            value={selectedOption.notes}
                            onChange={(e) => setSelectedOptionPatch({ notes: e.target.value })}
                            multiline
                            rows={2}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedOption.requires_approval}
                                onChange={(e) => setSelectedOptionPatch({ requires_approval: e.target.checked })}
                              />
                            }
                            label="Requires Approval"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedOption.is_active}
                                onChange={(e) => setSelectedOptionPatch({ is_active: e.target.checked })}
                              />
                            }
                            label="Is Active"
                          />
                        </Box>

                        <EditableLineItemsGrid
                          rows={selectedOption.components}
                          setRows={setSelectedOptionComponents}
                          columns={optionComponentColumns}
                          createRow={createComponentRow}
                          getRowId={(row) => row.row_id}
                          processRowUpdate={(newRow) => newRow}
                          validateRow={validateOptionComponentRow}
                          shouldConfirmDelete={(row) => Boolean(row.material_option_detail_id)}
                          getDeleteConfirmMessage={() => 'Delete this component row?'}
                          addRowLabel="Add Component"
                          focusField="component_material_id"
                          totals={{
                            totalItems: selectedOption.components.length,
                            totalQuantity: selectedOption.components.reduce(
                              (sum, row) => sum + (Number(row.required_quantity) || 0),
                              0
                            ),
                          }}
                        />
                      </>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={editingMaterialId ? handleUpdateMaterial : handleAddMaterial}
            variant="contained"
            color="primary"
          >
            {editingMaterialId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
