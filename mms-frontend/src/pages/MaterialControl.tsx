import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { accountApi, lookupApi, materialApi, materialControlApi, materialControlItemApi, projectApi, uomApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';

type SortField = 'control_code' | 'project_code' | 'project_name' | 'budget' | 'total_estimated_cost' | 'status_name' | 'created_at' | 'reviewed_at';
type SortDir = 'asc' | 'desc';

interface LookupItem {
  look_up_id: number;
  code: string;
  name: string;
}

interface ProjectItem {
  party_id: number;
  party_code: string;
  party_name: string;
}

interface MaterialControlItem {
  material_control_id: number;
  project_id: number;
  project_code: string;
  project_name: string;
  control_code: string;
  budget: string;
  total_estimated_cost: string | null;
  status_id: number;
  status_name: string;
  notes: string | null;
  reviewed_by_account_id: number | null;
  reviewed_by_account_name: string | null;
  log_date_reviewed: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface FormState {
  project_id: string;
  control_code: string;
  budget: string;
  total_estimated_cost: string;
  status_id: string;
  notes: string;
}

interface DetailRow {
  material_control_item_id?: number;
  material_id: string;
  material_code?: string;
  material_name?: string;
  estimated_quantity: string;
  uom_id: string;
  uom_name?: string;
  uom_abbreviation?: string;
  estimated_unit_cost: string;
  estimated_total_cost: string;
  remarks: string;
  line_no: string;
}

const emptyForm = (): FormState => ({
  project_id: '',
  control_code: '',
  budget: '',
  total_estimated_cost: '',
  status_id: '',
  notes: '',
});

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

function formatNumber(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function MaterialControlPage() {
  const { account } = useAuth();
  const [items, setItems] = useState<MaterialControlItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectQuery, setProjectQuery] = useState('');
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [filters, setFilters] = useState({ project_id: '', status_id: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<MaterialControlItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MaterialControlItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [permissions, setPermissions] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [importTargetId, setImportTargetId] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [detailMaterials, setDetailMaterials] = useState<any[]>([]);
  const [detailMaterialQuery, setDetailMaterialQuery] = useState('');
  const [detailUoms, setDetailUoms] = useState<any[]>([]);
  const [detailForm, setDetailForm] = useState({
    material_id: '',
    estimated_quantity: '',
    uom_id: '',
    estimated_unit_cost: '',
    estimated_total_cost: '',
    remarks: '',
    line_no: '',
  });
  const [editingDetailIndex, setEditingDetailIndex] = useState<number | null>(null);
  const [detailError, setDetailError] = useState('');

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Material Control:VIEW');
  const canCreate = permissionSet.has('Material Control:CREATE');
  const canUpdate = permissionSet.has('Material Control:UPDATE');
  const canDelete = permissionSet.has('Material Control:DELETE');

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [account?.account_id]);

  useEffect(() => {
    void loadItems();
  }, [canView, page, rowsPerPage, search, sortBy, sortDir, filters.project_id, filters.status_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void projectApi
        .list(100, 0, projectQuery)
        .then((data) => setProjects(Array.isArray(data?.items) ? data.items : []))
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [projectQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void materialApi
        .list(100, 0, { search: detailMaterialQuery || undefined })
        .then((data) => setDetailMaterials(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []))
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [detailMaterialQuery]);

  const loadPermissions = async () => {
    if (!account?.account_id) {
      setPermissions([]);
      return;
    }

    try {
      const permissionData = await accountApi.getPermissions(account.account_id);
      setPermissions(
        Array.isArray(permissionData)
          ? permissionData.map((item: { module_name: string; permission_code: string }) => `${item.module_name}:${item.permission_code}`)
          : []
      );
    } catch {
      setPermissions([]);
    }
  };

  const loadLookups = async () => {
    try {
      const [projectData, statusData] = await Promise.all([
        projectApi.list(100, 0).catch(() => ({ items: [] })),
        lookupApi.listByType('material_control_status', 100),
      ]);

      setProjects(Array.isArray(projectData?.items) ? projectData.items : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load lookup values');
    }
  };

  const loadItems = async () => {
    if (!canView) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await materialControlApi.list(rowsPerPage, page * rowsPerPage, {
        search: search || undefined,
        project_id: filters.project_id ? Number(filters.project_id) : undefined,
        status_id: filters.status_id ? Number(filters.status_id) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotal(result?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load material controls');
    } finally {
      setLoading(false);
    }
  };

  const resetDetailForm = () => {
    setDetailForm({
      material_id: '',
      estimated_quantity: '',
      uom_id: '',
      estimated_unit_cost: '',
      estimated_total_cost: '',
      remarks: '',
      line_no: '',
    });
    setEditingDetailIndex(null);
    setDetailError('');
  };

  const loadDetailLookups = async () => {
    try {
      const [materialsData, uomsData] = await Promise.all([
        materialApi.list(100, 0).catch(() => ({ items: [] })),
        uomApi.list(100, 0).catch(() => ({ items: [] })),
      ]);

      setDetailMaterials(Array.isArray(materialsData?.items) ? materialsData.items : []);
      setDetailUoms(Array.isArray(uomsData?.items) ? uomsData.items : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load detail lookups');
    }
  };

  const loadDetailRows = async (controlId: number) => {
    if (!controlId) {
      setDetailRows([]);
      return;
    }

    try {
      const result = await materialControlItemApi.list(100, 0, { material_control_id: controlId });
      setDetailRows(
        Array.isArray(result?.items)
          ? result.items.map((row: any) => ({
              material_control_item_id: row.material_control_item_id,
              material_id: row.material_id?.toString() || '',
              material_code: row.material_code,
              material_name: row.material_name,
              estimated_quantity: row.estimated_quantity ?? '',
              uom_id: row.uom_id?.toString() || '',
              uom_name: row.uom_name,
              uom_abbreviation: row.uom_abbreviation,
              estimated_unit_cost: row.estimated_unit_cost ?? '',
              estimated_total_cost: row.estimated_total_cost ?? '',
              remarks: row.remarks ?? '',
              line_no: row.line_no?.toString() || '',
            }))
          : []
      );
    } catch (err: any) {
      setDetailRows([]);
      setError(err.message || 'Failed to load material control items');
    }
  };

  const openCreate = async () => {
    setEditingId(null);
    setForm(emptyForm());
    setDetailRows([]);
    resetDetailForm();
    setDialogOpen(true);
    await loadDetailLookups();
  };

  const openEdit = async (item: MaterialControlItem) => {
    setEditingId(item.material_control_id);
    setForm({
      project_id: item.project_id.toString(),
      control_code: item.control_code,
      budget: item.budget?.toString?.() ?? String(item.budget ?? ''),
      total_estimated_cost: item.total_estimated_cost ?? '',
      status_id: item.status_id.toString(),
      notes: item.notes ?? '',
    });
    resetDetailForm();
    setDialogOpen(true);
    await loadDetailLookups();
    await loadDetailRows(item.material_control_id);
  };

  const openView = async (item: MaterialControlItem) => {
    try {
      const detail = await materialControlApi.get(item.material_control_id);
      setViewItem(detail);
      setViewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load material control');
    }
  };

  const openDelete = (item: MaterialControlItem) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  };

  const statusIdByCode = (code: string) => statuses.find((item) => item.code === code)?.look_up_id;

  const handleEditDetailRow = (index: number) => {
    const row = detailRows[index];
    if (!row) {
      return;
    }

    setEditingDetailIndex(index);
    setDetailForm({
      material_id: row.material_id,
      estimated_quantity: row.estimated_quantity,
      uom_id: row.uom_id,
      estimated_unit_cost: row.estimated_unit_cost,
      estimated_total_cost: row.estimated_total_cost,
      remarks: row.remarks,
      line_no: row.line_no,
    });
    setDetailError('');
  };

  const handleRemoveDetailRow = (index: number) => {
    setDetailRows((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (editingDetailIndex === index) {
      resetDetailForm();
    } else if (editingDetailIndex !== null && editingDetailIndex > index) {
      setEditingDetailIndex((current) => (current === null ? null : current - 1));
    }
  };

  const handleSaveDetailRow = () => {
    if (!detailForm.material_id || !detailForm.estimated_quantity || !detailForm.uom_id) {
      setDetailError('Material, quantity, and unit of measure are required');
      return;
    }

    const normalizedLineNo = detailForm.line_no.trim() || String(detailRows.length + 1);
    const nextRow: DetailRow = {
      material_id: detailForm.material_id,
      estimated_quantity: detailForm.estimated_quantity,
      uom_id: detailForm.uom_id,
      estimated_unit_cost: detailForm.estimated_unit_cost,
      estimated_total_cost: detailForm.estimated_total_cost,
      remarks: detailForm.remarks,
      line_no: normalizedLineNo,
    };

    if (editingDetailIndex === null) {
      setDetailRows((current) => [...current, nextRow]);
    } else {
      setDetailRows((current) => current.map((row, index) => (index === editingDetailIndex ? { ...row, ...nextRow } : row)));
    }

    resetDetailForm();
  };

  const submitForm = async () => {
    setSaving(true);
    setError('');

    try {
      const payload = {
        project_id: Number(form.project_id),
        control_code: form.control_code.trim(),
        budget: Number(form.budget),
        total_estimated_cost: form.total_estimated_cost === '' ? null : Number(form.total_estimated_cost),
        status_id: Number(form.status_id),
        notes: form.notes.trim() || null,
      };

      let savedControl: any;
      if (editingId) {
        savedControl = await materialControlApi.update(editingId, payload);
      } else {
        savedControl = await materialControlApi.create(payload);
      }

      const controlId = savedControl?.material_control_id;
      if (!controlId) {
        throw new Error('Material Control could not be saved');
      }

      if (editingId) {
        const existingItemsResult = await materialControlItemApi.list(100, 0, { material_control_id: editingId });
        const existingItems = Array.isArray(existingItemsResult?.items) ? existingItemsResult.items : [];
        for (const item of existingItems) {
          await materialControlItemApi.delete(item.material_control_item_id);
        }
      }

      for (const row of detailRows) {
        if (!row.material_id || !row.estimated_quantity || !row.uom_id) {
          continue;
        }

        await materialControlItemApi.create({
          material_control_id: controlId,
          material_id: Number(row.material_id),
          estimated_quantity: Number(row.estimated_quantity),
          uom_id: Number(row.uom_id),
          estimated_unit_cost: row.estimated_unit_cost === '' ? null : Number(row.estimated_unit_cost),
          estimated_total_cost: row.estimated_total_cost === '' ? null : Number(row.estimated_total_cost),
          remarks: row.remarks.trim() || null,
          line_no: Number(row.line_no || String(detailRows.indexOf(row) + 1)),
        });
      }

      setSuccess(editingId ? 'Material Control updated' : 'Material Control created');
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      setDetailRows([]);
      resetDetailForm();
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save material control');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteItem) {
      return;
    }

    setDeleting(true);
    try {
      await materialControlApi.delete(deleteItem.material_control_id);
      setDeleteOpen(false);
      setDeleteItem(null);
      setSuccess('Material Control deleted');
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material control');
    } finally {
      setDeleting(false);
    }
  };

  const quickTransition = async (statusCode: string) => {
    if (!viewItem) {
      return;
    }

    const statusId = statusIdByCode(statusCode);
    if (!statusId) {
      setError(`Missing ${statusLabelMap[statusCode] || statusCode} status lookup`);
      return;
    }

    try {
      await materialControlApi.update(viewItem.material_control_id, { status_id: statusId });
      setSuccess(`Material Control marked as ${statusLabelMap[statusCode] || statusCode}`);
      setViewOpen(false);
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleImportPreview = async () => {
    if (!importFile) {
      setImportError('Select a file first');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const result = await materialControlItemApi.previewImport(importFile);
      setImportPreview(result.rows || []);
      setImportSummary(result.summary || null);
      setImportTargetId('');
    } catch (err: any) {
      setImportError(err.message || 'Failed to preview import file');
    } finally {
      setImporting(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importTargetId || !importPreview.length) {
      setImportError('Select a material control and preview rows before importing');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const result = await materialControlItemApi.importRows(Number(importTargetId), importPreview.filter((row) => row.classification === 'existing' || (row.classification === 'missing' && row.resolvedMaterialId)));
      setImportSuccess(`Imported ${result.imported} rows`);
      setImportOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setImportSummary(null);
      setImportTargetId('');
      await loadItems();
    } catch (err: any) {
      setImportError(err.message || 'Failed to import material control items');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      const { blob } = await materialControlItemApi.downloadTemplate(format);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = format === 'csv' ? 'material_control_item_import_template.csv' : 'material_control_item_import_template.xlsx';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setImportError(err.message || 'Failed to download template');
    }
  };

  if (!canView) {
    return <Alert severity="error">You do not have permission to view Material Control.</Alert>;
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack spacing={1.5}>
          <Breadcrumbs aria-label="breadcrumb">
            <Typography color="text.secondary">Dashboard</Typography>
            <Typography color="text.secondary">Coordinating Transactions</Typography>
            <Typography color="text.primary" fontWeight={600}>Material Control</Typography>
          </Breadcrumbs>
          <Typography variant="h4" fontWeight={700}>
            Material Control
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage project control records, budgets, and status tracking.
          </Typography>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search control code, project, or notes"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSearch(searchInput.trim());
                    setPage(0);
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                size="small"
                options={projects}
                value={projects.find((project) => String(project.party_id) === String(filters.project_id)) || null}
                onChange={(_, value) => {
                  setFilters((current) => ({ ...current, project_id: value ? String(value.party_id) : '' }));
                  setPage(0);
                }}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setProjectQuery(value);
                  }
                }}
                getOptionLabel={(option) => `${option.party_code} - ${option.party_name}`}
                renderInput={(params) => <TextField {...params} label="Project" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  displayEmpty
                  value={filters.status_id}
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, status_id: event.target.value }));
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {statuses.map((status) => (
                    <MenuItem key={status.look_up_id} value={status.look_up_id.toString()}>
                      {status.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => void loadItems()}
                >
                  Refresh
                </Button>
                {canCreate && (
                  <>
                    <Button variant="outlined" onClick={() => setImportOpen(true)}>
                      Import Items
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => void openCreate()}>
                      New
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper>
        <TableContainer>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel active={sortBy === 'control_code'} direction={sortBy === 'control_code' ? sortDir : 'asc'} onClick={() => handleSort('control_code')}>
                    Control Code
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel active={sortBy === 'project_name'} direction={sortBy === 'project_name' ? sortDir : 'asc'} onClick={() => handleSort('project_name')}>
                    Project
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel active={sortBy === 'budget'} direction={sortBy === 'budget' ? sortDir : 'asc'} onClick={() => handleSort('budget')}>
                    Budget
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel active={sortBy === 'total_estimated_cost'} direction={sortBy === 'total_estimated_cost' ? sortDir : 'asc'} onClick={() => handleSort('total_estimated_cost')}>
                    Estimated Cost
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel active={sortBy === 'status_name'} direction={sortBy === 'status_name' ? sortDir : 'asc'} onClick={() => handleSort('status_name')}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>Reviewed By</TableCell>
                <TableCell>
                  <TableSortLabel active={sortBy === 'created_at'} direction={sortBy === 'created_at' ? sortDir : 'asc'} onClick={() => handleSort('created_at')}>
                    Created
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No material control records found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.material_control_id} hover>
                    <TableCell>{item.control_code}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" fontWeight={600}>{item.project_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.project_code}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{formatNumber(item.budget)}</TableCell>
                    <TableCell align="right">{formatNumber(item.total_estimated_cost)}</TableCell>
                    <TableCell>{item.status_name}</TableCell>
                    <TableCell>{item.reviewed_by_account_name || '-'}</TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => void openView(item)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canUpdate && (
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => void openEdit(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => openDelete(item)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? 'Edit Material Control' : 'New Material Control'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={projects}
                value={projects.find((project) => String(project.party_id) === String(form.project_id)) || null}
                onChange={(_, value) => setForm((current) => ({ ...current, project_id: value ? String(value.party_id) : '' }))}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setProjectQuery(value);
                  }
                }}
                getOptionLabel={(option) => `${option.party_code} - ${option.party_name}`}
                renderInput={(params) => <TextField {...params} label="Project" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Control Code"
                value={form.control_code}
                onChange={(event) => setForm((current) => ({ ...current, control_code: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Budget"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={form.budget}
                onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Total Estimated Cost"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={form.total_estimated_cost}
                onChange={(event) => setForm((current) => ({ ...current, total_estimated_cost: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <Select
                  value={form.status_id}
                  displayEmpty
                  onChange={(event) => setForm((current) => ({ ...current, status_id: event.target.value }))}
                >
                  <MenuItem value="">Select Status</MenuItem>
                  {statuses.map((status) => (
                    <MenuItem key={status.look_up_id} value={status.look_up_id.toString()}>
                      {status.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                minRows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={600}>Line Items</Typography>
                    <Typography variant="body2" color="text.secondary">Add materials directly in this form and save them with the control record.</Typography>
                  </Stack>
                  {detailError && <Alert severity="error">{detailError}</Alert>}
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Autocomplete
                        size="small"
                        options={detailMaterials}
                        value={detailMaterials.find((material) => String(material.material_id) === String(detailForm.material_id)) || null}
                        onChange={(_, value) => setDetailForm((current) => ({ ...current, material_id: value ? String(value.material_id) : '' }))}
                        onInputChange={(_, value, reason) => {
                          if (reason === 'input' || reason === 'clear') {
                            setDetailMaterialQuery(value);
                          }
                        }}
                        getOptionLabel={(option) => `${option.product_code} - ${option.full_description || option.product_name}`}
                        renderInput={(params) => <TextField {...params} label="Material" />}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Qty"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={detailForm.estimated_quantity}
                        onChange={(event) => setDetailForm((current) => ({ ...current, estimated_quantity: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={detailForm.uom_id}
                          displayEmpty
                          onChange={(event) => setDetailForm((current) => ({ ...current, uom_id: event.target.value }))}
                        >
                          <MenuItem value="">Select UOM</MenuItem>
                          {detailUoms.map((uom) => (
                            <MenuItem key={uom.uom_id} value={uom.uom_id.toString()}>
                              {uom.abbreviation || uom.uom_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Unit Cost"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={detailForm.estimated_unit_cost}
                        onChange={(event) => setDetailForm((current) => ({ ...current, estimated_unit_cost: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Total Cost"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        value={detailForm.estimated_total_cost}
                        onChange={(event) => setDetailForm((current) => ({ ...current, estimated_total_cost: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Line No"
                        type="number"
                        inputProps={{ min: 1, step: '1' }}
                        value={detailForm.line_no}
                        onChange={(event) => setDetailForm((current) => ({ ...current, line_no: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Remarks"
                        value={detailForm.remarks}
                        onChange={(event) => setDetailForm((current) => ({ ...current, remarks: event.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={handleSaveDetailRow}>
                          {editingDetailIndex === null ? 'Add Item' : 'Update Item'}
                        </Button>
                        {editingDetailIndex !== null && (
                          <Button variant="outlined" onClick={resetDetailForm}>
                            Cancel
                          </Button>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                  <Divider />
                  {detailRows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No line items yet. Add the first item above.</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Line</TableCell>
                            <TableCell>Material</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>UOM</TableCell>
                            <TableCell>Unit Cost</TableCell>
                            <TableCell>Total Cost</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detailRows.map((row, index) => (
                            <TableRow key={`${row.material_id || 'new'}-${index}`}>
                              <TableCell>{row.line_no}</TableCell>
                              <TableCell>{row.material_name || row.material_code || row.material_id}</TableCell>
                              <TableCell>{row.estimated_quantity}</TableCell>
                              <TableCell>{row.uom_abbreviation || row.uom_name || row.uom_id}</TableCell>
                              <TableCell>{row.estimated_unit_cost}</TableCell>
                              <TableCell>{row.estimated_total_cost}</TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <IconButton size="small" onClick={() => handleEditDetailRow(index)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleRemoveDetailRow(index)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitForm()} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={importOpen} onClose={() => !importing && setImportOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Import Material Control Items</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Upload an Excel or CSV file with Material Code, Material Description, Category, Sub Category, Unit of Measure, Quantity, and Remarks columns.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
              <Button variant="outlined" component="label">
                Choose File
                <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
              </Button>
              <Button variant="outlined" onClick={() => void handleDownloadTemplate('xlsx')}>
                Download XLSX Template
              </Button>
              <Button variant="outlined" onClick={() => void handleDownloadTemplate('csv')}>
                Download CSV Template
              </Button>
            </Stack>
            {importFile && <Typography variant="body2">Selected file: {importFile.name}</Typography>}
            <FormControl fullWidth size="small">
              <Select value={importTargetId} displayEmpty onChange={(event) => setImportTargetId(event.target.value)}>
                <MenuItem value="">Select Material Control</MenuItem>
                {items.map((item) => (
                  <MenuItem key={item.material_control_id} value={item.material_control_id.toString()}>
                    {item.control_code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {importError && <Alert severity="error">{importError}</Alert>}
            {importSuccess && <Alert severity="success">{importSuccess}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" onClick={() => void handleImportPreview()} disabled={importing || !importFile}>
                {importing ? 'Preparing...' : 'Preview'}
              </Button>
              <Button variant="contained" onClick={() => void handleImportSubmit()} disabled={importing || !importPreview.length || !importTargetId}>
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </Stack>
            {importSummary && (
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>Summary</Typography>
                <Typography variant="body2">Existing: {importSummary.existing} • Missing: {importSummary.missing} • Duplicate: {importSummary.duplicate} • Invalid: {importSummary.invalid}</Typography>
              </Box>
            )}
            {importPreview.length > 0 && (
              <TableContainer sx={{ maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Errors</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreview.map((row) => (
                      <TableRow key={`${row.rowNumber}-${row.materialCode}`}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.materialCode || row.materialDescription}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell>{row.classification}</TableCell>
                        <TableCell>{row.validationErrors?.join(', ') || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Material Control Details</DialogTitle>
        <DialogContent dividers>
          {viewItem && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Control Code</Typography><Typography fontWeight={600}>{viewItem.control_code}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Project</Typography><Typography fontWeight={600}>{viewItem.project_code} - {viewItem.project_name}</Typography></Grid>
              <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Budget</Typography><Typography fontWeight={600}>{formatNumber(viewItem.budget)}</Typography></Grid>
              <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Estimated Cost</Typography><Typography fontWeight={600}>{formatNumber(viewItem.total_estimated_cost)}</Typography></Grid>
              <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Status</Typography><Typography fontWeight={600}>{viewItem.status_name}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Reviewed By</Typography><Typography fontWeight={600}>{viewItem.reviewed_by_account_name || '-'}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Reviewed At</Typography><Typography fontWeight={600}>{formatDate(viewItem.log_date_reviewed)}</Typography></Grid>
              <Grid item xs={12}><Typography variant="body2" color="text.secondary">Notes</Typography><Typography>{viewItem.notes || '-'}</Typography></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {canUpdate && viewItem && (
              <>
                <Button onClick={() => void quickTransition('submitted')}>Submit</Button>
                <Button onClick={() => void quickTransition('approved')}>Approve</Button>
                <Button onClick={() => void quickTransition('rejected')}>Reject</Button>
                <Button onClick={() => void quickTransition('cancelled')}>Cancel</Button>
                <Button onClick={() => void quickTransition('closed')}>Close</Button>
              </>
            )}
          </Stack>
          <Button variant="contained" onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogTitle>Delete Material Control</DialogTitle>
        <DialogContent>
          <Typography>
            Delete {deleteItem?.control_code || 'this record'}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void submitDelete()} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" sx={{ width: '100%' }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}