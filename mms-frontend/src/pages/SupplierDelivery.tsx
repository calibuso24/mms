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
import { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { accountApi, lookupApi, projectApi, purchaseOrderApi, supplierApi, supplierDeliveryApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

type SortField = 'supplier_delivery_number' | 'po_number' | 'supplier_name' | 'project_name' | 'status_name' | 'delivery_date' | 'created_at' | 'item_count';
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

interface PurchaseOrderItem {
  purchase_order_id: number;
  po_number: string;
  supplier_party_id: number;
  supplier_party_name: string;
  project_id: number;
  project_name: string;
  status_name: string;
}

interface PurchaseOrderDetailItem {
  purchase_order_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  ordered_quantity: string;
  received_quantity: string;
}

interface SupplierDeliveryListItem {
  supplier_delivery_id: number;
  supplier_delivery_number: string;
  purchase_order_id: number;
  po_number: string;
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  project_id: number;
  project_code: string;
  project_name: string;
  received_by_account_name: string | null;
  delivery_date: string;
  status_id: number;
  status_code: string;
  status_name: string;
  posted_at: string | null;
  posted_by_account_name: string | null;
  reference_code: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
}

interface SupplierDeliveryItem {
  supplier_delivery_item_id: number;
  purchase_order_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  delivered_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  notes: string | null;
}

interface SupplierDeliveryDetail extends SupplierDeliveryListItem {
  items: SupplierDeliveryItem[];
  advices: Array<{ delivery_advice_id: number; da_number: string }>;
}

interface DeliveryItemForm {
  row_id: string;
  supplier_delivery_item_id?: number;
  purchase_order_item_id: string;
  material_label: string;
  uom_label: string;
  ordered_quantity: string;
  received_quantity: string;
  delivered_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  notes: string;
}

interface FormState {
  purchase_order_id: string;
  supplier_id: string;
  project_id: string;
  delivery_date: string;
  reference_code: string;
  notes: string;
  delivery_advice_ids: string;
  items: DeliveryItemForm[];
}

const emptyItem = (): DeliveryItemForm => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  supplier_delivery_item_id: undefined,
  purchase_order_item_id: '',
  material_label: '',
  uom_label: '',
  ordered_quantity: '',
  received_quantity: '',
  delivered_quantity: '',
  accepted_quantity: '',
  rejected_quantity: '',
  notes: '',
});

const emptyForm = (): FormState => ({
  purchase_order_id: '',
  supplier_id: '',
  project_id: '',
  delivery_date: new Date().toISOString().slice(0, 16),
  reference_code: '',
  notes: '',
  delivery_advice_ids: '',
  items: [emptyItem()],
});

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  return Number.isNaN(parsed) ? String(value) : parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function SupplierDeliveryPage() {
  const { account } = useAuth();
  const [items, setItems] = useState<SupplierDeliveryListItem[]>([]);
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
  const [sortBy, setSortBy] = useState<SortField>('delivery_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [filters, setFilters] = useState({
    purchase_order_id: '',
    supplier_id: '',
    project_id: '',
    status_id: '',
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [suppliers, setSuppliers] = useState<PartyItem[]>([]);
  const [projects, setProjects] = useState<PartyItem[]>([]);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<SupplierDeliveryDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<SupplierDeliveryListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [poItems, setPoItems] = useState<PurchaseOrderDetailItem[]>([]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Supplier Delivery:VIEW');
  const canCreate = permissionSet.has('Supplier Delivery:CREATE');
  const canUpdate = permissionSet.has('Supplier Delivery:UPDATE');
  const canDelete = permissionSet.has('Supplier Delivery:DELETE');
  const canApprove = permissionSet.has('Supplier Delivery:APPROVE');

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [account?.account_id]);

  useEffect(() => {
    void loadItems();
  }, [canView, page, rowsPerPage, search, sortBy, sortDir, filters.purchase_order_id, filters.supplier_id, filters.project_id, filters.status_id]);

  useEffect(() => {
    if (!form.purchase_order_id) {
      setPoItems([]);
      return;
    }
    void loadPurchaseOrderItems(Number(form.purchase_order_id));
  }, [form.purchase_order_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void supplierApi
        .list(100, 0, supplierQuery)
        .then((data) => setSuppliers(Array.isArray(data?.items) ? data.items : []))
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [supplierQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void projectApi
        .list(100, 0, projectQuery)
        .then((data) => setProjects(Array.isArray(data?.items) ? data.items : []))
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [projectQuery]);

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
      const [purchaseOrderData, supplierData, projectData, statusData] = await Promise.all([
        purchaseOrderApi.list(200, 0).catch(() => ({ items: [] })),
        supplierApi.list(200, 0).catch(() => ({ items: [] })),
        projectApi.list(200, 0).catch(() => ({ items: [] })),
        lookupApi.listByType('supplier_delivery_status', 100),
      ]);

      setPurchaseOrders(Array.isArray(purchaseOrderData?.items) ? purchaseOrderData.items : []);
      setSuppliers(Array.isArray(supplierData?.items) ? supplierData.items : []);
      setProjects(Array.isArray(projectData?.items) ? projectData.items : []);
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
      const result = await supplierDeliveryApi.list(rowsPerPage, page * rowsPerPage, {
        search: search || undefined,
        purchase_order_id: filters.purchase_order_id ? Number(filters.purchase_order_id) : undefined,
        supplier_id: filters.supplier_id ? Number(filters.supplier_id) : undefined,
        project_id: filters.project_id ? Number(filters.project_id) : undefined,
        status_id: filters.status_id ? Number(filters.status_id) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });

      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotal(result?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier deliveries');
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

  const openEdit = async (item: SupplierDeliveryListItem) => {
    setEditingId(item.supplier_delivery_id);
    try {
      const detail: SupplierDeliveryDetail = await supplierDeliveryApi.get(item.supplier_delivery_id);
      setForm({
        purchase_order_id: detail.purchase_order_id.toString(),
        supplier_id: detail.supplier_id.toString(),
        project_id: detail.project_id.toString(),
        delivery_date: detail.delivery_date ? detail.delivery_date.slice(0, 16) : '',
        reference_code: detail.reference_code || '',
        notes: detail.notes || '',
        delivery_advice_ids: detail.advices.map((advice) => advice.delivery_advice_id).join(', '),
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              row_id: `${Date.now()}-${row.supplier_delivery_item_id}`,
              supplier_delivery_item_id: row.supplier_delivery_item_id,
              purchase_order_item_id: row.purchase_order_item_id.toString(),
              material_label: `${row.material_code} - ${row.material_name}`,
              uom_label: row.uom_abbreviation,
              ordered_quantity: '',
              received_quantity: '',
              delivered_quantity: row.delivered_quantity,
              accepted_quantity: row.accepted_quantity,
              rejected_quantity: row.rejected_quantity,
              notes: row.notes || '',
            }))
          : [emptyItem()],
      });
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier delivery');
    }
  };

  const openView = async (item: SupplierDeliveryListItem) => {
    try {
      const detail = await supplierDeliveryApi.get(item.supplier_delivery_id);
      setViewItem(detail);
      setViewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier delivery');
    }
  };

  const openDelete = (item: SupplierDeliveryListItem) => {
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

  const syncFromPurchaseOrder = (purchaseOrderId: string) => {
    const selectedPo = purchaseOrders.find((po) => po.purchase_order_id === Number(purchaseOrderId));
    if (!selectedPo) return;

    setForm((current) => ({
      ...current,
      purchase_order_id: purchaseOrderId,
      supplier_id: selectedPo.supplier_party_id ? selectedPo.supplier_party_id.toString() : current.supplier_id,
      project_id: selectedPo.project_id ? selectedPo.project_id.toString() : current.project_id,
      items: [emptyItem()],
    }));
  };

  const updateItem = (index: number, field: keyof DeliveryItemForm, value: string) => {
    setForm((current) => {
      const nextItems = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const next = { ...item, [field]: value };
        if (field === 'purchase_order_item_id') {
          next.delivered_quantity = '';
          next.accepted_quantity = '';
          next.rejected_quantity = '';
        }
        return next;
      });

      return {
        ...current,
        items: nextItems,
      };
    });
  };

  const addItemRow = () => {
    setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  };

  const removeItemRow = (index: number) => {
    setForm((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, items: nextItems.length > 0 ? nextItems : [emptyItem()] };
    });
  };

  const parseDeliveryAdviceIds = (rawValue: string): number[] | undefined => {
    if (!rawValue.trim()) return undefined;
    return rawValue
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => Number(part))
      .filter((value) => Number.isInteger(value) && value > 0);
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
      const payloadItems = form.items
        .filter((item) => item.purchase_order_item_id && item.delivered_quantity && item.accepted_quantity)
        .map((item) => {
          const poItem = poItems.find((row) => row.purchase_order_item_id === Number(item.purchase_order_item_id));
          const delivered = Number(item.delivered_quantity);
          const accepted = Number(item.accepted_quantity);
          const rejected = item.rejected_quantity === '' ? delivered - accepted : Number(item.rejected_quantity);

          return {
            purchase_order_item_id: Number(item.purchase_order_item_id),
            material_id: Number(poItem?.material_id),
            uom_id: Number(poItem?.uom_id),
            delivered_quantity: delivered,
            accepted_quantity: accepted,
            rejected_quantity: rejected,
            notes: item.notes.trim() || null,
          };
        });

      const payload = {
        purchase_order_id: Number(form.purchase_order_id),
        supplier_id: Number(form.supplier_id),
        project_id: Number(form.project_id),
        delivery_date: form.delivery_date ? new Date(form.delivery_date).toISOString() : null,
        reference_code: form.reference_code.trim() || null,
        notes: form.notes.trim() || null,
        delivery_advice_ids: parseDeliveryAdviceIds(form.delivery_advice_ids),
        items: payloadItems,
      };

      if (editingId) {
        await supplierDeliveryApi.update(editingId, payload);
        setSuccess('Supplier Delivery updated');
      } else {
        await supplierDeliveryApi.create(payload);
        setSuccess('Supplier Delivery created');
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save supplier delivery');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await supplierDeliveryApi.delete(deleteItem.supplier_delivery_id);
      setSuccess('Supplier Delivery deleted');
      setDeleteOpen(false);
      setDeleteItem(null);
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete supplier delivery');
    } finally {
      setDeleting(false);
    }
  };

  const runWorkflowAction = async (action: 'post' | 'cancel') => {
    if (!viewItem) return;

    try {
      const next = action === 'post'
        ? await supplierDeliveryApi.post(viewItem.supplier_delivery_id)
        : await supplierDeliveryApi.cancel(viewItem.supplier_delivery_id);

      setViewItem(next);
      setSuccess(action === 'post' ? 'Supplier Delivery posted' : 'Supplier Delivery cancelled');
      await loadItems();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} supplier delivery`);
    }
  };

  const getPoItemById = (id: string) => poItems.find((item) => item.purchase_order_item_id === Number(id));

  const detailColumns = useMemo<GridColDef<DeliveryItemForm>[]>(() => {
    const poItemOptions = poItems.map((row) => ({ value: row.purchase_order_item_id.toString(), label: `#${row.purchase_order_item_id} - ${row.material_code}` }));
    return [
      {
        field: 'purchase_order_item_id',
        headerName: 'PO Item',
        minWidth: 210,
        flex: 0.9,
        editable: true,
        type: 'singleSelect',
        valueOptions: poItemOptions,
      },
      { field: 'material_label', headerName: 'Material', minWidth: 230, flex: 1.05 },
      { field: 'uom_label', headerName: 'UOM', minWidth: 100, flex: 0.55 },
      { field: 'ordered_quantity', headerName: 'Ordered', minWidth: 105, flex: 0.6 },
      { field: 'received_quantity', headerName: 'Received', minWidth: 105, flex: 0.6 },
      { field: 'delivered_quantity', headerName: 'Quantity', minWidth: 105, flex: 0.6, editable: true },
      { field: 'accepted_quantity', headerName: 'Accepted', minWidth: 105, flex: 0.6, editable: true },
      { field: 'rejected_quantity', headerName: 'Rejected', minWidth: 105, flex: 0.6, editable: true },
      { field: 'notes', headerName: 'Remarks', minWidth: 180, flex: 0.9, editable: true },
    ];
  }, [poItems]);

  const detailTotals = useMemo(() => {
    const totalQuantity = form.items.reduce((sum, row) => sum + (Number(row.delivered_quantity) || 0), 0);
    return {
      totalItems: form.items.length,
      totalQuantity,
      totalAmount: 0,
    };
  }, [form.items]);

  const validateDetailRow = (row: DeliveryItemForm, rows: DeliveryItemForm[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    const delivered = Number(row.delivered_quantity);
    const accepted = Number(row.accepted_quantity);

    if (!row.purchase_order_item_id) {
      errors.purchase_order_item_id = 'PO item is required';
    }
    if (!row.delivered_quantity || Number.isNaN(delivered) || delivered <= 0) {
      errors.delivered_quantity = 'Quantity must be greater than zero';
    }
    if (!row.accepted_quantity || Number.isNaN(accepted) || accepted < 0) {
      errors.accepted_quantity = 'Accepted quantity is required';
    }
    if (!Number.isNaN(delivered) && !Number.isNaN(accepted) && accepted > delivered) {
      errors.accepted_quantity = 'Accepted quantity cannot exceed delivered quantity';
    }

    const duplicateCount = rows.filter((candidate) => candidate.purchase_order_item_id && candidate.purchase_order_item_id === row.purchase_order_item_id).length;
    if (row.purchase_order_item_id && duplicateCount > 1) {
      errors.purchase_order_item_id = 'Duplicate PO item is not allowed';
    }

    return errors;
  };

  const processDetailRowUpdate = (newRow: DeliveryItemForm): DeliveryItemForm => {
    const nextRow = { ...newRow };
    const poItem = getPoItemById(nextRow.purchase_order_item_id);

    if (poItem) {
      nextRow.material_label = `${poItem.material_code} - ${poItem.material_name}`;
      nextRow.uom_label = poItem.uom_abbreviation;
      nextRow.ordered_quantity = poItem.ordered_quantity;
      nextRow.received_quantity = poItem.received_quantity;
    } else {
      nextRow.material_label = '';
      nextRow.uom_label = '';
      nextRow.ordered_quantity = '';
      nextRow.received_quantity = '';
    }

    if (nextRow.delivered_quantity && nextRow.accepted_quantity === '') {
      nextRow.accepted_quantity = nextRow.delivered_quantity;
    }
    if (nextRow.delivered_quantity && nextRow.accepted_quantity) {
      const delivered = Number(nextRow.delivered_quantity) || 0;
      const accepted = Number(nextRow.accepted_quantity) || 0;
      nextRow.rejected_quantity = (delivered - accepted).toString();
    }

    return nextRow;
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Supplier Delivery</Typography>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 0.5 }}>
            <Typography color="text.secondary">Inventory</Typography>
            <Typography color="text.primary">Supplier Delivery</Typography>
          </Breadcrumbs>
        </Box>

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4} lg={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search SD No., PO, supplier, project"
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

              <Grid item xs={12} md={2} lg={2}>
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
                <Autocomplete
                  size="small"
                  options={suppliers}
                  value={suppliers.find((supplier) => String(supplier.party_id) === String(filters.supplier_id)) || null}
                  onChange={(_, value) => {
                    setFilters((current) => ({ ...current, supplier_id: value ? String(value.party_id) : '' }));
                    setPage(0);
                  }}
                  onInputChange={(_, value, reason) => {
                    if (reason === 'input' || reason === 'clear') {
                      setSupplierQuery(value);
                    }
                  }}
                  getOptionLabel={(option) => `${option.party_code} - ${option.party_name}`}
                  renderInput={(params) => <TextField {...params} label="Supplier" />}
                />
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

              <Grid item xs={12} md={2} lg={2}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'stretch', md: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setSearchInput('');
                      setSearch('');
                      setFilters({ purchase_order_id: '', supplier_id: '', project_id: '', status_id: '' });
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
                      <TableCell>
                        <TableSortLabel active={sortBy === 'supplier_delivery_number'} direction={sortDir} onClick={() => handleSort('supplier_delivery_number')}>SD Number</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'po_number'} direction={sortDir} onClick={() => handleSort('po_number')}>PO Number</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'supplier_name'} direction={sortDir} onClick={() => handleSort('supplier_name')}>Supplier</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'project_name'} direction={sortDir} onClick={() => handleSort('project_name')}>Project</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'delivery_date'} direction={sortDir} onClick={() => handleSort('delivery_date')}>Delivery Date</TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel active={sortBy === 'status_name'} direction={sortDir} onClick={() => handleSort('status_name')}>Status</TableSortLabel>
                      </TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                            No supplier deliveries found.
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((row) => (
                        <TableRow key={row.supplier_delivery_id} hover>
                          <TableCell>{row.supplier_delivery_number}</TableCell>
                          <TableCell>{row.po_number}</TableCell>
                          <TableCell>{row.supplier_code} - {row.supplier_name}</TableCell>
                          <TableCell>{row.project_code} - {row.project_name}</TableCell>
                          <TableCell>{formatDate(row.delivery_date)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.status_name}</Typography>
                          </TableCell>
                          <TableCell align="right">{row.item_count}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View">
                                <IconButton size="small" onClick={() => openView(row)}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {canUpdate && row.status_code === 'draft' && (
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => openEdit(row)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {canDelete && (row.status_code === 'draft' || row.status_code === 'cancelled') && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => openDelete(row)}>
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
        <DialogTitle>{editingId ? 'Edit Supplier Delivery' : 'Create Supplier Delivery'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Purchase Order</Typography>
                <Select
                  value={form.purchase_order_id}
                  onChange={(event) => syncFromPurchaseOrder(event.target.value as string)}
                >
                  <MenuItem value="">Select purchase order</MenuItem>
                  {purchaseOrders.map((po) => (
                    <MenuItem key={po.purchase_order_id} value={po.purchase_order_id.toString()}>
                      {po.po_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
              <Autocomplete
                options={suppliers}
                value={suppliers.find((supplier) => String(supplier.party_id) === String(form.supplier_id)) || null}
                onChange={(_, value) => setForm((current) => ({ ...current, supplier_id: value ? String(value.party_id) : '' }))}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setSupplierQuery(value);
                  }
                }}
                getOptionLabel={(option) => `${option.party_code} - ${option.party_name}`}
                renderInput={(params) => <TextField {...params} label="Supplier" />}
              />
            </Grid>

            <Grid item xs={12} md={6} lg={4}>
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

            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                size="small"
                label="Delivery Date"
                type="datetime-local"
                value={form.delivery_date}
                onChange={(event) => setForm((current) => ({ ...current, delivery_date: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
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
                label="Delivery Advice IDs"
                helperText="Optional comma-separated IDs"
                value={form.delivery_advice_ids}
                onChange={(event) => setForm((current) => ({ ...current, delivery_advice_ids: event.target.value }))}
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
            validateRow={validateDetailRow}
            shouldConfirmDelete={(row) => Boolean(row.supplier_delivery_item_id)}
            getDeleteConfirmMessage={() => 'Delete this saved detail row?'}
            addRowLabel="Add Row"
            focusField="purchase_order_item_id"
            totals={detailTotals}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <LocalShippingIcon />}>
            {editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Supplier Delivery Details</DialogTitle>
        <DialogContent dividers>
          {!viewItem ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">SD Number</Typography>
                  <Typography variant="body2">{viewItem.supplier_delivery_number}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{viewItem.status_name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Purchase Order</Typography>
                  <Typography variant="body2">{viewItem.po_number}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Delivery Date</Typography>
                  <Typography variant="body2">{formatDate(viewItem.delivery_date)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Supplier</Typography>
                  <Typography variant="body2">{viewItem.supplier_code} - {viewItem.supplier_name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2">{viewItem.project_code} - {viewItem.project_name}</Typography>
                </Grid>
              </Grid>

              <Divider />

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell align="right">Delivered</TableCell>
                      <TableCell align="right">Accepted</TableCell>
                      <TableCell align="right">Rejected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewItem.items.map((item) => (
                      <TableRow key={item.supplier_delivery_item_id}>
                        <TableCell>{item.material_code} - {item.material_name}</TableCell>
                        <TableCell>{item.uom_abbreviation}</TableCell>
                        <TableCell align="right">{formatNumber(item.delivered_quantity)}</TableCell>
                        <TableCell align="right">{formatNumber(item.accepted_quantity)}</TableCell>
                        <TableCell align="right">{formatNumber(item.rejected_quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {viewItem && canApprove && viewItem.status_code === 'draft' && (
            <>
              <Button color="error" onClick={() => runWorkflowAction('cancel')}>Cancel Delivery</Button>
              <Button variant="contained" onClick={() => runWorkflowAction('post')}>Post Delivery</Button>
            </>
          )}
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Supplier Delivery</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Delete {deleteItem?.supplier_delivery_number}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={submitDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError('')} severity="error" variant="filled">{error}</Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success" variant="filled">{success}</Alert>
      </Snackbar>
    </Box>
  );
}
