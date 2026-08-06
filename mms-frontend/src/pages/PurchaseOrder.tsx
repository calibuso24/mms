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
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
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
  materialRequestApi,
  projectApi,
  purchaseOrderApi,
  supplierApi,
  uomApi,
} from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

type SortField = 'po_number' | 'project_code' | 'project_name' | 'supplier_party_name' | 'order_type_name' | 'status_name' | 'prepared_at' | 'expected_delivery_date' | 'total_amount' | 'item_count' | 'created_at';
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

interface SupplierItem {
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

interface RequestItemSummary {
  material_request_id: number;
  mr_number: string;
  project_id: number;
  project_name: string;
  status_name: string;
}

interface PurchaseOrderItemForm {
  row_id: string;
  purchase_order_item_id?: number;
  material_request_item_id: string;
  material_id: string;
  description: string;
  specification: string;
  brand: string;
  requested_quantity: string;
  ordered_quantity: string;
  received_quantity: string;
  uom_id: string;
  unit_price: string;
  line_total: string;
  supplier_reference: string;
  notes: string;
}

interface PurchaseOrderItemView {
  purchase_order_item_id: number;
  material_request_item_id: number | null;
  material_id: number;
  material_code: string;
  material_name: string;
  requested_quantity: string;
  ordered_quantity: string;
  received_quantity: string;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  unit_price: string | null;
  line_total: string | null;
  supplier_reference: string | null;
  notes: string | null;
}

interface PurchaseOrderListItem {
  purchase_order_id: number;
  po_number: string;
  project_id: number;
  project_code: string;
  project_name: string;
  material_request_id: number | null;
  material_request_number: string | null;
  supplier_party_id: number;
  supplier_party_code: string;
  supplier_party_name: string;
  requested_by_account_name: string | null;
  prepared_at: string | null;
  expected_delivery_date: string | null;
  order_type_id: number;
  order_type_name: string;
  status_id: number;
  status_code: string;
  status_name: string;
  total_amount: string | null;
  notes: string | null;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

interface PurchaseOrderDetail extends PurchaseOrderListItem {
  items: PurchaseOrderItemView[];
}

interface FormState {
  project_id: string;
  material_request_id: string;
  supplier_party_id: string;
  prepared_at: string;
  expected_delivery_date: string;
  order_type_id: string;
  total_amount: string;
  notes: string;
  items: PurchaseOrderItemForm[];
}

const emptyItem = (): PurchaseOrderItemForm => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  purchase_order_item_id: undefined,
  material_request_item_id: '',
  material_id: '',
  description: '',
  specification: '',
  brand: '',
  requested_quantity: '',
  ordered_quantity: '',
  received_quantity: '0',
  uom_id: '',
  unit_price: '',
  line_total: '',
  supplier_reference: '',
  notes: '',
});

const emptyForm = (): FormState => ({
  project_id: '',
  material_request_id: '',
  supplier_party_id: '',
  prepared_at: new Date().toISOString().slice(0, 10),
  expected_delivery_date: '',
  order_type_id: '',
  total_amount: '',
  notes: '',
  items: [emptyItem()],
});

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  partially_delivered: 'Partially Delivered',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
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

function toDateLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function PurchaseOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const baseRoute = '/app/purchasing/purchase-order';
  const routeMode = location.pathname.endsWith('/new') ? 'new' : (params.id ? 'edit' : 'list');
  const routeEditId = routeMode === 'edit' ? Number(params.id) : null;

  const { account } = useAuth();
  const [items, setItems] = useState<PurchaseOrderListItem[]>([]);
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
  const [sortBy, setSortBy] = useState<SortField>('prepared_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState({ project_id: '', supplier_party_id: '', status_id: '', order_type_id: '' });
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [projectQuery, setProjectQuery] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [orderTypes, setOrderTypes] = useState<LookupItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [uoms, setUoms] = useState<UomItem[]>([]);
  const [requestOptions, setRequestOptions] = useState<RequestItemSummary[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<PurchaseOrderDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<PurchaseOrderListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Purchase Order:VIEW');
  const canCreate = permissionSet.has('Purchase Order:CREATE');
  const canUpdate = permissionSet.has('Purchase Order:UPDATE');
  const canDelete = permissionSet.has('Purchase Order:DELETE');
  const canApprove = permissionSet.has('Purchase Order:APPROVE');

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [account?.account_id]);

  useEffect(() => {
    void loadItems();
  }, [canView, page, rowsPerPage, search, sortBy, sortDir, filters.project_id, filters.supplier_party_id, filters.status_id, filters.order_type_id]);

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
      void supplierApi
        .list(100, 0, supplierQuery)
        .then((data) => setSuppliers(Array.isArray(data?.items) ? data.items : []))
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [supplierQuery]);

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
      const [projectData, supplierData, statusData, typeData, materialData, uomData, requestData] = await Promise.all([
        projectApi.list(100, 0).catch(() => ({ items: [] })),
        supplierApi.list(100, 0).catch(() => ({ items: [] })),
        lookupApi.listByType('purchase_order_status', 100),
        lookupApi.listByType('purchase_order_type', 100),
        materialApi.list(100, 0).catch(() => []),
        uomApi.list(100, 0).catch(() => []),
        materialRequestApi.list(100, 0).catch(() => ({ items: [] })),
      ]);

      setProjects(Array.isArray(projectData?.items) ? projectData.items : []);
      setSuppliers(Array.isArray(supplierData?.items) ? supplierData.items : []);
      setStatuses(Array.isArray(statusData) ? statusData : []);
      setOrderTypes(Array.isArray(typeData) ? typeData : []);
      setMaterials(Array.isArray(materialData) ? materialData : Array.isArray(materialData?.items) ? materialData.items : []);
      setUoms(Array.isArray(uomData) ? uomData : []);
      const approvedRequests = Array.isArray(requestData?.items)
        ? requestData.items.filter((item: RequestItemSummary) => item.status_name === 'Approved')
        : [];
      setRequestOptions(approvedRequests);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reference data');
    }
  };

  const loadItems = async () => {
    if (!canView) return;

    setLoading(true);
    setError('');
    try {
      const result = await purchaseOrderApi.list(rowsPerPage, page * rowsPerPage, {
        search,
        project_id: filters.project_id ? Number(filters.project_id) : undefined,
        supplier_party_id: filters.supplier_party_id ? Number(filters.supplier_party_id) : undefined,
        status_id: filters.status_id ? Number(filters.status_id) : undefined,
        order_type_id: filters.order_type_id ? Number(filters.order_type_id) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setItems(result.items || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    navigate(`${baseRoute}/new`);
  };

  async function openEditById(purchaseOrderId: number) {
    if (!canUpdate) return;
    try {
      const detail: PurchaseOrderDetail = await purchaseOrderApi.get(purchaseOrderId);
      setEditingId(purchaseOrderId);
      setForm({
        project_id: String(detail.project_id),
        material_request_id: detail.material_request_id ? String(detail.material_request_id) : '',
        supplier_party_id: String(detail.supplier_party_id),
        prepared_at: toDateLocal(detail.prepared_at),
        expected_delivery_date: toDateLocal(detail.expected_delivery_date),
        order_type_id: String(detail.order_type_id),
        total_amount: detail.total_amount ?? '',
        notes: detail.notes ?? '',
        items: detail.items.length > 0
          ? detail.items.map((line: PurchaseOrderItemView) => ({
              row_id: `${Date.now()}-${line.purchase_order_item_id}`,
              purchase_order_item_id: line.purchase_order_item_id,
              material_request_item_id: line.material_request_item_id ? String(line.material_request_item_id) : '',
              material_id: String(line.material_id),
              description: line.material_name,
              specification: '',
              brand: '',
              requested_quantity: line.requested_quantity,
              ordered_quantity: line.ordered_quantity,
              received_quantity: line.received_quantity,
              uom_id: String(line.uom_id),
              unit_price: line.unit_price ?? '',
              line_total: line.line_total ?? '',
              supplier_reference: line.supplier_reference ?? '',
              notes: line.notes ?? '',
            }))
          : [emptyItem()],
      });
      if (location.pathname !== `${baseRoute}/${purchaseOrderId}/edit`) {
        navigate(`${baseRoute}/${purchaseOrderId}/edit`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase order');
    }
  }

  const openEdit = async (item: PurchaseOrderListItem) => {
    await openEditById(item.purchase_order_id);
  };

  useEffect(() => {
    if (routeMode === 'new') {
      setEditingId(null);
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
    }
  }, [routeMode, routeEditId]);

  const openView = async (item: PurchaseOrderListItem) => {
    try {
      const detail = await purchaseOrderApi.get(item.purchase_order_id);
      setViewItem(detail);
      setViewOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase order');
    }
  };

  const openDelete = (item: PurchaseOrderListItem) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  };

  const closeDialog = () => {
    navigate(baseRoute);
    setEditingId(null);
    setForm(emptyForm());
  };

  const closeView = () => {
    setViewOpen(false);
    setViewItem(null);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteItem(null);
  };

  const handleRequestLoad = async () => {
    if (!form.material_request_id) {
      setError('Select a material request first');
      return;
    }

    try {
      const detail = await materialRequestApi.get(Number(form.material_request_id));
      setForm((current) => ({
        ...current,
        project_id: String(detail.project_id),
        items: detail.items.length > 0
          ? detail.items.map((line: any) => ({
              row_id: `${Date.now()}-${line.material_request_item_id}`,
              material_request_item_id: String(line.material_request_item_id),
              material_id: String(line.material_id),
              description: line.material_name,
              specification: '',
              brand: '',
              requested_quantity: line.requested_quantity,
              ordered_quantity: line.requested_quantity,
              received_quantity: '0',
              uom_id: String(line.uom_id),
              unit_price: '',
              line_total: '',
              supplier_reference: '',
              notes: line.notes ?? '',
            }))
          : [emptyItem()],
      }));
      setSuccess('Material request items loaded');
    } catch (err: any) {
      setError(err?.message || 'Failed to load material request');
    }
  };

  const handleSave = async () => {
    const rowErrors = form.items.map((row) => validateDetailRow(row, form.items));
    const firstError = rowErrors.find((entry) => Object.keys(entry).length > 0);
    if (firstError) {
      setError(Object.values(firstError)[0]);
      return;
    }

    if (!form.project_id || !form.supplier_party_id || !form.order_type_id) {
      setError('Project, supplier, and order type are required');
      return;
    }

    if (!form.items.length) {
      setError('At least one line item is required');
      return;
    }

    const payload = {
      project_id: Number(form.project_id),
      material_request_id: form.material_request_id ? Number(form.material_request_id) : null,
      supplier_party_id: Number(form.supplier_party_id),
      prepared_at: form.prepared_at || null,
      expected_delivery_date: form.expected_delivery_date || null,
      order_type_id: Number(form.order_type_id),
      total_amount: form.total_amount ? Number(form.total_amount) : null,
      notes: form.notes || null,
      items: form.items.map((item) => ({
        material_request_item_id: item.material_request_item_id ? Number(item.material_request_item_id) : null,
        material_id: Number(item.material_id),
        requested_quantity: Number(item.requested_quantity),
        ordered_quantity: Number(item.ordered_quantity),
        received_quantity: item.received_quantity ? Number(item.received_quantity) : 0,
        uom_id: Number(item.uom_id),
        unit_price: item.unit_price ? Number(item.unit_price) : null,
        line_total: item.line_total ? Number(item.line_total) : null,
        supplier_reference: item.supplier_reference || null,
        notes: item.notes || null,
      })),
    };

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await purchaseOrderApi.update(editingId, payload);
        setSuccess('Purchase order updated');
      } else {
        await purchaseOrderApi.create(payload);
        setSuccess('Purchase order created');
      }
      navigate(baseRoute);
      setEditingId(null);
      setForm(emptyForm());
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to save purchase order');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    setError('');
    try {
      await purchaseOrderApi.delete(deleteItem.purchase_order_id);
      setSuccess('Purchase order deleted');
      closeDelete();
      await loadItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete purchase order');
    } finally {
      setDeleting(false);
    }
  };

  const handleWorkflow = async (action: 'approve' | 'cancel') => {
    if (!viewItem) return;

    setSaving(true);
    setError('');
    try {
      const updated = action === 'approve'
        ? await purchaseOrderApi.approve(viewItem.purchase_order_id)
        : await purchaseOrderApi.cancel(viewItem.purchase_order_id);
      setViewItem(updated);
      setSuccess(action === 'approve' ? 'Purchase order approved' : 'Purchase order cancelled');
      await loadItems();
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} purchase order`);
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItemForm, value: string) => {
    setForm((current) => {
      const next = [...current.items];
      next[index] = { ...next[index], [field]: value };
      return { ...current, items: next };
    });
  };

  const addItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  };

  const removeItem = (index: number) => {
    setForm((current) => {
      if (current.items.length === 1) {
        return current;
      }
      return { ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) };
    });
  };

  const detailColumns = useMemo<GridColDef<PurchaseOrderItemForm>[]>(() => {
    const materialOptions = materials.map((material) => ({
      value: material.material_id.toString(),
      label: `${material.product_code} - ${material.full_description || material.product_name}`,
    }));
    const uomOptions = uoms.map((uom) => ({
      value: uom.uom_id.toString(),
      label: `${uom.uom_name} (${uom.abbreviation})`,
    }));

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
        minWidth: 130,
        flex: 0.7,
        editable: true,
        type: 'singleSelect',
        valueOptions: uomOptions,
      },
      { field: 'requested_quantity', headerName: 'Req Qty', minWidth: 110, flex: 0.65, editable: true },
      { field: 'ordered_quantity', headerName: 'Qty', minWidth: 100, flex: 0.6, editable: true },
      { field: 'unit_price', headerName: 'Unit Cost', minWidth: 120, flex: 0.7, editable: true },
      { field: 'line_total', headerName: 'Amount', minWidth: 120, flex: 0.7 },
      { field: 'received_quantity', headerName: 'Received', minWidth: 110, flex: 0.65, editable: true },
      { field: 'supplier_reference', headerName: 'Supplier Ref', minWidth: 150, flex: 0.9, editable: true },
      { field: 'notes', headerName: 'Remarks', minWidth: 180, flex: 1, editable: true },
    ];
  }, [materials, uoms]);

  const detailTotals = useMemo(() => {
    const totalQuantity = form.items.reduce((sum, row) => sum + (Number(row.ordered_quantity) || 0), 0);
    const totalAmount = form.items.reduce((sum, row) => sum + (Number(row.line_total) || 0), 0);
    return {
      totalItems: form.items.length,
      totalQuantity,
      totalAmount,
    };
  }, [form.items]);

  const validateDetailRow = (row: PurchaseOrderItemForm, rows: PurchaseOrderItemForm[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    const quantity = Number(row.ordered_quantity);

    if (!row.material_id) {
      errors.material_id = 'Material is required';
    }

    if (!row.uom_id) {
      errors.uom_id = 'UOM is required';
    }

    if (!row.ordered_quantity || Number.isNaN(quantity) || quantity <= 0) {
      errors.ordered_quantity = 'Quantity must be greater than zero';
    }

    const duplicateCount = rows.filter((candidate) => candidate.material_id && candidate.material_id === row.material_id).length;
    if (row.material_id && duplicateCount > 1) {
      errors.material_id = 'Duplicate material is not allowed';
    }

    return errors;
  };

  const processDetailRowUpdate = (newRow: PurchaseOrderItemForm): PurchaseOrderItemForm => {
    const nextRow = { ...newRow };
    const material = materials.find((item) => item.material_id === Number(nextRow.material_id));
    if (material) {
      nextRow.description = material.product_name || '';
      nextRow.specification = material.specification_name || material.full_description || '';
      nextRow.brand = material.brand_name || '';
      if (material.stock_uom_id && !nextRow.uom_id) {
        nextRow.uom_id = String(material.stock_uom_id);
      }
    }

    const quantity = Number(nextRow.ordered_quantity) || 0;
    const unitCost = Number(nextRow.unit_price) || 0;
    nextRow.line_total = quantity > 0 && unitCost > 0 ? (quantity * unitCost).toFixed(2) : '';

    return nextRow;
  };

  return (
    <Box>
      {routeMode === 'list' && (
      <>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 1 }}>
          <Typography color="text.secondary">Purchasing Transactions</Typography>
          <Typography color="text.primary">Purchase Order</Typography>
        </Breadcrumbs>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Purchase Orders
            </Typography>
            <Typography color="text.secondary">
              Manage purchase orders, supplier commitments, and approval workflow.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                New Purchase Order
              </Button>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={loadItems}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSearch(searchInput);
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
            <Grid item xs={12} md={2}>
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
            <Grid item xs={12} md={2}>
              <Autocomplete
                size="small"
                options={suppliers}
                value={suppliers.find((supplier) => String(supplier.party_id) === String(filters.supplier_party_id)) || null}
                onChange={(_, value) => {
                  setFilters((current) => ({ ...current, supplier_party_id: value ? String(value.party_id) : '' }));
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
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={filters.status_id}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, status_id: event.target.value }));
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {statuses.map((status) => (
                  <MenuItem key={status.look_up_id} value={status.look_up_id}>
                    {status.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Type"
                value={filters.order_type_id}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, order_type_id: event.target.value }));
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {orderTypes.map((type) => (
                  <MenuItem key={type.look_up_id} value={type.look_up_id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearch(searchInput);
                    setPage(0);
                  }}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setFilters({ project_id: '', supplier_party_id: '', status_id: '', order_type_id: '' });
                    setPage(0);
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {[
                  ['po_number', 'PO Number'],
                  ['project_name', 'Project'],
                  ['supplier_party_name', 'Supplier'],
                  ['order_type_name', 'Type'],
                  ['status_name', 'Status'],
                  ['prepared_at', 'Prepared'],
                  ['expected_delivery_date', 'Expected Delivery'],
                  ['total_amount', 'Total Amount'],
                  ['item_count', 'Items'],
                ].map(([field, label]) => (
                  <TableCell key={field}>
                    <TableSortLabel
                      active={sortBy === field}
                      direction={sortBy === field ? sortDir : 'asc'}
                      onClick={() => {
                        const isAsc = sortBy === field && sortDir === 'asc';
                        setSortBy(field as SortField);
                        setSortDir(isAsc ? 'desc' : 'asc');
                      }}
                    >
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No purchase orders found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.purchase_order_id} hover>
                    <TableCell>{item.po_number}</TableCell>
                    <TableCell>{item.project_code} - {item.project_name}</TableCell>
                    <TableCell>{item.supplier_party_code} - {item.supplier_party_name}</TableCell>
                    <TableCell>{item.order_type_name}</TableCell>
                    <TableCell>{statusLabelMap[item.status_code] || item.status_name}</TableCell>
                    <TableCell>{formatDate(item.prepared_at)}</TableCell>
                    <TableCell>{formatDate(item.expected_delivery_date)}</TableCell>
                    <TableCell>{formatNumber(item.total_amount)}</TableCell>
                    <TableCell>{item.item_count}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => openView(item)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canUpdate && item.status_code === 'draft' && (
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && item.status_code === 'draft' && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => openDelete(item)}>
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
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
      </>
      )}

      {routeMode !== 'list' && (
      <Paper>
        <DialogTitle>{editingId ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Material Request" value={form.material_request_id} onChange={(event) => setForm((current) => ({ ...current, material_request_id: event.target.value }))}>
                <MenuItem value="">Optional</MenuItem>
                {requestOptions.map((request) => (
                  <MenuItem key={request.material_request_id} value={request.material_request_id}>
                    {request.mr_number} - {request.project_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
                <Button variant="outlined" onClick={handleRequestLoad} disabled={!form.material_request_id}>
                  Load Request Items
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={suppliers}
                value={suppliers.find((supplier) => String(supplier.party_id) === String(form.supplier_party_id)) || null}
                onChange={(_, value) => setForm((current) => ({ ...current, supplier_party_id: value ? String(value.party_id) : '' }))}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setSupplierQuery(value);
                  }
                }}
                getOptionLabel={(option) => `${option.party_code} - ${option.party_name}`}
                renderInput={(params) => <TextField {...params} label="Supplier" />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Order Type"
                value={form.order_type_id}
                onChange={(event) => setForm((current) => ({ ...current, order_type_id: event.target.value }))}
              >
                <MenuItem value="">Select type</MenuItem>
                {orderTypes.map((type) => (
                  <MenuItem key={type.look_up_id} value={type.look_up_id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="date" label="Prepared At" value={form.prepared_at} onChange={(event) => setForm((current) => ({ ...current, prepared_at: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="date" label="Expected Delivery" value={form.expected_delivery_date} onChange={(event) => setForm((current) => ({ ...current, expected_delivery_date: event.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="number" label="Total Amount" value={form.total_amount} onChange={(event) => setForm((current) => ({ ...current, total_amount: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
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
                shouldConfirmDelete={(row) => Boolean(row.purchase_order_item_id)}
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
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Paper>
      )}

      <Dialog open={viewOpen} onClose={closeView} fullWidth maxWidth="xl">
        <DialogTitle>Purchase Order Details</DialogTitle>
        <DialogContent dividers>
          {viewItem && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><Typography><strong>PO Number:</strong> {viewItem.po_number}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Project:</strong> {viewItem.project_code} - {viewItem.project_name}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Supplier:</strong> {viewItem.supplier_party_code} - {viewItem.supplier_party_name}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Material Request:</strong> {viewItem.material_request_number || '-'}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Type:</strong> {viewItem.order_type_name}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Status:</strong> {statusLabelMap[viewItem.status_code] || viewItem.status_name}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Prepared At:</strong> {formatDate(viewItem.prepared_at)}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Expected Delivery:</strong> {formatDate(viewItem.expected_delivery_date)}</Typography></Grid>
                <Grid item xs={12} md={4}><Typography><strong>Total Amount:</strong> {formatNumber(viewItem.total_amount)}</Typography></Grid>
                <Grid item xs={12}><Typography><strong>Notes:</strong> {viewItem.notes || '-'}</Typography></Grid>
              </Grid>

              <Divider />

              <Typography variant="h6">Items</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>Requested</TableCell>
                      <TableCell>Ordered</TableCell>
                      <TableCell>Received</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell>Unit Price</TableCell>
                      <TableCell>Line Total</TableCell>
                      <TableCell>Supplier Ref</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewItem.items.map((item) => (
                      <TableRow key={item.purchase_order_item_id}>
                        <TableCell>{item.material_code} - {item.material_name}</TableCell>
                        <TableCell>{formatNumber(item.requested_quantity)}</TableCell>
                        <TableCell>{formatNumber(item.ordered_quantity)}</TableCell>
                        <TableCell>{formatNumber(item.received_quantity)}</TableCell>
                        <TableCell>{item.uom_name} ({item.uom_abbreviation})</TableCell>
                        <TableCell>{formatNumber(item.unit_price)}</TableCell>
                        <TableCell>{formatNumber(item.line_total)}</TableCell>
                        <TableCell>{item.supplier_reference || '-'}</TableCell>
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
              <Button onClick={() => handleWorkflow('cancel')} color="inherit" disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => handleWorkflow('approve')} variant="contained" disabled={saving}>
                Approve
              </Button>
            </>
          )}
          <Button onClick={closeView}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={closeDelete}>
        <DialogTitle>Delete Purchase Order</DialogTitle>
        <DialogContent dividers>
          Are you sure you want to delete {deleteItem?.po_number}?
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}