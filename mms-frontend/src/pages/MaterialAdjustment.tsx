import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  accountApi,
  lookupApi,
  materialAdjustmentApi,
  materialApi,
  projectApi,
  uomApi,
} from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

type SortField = 'material_adjustment_number' | 'project_name' | 'status_name' | 'requested_at' | 'approved_at' | 'item_count';
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
  source_description?: string | null;
  brand_name?: string | null;
  specification_name?: string | null;
  stock_uom_id?: number | null;
}

interface UomItem {
  uom_id: number;
  abbreviation: string;
}

interface MaterialAdjustmentListItem {
  material_adjustment_id: number;
  material_adjustment_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  requested_at: string;
  approved_at: string | null;
  status_code: string;
  status_name: string;
  adjustment_reason_id: number | null;
  adjustment_reason_name: string | null;
  notes: string | null;
  item_count: number;
}

interface MaterialAdjustmentItem {
  material_adjustment_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom_id: number;
  uom_abbreviation: string;
  system_quantity: string;
  adjustment_quantity: string;
  resulting_quantity: string;
  notes: string | null;
}

interface MaterialAdjustmentDetail extends MaterialAdjustmentListItem {
  items: MaterialAdjustmentItem[];
}

interface ItemForm {
  row_id: string;
  material_adjustment_item_id?: number;
  material_id: string;
  description: string;
  specification: string;
  brand: string;
  uom_id: string;
  system_quantity: string;
  adjustment_quantity: string;
  resulting_quantity: string;
  notes: string;
}

interface FormState {
  project_id: string;
  requested_at: string;
  adjustment_reason_id: string;
  notes: string;
  items: ItemForm[];
}

const emptyItem = (): ItemForm => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  material_adjustment_item_id: undefined,
  material_id: '',
  description: '',
  specification: '',
  brand: '',
  uom_id: '',
  system_quantity: '',
  adjustment_quantity: '',
  resulting_quantity: '',
  notes: '',
});

const emptyForm = (): FormState => ({
  project_id: '',
  requested_at: new Date().toISOString().slice(0, 16),
  adjustment_reason_id: '',
  notes: '',
  items: [emptyItem()],
});

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function MaterialAdjustmentPage() {
  const { account } = useAuth();
  const [items, setItems] = useState<MaterialAdjustmentListItem[]>([]);
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
  const [filters, setFilters] = useState({ project_id: '', status_id: '', reason_id: '' });

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [reasons, setReasons] = useState<LookupItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [uoms, setUoms] = useState<UomItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<MaterialAdjustmentDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<MaterialAdjustmentListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Inventory Adjustment:VIEW');
  const canCreate = permissionSet.has('Inventory Adjustment:CREATE');
  const canUpdate = permissionSet.has('Inventory Adjustment:UPDATE');
  const canDelete = permissionSet.has('Inventory Adjustment:DELETE');
  const canApprove = permissionSet.has('Inventory Adjustment:APPROVE');

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [account?.account_id]);

  useEffect(() => {
    void loadItems();
  }, [canView, page, rowsPerPage, search, sortBy, sortDir, filters.project_id, filters.status_id, filters.reason_id]);

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
      const [projectData, statusData, reasonData, materialData, uomData] = await Promise.all([
        projectApi.list(200, 0).catch(() => ({ items: [] })),
        lookupApi.listByType('material_adjustment_status', 100),
        lookupApi.listByType('material_adjustment_reason', 100),
        materialApi.list(300, 0).catch(() => ({ items: [] })),
        uomApi.list(200, 0).catch(() => []),
      ]);

      setProjects(Array.isArray(projectData?.items) ? projectData.items : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
      setReasons(Array.isArray(reasonData) ? reasonData : []);
      setMaterials(Array.isArray(materialData?.items) ? materialData.items : []);
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
      const result = await materialAdjustmentApi.list(rowsPerPage, page * rowsPerPage, {
        search: search || undefined,
        project_id: filters.project_id ? Number(filters.project_id) : undefined,
        status_id: filters.status_id ? Number(filters.status_id) : undefined,
        reason_id: filters.reason_id ? Number(filters.reason_id) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotal(result?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load material adjustments');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (item: MaterialAdjustmentListItem) => {
    setEditingId(item.material_adjustment_id);
    try {
      const detail: MaterialAdjustmentDetail = await materialAdjustmentApi.get(item.material_adjustment_id);
      setForm({
        project_id: detail.project_id.toString(),
        requested_at: detail.requested_at ? detail.requested_at.slice(0, 16) : '',
        adjustment_reason_id: detail.adjustment_reason_id ? detail.adjustment_reason_id.toString() : '',
        notes: detail.notes || '',
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              row_id: `${Date.now()}-${row.material_adjustment_item_id}`,
              material_adjustment_item_id: row.material_adjustment_item_id,
              material_id: row.material_id.toString(),
              description: row.material_name,
              specification: '',
              brand: '',
              uom_id: row.uom_id.toString(),
              system_quantity: row.system_quantity,
              adjustment_quantity: row.adjustment_quantity,
              resulting_quantity: row.resulting_quantity,
              notes: row.notes || '',
            }))
          : [emptyItem()],
      });
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load material adjustment');
    }
  };

  const openView = async (item: MaterialAdjustmentListItem) => {
    try {
      const detail = await materialAdjustmentApi.get(item.material_adjustment_id);
      setViewItem(detail);
      setViewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load material adjustment');
    }
  };

  const openDelete = (item: MaterialAdjustmentListItem) => {
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

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItemRow = () => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));

  const removeItemRow = (index: number) => {
    setForm((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, items: nextItems.length > 0 ? nextItems : [emptyItem()] };
    });
  };

  const submitForm = async () => {
    const rowErrors = form.items.map((row) => validateDetailRow(row, form.items));
    const firstError = rowErrors.find((entry) => Object.keys(entry).length > 0);
    if (firstError) {
      setError(Object.values(firstError)[0]);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        project_id: Number(form.project_id),
        requested_at: form.requested_at ? new Date(form.requested_at).toISOString() : null,
        adjustment_reason_id: form.adjustment_reason_id ? Number(form.adjustment_reason_id) : null,
        notes: form.notes.trim() || null,
        items: form.items
          .filter((item) => item.material_id && item.uom_id && item.system_quantity !== '' && item.adjustment_quantity !== '' && item.resulting_quantity !== '')
          .map((item) => ({
            material_id: Number(item.material_id),
            uom_id: Number(item.uom_id),
            system_quantity: Number(item.system_quantity),
            adjustment_quantity: Number(item.adjustment_quantity),
            resulting_quantity: Number(item.resulting_quantity),
            notes: item.notes || null,
          })),
      };

      if (editingId) {
        await materialAdjustmentApi.update(editingId, payload);
        setSuccess('Material Adjustment updated');
      } else {
        await materialAdjustmentApi.create(payload);
        setSuccess('Material Adjustment created');
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save material adjustment');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);

    try {
      await materialAdjustmentApi.delete(deleteItem.material_adjustment_id);
      setSuccess('Material Adjustment deleted');
      setDeleteOpen(false);
      setDeleteItem(null);
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete material adjustment');
    } finally {
      setDeleting(false);
    }
  };

  const runWorkflowAction = async (action: 'approve' | 'reject' | 'complete') => {
    if (!viewItem) return;

    try {
      const next = action === 'approve'
        ? await materialAdjustmentApi.approve(viewItem.material_adjustment_id)
        : action === 'reject'
          ? await materialAdjustmentApi.reject(viewItem.material_adjustment_id)
          : await materialAdjustmentApi.complete(viewItem.material_adjustment_id);
      setViewItem(next);
      setSuccess(`Material Adjustment ${action} successful`);
      await loadItems();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} material adjustment`);
    }
  };

  const detailColumns = useMemo<GridColDef<ItemForm>[]>(() => {
    const materialOptions = materials.map((row) => ({ value: row.material_id.toString(), label: `${row.product_code} - ${row.product_name}` }));
    const uomOptions = uoms.map((row) => ({ value: row.uom_id.toString(), label: row.abbreviation }));

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
      { field: 'description', headerName: 'Description', minWidth: 220, flex: 1 },
      { field: 'specification', headerName: 'Specification', minWidth: 160, flex: 0.8 },
      { field: 'brand', headerName: 'Brand', minWidth: 140, flex: 0.7 },
      {
        field: 'uom_id',
        headerName: 'UOM',
        minWidth: 110,
        flex: 0.6,
        editable: true,
        type: 'singleSelect',
        valueOptions: uomOptions,
      },
      { field: 'system_quantity', headerName: 'System Qty', minWidth: 120, flex: 0.7, editable: true },
      { field: 'adjustment_quantity', headerName: 'Adjustment Qty', minWidth: 130, flex: 0.75, editable: true },
      { field: 'resulting_quantity', headerName: 'Quantity', minWidth: 120, flex: 0.7 },
      { field: 'notes', headerName: 'Remarks', minWidth: 180, flex: 0.9, editable: true },
    ];
  }, [materials, uoms]);

  const detailTotals = useMemo(() => {
    const totalQuantity = form.items.reduce((sum, row) => sum + (Number(row.resulting_quantity) || 0), 0);
    return {
      totalItems: form.items.length,
      totalQuantity,
      totalAmount: 0,
    };
  }, [form.items]);

  const validateDetailRow = (row: ItemForm, rows: ItemForm[]): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!row.material_id) {
      errors.material_id = 'Material is required';
    }
    if (!row.uom_id) {
      errors.uom_id = 'UOM is required';
    }
    if (row.resulting_quantity === '' || Number.isNaN(Number(row.resulting_quantity))) {
      errors.resulting_quantity = 'Resulting quantity is required';
    }

    const duplicateCount = rows.filter((candidate) => candidate.material_id && candidate.material_id === row.material_id).length;
    if (row.material_id && duplicateCount > 1) {
      errors.material_id = 'Duplicate material is not allowed';
    }

    return errors;
  };

  const processDetailRowUpdate = (newRow: ItemForm): ItemForm => {
    const nextRow = { ...newRow };
    const material = materials.find((item) => item.material_id === Number(nextRow.material_id));
    if (material) {
      nextRow.description = material.product_name || '';
      nextRow.specification = material.specification_name || material.source_description || '';
      nextRow.brand = material.brand_name || '';
      if (material.stock_uom_id && !nextRow.uom_id) {
        nextRow.uom_id = String(material.stock_uom_id);
      }
    }

    const systemQty = Number(nextRow.system_quantity);
    const adjustmentQty = Number(nextRow.adjustment_quantity);
    if (!Number.isNaN(systemQty) && !Number.isNaN(adjustmentQty)) {
      nextRow.resulting_quantity = (systemQty + adjustmentQty).toString();
    }

    return nextRow;
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Material Adjustment</Typography>
          <Breadcrumbs sx={{ mt: 0.5 }}>
            <Typography color="text.secondary">Inventory</Typography>
            <Typography color="text.primary">Material Adjustment</Typography>
          </Breadcrumbs>
        </Box>

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4} lg={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search adjustment no, project, notes"
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

              <Grid item xs={12} md={3} lg={3}>
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={filters.project_id}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, project_id: event.target.value }));
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">All Projects</MenuItem>
                    {projects.map((row) => (
                      <MenuItem key={row.party_id} value={row.party_id.toString()}>{row.party_code} - {row.party_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2} lg={2}>
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
                    {statuses.map((row) => (
                      <MenuItem key={row.look_up_id} value={row.look_up_id.toString()}>{row.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3} lg={3}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setSearchInput('');
                      setSearch('');
                      setFilters({ project_id: '', status_id: '', reason_id: '' });
                      setPage(0);
                    }}
                  >
                    Reset
                  </Button>
                  {canCreate && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New</Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Paper>
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={28} /></Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><TableSortLabel active={sortBy === 'material_adjustment_number'} direction={sortDir} onClick={() => handleSort('material_adjustment_number')}>Adjustment No.</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'project_name'} direction={sortDir} onClick={() => handleSort('project_name')}>Project</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'requested_at'} direction={sortDir} onClick={() => handleSort('requested_at')}>Requested At</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'status_name'} direction={sortDir} onClick={() => handleSort('status_name')}>Status</TableSortLabel></TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow><TableCell colSpan={7}><Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>No material adjustment records found.</Box></TableCell></TableRow>
                    ) : (
                      items.map((row) => (
                        <TableRow key={row.material_adjustment_id} hover>
                          <TableCell>{row.material_adjustment_number}</TableCell>
                          <TableCell>{row.project_code} - {row.project_name}</TableCell>
                          <TableCell>{formatDate(row.requested_at)}</TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.status_name}</Typography></TableCell>
                          <TableCell>{row.adjustment_reason_name || '-'}</TableCell>
                          <TableCell align="right">{row.item_count}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View"><IconButton size="small" onClick={() => openView(row)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                              {canUpdate && row.status_code === 'pending' && <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                              {canDelete && (row.status_code === 'pending' || row.status_code === 'rejected') && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => openDelete(row)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </>
          )}
        </Paper>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>{editingId ? 'Edit Material Adjustment' : 'Create Material Adjustment'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Project</Typography>
                <Select value={form.project_id} onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}>
                  <MenuItem value="">Select project</MenuItem>
                  {projects.map((row) => <MenuItem key={row.party_id} value={row.party_id.toString()}>{row.party_code} - {row.party_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField fullWidth size="small" type="datetime-local" label="Requested At" value={form.requested_at} onChange={(event) => setForm((current) => ({ ...current, requested_at: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Adjustment Reason</Typography>
                <Select value={form.adjustment_reason_id} onChange={(event) => setForm((current) => ({ ...current, adjustment_reason_id: event.target.value }))}>
                  <MenuItem value="">None</MenuItem>
                  {reasons.map((row) => <MenuItem key={row.look_up_id} value={row.look_up_id.toString()}>{row.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" multiline minRows={2} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
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
              validateRow={validateDetailRow}
              shouldConfirmDelete={(row) => Boolean(row.material_adjustment_item_id)}
              getDeleteConfirmMessage={() => 'Delete this saved detail row?'}
              addRowLabel="Add Row"
              focusField="material_id"
              totals={detailTotals}
              disabled={saving}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Material Adjustment Details</DialogTitle>
        <DialogContent dividers>
          {!viewItem ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={26} /></Box>
          ) : (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Adjustment No.</Typography><Typography variant="body2">{viewItem.material_adjustment_number}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Status</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{viewItem.status_name}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Project</Typography><Typography variant="body2">{viewItem.project_code} - {viewItem.project_name}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Requested At</Typography><Typography variant="body2">{formatDate(viewItem.requested_at)}</Typography></Grid>
              </Grid>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell align="right">System Qty</TableCell>
                      <TableCell align="right">Adjustment Qty</TableCell>
                      <TableCell align="right">Resulting Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewItem.items.map((item) => (
                      <TableRow key={item.material_adjustment_item_id}>
                        <TableCell>{item.material_code} - {item.material_name}</TableCell>
                        <TableCell>{item.uom_abbreviation}</TableCell>
                        <TableCell align="right">{item.system_quantity}</TableCell>
                        <TableCell align="right">{item.adjustment_quantity}</TableCell>
                        <TableCell align="right">{item.resulting_quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {viewItem && canApprove && viewItem.status_code === 'pending' && <Button onClick={() => runWorkflowAction('approve')} variant="contained">Approve</Button>}
          {viewItem && canApprove && viewItem.status_code === 'pending' && <Button color="error" onClick={() => runWorkflowAction('reject')}>Reject</Button>}
          {viewItem && canApprove && viewItem.status_code === 'approved' && <Button onClick={() => runWorkflowAction('complete')} variant="contained">Complete</Button>}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Material Adjustment</DialogTitle>
        <DialogContent><Typography variant="body2">Delete {deleteItem?.material_adjustment_number}? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={submitDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setError('')} severity="error" variant="filled">{error}</Alert>
      </Snackbar>

      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSuccess('')} severity="success" variant="filled">{success}</Alert>
      </Snackbar>
    </Box>
  );
}
