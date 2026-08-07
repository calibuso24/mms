import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { accountApi, deliveryAdviceApi, lookupApi, purchaseOrderApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

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
  updated_at: string | null;
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
  updated_at: string | null;
}

interface DeliveryAdviceDetail extends DeliveryAdviceListItem {
  items: DeliveryAdviceItem[];
}

interface AdviceItemForm {
  row_id: string;
  delivery_advice_item_id?: number;
  updated_at?: string | null;
  purchase_order_item_id: string;
  material_label: string;
  uom_label: string;
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
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  delivery_advice_item_id: undefined,
  purchase_order_item_id: '',
  material_label: '',
  uom_label: '',
  advised_quantity: '',
  received_quantity: '0',
  notes: '',
});

const emptyForm = (): FormState => ({
  purchase_order_id: '',
  reference_code: '',
  issued_at: new Date().toISOString().slice(0, 10),
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
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const baseRoute = '/app/purchasing/delivery-advice';
  const routeMode = location.pathname.endsWith('/new') ? 'new' : (params.id ? 'edit' : 'list');
  const routeEditId = routeMode === 'edit' ? Number(params.id) : null;

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

  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<DeliveryAdviceDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<DeliveryAdviceListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [poItems, setPoItems] = useState<PurchaseOrderDetailItem[]>([]);
  const [editingVersion, setEditingVersion] = useState<string | null>(null);

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

  useEffect(() => {
    if (routeMode === 'new') {
      setEditingId(null);
      setEditingVersion(null);
      setForm(emptyForm());
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
    setEditingVersion(null);
    setForm(emptyForm());
    navigate(`${baseRoute}/new`);
  };

  const openEditById = async (deliveryAdviceId: number) => {
    setEditingId(deliveryAdviceId);
    try {
      const detail: DeliveryAdviceDetail = await deliveryAdviceApi.get(deliveryAdviceId);
      setEditingVersion(detail.updated_at ?? null);
      setForm({
        purchase_order_id: detail.purchase_order_id.toString(),
        reference_code: detail.reference_code,
        issued_at: detail.issued_at ? detail.issued_at.slice(0, 10) : '',
        received_at: detail.received_at ? detail.received_at.slice(0, 10) : '',
        notes: detail.notes || '',
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              row_id: `${Date.now()}-${row.delivery_advice_item_id}`,
              delivery_advice_item_id: row.delivery_advice_item_id,
              updated_at: row.updated_at ?? null,
              purchase_order_item_id: row.purchase_order_item_id ? row.purchase_order_item_id.toString() : '',
              material_label: `${row.material_code} - ${row.material_name}`,
              uom_label: row.uom_abbreviation,
              advised_quantity: row.advised_quantity,
              received_quantity: row.received_quantity,
              notes: row.notes || '',
            }))
          : [emptyItem()],
      });
      if (location.pathname !== `${baseRoute}/${deliveryAdviceId}/edit`) {
        navigate(`${baseRoute}/${deliveryAdviceId}/edit`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery advice');
    }
  };

  const openEdit = async (item: DeliveryAdviceListItem) => {
    await openEditById(item.delivery_advice_id);
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
    if (!editingId) {
      const rowErrors = form.items.map((row) => validateDetailRow(row, form.items));
      const firstError = rowErrors.find((entry) => Object.keys(entry).length > 0);
      if (firstError) {
        setError(Object.values(firstError)[0]);
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const payload: any = {
        purchase_order_id: Number(form.purchase_order_id),
        reference_code: form.reference_code.trim(),
        issued_at: form.issued_at || null,
        received_at: form.received_at || null,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        payload.expected_updated_at = editingVersion ?? undefined;
      } else {
        payload.items = form.items
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
          });
      }

      if (editingId) {
        const updated = await deliveryAdviceApi.update(editingId, payload);
        setEditingVersion(updated?.updated_at ?? editingVersion);
        setSuccess('Delivery Advice updated');
      } else {
        await deliveryAdviceApi.create(payload);
        setSuccess('Delivery Advice created');
      }

      setEditingId(null);
  setEditingVersion(null);
      setForm(emptyForm());
      navigate(baseRoute);
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
      const latest = await deliveryAdviceApi.get(viewItem.delivery_advice_id);
      const expectedUpdatedAt = latest?.updated_at ?? viewItem.updated_at ?? undefined;
      const next = action === 'submit'
        ? await deliveryAdviceApi.submit(viewItem.delivery_advice_id, { expected_updated_at: expectedUpdatedAt })
        : action === 'complete'
          ? await deliveryAdviceApi.complete(viewItem.delivery_advice_id, { expected_updated_at: expectedUpdatedAt })
          : await deliveryAdviceApi.cancel(viewItem.delivery_advice_id, { expected_updated_at: expectedUpdatedAt });
      setViewItem(next);
      setSuccess(`Delivery Advice ${action} successful`);
      await loadItems();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} delivery advice`);
    }
  };

  const getPoItemById = (id: string) => poItems.find((row) => row.purchase_order_item_id === Number(id));

  const detailColumns = useMemo<GridColDef<AdviceItemForm>[]>(() => {
    const poItemOptions = poItems.map((row) => ({ value: row.purchase_order_item_id.toString(), label: `#${row.purchase_order_item_id} - ${row.material_code}` }));
    return [
      {
        field: 'purchase_order_item_id',
        headerName: 'PO Item',
        minWidth: 200,
        flex: 0.9,
        editable: true,
        type: 'singleSelect',
        valueOptions: poItemOptions,
      },
      { field: 'material_label', headerName: 'Material', minWidth: 240, flex: 1.1 },
      { field: 'uom_label', headerName: 'UOM', minWidth: 110, flex: 0.6 },
      { field: 'advised_quantity', headerName: 'Quantity', minWidth: 120, flex: 0.7, editable: true },
      { field: 'received_quantity', headerName: 'Received', minWidth: 120, flex: 0.7, editable: true },
      { field: 'notes', headerName: 'Remarks', minWidth: 200, flex: 1, editable: true },
    ];
  }, [poItems]);

  const detailTotals = useMemo(() => {
    const totalQuantity = form.items.reduce((sum, row) => sum + (Number(row.advised_quantity) || 0), 0);
    return {
      totalItems: form.items.length,
      totalQuantity,
      totalAmount: 0,
    };
  }, [form.items]);

  const validateDetailRow = (row: AdviceItemForm, rows: AdviceItemForm[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    const quantity = Number(row.advised_quantity);
    if (!row.purchase_order_item_id) {
      errors.purchase_order_item_id = 'PO item is required';
    }
    if (!row.advised_quantity || Number.isNaN(quantity) || quantity <= 0) {
      errors.advised_quantity = 'Quantity must be greater than zero';
    }
    const duplicateCount = rows.filter((candidate) => candidate.purchase_order_item_id && candidate.purchase_order_item_id === row.purchase_order_item_id).length;
    if (row.purchase_order_item_id && duplicateCount > 1) {
      errors.purchase_order_item_id = 'Duplicate PO item is not allowed';
    }
    return errors;
  };

  const processDetailRowUpdate = (newRow: AdviceItemForm): AdviceItemForm => {
    const nextRow = { ...newRow };
    const poItem = getPoItemById(nextRow.purchase_order_item_id);
    if (poItem) {
      nextRow.material_label = `${poItem.material_code} - ${poItem.material_name}`;
      nextRow.uom_label = poItem.uom_abbreviation;
    } else {
      nextRow.material_label = '';
      nextRow.uom_label = '';
    }
    return nextRow;
  };

  const toDetailPayload = (row: AdviceItemForm) => {
    const poItem = poItems.find((item) => item.purchase_order_item_id === Number(row.purchase_order_item_id));
    return {
      purchase_order_item_id: row.purchase_order_item_id ? Number(row.purchase_order_item_id) : null,
      material_id: Number(poItem?.material_id),
      uom_id: Number(poItem?.uom_id),
      advised_quantity: Number(row.advised_quantity),
      received_quantity: row.received_quantity === '' ? 0 : Number(row.received_quantity),
      notes: row.notes || null,
    };
  };

  const handleDetailRowCommitted = async (newRow: AdviceItemForm, oldRow: AdviceItemForm): Promise<AdviceItemForm> => {
    if (!editingId) {
      return newRow;
    }

    const rowErrors = validateDetailRow(newRow, form.items.map((item) => (item.row_id === oldRow.row_id ? newRow : item)));
    if (Object.keys(rowErrors).length > 0) {
      return newRow;
    }

    if (!newRow.purchase_order_item_id || !newRow.advised_quantity) {
      return newRow;
    }

    const poItem = poItems.find((item) => item.purchase_order_item_id === Number(newRow.purchase_order_item_id));
    if (!poItem) {
      return newRow;
    }

    if (newRow.delivery_advice_item_id) {
      const detail = await deliveryAdviceApi.updateItem(editingId, newRow.delivery_advice_item_id, {
        ...toDetailPayload(newRow),
        expected_updated_at: oldRow.updated_at ?? null,
      });
      const savedItem = Array.isArray(detail?.items)
        ? detail.items.find((item: DeliveryAdviceItem) => item.delivery_advice_item_id === newRow.delivery_advice_item_id)
        : null;
      return {
        ...newRow,
        updated_at: savedItem?.updated_at ?? newRow.updated_at ?? null,
      };
    }

    const detail = await deliveryAdviceApi.addItem(editingId, toDetailPayload(newRow));
    const createdItem = Array.isArray(detail?.items)
      ? [...detail.items].sort((a: DeliveryAdviceItem, b: DeliveryAdviceItem) => b.delivery_advice_item_id - a.delivery_advice_item_id)[0]
      : null;

    return {
      ...newRow,
      delivery_advice_item_id: createdItem?.delivery_advice_item_id,
      updated_at: createdItem?.updated_at ?? null,
    };
  };

  const handleDetailRowDelete = async (row: AdviceItemForm): Promise<void> => {
    if (!editingId || !row.delivery_advice_item_id) {
      return;
    }

    await deliveryAdviceApi.deleteItem(editingId, row.delivery_advice_item_id, {
      expected_updated_at: row.updated_at ?? null,
    });
  };

  return (
    <Box>
      {routeMode === 'list' && (
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
      )}

      {routeMode !== 'list' && (
      <Paper>
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
                type="date"
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
                type="date"
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
            shouldConfirmDelete={(row) => Boolean(row.delivery_advice_item_id)}
            getDeleteConfirmMessage={() => 'Delete this saved detail row?'}
            addRowLabel="Add Row"
            focusField="purchase_order_item_id"
            totals={detailTotals}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(baseRoute)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Paper>
      )}

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
