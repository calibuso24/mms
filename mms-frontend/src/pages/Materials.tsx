import { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { materialApi, materialTypeApi, categoryApi, subCategoryApi, brandApi, uomApi, lookupApi } from '../shared/api/client.js';

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
  material_option?: {
    material_option_id?: number;
    option_code?: string;
    option_name?: string;
    option_type_id?: string;
    requires_approval?: boolean;
    is_active?: boolean;
    notes?: string;
  };
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [materialTypes, setMaterialTypes] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [optionTypes, setOptionTypes] = useState<any[]>([]);
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
    material_option: {
      option_code: '',
      option_name: '',
      option_type_id: '',
      requires_approval: true,
      is_active: true,
      notes: '',
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
    } else if (name.startsWith('option_')) {
      const optionField = name.replace('option_', '');
      const checkedValue = type === 'checkbox' ? checked : value;
      setFormData({
        ...formData,
        material_option: {
          ...formData.material_option,
          [optionField]: checkedValue,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
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

      if (formData.material_option?.option_code) {
        submitData.material_option = {
          option_code: formData.material_option.option_code,
          option_name: formData.material_option.option_name,
          option_type_id: formData.material_option.option_type_id ? parseInt(formData.material_option.option_type_id) : undefined,
          requires_approval: formData.material_option.requires_approval,
          is_active: formData.material_option.is_active,
          notes: formData.material_option.notes,
        };
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
      const material = await materialApi.get(parseInt(materialId));
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
        material_option: material.material_options?.[0] ? {
          material_option_id: material.material_options[0].material_option_id,
          option_code: material.material_options[0].option_code,
          option_name: material.material_options[0].option_name,
          option_type_id: material.material_options[0].option_type_id?.toString() || '',
          requires_approval: material.material_options[0].requires_approval ?? true,
          is_active: material.material_options[0].is_active ?? true,
          notes: material.material_options[0].notes || '',
        } : {
          option_code: '',
          option_name: '',
          option_type_id: '',
          requires_approval: true,
          is_active: true,
          notes: '',
        },
      });
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

      if (formData.material_option?.material_option_id || formData.material_option?.option_code) {
        submitData.material_option = {
          material_option_id: formData.material_option.material_option_id,
          option_code: formData.material_option.option_code,
          option_name: formData.material_option.option_name,
          option_type_id: formData.material_option.option_type_id ? parseInt(formData.material_option.option_type_id) : undefined,
          requires_approval: formData.material_option.requires_approval,
          is_active: formData.material_option.is_active,
          notes: formData.material_option.notes,
        };
      }

      await materialApi.update(parseInt(editingMaterialId), submitData);
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
      material_option: {
        option_code: '',
        option_name: '',
        option_type_id: '',
        requires_approval: true,
        is_active: true,
        notes: '',
      },
    });
    setSubCategories([]);
    setExpandedSpecSection(false);
    setExpandedOptionSection(false);
  };

  const handleDialogClose = () => {
    resetForm();
    setShowDialog(false);
    setEditingMaterialId(null);
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
          onClick={() => setShowDialog(true)}
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
                  {expandedOptionSection ? '▼' : '▶'} Material Option
                </Button>

                {expandedOptionSection && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2, pt: 1, borderLeft: '2px solid #E1DFDD' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField
                        label="Option Code"
                        name="option_code"
                        value={formData.material_option?.option_code || ''}
                        onChange={handleFormChange}
                        disabled={!!formData.material_option?.material_option_id}
                        size="small"
                      />
                      <TextField
                        label="Option Name"
                        name="option_name"
                        value={formData.material_option?.option_name || ''}
                        onChange={handleFormChange}
                        size="small"
                      />
                    </Box>

                    <Select
                      value={formData.material_option?.option_type_id || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        material_option: {
                          ...formData.material_option,
                          option_type_id: e.target.value,
                        },
                      })}
                      displayEmpty
                      size="small"
                      renderValue={(value) => value ? optionTypes.find(o => o.look_up_id === value)?.name || 'Select' : 'Option Type'}
                    >
                      <MenuItem value="">Select type</MenuItem>
                      {optionTypes.map((type) => (
                        <MenuItem key={type.look_up_id} value={type.look_up_id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="option_requires_approval"
                            checked={formData.material_option?.requires_approval ?? true}
                            onChange={handleFormChange}
                          />
                        }
                        label="Requires Approval"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="option_is_active"
                            checked={formData.material_option?.is_active ?? true}
                            onChange={handleFormChange}
                          />
                        }
                        label="Is Active"
                      />
                    </Box>

                    <TextField
                      label="Option Notes"
                      name="option_notes"
                      value={formData.material_option?.notes || ''}
                      onChange={handleFormChange}
                      multiline
                      rows={2}
                      size="small"
                    />
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
