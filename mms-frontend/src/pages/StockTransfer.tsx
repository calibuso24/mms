import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
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
  materialApi,
  projectApi,
  purchaseOrderApi,
  stockTransferApi,
  supplierApi,
  uomApi,
} from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

type SortField = 'stock_transfer_number' | 'transfer_type_name' | 'source_name' | 'destination_name' | 'status_name' | 'transfer_date' | 'created_at';
type SortDir = 'asc' | 'desc';

interface LookupItem {
  look_up_id: number;
  code: string;
  name: string;
}

interface PartyItem {
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

interface PurchaseOrderItem {
  purchase_order_id: number;
  po_number: string;
}

interface PurchaseOrderDetailItem {
  purchase_order_item_id: number;
  material_id: number;
  uom_id: number;
}

interface StockTransferListItem {
  stock_transfer_id: number;
  stock_transfer_number: string;
  transfer_type_id: number;
  transfer_type_name: string;
  source_id: number;
  source_code: string;
  source_name: string;
  destination_id: number;
  destination_code: string;
  destination_name: string;
  purchase_order_id: number | null;
  po_number: string | null;
  status_code: string;
  status_name: string;
  transfer_date: string;
  item_count: number;
  reference_code: string | null;
}

interface StockTransferItem {
  stock_transfer_item_id: number;
  purchase_order_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  uom_id: number;
  uom_abbreviation: string;
  quantity: string;
  notes: string | null;
}

interface StockTransferDetail extends StockTransferListItem {
  items: StockTransferItem[];
}

interface ItemForm {
  row_id: string;
  stock_transfer_item_id?: number;
  purchase_order_item_id: string;
  material_id: string;
  description: string;
  specification: string;
  brand: string;
  uom_id: string;
  quantity: string;
  notes: string;
}

interface FormState {
  transfer_type_id: string;
  source_id: string;
  destination_id: string;
  purchase_order_id: string;
  transfer_date: string;
  reference_code: string;
  notes: string;
  items: ItemForm[];
}

const emptyItem = (): ItemForm => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  stock_transfer_item_id: undefined,
  purchase_order_item_id: '',
  material_id: '',
  description: '',
  specification: '',
  brand: '',
  uom_id: '',
  quantity: '',
  notes: '',
});

const emptyForm = (): FormState => ({
  transfer_type_id: '',
  source_id: '',
  destination_id: '',
  purchase_order_id: '',
  transfer_date: new Date().toISOString().slice(0, 10),
  reference_code: '',
  notes: '',
  items: [emptyItem()],
});

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function StockTransferPage() {
  const { account } = useAuth();
  const [items, setItems] = useState<StockTransferListItem[]>([]);
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
  const [sortBy, setSortBy] = useState<SortField>('transfer_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState({ transfer_type_id: '', status_id: '' });

  const [transferTypes, setTransferTypes] = useState<LookupItem[]>([]);
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [uoms, setUoms] = useState<UomItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [parties, setParties] = useState<PartyItem[]>([]);
  const [poItems, setPoItems] = useState<PurchaseOrderDetailItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<StockTransferDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockTransferListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Stock Transfer:VIEW');
  const canCreate = permissionSet.has('Stock Transfer:CREATE');
  const canUpdate = permissionSet.has('Stock Transfer:UPDATE');
  const canDelete = permissionSet.has('Stock Transfer:DELETE');
  const canApprove = permissionSet.has('Stock Transfer:APPROVE');

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [account?.account_id]);

  useEffect(() => {
    void loadItems();
  }, [canView, page, rowsPerPage, search, sortBy, sortDir, filters.transfer_type_id, filters.status_id]);

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
      const [typeData, statusData, materialData, uomData, poData, projectData, supplierData] = await Promise.all([
        lookupApi.listByType('stock_transfer_type', 100),
        lookupApi.listByType('stock_transfer_status', 100),
        materialApi.list(300, 0).catch(() => ({ items: [] })),
        uomApi.list(200, 0).catch(() => []),
        purchaseOrderApi.list(200, 0).catch(() => ({ items: [] })),
        projectApi.list(200, 0).catch(() => ({ items: [] })),
        supplierApi.list(200, 0).catch(() => ({ items: [] })),
      ]);

      const projectItems: PartyItem[] = Array.isArray(projectData?.items) ? projectData.items : [];
      const supplierItems: PartyItem[] = Array.isArray(supplierData?.items) ? supplierData.items : [];
      const mergedPartyMap = new Map<number, PartyItem>();
      [...projectItems, ...supplierItems].forEach((party) => mergedPartyMap.set(party.party_id, party));

      setTransferTypes(Array.isArray(typeData) ? typeData : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
      setMaterials(Array.isArray(materialData?.items) ? materialData.items : []);
      setUoms(Array.isArray(uomData) ? uomData : []);
      setPurchaseOrders(Array.isArray(poData?.items) ? poData.items : []);
      setParties(Array.from(mergedPartyMap.values()));
    } catch (err: any) {
      setError(err.message || 'Failed to load lookup values');
    }
  };

  const loadItems = async () => {
    if (!canView) return;
    setLoading(true);
    setError('');

    try {
      const result = await stockTransferApi.list(rowsPerPage, page * rowsPerPage, {
        search: search || undefined,
        transfer_type_id: filters.transfer_type_id ? Number(filters.transfer_type_id) : undefined,
        status_id: filters.status_id ? Number(filters.status_id) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotal(result?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock transfers');
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

  const openEdit = async (item: StockTransferListItem) => {
    setEditingId(item.stock_transfer_id);
    try {
      const detail: StockTransferDetail = await stockTransferApi.get(item.stock_transfer_id);
      setForm({
        transfer_type_id: detail.transfer_type_id.toString(),
        source_id: detail.source_id.toString(),
        destination_id: detail.destination_id.toString(),
        purchase_order_id: detail.purchase_order_id ? detail.purchase_order_id.toString() : '',
        transfer_date: detail.transfer_date ? detail.transfer_date.slice(0, 10) : '',
        reference_code: detail.reference_code || '',
        notes: detail.notes || '',
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              row_id: `${Date.now()}-${row.stock_transfer_item_id}`,
              stock_transfer_item_id: row.stock_transfer_item_id,
              purchase_order_item_id: row.purchase_order_item_id ? row.purchase_order_item_id.toString() : '',
              material_id: row.material_id.toString(),
              description: row.material_name,
              specification: '',
              brand: '',
              uom_id: row.uom_id.toString(),
              quantity: row.quantity,
              notes: row.notes || '',
            }))
          : [emptyItem()],
      });
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock transfer');
    }
  };

  const openView = async (item: StockTransferListItem) => {
    try {
      const detail = await stockTransferApi.get(item.stock_transfer_id);
      setViewItem(detail);
      setViewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock transfer');
    }
  };

  const openDelete = (item: StockTransferListItem) => {
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
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [field]: value };
        if (field === 'purchase_order_item_id' && value) {
          const poItem = poItems.find((row) => row.purchase_order_item_id === Number(value));
          if (poItem) {
            next.material_id = poItem.material_id.toString();
            next.uom_id = poItem.uom_id.toString();
          }
        }
        return next;
      }),
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
        transfer_type_id: Number(form.transfer_type_id),
        source_id: Number(form.source_id),
        destination_id: Number(form.destination_id),
        purchase_order_id: form.purchase_order_id ? Number(form.purchase_order_id) : null,
        transfer_date: form.transfer_date || null,
        reference_code: form.reference_code.trim() || null,
        notes: form.notes.trim() || null,
        items: form.items
          .filter((item) => item.material_id && item.uom_id && item.quantity)
          .map((item) => ({
            purchase_order_item_id: item.purchase_order_item_id ? Number(item.purchase_order_item_id) : null,
            material_id: Number(item.material_id),
            uom_id: Number(item.uom_id),
            quantity: Number(item.quantity),
            notes: item.notes || null,
          })),
      };

      if (editingId) {
        await stockTransferApi.update(editingId, payload);
        setSuccess('Stock Transfer updated');
      } else {
        await stockTransferApi.create(payload);
        setSuccess('Stock Transfer created');
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save stock transfer');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await stockTransferApi.delete(deleteItem.stock_transfer_id);
      setSuccess('Stock Transfer deleted');
      setDeleteOpen(false);
      setDeleteItem(null);
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete stock transfer');
    } finally {
      setDeleting(false);
    }
  };

  const runWorkflowAction = async (action: 'submit' | 'approve' | 'cancel') => {
    if (!viewItem) return;

    try {
      const next = action === 'submit'
        ? await stockTransferApi.submit(viewItem.stock_transfer_id)
        : action === 'approve'
          ? await stockTransferApi.approve(viewItem.stock_transfer_id)
          : await stockTransferApi.cancel(viewItem.stock_transfer_id);
      setViewItem(next);
      setSuccess(`Stock Transfer ${action} successful`);
      await loadItems();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} stock transfer`);
    }
  };

  const detailColumns = useMemo<GridColDef<ItemForm>[]>(() => {
    const poItemOptions = poItems.map((row) => ({ value: row.purchase_order_item_id.toString(), label: `#${row.purchase_order_item_id}` }));
    const materialOptions = materials.map((row) => ({ value: row.material_id.toString(), label: `${row.product_code} - ${row.full_description || row.product_name}` }));
    const uomOptions = uoms.map((row) => ({ value: row.uom_id.toString(), label: row.abbreviation }));

    return [
      {
        field: 'purchase_order_item_id',
        headerName: 'PO Item',
        minWidth: 140,
        flex: 0.6,
        editable: true,
        type: 'singleSelect',
        valueOptions: poItemOptions,
      },
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
      { field: 'quantity', headerName: 'Quantity', minWidth: 120, flex: 0.7, editable: true },
      { field: 'notes', headerName: 'Remarks', minWidth: 180, flex: 0.9, editable: true },
    ];
  }, [poItems, materials, uoms]);

  const detailTotals = useMemo(() => {
    const totalQuantity = form.items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    return {
      totalItems: form.items.length,
      totalQuantity,
      totalAmount: 0,
    };
  }, [form.items]);

  const validateDetailRow = (row: ItemForm, rows: ItemForm[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    const quantity = Number(row.quantity);

    if (!row.material_id) {
      errors.material_id = 'Material is required';
    }
    if (!row.uom_id) {
      errors.uom_id = 'UOM is required';
    }
    if (!row.quantity || Number.isNaN(quantity) || quantity <= 0) {
      errors.quantity = 'Quantity must be greater than zero';
    }

    const duplicateCount = rows.filter((candidate) => candidate.material_id && candidate.material_id === row.material_id).length;
    if (row.material_id && duplicateCount > 1) {
      errors.material_id = 'Duplicate material is not allowed';
    }

    return errors;
  };

  const processDetailRowUpdate = (newRow: ItemForm): ItemForm => {
    const nextRow = { ...newRow };

    if (nextRow.purchase_order_item_id) {
      const poItem = poItems.find((row) => row.purchase_order_item_id === Number(nextRow.purchase_order_item_id));
      if (poItem) {
        nextRow.material_id = poItem.material_id.toString();
        nextRow.uom_id = poItem.uom_id.toString();
      }
    }

    const material = materials.find((item) => item.material_id === Number(nextRow.material_id));
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

  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Stock Transfer</Typography>
          <Breadcrumbs sx={{ mt: 0.5 }}>
            <Typography color="text.secondary">Inventory</Typography>
            <Typography color="text.primary">Stock Transfer</Typography>
          </Breadcrumbs>
        </Box>

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4} lg={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search transfer no, source, destination"
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
                    value={filters.transfer_type_id}
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, transfer_type_id: event.target.value }));
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {transferTypes.map((row) => (
                      <MenuItem key={row.look_up_id} value={row.look_up_id.toString()}>{row.name}</MenuItem>
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
                      setFilters({ transfer_type_id: '', status_id: '' });
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
                      <TableCell><TableSortLabel active={sortBy === 'stock_transfer_number'} direction={sortDir} onClick={() => handleSort('stock_transfer_number')}>Transfer No.</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'transfer_type_name'} direction={sortDir} onClick={() => handleSort('transfer_type_name')}>Type</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'source_name'} direction={sortDir} onClick={() => handleSort('source_name')}>Source</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'destination_name'} direction={sortDir} onClick={() => handleSort('destination_name')}>Destination</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'transfer_date'} direction={sortDir} onClick={() => handleSort('transfer_date')}>Transfer Date</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortBy === 'status_name'} direction={sortDir} onClick={() => handleSort('status_name')}>Status</TableSortLabel></TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow><TableCell colSpan={8}><Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>No stock transfer records found.</Box></TableCell></TableRow>
                    ) : (
                      items.map((row) => (
                        <TableRow key={row.stock_transfer_id} hover>
                          <TableCell>{row.stock_transfer_number}</TableCell>
                          <TableCell>{row.transfer_type_name}</TableCell>
                          <TableCell>{row.source_code} - {row.source_name}</TableCell>
                          <TableCell>{row.destination_code} - {row.destination_name}</TableCell>
                          <TableCell>{formatDate(row.transfer_date)}</TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.status_name}</Typography></TableCell>
                          <TableCell align="right">{row.item_count}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View"><IconButton size="small" onClick={() => openView(row)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                              {canUpdate && row.status_code === 'draft' && <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                              {canDelete && (row.status_code === 'draft' || row.status_code === 'cancelled') && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => openDelete(row)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
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
        <DialogTitle>{editingId ? 'Edit Stock Transfer' : 'Create Stock Transfer'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Transfer Type</Typography>
                <Select value={form.transfer_type_id} onChange={(event) => setForm((current) => ({ ...current, transfer_type_id: event.target.value }))}>
                  <MenuItem value="">Select type</MenuItem>
                  {transferTypes.map((row) => <MenuItem key={row.look_up_id} value={row.look_up_id.toString()}>{row.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <Autocomplete
                size="small"
                options={parties}
                value={parties.find((party) => String(party.party_id) === String(form.source_id)) || null}
                onChange={(_, value) => setForm((current) => ({ ...current, source_id: value ? String(value.party_id) : '' }))}
                getOptionLabel={(option) => `${option.party_code} - ${option.party_name}`}
                renderInput={(params) => <TextField {...params} label="Source" />}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <Autocomplete
                size="small"
                options={parties}
                value={parties.find((party) => String(party.party_id) === String(form.destination_id)) || null}
                onChange={(_, value) => setForm((current) => ({ ...current, destination_id: value ? String(value.party_id) : '' }))}
                getOptionLabel={(option) => `${option.party_code} - ${option.party_name}`}
                renderInput={(params) => <TextField {...params} label="Destination" />}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Purchase Order (optional)</Typography>
                <Select value={form.purchase_order_id} onChange={(event) => setForm((current) => ({ ...current, purchase_order_id: event.target.value }))}>
                  <MenuItem value="">None</MenuItem>
                  {purchaseOrders.map((row) => <MenuItem key={row.purchase_order_id} value={row.purchase_order_id.toString()}>{row.po_number}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField fullWidth size="small" type="date" label="Transfer Date" value={form.transfer_date} onChange={(event) => setForm((current) => ({ ...current, transfer_date: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField fullWidth size="small" label="Reference Code" value={form.reference_code} onChange={(event) => setForm((current) => ({ ...current, reference_code: event.target.value }))} />
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
              shouldConfirmDelete={(row) => Boolean(row.stock_transfer_item_id)}
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
        <DialogTitle>Stock Transfer Details</DialogTitle>
        <DialogContent dividers>
          {!viewItem ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={26} /></Box>
          ) : (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Transfer No.</Typography><Typography variant="body2">{viewItem.stock_transfer_number}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Status</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{viewItem.status_name}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Type</Typography><Typography variant="body2">{viewItem.transfer_type_name}</Typography></Grid>
                <Grid item xs={12} md={6}><Typography variant="caption" color="text.secondary">Transfer Date</Typography><Typography variant="body2">{formatDate(viewItem.transfer_date)}</Typography></Grid>
              </Grid>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewItem.items.map((item) => (
                      <TableRow key={item.stock_transfer_item_id}>
                        <TableCell>{item.material_code} - {item.material_name}</TableCell>
                        <TableCell>{item.uom_abbreviation}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {viewItem && canUpdate && viewItem.status_code === 'draft' && <Button onClick={() => runWorkflowAction('submit')} variant="contained">Submit</Button>}
          {viewItem && canApprove && viewItem.status_code === 'submitted' && <Button onClick={() => runWorkflowAction('approve')} variant="contained">Approve</Button>}
          {viewItem && canApprove && (viewItem.status_code === 'draft' || viewItem.status_code === 'submitted') && <Button color="error" onClick={() => runWorkflowAction('cancel')}>Cancel</Button>}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Stock Transfer</DialogTitle>
        <DialogContent><Typography variant="body2">Delete {deleteItem?.stock_transfer_number}? This action cannot be undone.</Typography></DialogContent>
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
