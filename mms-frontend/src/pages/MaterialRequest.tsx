import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Autocomplete,
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
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
import { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { accountApi, lookupApi, materialApi, materialRequestApi, projectApi, uomApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

type SortField = 'mr_number' | 'project_code' | 'project_name' | 'status_name' | 'requested_at' | 'created_at' | 'item_count';
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

interface MaterialItem {
  material_id: number;
  product_code: string;
  product_name: string;
  full_description?: string | null;
  brand_name?: string | null;
  specification_name?: string | null;
  stock_uom_id?: number | null;
}

interface UomItem {
  uom_id: number;
  uom_name: string;
  abbreviation: string;
}

interface RequestItemForm {
  row_id: string;
  material_request_item_id?: number;
  updated_at?: string | null;
  material_id: string;
  description: string;
  specification: string;
  brand: string;
  requested_quantity: string;
  approved_quantity: string;
  estimated_quantity: string;
  area_usage: string;
  remarks: string;
  uom_id: string;
  notes: string;
}

interface MaterialRequestItemView {
  material_request_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  requested_quantity: string;
  approved_quantity: string | null;
  estimated_quantity: string | null;
  area_usage: string | null;
  remarks: string | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  notes: string | null;
  updated_at: string | null;
}

interface MaterialRequestItemList {
  material_request_id: number;
  mr_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  status_id: number;
  status_name: string;
  requested_by_account_name: string | null;
  requested_at: string | null;
  date_prepared: string | null;
  date_received: string | null;
  stock_checked: boolean;
  ceo_approval_required: boolean;
  ceo_approved: boolean | null;
  ceo_approved_by_name: string | null;
  ceo_approved_at: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

interface MaterialRequestDetail extends MaterialRequestItemList {
  items: MaterialRequestItemView[];
}

interface FormState {
  project_id: string;
  status_id: string;
  requested_at: string;
  date_prepared: string;
  date_received: string;
  stock_checked: boolean;
  ceo_approval_required: boolean;
  notes: string;
  items: RequestItemForm[];
}

const emptyItem = (): RequestItemForm => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  material_request_item_id: undefined,
  material_id: '',
  description: '',
  specification: '',
  brand: '',
  requested_quantity: '',
  approved_quantity: '',
  estimated_quantity: '',
  area_usage: '',
  remarks: '',
  uom_id: '',
  notes: '',
});

const emptyForm = (): FormState => ({
  project_id: '',
  status_id: '',
  requested_at: '',
  date_prepared: '',
  date_received: '',
  stock_checked: false,
  ceo_approval_required: false,
  notes: '',
  items: [emptyItem()],
});

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  closed: 'Closed',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatNumber(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function MaterialRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const baseRoute = '/app/coordinating/material-request';
  const routeMode = location.pathname.endsWith('/new') ? 'new' : (params.id ? 'edit' : 'list');
  const routeEditId = routeMode === 'edit' ? Number(params.id) : null;

  const { account } = useAuth();
  const [items, setItems] = useState<MaterialRequestItemList[]>([]);
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
  const [sortBy, setSortBy] = useState<SortField>('requested_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState({ project_id: '', status_id: '' });
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectQuery, setProjectQuery] = useState('');
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [uoms, setUoms] = useState<UomItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<MaterialRequestDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<MaterialRequestItemList | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingVersion, setEditingVersion] = useState<string | null>(null);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Material Request:VIEW');
  const canCreate = permissionSet.has('Material Request:CREATE');
  const canUpdate = permissionSet.has('Material Request:UPDATE');
  const canDelete = permissionSet.has('Material Request:DELETE');
  const canApprove = permissionSet.has('Material Request:APPROVE');

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
    if (routeMode === 'new') {
      setEditingId(null);
      setForm(emptyForm());
      setEditingVersion(null);
      setError('');
      return;
    }

    if (routeMode === 'edit' && routeEditId && editingId !== routeEditId) {
      void openEditById(routeEditId);
      return;
    }

    if (routeMode === 'list') {
      setEditingId(null);
      setEditingVersion(null);
    }
  }, [routeMode, routeEditId]);

  const loadPermissions = async () => {
    if (!account?.account_id) {
      setPermissions([]);
      return;
    }

    try {
      const permissionData = await accountApi.getPermissions(account.account_id);
      setPermissions(Array.isArray(permissionData) ? permissionData.map((item: { module_name: string; permission_code: string }) => `${item.module_name}:${item.permission_code}`) : []);
    } catch {
      setPermissions([]);
    }
  };

  const loadLookups = async () => {
    try {
      const [projectData, statusData, materialData, uomData] = await Promise.all([
        projectApi.list(100, 0).catch(() => ({ items: [] })),
        lookupApi.listByType('material_request_status', 100),
        materialApi.list(100, 0).catch(() => ({ items: [] })),
        uomApi.list(100, 0).catch(() => []),
      ]);

      setProjects(Array.isArray(projectData?.items) ? projectData.items : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
      setMaterials(Array.isArray(materialData) ? materialData : Array.isArray(materialData?.items) ? materialData.items : []);
      setUoms(Array.isArray(uomData) ? uomData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load lookup values');
    }
  };

  const loadItems = async () => {
    if (!canView) return;
    setLoading(true);
    setError('');

    try {
      const result = await materialRequestApi.list(rowsPerPage, page * rowsPerPage, {
        search: search || undefined,
        project_id: filters.project_id ? Number(filters.project_id) : undefined,
        status_id: filters.status_id ? Number(filters.status_id) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotal(result?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load material requests');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    navigate(`${baseRoute}/new`);
  };

  const openEditById = async (materialRequestId: number, navigateFirst: boolean = false) => {
    if (navigateFirst) {
      navigate(`${baseRoute}/${materialRequestId}/edit`);
    }

    setEditingId(materialRequestId);
    try {
      const detail: MaterialRequestDetail = await materialRequestApi.get(materialRequestId);
      setEditingVersion(detail.updated_at ?? null);
      setForm({
        project_id: detail.project_id.toString(),
        status_id: detail.status_id.toString(),
        requested_at: detail.requested_at ? detail.requested_at.slice(0, 10) : '',
        date_prepared: detail.date_prepared ? detail.date_prepared.slice(0, 10) : '',
        date_received: detail.date_received ? detail.date_received.slice(0, 10) : '',
        stock_checked: detail.stock_checked,
        ceo_approval_required: detail.ceo_approval_required,
        notes: detail.notes || '',
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              row_id: `${Date.now()}-${row.material_request_item_id}`,
              material_request_item_id: row.material_request_item_id,
              updated_at: row.updated_at ?? null,
              material_id: row.material_id.toString(),
              description: row.material_name,
              specification: '',
              brand: '',
              requested_quantity: row.requested_quantity,
              approved_quantity: row.approved_quantity || '',
              estimated_quantity: row.estimated_quantity || '',
              area_usage: row.area_usage || '',
              remarks: row.remarks || '',
              uom_id: row.uom_id.toString(),
              notes: row.notes || '',
            }))
          : [emptyItem()],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load material request');
      navigate(baseRoute);
    }
  };

  const openEdit = async (item: MaterialRequestItemList) => {
    await openEditById(item.material_request_id, true);
  };

  const openView = async (item: MaterialRequestItemList) => {
    try {
      const detail = await materialRequestApi.get(item.material_request_id);
      setViewItem(detail);
      setViewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load material request');
    }
  };

  const openDelete = (item: MaterialRequestItemList) => {
    setDeleteItem(item);
    setDeleteOpen(true);
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

  const updateItem = (index: number, field: keyof RequestItemForm, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItemRow = () => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  const removeItemRow = (index: number) => setForm((current) => {
    const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
    return { ...current, items: nextItems.length > 0 ? nextItems : [emptyItem()] };
  });

  const submitForm = async () => {
    const validationErrors = form.items.map((row) => validateDetailRow(row, form.items));
    const firstError = validationErrors.find((entry) => Object.keys(entry).length > 0);
    if (firstError) {
      setError(Object.values(firstError)[0]);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const basePayload = {
        project_id: Number(form.project_id),
        status_id: form.status_id ? Number(form.status_id) : undefined,
        requested_at: form.requested_at || null,
        date_prepared: form.date_prepared || null,
        date_received: form.date_received || null,
        stock_checked: form.stock_checked,
        ceo_approval_required: form.ceo_approval_required,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        const updated = await materialRequestApi.update(editingId, {
          ...basePayload,
          expected_updated_at: editingVersion ?? undefined,
        });
        setEditingVersion(updated?.updated_at ?? editingVersion);
        setSuccess('Material Request updated');
      } else {
        const payload = {
          ...basePayload,
          items: form.items
            .filter((item) => item.material_id && item.uom_id && item.requested_quantity)
            .map((item) => ({
              material_id: Number(item.material_id),
              requested_quantity: Number(item.requested_quantity),
              approved_quantity: item.approved_quantity === '' ? null : Number(item.approved_quantity),
              estimated_quantity: item.estimated_quantity === '' ? null : Number(item.estimated_quantity),
              area_usage: item.area_usage || null,
              remarks: item.remarks || null,
              uom_id: Number(item.uom_id),
              notes: item.notes || null,
            })),
        };
        await materialRequestApi.create(payload);
        setSuccess('Material Request created');
      }

      setEditingId(null);
      setEditingVersion(null);
      setForm(emptyForm());
      navigate(baseRoute);
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save material request');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await materialRequestApi.delete(deleteItem.material_request_id);
      setSuccess('Material Request deleted');
      setDeleteOpen(false);
      setDeleteItem(null);
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material request');
    } finally {
      setDeleting(false);
    }
  };

  const statusByCode = (code: string) => statuses.find((item) => item.code === code)?.look_up_id;

  const detailColumns = useMemo<GridColDef<RequestItemForm>[]>(() => {
    const materialOptions = materials.map((material) => ({
      value: material.material_id.toString(),
      label: `${material.product_code} - ${material.full_description || material.product_name}`,
    }));
    const uomOptions = uoms.map((uom) => ({ value: uom.uom_id.toString(), label: uom.abbreviation }));

    return [
      {
        field: 'material_id',
        headerName: 'Material',
        minWidth: 240,
        flex: 1,
        editable: true,
        type: 'singleSelect',
        valueOptions: materialOptions,
      },
      { field: 'description', headerName: 'Description', minWidth: 220, flex: 1.1 },
      { field: 'specification', headerName: 'Specification', minWidth: 180, flex: 0.9 },
      { field: 'brand', headerName: 'Brand', minWidth: 150, flex: 0.8 },
      {
        field: 'uom_id',
        headerName: 'UOM',
        minWidth: 110,
        flex: 0.6,
        editable: true,
        type: 'singleSelect',
        valueOptions: uomOptions,
      },
      { field: 'requested_quantity', headerName: 'Quantity', minWidth: 120, flex: 0.7, editable: true },
      { field: 'approved_quantity', headerName: 'Approved', minWidth: 120, flex: 0.7, editable: true },
      { field: 'estimated_quantity', headerName: 'Estimated', minWidth: 120, flex: 0.7, editable: true },
      { field: 'area_usage', headerName: 'Area Usage', minWidth: 150, flex: 0.8, editable: true },
      { field: 'remarks', headerName: 'Remarks', minWidth: 180, flex: 1, editable: true },
      { field: 'notes', headerName: 'Item Notes', minWidth: 180, flex: 1, editable: true },
    ];
  }, [materials, uoms]);

  const detailTotals = useMemo(() => {
    const totalQuantity = form.items.reduce((sum, row) => sum + (Number(row.requested_quantity) || 0), 0);
    return {
      totalItems: form.items.length,
      totalQuantity,
      totalAmount: 0,
    };
  }, [form.items]);

  const validateDetailRow = (row: RequestItemForm, rows: RequestItemForm[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    const quantity = Number(row.requested_quantity);

    if (!row.material_id) {
      errors.material_id = 'Material is required';
    }

    if (!row.uom_id) {
      errors.uom_id = 'UOM is required';
    }

    if (!row.requested_quantity || Number.isNaN(quantity) || quantity <= 0) {
      errors.requested_quantity = 'Quantity must be greater than zero';
    }

    const duplicateCount = rows.filter((candidate) => candidate.material_id && candidate.material_id === row.material_id).length;
    if (row.material_id && duplicateCount > 1) {
      errors.material_id = 'Duplicate material is not allowed';
    }

    return errors;
  };

  const processDetailRowUpdate = (newRow: RequestItemForm): RequestItemForm => {
    const material = materials.find((item) => item.material_id === Number(newRow.material_id));
    const nextRow = { ...newRow };
    if (material) {
      nextRow.description = material.product_name || '';
      nextRow.specification = material.specification_name || material.full_description || '';
      nextRow.brand = material.brand_name || '';
      if (material.stock_uom_id && !nextRow.uom_id) {
        nextRow.uom_id = String(material.stock_uom_id);
      }
    }
    return nextRow;
  };

  const toDetailPayload = (row: RequestItemForm) => ({
    material_id: Number(row.material_id),
    requested_quantity: Number(row.requested_quantity),
    approved_quantity: row.approved_quantity === '' ? null : Number(row.approved_quantity),
    estimated_quantity: row.estimated_quantity === '' ? null : Number(row.estimated_quantity),
    area_usage: row.area_usage || null,
    remarks: row.remarks || null,
    uom_id: Number(row.uom_id),
    notes: row.notes || null,
  });

  const handleDetailRowCommitted = async (newRow: RequestItemForm, oldRow: RequestItemForm): Promise<RequestItemForm> => {
    if (!editingId) {
      return newRow;
    }

    const rowErrors = validateDetailRow(newRow, form.items.map((item) => (item.row_id === oldRow.row_id ? newRow : item)));
    if (Object.keys(rowErrors).length > 0) {
      return newRow;
    }

    if (!newRow.material_id || !newRow.uom_id || !newRow.requested_quantity) {
      return newRow;
    }

    if (newRow.material_request_item_id) {
      const detail = await materialRequestApi.updateItem(editingId, newRow.material_request_item_id, {
        ...toDetailPayload(newRow),
        expected_updated_at: oldRow.updated_at ?? null,
      });
      const savedItem = Array.isArray(detail?.items)
        ? detail.items.find((item: MaterialRequestItemView) => item.material_request_item_id === newRow.material_request_item_id)
        : null;
      return {
        ...newRow,
        updated_at: savedItem?.updated_at ?? newRow.updated_at ?? null,
      };
    }

    const detail = await materialRequestApi.addItem(editingId, toDetailPayload(newRow));
    const createdItem = Array.isArray(detail?.items)
      ? [...detail.items].sort((a: MaterialRequestItemView, b: MaterialRequestItemView) => b.material_request_item_id - a.material_request_item_id)[0]
      : null;

    return {
      ...newRow,
      material_request_item_id: createdItem?.material_request_item_id,
      updated_at: createdItem?.updated_at ?? null,
    };
  };

  const handleDetailRowDelete = async (row: RequestItemForm): Promise<void> => {
    if (!editingId || !row.material_request_item_id) {
      return;
    }

    await materialRequestApi.deleteItem(editingId, row.material_request_item_id, {
      expected_updated_at: row.updated_at ?? null,
    });
  };

  const transition = async (action: 'submit' | 'approve' | 'reject' | 'cancel' | 'close') => {
    if (!viewItem) return;
    try {
      const latest = await materialRequestApi.get(viewItem.material_request_id);
      const expectedUpdatedAt = latest?.updated_at ?? viewItem.updated_at ?? undefined;
      const response =
        action === 'submit'
          ? await materialRequestApi.submit(viewItem.material_request_id, { expected_updated_at: expectedUpdatedAt })
          : action === 'approve'
            ? await materialRequestApi.approve(viewItem.material_request_id, { expected_updated_at: expectedUpdatedAt })
            : action === 'reject'
              ? await materialRequestApi.reject(viewItem.material_request_id, { expected_updated_at: expectedUpdatedAt })
              : action === 'cancel'
                ? await materialRequestApi.cancel(viewItem.material_request_id, { expected_updated_at: expectedUpdatedAt })
                : await materialRequestApi.close(viewItem.material_request_id, { expected_updated_at: expectedUpdatedAt });
      setViewItem(response);
      setSuccess(`Material Request ${action}d`);
      await loadItems();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} material request`);
    }
  };

  if (!canView) {
    return <Alert severity="error">You do not have permission to view Material Request.</Alert>;
  }

  return (
    <Box>
      {routeMode === 'list' && (
      <>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack spacing={1.5}>
          <Breadcrumbs aria-label="breadcrumb">
            <Typography color="text.secondary">Dashboard</Typography>
            <Typography color="text.secondary">Coordinating Transactions</Typography>
            <Typography color="text.primary" fontWeight={600}>Material Request</Typography>
          </Breadcrumbs>
          <Typography variant="h4" fontWeight={700}>Material Request</Typography>
          <Typography variant="body2" color="text.secondary">Manage project material requests and line items.</Typography>
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
                placeholder="Search request number, project, or notes"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSearch(searchInput.trim());
                    setPage(0);
                  }
                }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
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
                <Select displayEmpty value={filters.status_id} onChange={(event) => { setFilters((current) => ({ ...current, status_id: event.target.value })); setPage(0); }}>
                  <MenuItem value="">All Statuses</MenuItem>
                  {statuses.map((status) => <MenuItem key={status.look_up_id} value={status.look_up_id.toString()}>{status.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void loadItems()}>Refresh</Button>
                {canCreate && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New</Button>}
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
                <TableCell><TableSortLabel active={sortBy === 'mr_number'} direction={sortBy === 'mr_number' ? sortDir : 'asc'} onClick={() => handleSort('mr_number')}>MR Number</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortBy === 'project_name'} direction={sortBy === 'project_name' ? sortDir : 'asc'} onClick={() => handleSort('project_name')}>Project</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortBy === 'status_name'} direction={sortBy === 'status_name' ? sortDir : 'asc'} onClick={() => handleSort('status_name')}>Status</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortBy === 'requested_at'} direction={sortBy === 'requested_at' ? sortDir : 'asc'} onClick={() => handleSort('requested_at')}>Requested At</TableSortLabel></TableCell>
                <TableCell align="right"><TableSortLabel active={sortBy === 'item_count'} direction={sortBy === 'item_count' ? sortDir : 'asc'} onClick={() => handleSort('item_count')}>Items</TableSortLabel></TableCell>
                <TableCell>Requested By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No material requests found.</Typography></TableCell></TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.material_request_id} hover>
                    <TableCell>{item.mr_number}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}><Typography fontWeight={600} variant="body2">{item.project_name}</Typography><Typography variant="caption" color="text.secondary">{item.project_code}</Typography></Stack>
                    </TableCell>
                    <TableCell>{item.status_name}</TableCell>
                    <TableCell>{formatDate(item.requested_at)}</TableCell>
                    <TableCell align="right">{item.item_count}</TableCell>
                    <TableCell>{item.requested_by_account_name || '-'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View"><IconButton size="small" onClick={() => void openView(item)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                        {canUpdate && <Tooltip title="Edit"><IconButton size="small" onClick={() => void openEdit(item)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                        {canDelete && <Tooltip title="Delete"><IconButton size="small" onClick={() => openDelete(item)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <TablePagination component="div" count={total} page={page} onPageChange={(_, nextPage) => setPage(nextPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[10, 25, 50, 100]} />
      </Paper>
      </>
      )}

      {routeMode !== 'list' && (
      <Paper>
        <DialogTitle>{editingId ? 'Edit Material Request' : 'New Material Request'}</DialogTitle>
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <Select value={form.status_id} displayEmpty onChange={(event) => setForm((current) => ({ ...current, status_id: event.target.value }))}>
                  <MenuItem value="">Draft</MenuItem>
                  {statuses.map((status) => <MenuItem key={status.look_up_id} value={status.look_up_id.toString()}>{status.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Requested At" type="date" value={form.requested_at} onChange={(event) => setForm((current) => ({ ...current, requested_at: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Date Prepared" type="date" value={form.date_prepared} onChange={(event) => setForm((current) => ({ ...current, date_prepared: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Date Received" type="date" value={form.date_received} onChange={(event) => setForm((current) => ({ ...current, date_received: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}><FormControlLabel control={<Checkbox checked={form.stock_checked} onChange={(event) => setForm((current) => ({ ...current, stock_checked: event.target.checked }))} />} label="Stock Checked" /></Grid>
            <Grid item xs={12} md={3}><FormControlLabel control={<Checkbox checked={form.ceo_approval_required} onChange={(event) => setForm((current) => ({ ...current, ceo_approval_required: event.target.checked }))} />} label="CEO Approval Required" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" multiline minRows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Grid>
            <Grid item xs={12}>
              <EditableLineItemsGrid
                rows={form.items}
                setRows={(nextRows) => {
                  setForm((current) => ({
                    ...current,
                    items: typeof nextRows === 'function' ? nextRows(current.items) : nextRows,
                  }));
                }}
                columns={detailColumns}
                createRow={emptyItem}
                getRowId={(row) => row.row_id}
                processRowUpdate={(newRow) => processDetailRowUpdate(newRow)}
                onRowUpdateCommitted={handleDetailRowCommitted}
                onRowDelete={handleDetailRowDelete}
                validateRow={validateDetailRow}
                shouldConfirmDelete={(row) => Boolean(row.material_request_item_id)}
                getDeleteConfirmMessage={() => 'Delete this saved detail row?'}
                addRowLabel="Add Row"
                focusField="material_id"
                totals={detailTotals}
                disabled={saving}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(baseRoute)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitForm()} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</Button>
        </DialogActions>
      </Paper>
      )}

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Material Request Details</DialogTitle>
        <DialogContent dividers>
          {viewItem && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">MR Number</Typography><Typography fontWeight={600}>{viewItem.mr_number}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="body2" color="text.secondary">Project</Typography><Typography fontWeight={600}>{viewItem.project_code} - {viewItem.project_name}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Status</Typography><Typography fontWeight={600}>{viewItem.status_name}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Requested By</Typography><Typography fontWeight={600}>{viewItem.requested_by_account_name || '-'}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Requested At</Typography><Typography fontWeight={600}>{formatDate(viewItem.requested_at)}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Prepared</Typography><Typography fontWeight={600}>{formatDate(viewItem.date_prepared)}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Received</Typography><Typography fontWeight={600}>{formatDate(viewItem.date_received)}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography variant="body2" color="text.secondary">Items</Typography><Typography fontWeight={600}>{viewItem.item_count}</Typography></Grid>
                <Grid item xs={12}><Typography variant="body2" color="text.secondary">Notes</Typography><Typography>{viewItem.notes || '-'}</Typography></Grid>
              </Grid>
              <Divider />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>Requested Qty</TableCell>
                      <TableCell>Approved Qty</TableCell>
                      <TableCell>Estimated Qty</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell>Area Usage</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewItem.items.map((item) => (
                      <TableRow key={item.material_request_item_id}>
                        <TableCell>
                          <Stack spacing={0.25}><Typography variant="body2" fontWeight={600}>{item.material_name}</Typography><Typography variant="caption" color="text.secondary">{item.material_code}</Typography></Stack>
                        </TableCell>
                        <TableCell>{formatNumber(item.requested_quantity)}</TableCell>
                        <TableCell>{formatNumber(item.approved_quantity)}</TableCell>
                        <TableCell>{formatNumber(item.estimated_quantity)}</TableCell>
                        <TableCell>{item.uom_abbreviation}</TableCell>
                        <TableCell>{item.area_usage || '-'}</TableCell>
                        <TableCell>{item.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {canUpdate && <Button onClick={() => void transition('submit')}>Submit</Button>}
            {canApprove && <Button onClick={() => void transition('approve')}>Approve</Button>}
            {canApprove && <Button onClick={() => void transition('reject')}>Reject</Button>}
            {canUpdate && <Button onClick={() => void transition('cancel')}>Cancel</Button>}
            {canUpdate && <Button onClick={() => void transition('close')}>Close</Button>}
          </Stack>
          <Button variant="contained" onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogTitle>Delete Material Request</DialogTitle>
        <DialogContent><Typography>Delete {deleteItem?.mr_number || 'this request'}?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void submitDelete()} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" sx={{ width: '100%' }} onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}