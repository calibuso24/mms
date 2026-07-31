import { useEffect, useMemo, useState } from 'react';
import {
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { accountApi, lookupApi, materialApi, materialRequestApi, projectApi, uomApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';

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
}

interface UomItem {
  uom_id: number;
  uom_name: string;
  abbreviation: string;
}

interface RequestItemForm {
  material_id: string;
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
  material_id: '',
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
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [uoms, setUoms] = useState<UomItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<MaterialRequestDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<MaterialRequestItemList | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

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
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (item: MaterialRequestItemList) => {
    setEditingId(item.material_request_id);
    try {
      const detail: MaterialRequestDetail = await materialRequestApi.get(item.material_request_id);
      setForm({
        project_id: detail.project_id.toString(),
        status_id: detail.status_id.toString(),
        requested_at: detail.requested_at ? detail.requested_at.slice(0, 16) : '',
        date_prepared: detail.date_prepared ? detail.date_prepared.slice(0, 16) : '',
        date_received: detail.date_received ? detail.date_received.slice(0, 16) : '',
        stock_checked: detail.stock_checked,
        ceo_approval_required: detail.ceo_approval_required,
        notes: detail.notes || '',
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              material_id: row.material_id.toString(),
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
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load material request');
    }
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
    setSaving(true);
    setError('');

    try {
      const payload = {
        project_id: Number(form.project_id),
        status_id: form.status_id ? Number(form.status_id) : undefined,
        requested_at: form.requested_at ? new Date(form.requested_at).toISOString() : null,
        date_prepared: form.date_prepared ? new Date(form.date_prepared).toISOString() : null,
        date_received: form.date_received ? new Date(form.date_received).toISOString() : null,
        stock_checked: form.stock_checked,
        ceo_approval_required: form.ceo_approval_required,
        notes: form.notes.trim() || null,
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

      if (editingId) {
        await materialRequestApi.update(editingId, payload);
        setSuccess('Material Request updated');
      } else {
        await materialRequestApi.create(payload);
        setSuccess('Material Request created');
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
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

  const transition = async (action: 'submit' | 'approve' | 'reject' | 'cancel' | 'close') => {
    if (!viewItem) return;
    try {
      const response =
        action === 'submit'
          ? await materialRequestApi.submit(viewItem.material_request_id)
          : action === 'approve'
            ? await materialRequestApi.approve(viewItem.material_request_id)
            : action === 'reject'
              ? await materialRequestApi.reject(viewItem.material_request_id)
              : action === 'cancel'
                ? await materialRequestApi.cancel(viewItem.material_request_id)
                : await materialRequestApi.close(viewItem.material_request_id);
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
              <FormControl fullWidth size="small">
                <Select displayEmpty value={filters.project_id} onChange={(event) => { setFilters((current) => ({ ...current, project_id: event.target.value })); setPage(0); }}>
                  <MenuItem value="">All Projects</MenuItem>
                  {projects.map((project) => <MenuItem key={project.party_id} value={project.party_id.toString()}>{project.party_code} - {project.party_name}</MenuItem>)}
                </Select>
              </FormControl>
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

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>{editingId ? 'Edit Material Request' : 'New Material Request'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <Select value={form.project_id} displayEmpty onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}>
                  <MenuItem value="">Select Project</MenuItem>
                  {projects.map((project) => <MenuItem key={project.party_id} value={project.party_id.toString()}>{project.party_code} - {project.party_name}</MenuItem>)}
                </Select>
              </FormControl>
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
              <TextField fullWidth label="Requested At" type="datetime-local" value={form.requested_at} onChange={(event) => setForm((current) => ({ ...current, requested_at: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Date Prepared" type="datetime-local" value={form.date_prepared} onChange={(event) => setForm((current) => ({ ...current, date_prepared: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Date Received" type="datetime-local" value={form.date_received} onChange={(event) => setForm((current) => ({ ...current, date_received: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}><FormControlLabel control={<Checkbox checked={form.stock_checked} onChange={(event) => setForm((current) => ({ ...current, stock_checked: event.target.checked }))} />} label="Stock Checked" /></Grid>
            <Grid item xs={12} md={3}><FormControlLabel control={<Checkbox checked={form.ceo_approval_required} onChange={(event) => setForm((current) => ({ ...current, ceo_approval_required: event.target.checked }))} />} label="CEO Approval Required" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" multiline minRows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Grid>
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={600}>Line Items</Typography>
                <Button startIcon={<AddIcon />} onClick={addItemRow}>Add Item</Button>
              </Stack>
              <Stack spacing={1.5}>
                {form.items.map((item, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography fontWeight={600}>Item {index + 1}</Typography>
                      <IconButton size="small" onClick={() => removeItemRow(index)} disabled={form.items.length === 1}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={5}>
                        <FormControl fullWidth size="small">
                          <Select value={item.material_id} displayEmpty onChange={(event) => updateItem(index, 'material_id', event.target.value)}>
                            <MenuItem value="">Select Material</MenuItem>
                            {materials.map((material) => <MenuItem key={material.material_id} value={material.material_id.toString()}>{material.product_code} - {material.product_name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField fullWidth size="small" label="Requested Qty" type="number" inputProps={{ min: 0, step: '0.01' }} value={item.requested_quantity} onChange={(event) => updateItem(index, 'requested_quantity', event.target.value)} />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField fullWidth size="small" label="UOM" select value={item.uom_id} onChange={(event) => updateItem(index, 'uom_id', event.target.value)}>
                          <MenuItem value="">Select</MenuItem>
                          {uoms.map((uom) => <MenuItem key={uom.uom_id} value={uom.uom_id.toString()}>{uom.abbreviation}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField fullWidth size="small" label="Approved Qty" type="number" inputProps={{ min: 0, step: '0.01' }} value={item.approved_quantity} onChange={(event) => updateItem(index, 'approved_quantity', event.target.value)} />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField fullWidth size="small" label="Estimated Qty" type="number" inputProps={{ min: 0, step: '0.01' }} value={item.estimated_quantity} onChange={(event) => updateItem(index, 'estimated_quantity', event.target.value)} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" label="Area Usage" value={item.area_usage} onChange={(event) => updateItem(index, 'area_usage', event.target.value)} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" label="Remarks" value={item.remarks} onChange={(event) => updateItem(index, 'remarks', event.target.value)} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth size="small" label="Item Notes" value={item.notes} onChange={(event) => updateItem(index, 'notes', event.target.value)} />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitForm()} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

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