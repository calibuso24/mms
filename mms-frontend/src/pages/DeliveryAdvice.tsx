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
import { accountApi, deliveryAdviceApi, lookupApi, purchaseOrderApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';

type SortField = 'da_number' | 'reference_code' | 'po_number' | 'status_name' | 'issued_at' | 'received_at' | 'created_at' | 'item_count';
type SortDir = 'asc' | 'desc';

interface LookupItem {
  look_up_id: number;
  code: string;
  name: string;
}

interface PurchaseOrderItem {
  purchase_order_id: number;
  po_number: string;
}

interface PurchaseOrderDetailItem {
  purchase_order_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom_id: number;
  uom_abbreviation: string;
}

interface DeliveryAdviceListItem {
  delivery_advice_id: number;
  purchase_order_id: number;
  po_number: string;
  da_number: string;
  reference_code: string;
  issued_at: string;
  received_at: string | null;
  status_id: number;
  status_code: string;
  status_name: string;
  notes: string | null;
  item_count: number;
  created_at: string | null;
}

interface DeliveryAdviceItem {
  delivery_advice_item_id: number;
  purchase_order_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  uom_id: number;
  uom_abbreviation: string;
  advised_quantity: string;
  received_quantity: string;
  notes: string | null;
}

interface DeliveryAdviceDetail extends DeliveryAdviceListItem {
  items: DeliveryAdviceItem[];
}

interface AdviceItemForm {
  purchase_order_item_id: string;
  advised_quantity: string;
  received_quantity: string;
  notes: string;
}

interface FormState {
  purchase_order_id: string;
  reference_code: string;
  issued_at: string;
  received_at: string;
  notes: string;
  items: AdviceItemForm[];
}

const emptyItem = (): AdviceItemForm => ({
  purchase_order_item_id: '',
  advised_quantity: '',
  received_quantity: '0',
  notes: '',
});

const emptyForm = (): FormState => ({
  purchase_order_id: '',
  reference_code: '',
  issued_at: new Date().toISOString().slice(0, 16),
  received_at: '',
  notes: '',
  items: [emptyItem()],
});

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function DeliveryAdvicePage() {
  const { account } = useAuth();
  const [items, setItems] = useState<DeliveryAdviceListItem[]>([]);
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
  const [sortBy, setSortBy] = useState<SortField>('issued_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState({ purchase_order_id: '', status_id: '' });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<DeliveryAdviceDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<DeliveryAdviceListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [poItems, setPoItems] = useState<PurchaseOrderDetailItem[]>([]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Delivery Advice:VIEW');
  const canCreate = permissionSet.has('Delivery Advice:CREATE');
  const canUpdate = permissionSet.has('Delivery Advice:UPDATE');
  const canDelete = permissionSet.has('Delivery Advice:DELETE');

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [account?.account_id]);

  useEffect(() => {
    void loadItems();
  }, [canView, page, rowsPerPage, search, sortBy, sortDir, filters.purchase_order_id, filters.status_id]);

  useEffect(() => {
    if (!form.purchase_order_id) {
      setPoItems([]);
      return;
    }

    void loadPurchaseOrderItems(Number(form.purchase_order_id));
  }, [form.purchase_order_id]);

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
      const [poData, statusData] = await Promise.all([
        purchaseOrderApi.list(200, 0).catch(() => ({ items: [] })),
        lookupApi.listByType('delivery_advice_status', 100),
      ]);

      setPurchaseOrders(Array.isArray(poData?.items) ? poData.items : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load lookup values');
    }
  };

  const loadItems = async () => {
    if (!canView) return;
    setLoading(true);
    setError('');

    try {
      const result = await deliveryAdviceApi.list(rowsPerPage, page * rowsPerPage, {
        search: search || undefined,
        purchase_order_id: filters.purchase_order_id ? Number(filters.purchase_order_id) : undefined,
        status_id: filters.status_id ? Number(filters.status_id) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotal(result?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery advices');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseOrderItems = async (purchaseOrderId: number) => {
    try {
      const detail = await purchaseOrderApi.get(purchaseOrderId);
      setPoItems(Array.isArray(detail?.items) ? detail.items : []);
    } catch {
      setPoItems([]);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = async (item: DeliveryAdviceListItem) => {
    setEditingId(item.delivery_advice_id);
    try {
      const detail: DeliveryAdviceDetail = await deliveryAdviceApi.get(item.delivery_advice_id);
      setForm({
        purchase_order_id: detail.purchase_order_id.toString(),
        reference_code: detail.reference_code,
        issued_at: detail.issued_at ? detail.issued_at.slice(0, 16) : '',
        received_at: detail.received_at ? detail.received_at.slice(0, 16) : '',
        notes: detail.notes || '',
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              purchase_order_item_id: row.purchase_order_item_id ? row.purchase_order_item_id.toString() : '',
              advised_quantity: row.advised_quantity,
              received_quantity: row.received_quantity,
              notes: row.notes || '',
            }))
          : [emptyItem()],
      });
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery advice');
    }
  };

  const openView = async (item: DeliveryAdviceListItem) => {
    try {
      const detail = await deliveryAdviceApi.get(item.delivery_advice_id);
      setViewItem(detail);
      setViewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery advice');
    }
  };

  const openDelete = (item: DeliveryAdviceListItem) => {
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

  const updateItem = (index: number, field: keyof AdviceItemForm, value: string) => {
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
    setSaving(true);
    setError('');

    try {
      const payload = {
        purchase_order_id: Number(form.purchase_order_id),
        reference_code: form.reference_code.trim(),
        issued_at: form.issued_at ? new Date(form.issued_at).toISOString() : null,
        received_at: form.received_at ? new Date(form.received_at).toISOString() : null,
        notes: form.notes.trim() || null,
        items: form.items
          .filter((item) => item.purchase_order_item_id && item.advised_quantity)
          .map((item) => {
            const poItem = poItems.find((row) => row.purchase_order_item_id === Number(item.purchase_order_item_id));
            return {
              purchase_order_item_id: Number(item.purchase_order_item_id),
              material_id: Number(poItem?.material_id),
              uom_id: Number(poItem?.uom_id),
              advised_quantity: Number(item.advised_quantity),
              received_quantity: item.received_quantity === '' ? 0 : Number(item.received_quantity),
              notes: item.notes || null,
            };
          }),
      };

      if (editingId) {
        await deliveryAdviceApi.update(editingId, payload);
        setSuccess('Delivery Advice updated');
      } else {
        await deliveryAdviceApi.create(payload);
        setSuccess('Delivery Advice created');
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save delivery advice');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);

    try {
      await deliveryAdviceApi.delete(deleteItem.delivery_advice_id);
      setSuccess('Delivery Advice deleted');
      setDeleteOpen(false);
      setDeleteItem(null);
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete delivery advice');
    } finally {
      setDeleting(false);
    }
  };

  const runWorkflowAction = async (action: 'submit' | 'complete' | 'cancel') => {
    if (!viewItem) return;

    try {
      const next = action === 'submit'
        ? await deliveryAdviceApi.submit(viewItem.delivery_advice_id)
        : action === 'complete'
          ? await deliveryAdviceApi.complete(viewItem.delivery_advice_id)
          : await deliveryAdviceApi.cancel(viewItem.delivery_advice_id);
      setViewItem(next);
      setSuccess(`Delivery Advice ${action} successful`);
      await loadItems();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} delivery advice`);
    }
  };

  const getPoItemById = (id: string) => poItems.find((row) => row.purchase_order_item_id === Number(id));

  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Delivery Advice</Typography>
          <Breadcrumbs sx={{ mt: 0.5 }}>
            <Typography color="text.secondary">Purchasing</Typography>
            <Typography color="text.primary">Delivery Advice</Typography>
          </Breadcrumbs>
        </Box>

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5} lg={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search DA No., reference, PO"
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
                    value={filters.purchase_order_id}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, purchase_order_id: event.target.value }));
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">All POs</MenuItem>
                    {purchaseOrders.map((row) => (
                      <MenuItem key={row.purchase_order_id} value={row.purchase_order_id.toString()}>{row.po_number}</MenuItem>
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

              <Grid item xs={12} md={2} lg={3}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setSearchInput('');
                      setSearch('');
                      setFilters({ purchase_order_id: '', status_id: '' });
                      setPage(0);
                    }}
                  >
                    Reset
                  </Button>
                  {canCreate && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                      New
                    </Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Paper>
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><TableSortLabel active={sortBy === 'da_number'} direction={sortDir} onClick={() => handleSort('da_number')}>DA Number</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'reference_code'} direction={sortDir} onClick={() => handleSort('reference_code')}>Reference</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'po_number'} direction={sortDir} onClick={() => handleSort('po_number')}>PO Number</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'issued_at'} direction={sortDir} onClick={() => handleSort('issued_at')}>Issued At</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'status_name'} direction={sortDir} onClick={() => handleSort('status_name')}>Status</TableSortLabel></TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>No delivery advice records found.</Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((row) => (
                        <TableRow key={row.delivery_advice_id} hover>
                          <TableCell>{row.da_number}</TableCell>
                          <TableCell>{row.reference_code}</TableCell>
                          <TableCell>{row.po_number}</TableCell>
                          <TableCell>{formatDate(row.issued_at)}</TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.status_name}</Typography></TableCell>
                          <TableCell align="right">{row.item_count}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View">
                                <IconButton size="small" onClick={() => openView(row)}><VisibilityIcon fontSize="small" /></IconButton>
                              </Tooltip>
                              {canUpdate && row.status_code === 'draft' && (
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                                </Tooltip>
                              )}
                              {canDelete && (row.status_code === 'draft' || row.status_code === 'cancelled') && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => openDelete(row)}><DeleteIcon fontSize="small" /></IconButton>
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
        <DialogTitle>{editingId ? 'Edit Delivery Advice' : 'Create Delivery Advice'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Purchase Order</Typography>
                <Select
                  value={form.purchase_order_id}
                  onChange={(event) => setForm((current) => ({ ...current, purchase_order_id: event.target.value }))}
                >
                  <MenuItem value="">Select purchase order</MenuItem>
                  {purchaseOrders.map((po) => (
                    <MenuItem key={po.purchase_order_id} value={po.purchase_order_id.toString()}>{po.po_number}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                size="small"
                label="Reference Code"
                value={form.reference_code}
                onChange={(event) => setForm((current) => ({ ...current, reference_code: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                size="small"
                label="Issued At"
                type="datetime-local"
                value={form.issued_at}
                onChange={(event) => setForm((current) => ({ ...current, issued_at: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                size="small"
                label="Received At"
                type="datetime-local"
                value={form.received_at}
                onChange={(event) => setForm((current) => ({ ...current, received_at: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                minRows={2}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>Line Items</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addItemRow}>Add Item</Button>
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 240 }}>PO Item</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell>UOM</TableCell>
                  <TableCell>Advised Qty</TableCell>
                  <TableCell>Received Qty</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.items.map((item, index) => {
                  const poItem = getPoItemById(item.purchase_order_item_id);
                  return (
                    <TableRow key={`${index}-${item.purchase_order_item_id}`}>
                      <TableCell>
                        <Select
                          fullWidth
                          size="small"
                          value={item.purchase_order_item_id}
                          onChange={(event) => updateItem(index, 'purchase_order_item_id', event.target.value as string)}
                        >
                          <MenuItem value="">Select PO item</MenuItem>
                          {poItems.map((row) => (
                            <MenuItem key={row.purchase_order_item_id} value={row.purchase_order_item_id.toString()}>
                              #{row.purchase_order_item_id} - {row.material_code}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>{poItem ? `${poItem.material_code} - ${poItem.material_name}` : '-'}</TableCell>
                      <TableCell>{poItem ? poItem.uom_abbreviation : '-'}</TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={item.advised_quantity} onChange={(event) => updateItem(index, 'advised_quantity', event.target.value)} inputProps={{ min: 0, step: '0.01' }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={item.received_quantity} onChange={(event) => updateItem(index, 'received_quantity', event.target.value)} inputProps={{ min: 0, step: '0.01' }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={item.notes} onChange={(event) => updateItem(index, 'notes', event.target.value)} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => removeItemRow(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Delivery Advice Details</DialogTitle>
        <DialogContent dividers>
          {!viewItem ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={26} /></Box>
          ) : (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">DA Number</Typography><Typography variant="body2">{viewItem.da_number}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Reference</Typography><Typography variant="body2">{viewItem.reference_code}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">PO Number</Typography><Typography variant="body2">{viewItem.po_number}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Status</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{viewItem.status_name}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Issued At</Typography><Typography variant="body2">{formatDate(viewItem.issued_at)}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Received At</Typography><Typography variant="body2">{formatDate(viewItem.received_at)}</Typography></Grid>
              </Grid>

              <Divider />

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell align="right">Advised</TableCell>
                      <TableCell align="right">Received</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewItem.items.map((item) => (
                      <TableRow key={item.delivery_advice_item_id}>
                        <TableCell>{item.material_code} - {item.material_name}</TableCell>
                        <TableCell>{item.uom_abbreviation}</TableCell>
                        <TableCell align="right">{item.advised_quantity}</TableCell>
                        <TableCell align="right">{item.received_quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {viewItem && canUpdate && viewItem.status_code === 'draft' && (
            <Button onClick={() => runWorkflowAction('submit')} variant="contained">Submit</Button>
          )}
          {viewItem && canUpdate && viewItem.status_code === 'submitted' && (
            <>
              <Button color="error" onClick={() => runWorkflowAction('cancel')}>Cancel</Button>
              <Button onClick={() => runWorkflowAction('complete')} variant="contained">Complete</Button>
            </>
          )}
          {viewItem && canUpdate && viewItem.status_code === 'draft' && (
            <Button color="error" onClick={() => runWorkflowAction('cancel')}>Cancel</Button>
          )}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Delivery Advice</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Delete {deleteItem?.da_number}? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={submitDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
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
