import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
import {
  accountApi,
  deliveryAdviceApi,
  lookupApi,
  materialApi,
  materialRequestApi,
  projectApi,
  purchaseOrderApi,
  supplierApi,
  supplierDeliveryApi,
  uomApi,
} from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import EditableLineItemsGrid from '../shared/components/EditableLineItemsGrid.js';

type SortField = 'supplier_delivery_number' | 'supplier_name' | 'project_name' | 'status_name' | 'delivery_date' | 'created_at' | 'item_count';
type SortDir = 'asc' | 'desc';

type ReferenceTypeCode = 'po' | 'delivery_advice' | 'material_request';

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
  material_brand_id?: number | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  ordered_quantity: string;
  received_quantity: string;
}

interface DeliveryAdviceListItem {
  delivery_advice_id: number;
  purchase_order_id: number;
  da_number: string;
  status_code: string;
}

interface DeliveryAdviceDetailItem {
  delivery_advice_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id?: number | null;
  uom_id: number;
  uom_abbreviation: string;
  advised_quantity: string;
  received_quantity: string;
}

interface DeliveryAdviceDetail {
  delivery_advice_id: number;
  purchase_order_id: number;
  da_number: string;
  items: DeliveryAdviceDetailItem[];
}

interface MaterialRequestListItem {
  material_request_id: number;
  mr_number: string;
  project_id: number;
  project_name: string;
  status_code: string;
}

interface MaterialRequestDetailItem {
  material_request_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  uom_id: number;
  uom_abbreviation: string;
  requested_quantity: string;
  approved_quantity: string | null;
}

interface MaterialRequestDetail {
  material_request_id: number;
  mr_number: string;
  project_id: number;
  items: MaterialRequestDetailItem[];
}

interface SupplierDeliveryListItem {
  supplier_delivery_id: number;
  supplier_delivery_number: string;
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
  purchase_order_numbers: string[];
  delivery_advice_numbers: string[];
  material_request_numbers: string[];
  created_at: string | null;
  updated_at: string | null;
}

interface SupplierDeliveryReference {
  reference_type_code: ReferenceTypeCode;
  reference_id: number;
  reference_line_id: number;
  quantity: string;
  reference_number?: string;
}

interface SupplierDeliveryItem {
  supplier_delivery_item_id: number;
  material_id: number;
  material_code: string;
  material_name: string;
  material_brand_id: number | null;
  uom_id: number;
  uom_name: string;
  uom_abbreviation: string;
  delivered_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  notes: string | null;
  references: Array<{
    reference_type_code: ReferenceTypeCode;
    reference_id: number;
    reference_line_id: number;
    quantity: string;
    reference_number: string;
  }>;
  updated_at: string | null;
}

interface SupplierDeliveryDetail extends SupplierDeliveryListItem {
  items: SupplierDeliveryItem[];
  purchase_orders: Array<{ purchase_order_id: number; po_number: string }>;
  advices: Array<{ delivery_advice_id: number; da_number: string }>;
  material_requests: Array<{ material_request_id: number; mr_number: string }>;
}

interface DeliveryItemForm {
  row_id: string;
  supplier_delivery_item_id?: number;
  updated_at?: string | null;
  material_id: string;
  material_label: string;
  material_brand_id: string;
  uom_id: string;
  uom_label: string;
  source_summary: string;
  delivered_quantity: string;
  accepted_quantity: string;
  rejected_quantity: string;
  notes: string;
  references: SupplierDeliveryReference[];
}

interface FormState {
  supplier_id: string;
  project_id: string;
  delivery_date: string;
  reference_code: string;
  notes: string;
  purchase_order_ids: string[];
  delivery_advice_ids: string[];
  material_request_ids: string[];
  items: DeliveryItemForm[];
}

const emptyItem = (): DeliveryItemForm => ({
  row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  supplier_delivery_item_id: undefined,
  updated_at: null,
  material_id: '',
  material_label: '',
  material_brand_id: '',
  uom_id: '',
  uom_label: '',
  source_summary: 'Direct Receipt',
  delivered_quantity: '',
  accepted_quantity: '',
  rejected_quantity: '',
  notes: '',
  references: [],
});

const emptyForm = (): FormState => ({
  supplier_id: '',
  project_id: '',
  delivery_date: new Date().toISOString().slice(0, 10),
  reference_code: '',
  notes: '',
  purchase_order_ids: [],
  delivery_advice_ids: [],
  material_request_ids: [],
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
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const baseRoute = '/app/inventory/supplier-delivery';
  const routeMode = location.pathname.endsWith('/new') ? 'new' : (params.id ? 'edit' : 'list');
  const routeEditId = routeMode === 'edit' ? Number(params.id) : null;

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
    status_id: '',
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [deliveryAdvices, setDeliveryAdvices] = useState<DeliveryAdviceListItem[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequestListItem[]>([]);
  const [suppliers, setSuppliers] = useState<PartyItem[]>([]);
  const [projects, setProjects] = useState<PartyItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [uoms, setUoms] = useState<UomItem[]>([]);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [projectQuery, setProjectQuery] = useState('');
  const [statuses, setStatuses] = useState<LookupItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<SupplierDeliveryDetail | null>(null);
  const [deleteItem, setDeleteItem] = useState<SupplierDeliveryListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingVersion, setEditingVersion] = useState<string | null>(null);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has('Supplier Delivery:VIEW');
  const canCreate = permissionSet.has('Supplier Delivery:CREATE');
  const canUpdate = permissionSet.has('Supplier Delivery:UPDATE');
  const canDelete = permissionSet.has('Supplier Delivery:DELETE');
  const canApprove = permissionSet.has('Supplier Delivery:APPROVE');

  const materialOptions = useMemo(() => materials.map((row) => ({ value: row.material_id.toString(), label: `${row.product_code} - ${row.product_name}` })), [materials]);
  const uomOptions = useMemo(() => uoms.map((row) => ({ value: row.uom_id.toString(), label: row.abbreviation || row.uom_name })), [uoms]);

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [account?.account_id]);

  useEffect(() => {
    void loadItems();
  }, [canView, page, rowsPerPage, search, sortBy, sortDir, filters.purchase_order_id, filters.supplier_id, filters.status_id]);

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
      const [
        purchaseOrderData,
        deliveryAdviceData,
        materialRequestData,
        supplierData,
        projectData,
        materialData,
        uomData,
        statusData,
      ] = await Promise.all([
        purchaseOrderApi.list(300, 0).catch(() => ({ items: [] })),
        deliveryAdviceApi.list(300, 0).catch(() => ({ items: [] })),
        materialRequestApi.list(300, 0).catch(() => ({ items: [] })),
        supplierApi.list(300, 0).catch(() => ({ items: [] })),
        projectApi.list(300, 0).catch(() => ({ items: [] })),
        materialApi.list(500, 0).catch(() => ({ items: [] })),
        uomApi.list(200, 0).catch(() => []),
        lookupApi.listByType('supplier_delivery_status', 100),
      ]);

      setPurchaseOrders(Array.isArray(purchaseOrderData?.items) ? purchaseOrderData.items : []);
      setDeliveryAdvices(Array.isArray(deliveryAdviceData?.items) ? deliveryAdviceData.items : []);
      setMaterialRequests(Array.isArray(materialRequestData?.items) ? materialRequestData.items : []);
      setSuppliers(Array.isArray(supplierData?.items) ? supplierData.items : []);
      setProjects(Array.isArray(projectData?.items) ? projectData.items : []);
      setMaterials(Array.isArray(materialData) ? materialData : Array.isArray(materialData?.items) ? materialData.items : []);
      setUoms(Array.isArray(uomData) ? uomData : []);
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

  const openCreate = () => {
    setEditingId(null);
    setEditingVersion(null);
    setForm(emptyForm());
    navigate(`${baseRoute}/new`);
  };

  async function openEditById(supplierDeliveryId: number) {
    setEditingId(supplierDeliveryId);
    try {
      const detail: SupplierDeliveryDetail = await supplierDeliveryApi.get(supplierDeliveryId);
      setEditingVersion(detail.updated_at ?? null);
      setForm({
        supplier_id: detail.supplier_id.toString(),
        project_id: detail.project_id.toString(),
        delivery_date: detail.delivery_date ? detail.delivery_date.slice(0, 10) : '',
        reference_code: detail.reference_code || '',
        notes: detail.notes || '',
        purchase_order_ids: detail.purchase_orders.map((row) => String(row.purchase_order_id)),
        delivery_advice_ids: detail.advices.map((row) => String(row.delivery_advice_id)),
        material_request_ids: detail.material_requests.map((row) => String(row.material_request_id)),
        items: detail.items.length > 0
          ? detail.items.map((row) => ({
              row_id: `${Date.now()}-${row.supplier_delivery_item_id}`,
              supplier_delivery_item_id: row.supplier_delivery_item_id,
              updated_at: row.updated_at ?? null,
              material_id: String(row.material_id),
              material_label: `${row.material_code} - ${row.material_name}`,
              material_brand_id: row.material_brand_id ? String(row.material_brand_id) : '',
              uom_id: String(row.uom_id),
              uom_label: row.uom_abbreviation,
              source_summary: row.references.length > 0 ? row.references.map((ref) => `${ref.reference_number} (${formatNumber(ref.quantity)})`).join(', ') : 'Direct Receipt',
              delivered_quantity: row.delivered_quantity,
              accepted_quantity: row.accepted_quantity,
              rejected_quantity: row.rejected_quantity,
              notes: row.notes || '',
              references: row.references.map((ref) => ({
                reference_type_code: ref.reference_type_code,
                reference_id: ref.reference_id,
                reference_line_id: ref.reference_line_id,
                quantity: ref.quantity,
                reference_number: ref.reference_number,
              })),
            }))
          : [emptyItem()],
      });
      if (location.pathname !== `${baseRoute}/${supplierDeliveryId}/edit`) {
        navigate(`${baseRoute}/${supplierDeliveryId}/edit`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier delivery');
    }
  }

  const openEdit = async (item: SupplierDeliveryListItem) => {
    await openEditById(item.supplier_delivery_id);
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

  const updateItem = (index: number, field: keyof DeliveryItemForm, value: string) => {
    setForm((current) => {
      const nextItems = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const next = { ...item, [field]: value };
        if (field === 'delivered_quantity' && !next.accepted_quantity) {
          next.accepted_quantity = value;
        }
        if (field === 'delivered_quantity' || field === 'accepted_quantity') {
          const delivered = Number(next.delivered_quantity) || 0;
          const accepted = Number(next.accepted_quantity) || 0;
          next.rejected_quantity = delivered > 0 ? String(Math.max(delivered - accepted, 0)) : '';
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

  const syncHeaderFromSources = () => {
    const selectedPoIds = new Set(form.purchase_order_ids.map((id) => Number(id)));
    const selectedDaIds = new Set(form.delivery_advice_ids.map((id) => Number(id)));
    const selectedMrIds = new Set(form.material_request_ids.map((id) => Number(id)));

    const selectedPos = purchaseOrders.filter((po) => selectedPoIds.has(po.purchase_order_id));
    const selectedDas = deliveryAdvices.filter((da) => selectedDaIds.has(da.delivery_advice_id));
    const selectedMrs = materialRequests.filter((mr) => selectedMrIds.has(mr.material_request_id));

    const supplierCandidates = new Set<number>();
    const projectCandidates = new Set<number>();

    selectedPos.forEach((po) => {
      if (po.supplier_party_id) supplierCandidates.add(po.supplier_party_id);
      if (po.project_id) projectCandidates.add(po.project_id);
    });

    selectedDas.forEach((da) => {
      const po = purchaseOrders.find((row) => row.purchase_order_id === da.purchase_order_id);
      if (po?.supplier_party_id) supplierCandidates.add(po.supplier_party_id);
      if (po?.project_id) projectCandidates.add(po.project_id);
    });

    selectedMrs.forEach((mr) => {
      if (mr.project_id) projectCandidates.add(mr.project_id);
    });

    setForm((current) => ({
      ...current,
      supplier_id: supplierCandidates.size === 1 ? String([...supplierCandidates][0]) : current.supplier_id,
      project_id: projectCandidates.size === 1 ? String([...projectCandidates][0]) : current.project_id,
    }));
  };

  const loadMergedSourceItems = async () => {
    setSaving(true);
    setError('');

    try {
      const poDetails = await Promise.all(
        form.purchase_order_ids.map((id) => purchaseOrderApi.get(Number(id)).catch(() => null))
      );
      const daDetails = await Promise.all(
        form.delivery_advice_ids.map((id) => deliveryAdviceApi.get(Number(id)).catch(() => null))
      );
      const mrDetails = await Promise.all(
        form.material_request_ids.map((id) => materialRequestApi.get(Number(id)).catch(() => null))
      );

      const merged = new Map<string, DeliveryItemForm>();

      const appendReference = (
        key: string,
        base: { material_id: number; material_label: string; material_brand_id?: number | null; uom_id: number; uom_label: string },
        reference: SupplierDeliveryReference
      ) => {
        const current = merged.get(key) ?? {
          row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          material_id: String(base.material_id),
          material_label: base.material_label,
          material_brand_id: base.material_brand_id ? String(base.material_brand_id) : '',
          uom_id: String(base.uom_id),
          uom_label: base.uom_label,
          source_summary: '',
          delivered_quantity: '0',
          accepted_quantity: '0',
          rejected_quantity: '0',
          notes: '',
          references: [],
        };

        current.references.push(reference);
        const refQty = Number(reference.quantity) || 0;
        const nextDelivered = (Number(current.delivered_quantity) || 0) + refQty;
        current.delivered_quantity = String(nextDelivered);
        current.accepted_quantity = String(nextDelivered);
        current.rejected_quantity = '0';
        current.source_summary = current.references.map((entry) => `${entry.reference_number ?? `${entry.reference_type_code.toUpperCase()}-${entry.reference_id}`} (${formatNumber(entry.quantity)})`).join(', ');
        merged.set(key, current);
      };

      poDetails.forEach((detail: any, index) => {
        if (!detail || !Array.isArray(detail.items)) return;
        const poId = Number(form.purchase_order_ids[index]);
        const poNumber = detail.po_number ?? `PO-${poId}`;

        detail.items.forEach((item: PurchaseOrderDetailItem) => {
          const remaining = Math.max((Number(item.ordered_quantity) || 0) - (Number(item.received_quantity) || 0), 0);
          if (remaining <= 0) return;

          const materialLabel = `${item.material_code} - ${item.material_name}`;
          const key = `m-${item.material_id}|b-${item.material_brand_id ?? 0}|u-${item.uom_id}`;
          appendReference(
            key,
            {
              material_id: item.material_id,
              material_label: materialLabel,
              material_brand_id: item.material_brand_id ?? null,
              uom_id: item.uom_id,
              uom_label: item.uom_abbreviation,
            },
            {
              reference_type_code: 'po',
              reference_id: poId,
              reference_line_id: item.purchase_order_item_id,
              quantity: String(remaining),
              reference_number: `${poNumber}#${item.purchase_order_item_id}`,
            }
          );
        });
      });

      daDetails.forEach((detail: any, index) => {
        if (!detail || !Array.isArray(detail.items)) return;
        const daId = Number(form.delivery_advice_ids[index]);
        const daNumber = detail.da_number ?? `DA-${daId}`;

        detail.items.forEach((item: DeliveryAdviceDetailItem) => {
          const remaining = Math.max((Number(item.advised_quantity) || 0) - (Number(item.received_quantity) || 0), 0);
          if (remaining <= 0) return;

          const materialLabel = `${item.material_code} - ${item.material_name}`;
          const key = `m-${item.material_id}|b-${item.material_brand_id ?? 0}|u-${item.uom_id}`;
          appendReference(
            key,
            {
              material_id: item.material_id,
              material_label: materialLabel,
              material_brand_id: item.material_brand_id ?? null,
              uom_id: item.uom_id,
              uom_label: item.uom_abbreviation,
            },
            {
              reference_type_code: 'delivery_advice',
              reference_id: daId,
              reference_line_id: item.delivery_advice_item_id,
              quantity: String(remaining),
              reference_number: `${daNumber}#${item.delivery_advice_item_id}`,
            }
          );
        });
      });

      mrDetails.forEach((detail: any, index) => {
        if (!detail || !Array.isArray(detail.items)) return;
        const mrId = Number(form.material_request_ids[index]);
        const mrNumber = detail.mr_number ?? `MR-${mrId}`;

        detail.items.forEach((item: MaterialRequestDetailItem) => {
          const sourceQuantity = Number(item.approved_quantity ?? item.requested_quantity ?? 0);
          if (sourceQuantity <= 0) return;

          const materialLabel = `${item.material_code} - ${item.material_name}`;
          const key = `m-${item.material_id}|b-0|u-${item.uom_id}`;
          appendReference(
            key,
            {
              material_id: item.material_id,
              material_label: materialLabel,
              material_brand_id: null,
              uom_id: item.uom_id,
              uom_label: item.uom_abbreviation,
            },
            {
              reference_type_code: 'material_request',
              reference_id: mrId,
              reference_line_id: item.material_request_item_id,
              quantity: String(sourceQuantity),
              reference_number: `${mrNumber}#${item.material_request_item_id}`,
            }
          );
        });
      });

      const mergedRows = [...merged.values()];
      setForm((current) => ({
        ...current,
        items: mergedRows.length > 0 ? mergedRows : current.items,
      }));
      if (mergedRows.length === 0) {
        setSuccess('No remaining source quantities found.');
      } else {
        setSuccess('Source lines merged into receipt items.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load source document lines');
    } finally {
      setSaving(false);
    }
  };

  const scaleReferencesToAccepted = (references: SupplierDeliveryReference[], acceptedQuantity: number) => {
    if (references.length === 0) return [];
    const currentTotal = references.reduce((sum, reference) => sum + (Number(reference.quantity) || 0), 0);
    if (currentTotal <= 0) {
      return references;
    }
    if (Math.abs(currentTotal - acceptedQuantity) <= 0.000001) {
      return references;
    }

    const scaled = references.map((reference) => ({
      ...reference,
      quantity: String((Number(reference.quantity) || 0) * (acceptedQuantity / currentTotal)),
    }));

    const scaledTotal = scaled.reduce((sum, reference) => sum + (Number(reference.quantity) || 0), 0);
    const delta = acceptedQuantity - scaledTotal;
    if (scaled.length > 0) {
      const last = scaled[scaled.length - 1];
      last.quantity = String((Number(last.quantity) || 0) + delta);
    }

    return scaled;
  };

  const toDetailPayload = (row: DeliveryItemForm) => {
    const delivered = Number(row.delivered_quantity);
    const accepted = Number(row.accepted_quantity);
    const rejected = row.rejected_quantity === '' ? delivered - accepted : Number(row.rejected_quantity);

    const references = scaleReferencesToAccepted(row.references, accepted).map((reference) => ({
      reference_type_code: reference.reference_type_code,
      reference_id: Number(reference.reference_id),
      reference_line_id: Number(reference.reference_line_id),
      quantity: Number(reference.quantity),
    }));

    return {
      material_id: Number(row.material_id),
      material_brand_id: row.material_brand_id ? Number(row.material_brand_id) : null,
      uom_id: Number(row.uom_id),
      delivered_quantity: delivered,
      accepted_quantity: accepted,
      rejected_quantity: rejected,
      notes: row.notes.trim() || null,
      references,
    };
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
      const payload: any = {
        supplier_id: Number(form.supplier_id),
        project_id: Number(form.project_id),
        delivery_date: form.delivery_date || null,
        reference_code: form.reference_code.trim() || null,
        notes: form.notes.trim() || null,
        purchase_order_ids: form.purchase_order_ids.map((id) => Number(id)),
        delivery_advice_ids: form.delivery_advice_ids.map((id) => Number(id)),
        material_request_ids: form.material_request_ids.map((id) => Number(id)),
        items: form.items.map((row) => toDetailPayload(row)),
      };

      if (editingId) {
        payload.expected_updated_at = editingVersion ?? undefined;
      }

      if (editingId) {
        const updated = await supplierDeliveryApi.update(editingId, payload);
        setEditingVersion(updated?.updated_at ?? editingVersion);
        setSuccess('Supplier Delivery updated');
      } else {
        await supplierDeliveryApi.create(payload);
        setSuccess('Supplier Delivery created');
      }

      setEditingId(null);
      setEditingVersion(null);
      setForm(emptyForm());
      navigate(baseRoute);
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
      const latest = await supplierDeliveryApi.get(viewItem.supplier_delivery_id);
      const expectedUpdatedAt = latest?.updated_at ?? viewItem.updated_at ?? undefined;
      const next = action === 'post'
        ? await supplierDeliveryApi.post(viewItem.supplier_delivery_id, { expected_updated_at: expectedUpdatedAt })
        : await supplierDeliveryApi.cancel(viewItem.supplier_delivery_id, { expected_updated_at: expectedUpdatedAt });

      setViewItem(next);
      setSuccess(action === 'post' ? 'Supplier Delivery posted' : 'Supplier Delivery cancelled');
      await loadItems();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} supplier delivery`);
    }
  };

  const detailColumns = useMemo<GridColDef<DeliveryItemForm>[]>(() => [
    {
      field: 'material_id',
      headerName: 'Material',
      minWidth: 260,
      flex: 1.2,
      editable: true,
      type: 'singleSelect',
      valueOptions: materialOptions,
      valueFormatter: (value) => materialOptions.find((option) => option.value === String(value))?.label ?? '',
    },
    {
      field: 'uom_id',
      headerName: 'UOM',
      minWidth: 120,
      flex: 0.6,
      editable: true,
      type: 'singleSelect',
      valueOptions: uomOptions,
      valueFormatter: (value) => uomOptions.find((option) => option.value === String(value))?.label ?? '',
    },
    { field: 'source_summary', headerName: 'Source References', minWidth: 280, flex: 1.4 },
    { field: 'delivered_quantity', headerName: 'Delivered', minWidth: 110, flex: 0.6, editable: true },
    { field: 'accepted_quantity', headerName: 'Accepted', minWidth: 110, flex: 0.6, editable: true },
    { field: 'rejected_quantity', headerName: 'Rejected', minWidth: 110, flex: 0.6, editable: true },
    { field: 'notes', headerName: 'Remarks', minWidth: 200, flex: 1, editable: true },
  ], [materialOptions, uomOptions]);

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

    if (!row.material_id) {
      errors.material_id = 'Material is required';
    }
    if (!row.uom_id) {
      errors.uom_id = 'UOM is required';
    }
    if (!row.delivered_quantity || Number.isNaN(delivered) || delivered <= 0) {
      errors.delivered_quantity = 'Delivered quantity must be greater than zero';
    }
    if (!row.accepted_quantity || Number.isNaN(accepted) || accepted < 0) {
      errors.accepted_quantity = 'Accepted quantity is required';
    }
    if (!Number.isNaN(delivered) && !Number.isNaN(accepted) && accepted > delivered) {
      errors.accepted_quantity = 'Accepted quantity cannot exceed delivered quantity';
    }

    const duplicateCount = rows.filter((candidate) => candidate.material_id && candidate.uom_id && candidate.material_id === row.material_id && candidate.uom_id === row.uom_id).length;
    if (row.material_id && row.uom_id && duplicateCount > 1) {
      errors.material_id = 'Duplicate material and UOM combination is not allowed';
    }

    return errors;
  };

  const processDetailRowUpdate = (newRow: DeliveryItemForm): DeliveryItemForm => {
    const nextRow = { ...newRow };

    const material = materials.find((item) => item.material_id === Number(nextRow.material_id));
    if (material) {
      nextRow.material_label = `${material.product_code} - ${material.product_name}`;
      if (!nextRow.uom_id && material.stock_uom_id) {
        nextRow.uom_id = String(material.stock_uom_id);
      }
    }

    const uom = uoms.find((item) => item.uom_id === Number(nextRow.uom_id));
    nextRow.uom_label = uom ? (uom.abbreviation || uom.uom_name) : '';

    if (nextRow.delivered_quantity && nextRow.accepted_quantity === '') {
      nextRow.accepted_quantity = nextRow.delivered_quantity;
    }
    if (nextRow.delivered_quantity && nextRow.accepted_quantity) {
      const delivered = Number(nextRow.delivered_quantity) || 0;
      const accepted = Number(nextRow.accepted_quantity) || 0;
      nextRow.rejected_quantity = String(Math.max(delivered - accepted, 0));
    }

    return nextRow;
  };

  const handleDetailRowCommitted = async (newRow: DeliveryItemForm, oldRow: DeliveryItemForm): Promise<DeliveryItemForm> => {
    if (!editingId) {
      return newRow;
    }

    const rowErrors = validateDetailRow(newRow, form.items.map((item) => (item.row_id === oldRow.row_id ? newRow : item)));
    if (Object.keys(rowErrors).length > 0) {
      return newRow;
    }

    if (!newRow.material_id || !newRow.uom_id || !newRow.delivered_quantity || !newRow.accepted_quantity) {
      return newRow;
    }

    if (newRow.supplier_delivery_item_id) {
      const detail = await supplierDeliveryApi.updateItem(editingId, newRow.supplier_delivery_item_id, {
        ...toDetailPayload(newRow),
        expected_updated_at: oldRow.updated_at ?? null,
      });

      const savedItem = Array.isArray(detail?.items)
        ? detail.items.find((item: SupplierDeliveryItem) => item.supplier_delivery_item_id === newRow.supplier_delivery_item_id)
        : null;

      return {
        ...newRow,
        updated_at: savedItem?.updated_at ?? newRow.updated_at ?? null,
      };
    }

    const detail = await supplierDeliveryApi.addItem(editingId, toDetailPayload(newRow));
    const createdItem = Array.isArray(detail?.items)
      ? [...detail.items].sort((a: SupplierDeliveryItem, b: SupplierDeliveryItem) => b.supplier_delivery_item_id - a.supplier_delivery_item_id)[0]
      : null;

    return {
      ...newRow,
      supplier_delivery_item_id: createdItem?.supplier_delivery_item_id,
      updated_at: createdItem?.updated_at ?? null,
    };
  };

  const handleDetailRowDelete = async (row: DeliveryItemForm): Promise<void> => {
    if (!editingId || !row.supplier_delivery_item_id) {
      return;
    }

    await supplierDeliveryApi.deleteItem(editingId, row.supplier_delivery_item_id, {
      expected_updated_at: row.updated_at ?? null,
    });
  };

  return (
    <Box>
      {routeMode === 'list' && (
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
                  placeholder="Search SD No., source docs, supplier, project"
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
                      setFilters({ purchase_order_id: '', supplier_id: '', status_id: '' });
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
                      <TableCell>Source Documents</TableCell>
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
                          <TableCell>
                            <Typography variant="body2">PO: {row.purchase_order_numbers.length > 0 ? row.purchase_order_numbers.join(', ') : '-'}</Typography>
                            <Typography variant="caption" color="text.secondary">DA: {row.delivery_advice_numbers.length > 0 ? row.delivery_advice_numbers.join(', ') : '-'}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">MR: {row.material_request_numbers.length > 0 ? row.material_request_numbers.join(', ') : '-'}</Typography>
                          </TableCell>
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
      )}

      {routeMode !== 'list' && (
      <Paper>
        <DialogTitle>{editingId ? 'Edit Supplier Delivery' : 'Create Supplier Delivery'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
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
                type="date"
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

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Source Documents (Optional)</Typography>
            </Grid>

            <Grid item xs={12} md={4} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Purchase Orders</Typography>
                <Select
                  multiple
                  value={form.purchase_order_ids}
                  onChange={(event) => {
                    const value = event.target.value as string[];
                    setForm((current) => ({ ...current, purchase_order_ids: value }));
                  }}
                  renderValue={(selected) => selected
                    .map((id) => purchaseOrders.find((po) => po.purchase_order_id === Number(id))?.po_number ?? id)
                    .join(', ')}
                >
                  {purchaseOrders.map((po) => (
                    <MenuItem key={po.purchase_order_id} value={po.purchase_order_id.toString()}>
                      {po.po_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Delivery Advices</Typography>
                <Select
                  multiple
                  value={form.delivery_advice_ids}
                  onChange={(event) => {
                    const value = event.target.value as string[];
                    setForm((current) => ({ ...current, delivery_advice_ids: value }));
                  }}
                  renderValue={(selected) => selected
                    .map((id) => deliveryAdvices.find((da) => da.delivery_advice_id === Number(id))?.da_number ?? id)
                    .join(', ')}
                >
                  {deliveryAdvices.map((da) => (
                    <MenuItem key={da.delivery_advice_id} value={da.delivery_advice_id.toString()}>
                      {da.da_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4} lg={4}>
              <FormControl fullWidth size="small">
                <Typography variant="caption" color="text.secondary">Material Requests</Typography>
                <Select
                  multiple
                  value={form.material_request_ids}
                  onChange={(event) => {
                    const value = event.target.value as string[];
                    setForm((current) => ({ ...current, material_request_ids: value }));
                  }}
                  renderValue={(selected) => selected
                    .map((id) => materialRequests.find((mr) => mr.material_request_id === Number(id))?.mr_number ?? id)
                    .join(', ')}
                >
                  {materialRequests.map((mr) => (
                    <MenuItem key={mr.material_request_id} value={mr.material_request_id.toString()}>
                      {mr.mr_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button variant="outlined" onClick={syncHeaderFromSources} disabled={saving}>Sync Supplier/Project From Sources</Button>
                <Button variant="contained" onClick={loadMergedSourceItems} disabled={saving}>Load and Merge Source Lines</Button>
                <Button
                  variant="text"
                  onClick={() => setForm((current) => ({ ...current, items: [emptyItem()] }))}
                  disabled={saving}
                >
                  Use Direct Receipt
                </Button>
              </Stack>
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
            shouldConfirmDelete={(row) => Boolean(row.supplier_delivery_item_id)}
            getDeleteConfirmMessage={() => 'Delete this saved detail row?'}
            addRowLabel="Add Row"
            focusField="material_id"
            totals={detailTotals}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(baseRoute)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <LocalShippingIcon />}>
            {editingId ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Paper>
      )}

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
                  <Typography variant="caption" color="text.secondary">Supplier</Typography>
                  <Typography variant="body2">{viewItem.supplier_code} - {viewItem.supplier_name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">Project</Typography>
                  <Typography variant="body2">{viewItem.project_code} - {viewItem.project_name}</Typography>
                </Grid>
                <Grid item xs={12} md={12}>
                  <Typography variant="caption" color="text.secondary">Source Documents</Typography>
                  <Typography variant="body2">PO: {viewItem.purchase_order_numbers.length > 0 ? viewItem.purchase_order_numbers.join(', ') : '-'}</Typography>
                  <Typography variant="body2">DA: {viewItem.delivery_advice_numbers.length > 0 ? viewItem.delivery_advice_numbers.join(', ') : '-'}</Typography>
                  <Typography variant="body2">MR: {viewItem.material_request_numbers.length > 0 ? viewItem.material_request_numbers.join(', ') : '-'}</Typography>
                </Grid>
              </Grid>

              <Divider />

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Material</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell>References</TableCell>
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
                        <TableCell>{item.references.length > 0 ? item.references.map((row) => `${row.reference_number} (${formatNumber(row.quantity)})`).join(', ') : 'Direct Receipt'}</TableCell>
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
