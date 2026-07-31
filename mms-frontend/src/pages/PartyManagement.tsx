import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
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
  FormControlLabel,
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
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Typography,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import {
  lookupApi,
  projectApi,
  supplierApi,
} from '../shared/api/client.js';

type Mode = 'project' | 'supplier';
type SortField = 'party_code' | 'party_name' | 'project_type_name' | 'payment_terms_name' | 'status_name' | 'created_at';
type SortDir = 'asc' | 'desc';
type ScheduleTemplateCode =
  | 'custom'
  | 'standard_office_hours'
  | 'monday_saturday'
  | 'retail_hours'
  | 'always_open';

const WEEK_DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const SCHEDULE_TEMPLATES: Array<{ code: ScheduleTemplateCode; label: string }> = [
  { code: 'standard_office_hours', label: 'Standard Office Hours' },
  { code: 'monday_saturday', label: 'Monday-Saturday' },
  { code: 'retail_hours', label: 'Retail Hours' },
  { code: 'always_open', label: '24/7' },
  { code: 'custom', label: 'Custom' },
];

interface LookupItem {
  look_up_id: number;
  name: string;
  code: string;
}

interface AddressInput {
  address_id?: number;
  address_type_id?: number | null;
  house_no?: string | null;
  street?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  postal_code?: string | null;
  is_primary?: boolean;
}

interface PhoneInput {
  phone_id?: number;
  phone_type_id?: number | null;
  phone_number: string;
  is_primary?: boolean;
}

interface EmailInput {
  email_id?: number;
  email_type_id?: number | null;
  email_address: string;
  is_primary?: boolean;
}

interface ContactInput {
  contact_id?: number;
  contact_name: string;
  addresses: AddressInput[];
  phones: PhoneInput[];
  emails: EmailInput[];
}

interface BusinessHourInput {
  day_of_week: number;
  is_closed: boolean;
  opening_time: string | null;
  closing_time: string | null;
}

interface PartyFormState {
  status_id: string;
  description: string;
  project_code: string;
  project_name: string;
  project_type_id: string;
  supplier_code: string;
  supplier_name: string;
  payment_terms_id: string;
  business_hours_schedule: BusinessHourInput[];
  addresses: AddressInput[];
  phones: PhoneInput[];
  emails: EmailInput[];
  contacts: ContactInput[];
  deleted_contact_ids: number[];
}

interface PartyListItem {
  party_id: number;
  status_name: string;
  project_code?: string;
  project_name?: string;
  project_type_name?: string | null;
  supplier_code?: string;
  supplier_name?: string;
  payment_terms_name?: string | null;
  business_hours_schedule?: BusinessHourInput[];
}

interface PartyListResponse {
  items: PartyListItem[];
  total: number;
}

const emptyAddress = (): AddressInput => ({
  address_type_id: null,
  house_no: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  region: '',
  postal_code: '',
  is_primary: false,
});

const emptyPhone = (): PhoneInput => ({
  phone_type_id: null,
  phone_number: '',
  is_primary: false,
});

const emptyEmail = (): EmailInput => ({
  email_type_id: null,
  email_address: '',
  is_primary: false,
});

const emptyContact = (): ContactInput => ({
  contact_name: '',
  addresses: [],
  phones: [],
  emails: [],
});

const defaultBusinessHoursSchedule = (): BusinessHourInput[] => (
  WEEK_DAYS.map((day) => ({
    day_of_week: day.value,
    is_closed: true,
    opening_time: null,
    closing_time: null,
  }))
);

function normalizeTimeForInput(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length >= 5) {
    return trimmed.slice(0, 5);
  }
  return trimmed;
}

function normalizeScheduleFromApi(items?: BusinessHourInput[]): BusinessHourInput[] {
  const defaults = defaultBusinessHoursSchedule();
  if (!items || items.length === 0) {
    return defaults;
  }

  const byDay = new Map<number, BusinessHourInput>();
  items.forEach((item) => {
    byDay.set(item.day_of_week, {
      day_of_week: item.day_of_week,
      is_closed: !!item.is_closed,
      opening_time: normalizeTimeForInput(item.opening_time),
      closing_time: normalizeTimeForInput(item.closing_time),
    });
  });

  return defaults.map((item) => byDay.get(item.day_of_week) || item);
}

function summarizeBusinessHours(schedule?: BusinessHourInput[]): string {
  const rows = schedule || [];
  if (rows.length === 0) {
    return '-';
  }
  const openDays = rows.filter((item) => !item.is_closed).length;
  return openDays === 0 ? 'Closed all week' : `${openDays} open day${openDays > 1 ? 's' : ''}`;
}

function getTemplateSchedule(templateCode: ScheduleTemplateCode): BusinessHourInput[] {
  if (templateCode === 'standard_office_hours') {
    return WEEK_DAYS.map((day) => ({
      day_of_week: day.value,
      is_closed: day.value >= 6,
      opening_time: day.value <= 5 ? '09:00' : null,
      closing_time: day.value <= 5 ? '17:00' : null,
    }));
  }

  if (templateCode === 'monday_saturday') {
    return WEEK_DAYS.map((day) => {
      if (day.value <= 5) {
        return {
          day_of_week: day.value,
          is_closed: false,
          opening_time: '08:00',
          closing_time: '17:00',
        };
      }
      if (day.value === 6) {
        return {
          day_of_week: day.value,
          is_closed: false,
          opening_time: '08:00',
          closing_time: '12:00',
        };
      }
      return {
        day_of_week: day.value,
        is_closed: true,
        opening_time: null,
        closing_time: null,
      };
    });
  }

  if (templateCode === 'retail_hours') {
    return WEEK_DAYS.map((day) => ({
      day_of_week: day.value,
      is_closed: false,
      opening_time: '10:00',
      closing_time: day.value === 7 ? '18:00' : '20:00',
    }));
  }

  if (templateCode === 'always_open') {
    return WEEK_DAYS.map((day) => ({
      day_of_week: day.value,
      is_closed: false,
      opening_time: '00:00',
      closing_time: '23:59',
    }));
  }

  return defaultBusinessHoursSchedule();
}

function areSchedulesEqual(a: BusinessHourInput[], b: BusinessHourInput[]): boolean {
  const normalize = (items: BusinessHourInput[]) => items
    .slice()
    .sort((left, right) => left.day_of_week - right.day_of_week)
    .map((item) => ({
      day_of_week: item.day_of_week,
      is_closed: item.is_closed,
      opening_time: item.is_closed ? null : normalizeTimeForInput(item.opening_time),
      closing_time: item.is_closed ? null : normalizeTimeForInput(item.closing_time),
    }));

  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function detectScheduleTemplate(schedule: BusinessHourInput[]): ScheduleTemplateCode {
  const templateCodes: ScheduleTemplateCode[] = [
    'standard_office_hours',
    'monday_saturday',
    'retail_hours',
    'always_open',
  ];

  for (const templateCode of templateCodes) {
    if (areSchedulesEqual(schedule, getTemplateSchedule(templateCode))) {
      return templateCode;
    }
  }

  return 'custom';
}

function getScheduleTemplatePreview(templateCode: ScheduleTemplateCode): string {
  if (templateCode === 'standard_office_hours') {
    return 'Mon-Fri 9:00 AM-5:00 PM, Sat/Sun Closed';
  }
  if (templateCode === 'monday_saturday') {
    return 'Mon-Fri 8:00 AM-5:00 PM, Sat 8:00 AM-12:00 PM, Sun Closed';
  }
  if (templateCode === 'retail_hours') {
    return 'Mon-Sat 10:00 AM-8:00 PM, Sun 10:00 AM-6:00 PM';
  }
  if (templateCode === 'always_open') {
    return 'Daily 12:00 AM-11:59 PM';
  }
  return 'No auto-population. Keep or edit the current day-by-day schedule manually.';
}

const initialFormState = (): PartyFormState => ({
  status_id: '',
  description: '',
  project_code: '',
  project_name: '',
  project_type_id: '',
  supplier_code: '',
  supplier_name: '',
  payment_terms_id: '',
  business_hours_schedule: defaultBusinessHoursSchedule(),
  addresses: [],
  phones: [],
  emails: [],
  contacts: [],
  deleted_contact_ids: [],
});

function setPrimary<T extends { is_primary?: boolean }>(items: T[], index: number): T[] {
  return items.map((item, idx) => ({
    ...item,
    is_primary: idx === index,
  }));
}

function normalizeAddresses(items: AddressInput[]): AddressInput[] {
  return items.map((item) => ({
    ...(item.address_id ? { address_id: item.address_id } : {}),
    address_type_id: item.address_type_id ?? null,
    house_no: item.house_no?.trim() || null,
    street: item.street?.trim() || null,
    barangay: item.barangay?.trim() || null,
    city: item.city?.trim() || null,
    province: item.province?.trim() || null,
    region: item.region?.trim() || null,
    postal_code: item.postal_code?.trim() || null,
    is_primary: !!item.is_primary,
  }));
}

function normalizePhones(items: PhoneInput[]): PhoneInput[] {
  return items
    .filter((item) => item.phone_number.trim().length > 0)
    .map((item) => ({
      ...(item.phone_id ? { phone_id: item.phone_id } : {}),
      phone_type_id: item.phone_type_id ?? null,
      phone_number: item.phone_number.trim(),
      is_primary: !!item.is_primary,
    }));
}

function normalizeEmails(items: EmailInput[]): EmailInput[] {
  return items
    .filter((item) => item.email_address.trim().length > 0)
    .map((item) => ({
      ...(item.email_id ? { email_id: item.email_id } : {}),
      email_type_id: item.email_type_id ?? null,
      email_address: item.email_address.trim(),
      is_primary: !!item.is_primary,
    }));
}

function normalizeContacts(items: ContactInput[]): ContactInput[] {
  return items
    .filter((item) => item.contact_name.trim().length > 0)
    .map((item) => ({
      ...(item.contact_id ? { contact_id: item.contact_id } : {}),
      contact_name: item.contact_name.trim(),
      addresses: normalizeAddresses(item.addresses || []),
      phones: normalizePhones(item.phones || []),
      emails: normalizeEmails(item.emails || []),
    }));
}

function PartyManagementPage({ mode }: { mode: Mode }) {
  const [items, setItems] = useState<PartyListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('party_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [loading, setLoading] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState<number | null>(null);
  const [form, setForm] = useState<PartyFormState>(initialFormState);
  const [selectedScheduleTemplate, setSelectedScheduleTemplate] = useState<ScheduleTemplateCode>('custom');
  const [formErrors, setFormErrors] = useState<Partial<Record<'project_code' | 'project_name' | 'supplier_code' | 'supplier_name', string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<PartyListItem | null>(null);

  const [statusOptions, setStatusOptions] = useState<LookupItem[]>([]);
  const [projectTypeOptions, setProjectTypeOptions] = useState<LookupItem[]>([]);
  const [paymentTermsOptions, setPaymentTermsOptions] = useState<LookupItem[]>([]);
  const [addressTypeOptions, setAddressTypeOptions] = useState<LookupItem[]>([]);
  const [phoneTypeOptions, setPhoneTypeOptions] = useState<LookupItem[]>([]);
  const [emailTypeOptions, setEmailTypeOptions] = useState<LookupItem[]>([]);

  const title = mode === 'project' ? 'Project Management' : 'Supplier Management';
  const codeLabel = mode === 'project' ? 'Project Code' : 'Supplier Code';
  const nameLabel = mode === 'project' ? 'Project Name' : 'Supplier Name';

  const listApi = mode === 'project' ? projectApi : supplierApi;

  useEffect(() => {
    setPage(0);
    setSearch('');
    setSearchInput('');
    setSortBy('party_name');
    setSortDir('asc');
    void loadLookups();
  }, [mode]);

  useEffect(() => {
    void loadData();
  }, [mode, page, rowsPerPage, search, sortBy, sortDir]);

  const loadLookups = async () => {
    try {
      const [statuses, projectTypes, paymentTerms, addressTypes, phoneTypes, emailTypes] = await Promise.all([
        lookupApi.listByType('party_status', 100),
        lookupApi.listByType('project_type', 100).catch(() => []),
        lookupApi.listByType('payment_terms', 100).catch(() => []),
        lookupApi.listByType('address_type', 100).catch(() => []),
        lookupApi.listByType('PHONE_TYPE', 100).catch(() => []),
        lookupApi.listByType('EMAIL_TYPE', 100).catch(() => []),
      ]);

      setStatusOptions(Array.isArray(statuses) ? statuses : []);
      setProjectTypeOptions(Array.isArray(projectTypes) ? projectTypes : []);
      setPaymentTermsOptions(Array.isArray(paymentTerms) ? paymentTerms : []);
      setAddressTypeOptions(Array.isArray(addressTypes) ? addressTypes : []);
      setPhoneTypeOptions(Array.isArray(phoneTypes) ? phoneTypes : []);
      setEmailTypeOptions(Array.isArray(emailTypes) ? emailTypes : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load lookup values');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const listResult = await listApi.list(
        rowsPerPage,
        page * rowsPerPage,
        search || undefined,
        sortBy,
        sortDir,
      ) as PartyListResponse;
      setItems(Array.isArray(listResult?.items) ? listResult.items : []);
      setTotal(listResult?.total || 0);
    } catch (err: any) {
      setError(err.message || `Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(initialFormState());
    setSelectedScheduleTemplate('custom');
    setEditingPartyId(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = async (partyId: number) => {
    setDialogOpen(true);
    setDialogLoading(true);
    setError('');

    try {
      const detail = await listApi.get(partyId);
      setEditingPartyId(partyId);
      setFormErrors({});
      setForm({
        status_id: detail.status_id ? String(detail.status_id) : '',
        description: detail.description || '',
        project_code: detail.project_code || '',
        project_name: detail.project_name || '',
        project_type_id: detail.project_type_id ? String(detail.project_type_id) : '',
        supplier_code: detail.supplier_code || '',
        supplier_name: detail.supplier_name || '',
        payment_terms_id: detail.payment_terms_id ? String(detail.payment_terms_id) : '',
        business_hours_schedule: normalizeScheduleFromApi(detail.business_hours_schedule),
        addresses: detail.addresses || [],
        phones: detail.phones || [],
        emails: detail.emails || [],
        contacts: detail.contacts || [],
        deleted_contact_ids: [],
      });
      setSelectedScheduleTemplate(
        mode === 'supplier'
          ? detectScheduleTemplate(normalizeScheduleFromApi(detail.business_hours_schedule))
          : 'custom'
      );
    } catch (err: any) {
      setError(err.message || `Failed to load ${title.toLowerCase()} details`);
      setDialogOpen(false);
    } finally {
      setDialogLoading(false);
    }
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<'project_code' | 'project_name' | 'supplier_code' | 'supplier_name', string>> = {};

    if (mode === 'project') {
      if (!form.project_code.trim()) {
        nextErrors.project_code = 'Project code is required';
      }
      if (!form.project_name.trim()) {
        nextErrors.project_name = 'Project name is required';
      }
    } else {
      if (!form.supplier_code.trim()) {
        nextErrors.supplier_code = 'Supplier code is required';
      }
      if (!form.supplier_name.trim()) {
        nextErrors.supplier_name = 'Supplier name is required';
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    const basePayload = {
      status_id: form.status_id ? parseInt(form.status_id, 10) : undefined,
      description: form.description?.trim() || null,
      addresses: normalizeAddresses(form.addresses),
      phones: normalizePhones(form.phones),
      emails: normalizeEmails(form.emails),
      contacts: normalizeContacts(form.contacts),
      deleted_contact_ids: form.deleted_contact_ids,
    };

    try {
      if (mode === 'project') {
        const payload = {
          ...basePayload,
          project_code: form.project_code.trim(),
          project_name: form.project_name.trim(),
          project_type_id: form.project_type_id ? parseInt(form.project_type_id, 10) : null,
        };

        if (editingPartyId) {
          await projectApi.update(editingPartyId, payload);
        } else {
          await projectApi.create(payload);
        }
      } else {
        const payload = {
          ...basePayload,
          supplier_code: form.supplier_code.trim(),
          supplier_name: form.supplier_name.trim(),
          payment_terms_id: form.payment_terms_id ? parseInt(form.payment_terms_id, 10) : null,
          business_hours_schedule: form.business_hours_schedule.map((item) => ({
            day_of_week: item.day_of_week,
            is_closed: item.is_closed,
            opening_time: item.is_closed ? null : item.opening_time,
            closing_time: item.is_closed ? null : item.closing_time,
          })),
        };

        if (editingPartyId) {
          await supplierApi.update(editingPartyId, payload);
        } else {
          await supplierApi.create(payload);
        }
      }

      setDialogOpen(false);
      setEditingPartyId(null);
      setForm(initialFormState());
      setSuccessMessage(`${mode === 'project' ? 'Project' : 'Supplier'} saved successfully`);
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to save ${title.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const applyScheduleToForm = (schedule: BusinessHourInput[]) => {
    setForm((prev) => ({
      ...prev,
      business_hours_schedule: schedule,
    }));
    setSelectedScheduleTemplate(detectScheduleTemplate(schedule));
  };

  const handleTemplateChange = (templateCode: ScheduleTemplateCode) => {
    setSelectedScheduleTemplate(templateCode);
    if (templateCode === 'custom') {
      return;
    }
    applyScheduleToForm(getTemplateSchedule(templateCode));
  };

  const handleDelete = async (partyId: number) => {
    setDeleteTarget(items.find((item) => item.party_id === partyId) || null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      if (mode === 'project') {
        await projectApi.delete(deleteTarget.party_id);
      } else {
        await supplierApi.delete(deleteTarget.party_id);
      }
      setSuccessMessage(`${mode === 'project' ? 'Project' : 'Supplier'} deleted successfully`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to delete ${mode}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(0);
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

  const totalPages = total === 0 ? 0 : Math.ceil(total / rowsPerPage);
  const currentPageLabel = total === 0 ? 'Page 0 of 0' : `Page ${page + 1} of ${totalPages}`;

  const handleScheduleFieldChange = (index: number, field: keyof BusinessHourInput, value: string | boolean | null) => {
    const next = [...form.business_hours_schedule];
    next[index] = {
      ...next[index],
      [field]: value,
    };
    if (field === 'is_closed' && value === true) {
      next[index] = { ...next[index], opening_time: null, closing_time: null };
    }
    applyScheduleToForm(next);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentPageLabel} · {total.toLocaleString()} total records
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => void loadData()}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add {mode === 'project' ? 'Project' : 'Supplier'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box component="form" onSubmit={handleSearchSubmit}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder={`Search ${mode}s`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="outlined">
              Search
            </Button>
            <Button variant="text" onClick={handleClearSearch} disabled={!search && !searchInput}>
              Clear
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sortDirection={sortBy === 'party_code' ? sortDir : false}>
                  <TableSortLabel active={sortBy === 'party_code'} direction={sortBy === 'party_code' ? sortDir : 'asc'} onClick={() => handleSort('party_code')}>
                    {codeLabel}
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortBy === 'party_name' ? sortDir : false}>
                  <TableSortLabel active={sortBy === 'party_name'} direction={sortBy === 'party_name' ? sortDir : 'asc'} onClick={() => handleSort('party_name')}>
                    {nameLabel}
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortBy === (mode === 'project' ? 'project_type_name' : 'payment_terms_name') ? sortDir : false}>
                  <TableSortLabel
                    active={sortBy === (mode === 'project' ? 'project_type_name' : 'payment_terms_name')}
                    direction={sortBy === (mode === 'project' ? 'project_type_name' : 'payment_terms_name') ? sortDir : 'asc'}
                    onClick={() => handleSort(mode === 'project' ? 'project_type_name' : 'payment_terms_name')}
                  >
                    {mode === 'project' ? 'Project Type' : 'Payment Terms'}
                  </TableSortLabel>
                </TableCell>
                {mode === 'supplier' ? <TableCell>Business Schedule</TableCell> : null}
                <TableCell sortDirection={sortBy === 'status_name' ? sortDir : false}>
                  <TableSortLabel active={sortBy === 'status_name'} direction={sortBy === 'status_name' ? sortDir : 'asc'} onClick={() => handleSort('status_name')}>
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={mode === 'supplier' ? 6 : 5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={mode === 'supplier' ? 6 : 5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: PartyListItem) => (
                  <TableRow key={item.party_id} hover>
                    <TableCell>{mode === 'project' ? item.project_code : item.supplier_code}</TableCell>
                    <TableCell>{mode === 'project' ? item.project_name : item.supplier_name}</TableCell>
                    {mode === 'project' ? <TableCell>{item.project_type_name || '-'}</TableCell> : <TableCell>{item.payment_terms_name || '-'}</TableCell>}
                    {mode === 'supplier' ? <TableCell>{summarizeBusinessHours(item.business_hours_schedule)}</TableCell> : null}
                    <TableCell>{item.status_name}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton color="primary" onClick={() => void openEdit(item.party_id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => handleDelete(item.party_id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, px: 2, pb: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            {currentPageLabel} · {total.toLocaleString()} total records
          </Typography>
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
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="lg">
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingPartyId ? `Edit ${mode === 'project' ? 'Project' : 'Supplier'}` : `Create ${mode === 'project' ? 'Project' : 'Supplier'}`}
          </DialogTitle>
          <DialogContent dividers>
            {dialogLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Basic Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          label={codeLabel}
                          value={mode === 'project' ? form.project_code : form.supplier_code}
                          error={Boolean(mode === 'project' ? formErrors.project_code : formErrors.supplier_code)}
                          helperText={mode === 'project' ? formErrors.project_code : formErrors.supplier_code}
                          onChange={(e) => setForm((prev) => mode === 'project'
                            ? { ...prev, project_code: e.target.value }
                            : { ...prev, supplier_code: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          required
                          fullWidth
                          label={nameLabel}
                          value={mode === 'project' ? form.project_name : form.supplier_name}
                          error={Boolean(mode === 'project' ? formErrors.project_name : formErrors.supplier_name)}
                          helperText={mode === 'project' ? formErrors.project_name : formErrors.supplier_name}
                          onChange={(e) => setForm((prev) => mode === 'project'
                            ? { ...prev, project_name: e.target.value }
                            : { ...prev, supplier_name: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Status"
                          select
                          value={form.status_id}
                          onChange={(e) => setForm((prev) => ({ ...prev, status_id: e.target.value }))}
                        >
                          <MenuItem value="">Active</MenuItem>
                          {statusOptions.map((item: LookupItem) => (
                            <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        {mode === 'project' ? (
                          <TextField
                            fullWidth
                            label="Project Type"
                            select
                            value={form.project_type_id}
                            onChange={(e) => setForm((prev) => ({ ...prev, project_type_id: e.target.value }))}
                          >
                            <MenuItem value="">None</MenuItem>
                            {projectTypeOptions.map((item: LookupItem) => (
                              <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <TextField
                            fullWidth
                            label="Payment Terms"
                            select
                            value={form.payment_terms_id}
                            onChange={(e) => setForm((prev) => ({ ...prev, payment_terms_id: e.target.value }))}
                          >
                            <MenuItem value="">None</MenuItem>
                            {paymentTermsOptions.map((item: LookupItem) => (
                              <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Description"
                          value={form.description}
                          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                          multiline
                          minRows={2}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {mode === 'supplier' ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5} sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Business Schedule
                        </Typography>
                        <TextField
                          fullWidth
                          label="Schedule Template"
                          select
                          value={selectedScheduleTemplate}
                          onChange={(e) => handleTemplateChange(e.target.value as ScheduleTemplateCode)}
                        >
                          {SCHEDULE_TEMPLATES.map((template) => (
                            <MenuItem key={template.code} value={template.code}>{template.label}</MenuItem>
                          ))}
                        </TextField>
                        <Typography variant="body2" color="text.secondary">
                          {getScheduleTemplatePreview(selectedScheduleTemplate)}
                        </Typography>
                      </Stack>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Day</TableCell>
                              <TableCell>Closed</TableCell>
                              <TableCell>Opening Time</TableCell>
                              <TableCell>Closing Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {form.business_hours_schedule.map((row, index) => {
                              const day = WEEK_DAYS.find((item) => item.value === row.day_of_week);
                              return (
                                <TableRow key={`business-hour-${row.day_of_week}`}>
                                  <TableCell>{day?.label || row.day_of_week}</TableCell>
                                  <TableCell>
                                    <Checkbox
                                      checked={row.is_closed}
                                      onChange={(e) => handleScheduleFieldChange(index, 'is_closed', e.target.checked)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      type="time"
                                      size="small"
                                      value={row.opening_time || ''}
                                      disabled={row.is_closed}
                                      onChange={(e) => handleScheduleFieldChange(index, 'opening_time', e.target.value || null)}
                                      inputProps={{ step: 60 }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      type="time"
                                      size="small"
                                      value={row.closing_time || ''}
                                      disabled={row.is_closed}
                                      onChange={(e) => handleScheduleFieldChange(index, 'closing_time', e.target.value || null)}
                                      inputProps={{ step: 60 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                ) : null}

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Addresses
                    </Typography>
                    <Stack spacing={2}>
                      {(form.addresses || []).map((address, index) => (
                        <Card key={`address-${index}`} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={3}>
                                <TextField
                                  fullWidth
                                  label="Address Type"
                                  select
                                  value={address.address_type_id ? String(address.address_type_id) : ''}
                                  onChange={(e) => {
                                    const next = [...form.addresses];
                                    next[index] = { ...next[index], address_type_id: e.target.value ? parseInt(e.target.value, 10) : null };
                                    setForm((prev) => ({ ...prev, addresses: next }));
                                  }}
                                >
                                  <MenuItem value="">None</MenuItem>
                                  {addressTypeOptions.map((item: LookupItem) => (
                                    <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                                  ))}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="House No" value={address.house_no || ''} onChange={(e) => { const next = [...form.addresses]; next[index] = { ...next[index], house_no: e.target.value }; setForm((prev) => ({ ...prev, addresses: next })); }} /></Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="Street" value={address.street || ''} onChange={(e) => { const next = [...form.addresses]; next[index] = { ...next[index], street: e.target.value }; setForm((prev) => ({ ...prev, addresses: next })); }} /></Grid>
                              <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <FormControlLabel
                                    control={<Checkbox checked={!!address.is_primary} onChange={() => setForm((prev) => ({ ...prev, addresses: setPrimary(prev.addresses, index) }))} />}
                                    label="Primary"
                                  />
                                  <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, addresses: prev.addresses.filter((_, idx) => idx !== index) }))}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="Barangay" value={address.barangay || ''} onChange={(e) => { const next = [...form.addresses]; next[index] = { ...next[index], barangay: e.target.value }; setForm((prev) => ({ ...prev, addresses: next })); }} /></Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="City" value={address.city || ''} onChange={(e) => { const next = [...form.addresses]; next[index] = { ...next[index], city: e.target.value }; setForm((prev) => ({ ...prev, addresses: next })); }} /></Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="Province" value={address.province || ''} onChange={(e) => { const next = [...form.addresses]; next[index] = { ...next[index], province: e.target.value }; setForm((prev) => ({ ...prev, addresses: next })); }} /></Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="Region" value={address.region || ''} onChange={(e) => { const next = [...form.addresses]; next[index] = { ...next[index], region: e.target.value }; setForm((prev) => ({ ...prev, addresses: next })); }} /></Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="Postal Code" value={address.postal_code || ''} onChange={(e) => { const next = [...form.addresses]; next[index] = { ...next[index], postal_code: e.target.value }; setForm((prev) => ({ ...prev, addresses: next })); }} /></Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                      <Box>
                        <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, addresses: [...prev.addresses, emptyAddress()] }))}>
                          Add Address
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Phone Numbers
                    </Typography>
                    <Stack spacing={2}>
                      {(form.phones || []).map((phone, index) => (
                        <Grid key={`phone-${index}`} container spacing={2} alignItems="center">
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Phone Type"
                              select
                              value={phone.phone_type_id ? String(phone.phone_type_id) : ''}
                              onChange={(e) => {
                                const next = [...form.phones];
                                next[index] = { ...next[index], phone_type_id: e.target.value ? parseInt(e.target.value, 10) : null };
                                setForm((prev) => ({ ...prev, phones: next }));
                              }}
                            >
                              <MenuItem value="">None</MenuItem>
                              {phoneTypeOptions.map((item: LookupItem) => (
                                <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <TextField
                              fullWidth
                              required
                              label="Phone Number"
                              value={phone.phone_number}
                              onChange={(e) => {
                                const next = [...form.phones];
                                next[index] = { ...next[index], phone_number: e.target.value };
                                setForm((prev) => ({ ...prev, phones: next }));
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <FormControlLabel control={<Checkbox checked={!!phone.is_primary} onChange={() => setForm((prev) => ({ ...prev, phones: setPrimary(prev.phones, index) }))} />} label="Primary" />
                              <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, idx) => idx !== index) }))}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Grid>
                        </Grid>
                      ))}
                      <Box>
                        <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, emptyPhone()] }))}>
                          Add Phone
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Email Addresses
                    </Typography>
                    <Stack spacing={2}>
                      {(form.emails || []).map((email, index) => (
                        <Grid key={`email-${index}`} container spacing={2} alignItems="center">
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Email Type"
                              select
                              value={email.email_type_id ? String(email.email_type_id) : ''}
                              onChange={(e) => {
                                const next = [...form.emails];
                                next[index] = { ...next[index], email_type_id: e.target.value ? parseInt(e.target.value, 10) : null };
                                setForm((prev) => ({ ...prev, emails: next }));
                              }}
                            >
                              <MenuItem value="">None</MenuItem>
                              {emailTypeOptions.map((item: LookupItem) => (
                                <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <TextField
                              fullWidth
                              required
                              label="Email Address"
                              value={email.email_address}
                              onChange={(e) => {
                                const next = [...form.emails];
                                next[index] = { ...next[index], email_address: e.target.value };
                                setForm((prev) => ({ ...prev, emails: next }));
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <FormControlLabel control={<Checkbox checked={!!email.is_primary} onChange={() => setForm((prev) => ({ ...prev, emails: setPrimary(prev.emails, index) }))} />} label="Primary" />
                              <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, emails: prev.emails.filter((_, idx) => idx !== index) }))}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Grid>
                        </Grid>
                      ))}
                      <Box>
                        <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, emails: [...prev.emails, emptyEmail()] }))}>
                          Add Email
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Contact Persons
                    </Typography>
                    <Stack spacing={2}>
                      {(form.contacts || []).map((contact, contactIndex) => (
                        <Card key={`contact-${contactIndex}`} variant="outlined">
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={10}>
                                <TextField
                                  fullWidth
                                  required
                                  label="Contact Name"
                                  value={contact.contact_name}
                                  onChange={(e) => {
                                    const next = [...form.contacts];
                                    next[contactIndex] = { ...next[contactIndex], contact_name: e.target.value };
                                    setForm((prev) => ({ ...prev, contacts: next }));
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                <IconButton
                                  color="error"
                                  onClick={() => {
                                    const removed = form.contacts[contactIndex];
                                    setForm((prev) => ({
                                      ...prev,
                                      contacts: prev.contacts.filter((_, idx) => idx !== contactIndex),
                                      deleted_contact_ids: removed.contact_id
                                        ? [...prev.deleted_contact_ids, removed.contact_id]
                                        : prev.deleted_contact_ids,
                                    }));
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={1.5}>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Button size="small" onClick={() => {
                                  const next = [...form.contacts];
                                  next[contactIndex] = { ...next[contactIndex], phones: [...next[contactIndex].phones, emptyPhone()] };
                                  setForm((prev) => ({ ...prev, contacts: next }));
                                }}>
                                  Add Contact Phone
                                </Button>
                                <Button size="small" onClick={() => {
                                  const next = [...form.contacts];
                                  next[contactIndex] = { ...next[contactIndex], emails: [...next[contactIndex].emails, emptyEmail()] };
                                  setForm((prev) => ({ ...prev, contacts: next }));
                                }}>
                                  Add Contact Email
                                </Button>
                                <Button size="small" onClick={() => {
                                  const next = [...form.contacts];
                                  next[contactIndex] = { ...next[contactIndex], addresses: [...next[contactIndex].addresses, emptyAddress()] };
                                  setForm((prev) => ({ ...prev, contacts: next }));
                                }}>
                                  Add Contact Address
                                </Button>
                              </Stack>

                              {(contact.phones || []).map((phone, phoneIndex) => (
                                <Grid key={`cp-${contactIndex}-ph-${phoneIndex}`} container spacing={2} alignItems="center">
                                  <Grid item xs={12} md={5}>
                                    <TextField
                                      fullWidth
                                      label="Phone Type"
                                      select
                                      value={phone.phone_type_id ? String(phone.phone_type_id) : ''}
                                      onChange={(e) => {
                                        const next = [...form.contacts];
                                        const phones = [...next[contactIndex].phones];
                                        phones[phoneIndex] = { ...phones[phoneIndex], phone_type_id: e.target.value ? parseInt(e.target.value, 10) : null };
                                        next[contactIndex] = { ...next[contactIndex], phones };
                                        setForm((prev) => ({ ...prev, contacts: next }));
                                      }}
                                    >
                                      <MenuItem value="">None</MenuItem>
                                      {phoneTypeOptions.map((item: LookupItem) => (
                                        <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                                      ))}
                                    </TextField>
                                  </Grid>
                                  <Grid item xs={12} md={5}>
                                    <TextField
                                      fullWidth
                                      label="Phone"
                                      value={phone.phone_number}
                                      onChange={(e) => {
                                        const next = [...form.contacts];
                                        const phones = [...next[contactIndex].phones];
                                        phones[phoneIndex] = { ...phones[phoneIndex], phone_number: e.target.value };
                                        next[contactIndex] = { ...next[contactIndex], phones };
                                        setForm((prev) => ({ ...prev, contacts: next }));
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <IconButton color="error" onClick={() => {
                                      const next = [...form.contacts];
                                      const phones = next[contactIndex].phones.filter((_, idx) => idx !== phoneIndex);
                                      next[contactIndex] = { ...next[contactIndex], phones };
                                      setForm((prev) => ({ ...prev, contacts: next }));
                                    }}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              ))}

                              {(contact.emails || []).map((email, emailIndex) => (
                                <Grid key={`cp-${contactIndex}-em-${emailIndex}`} container spacing={2} alignItems="center">
                                  <Grid item xs={12} md={5}>
                                    <TextField
                                      fullWidth
                                      label="Email Type"
                                      select
                                      value={email.email_type_id ? String(email.email_type_id) : ''}
                                      onChange={(e) => {
                                        const next = [...form.contacts];
                                        const emails = [...next[contactIndex].emails];
                                        emails[emailIndex] = { ...emails[emailIndex], email_type_id: e.target.value ? parseInt(e.target.value, 10) : null };
                                        next[contactIndex] = { ...next[contactIndex], emails };
                                        setForm((prev) => ({ ...prev, contacts: next }));
                                      }}
                                    >
                                      <MenuItem value="">None</MenuItem>
                                      {emailTypeOptions.map((item: LookupItem) => (
                                        <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                                      ))}
                                    </TextField>
                                  </Grid>
                                  <Grid item xs={12} md={5}>
                                    <TextField
                                      fullWidth
                                      label="Email"
                                      value={email.email_address}
                                      onChange={(e) => {
                                        const next = [...form.contacts];
                                        const emails = [...next[contactIndex].emails];
                                        emails[emailIndex] = { ...emails[emailIndex], email_address: e.target.value };
                                        next[contactIndex] = { ...next[contactIndex], emails };
                                        setForm((prev) => ({ ...prev, contacts: next }));
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <IconButton color="error" onClick={() => {
                                      const next = [...form.contacts];
                                      const emails = next[contactIndex].emails.filter((_, idx) => idx !== emailIndex);
                                      next[contactIndex] = { ...next[contactIndex], emails };
                                      setForm((prev) => ({ ...prev, contacts: next }));
                                    }}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              ))}

                              {(contact.addresses || []).map((address, addressIndex) => (
                                <Grid key={`cp-${contactIndex}-ad-${addressIndex}`} container spacing={2} alignItems="center">
                                  <Grid item xs={12} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Address Type"
                                      select
                                      value={address.address_type_id ? String(address.address_type_id) : ''}
                                      onChange={(e) => {
                                        const next = [...form.contacts];
                                        const addresses = [...next[contactIndex].addresses];
                                        addresses[addressIndex] = { ...addresses[addressIndex], address_type_id: e.target.value ? parseInt(e.target.value, 10) : null };
                                        next[contactIndex] = { ...next[contactIndex], addresses };
                                        setForm((prev) => ({ ...prev, contacts: next }));
                                      }}
                                    >
                                      <MenuItem value="">None</MenuItem>
                                      {addressTypeOptions.map((item: LookupItem) => (
                                        <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                                      ))}
                                    </TextField>
                                  </Grid>
                                  <Grid item xs={12} md={5}>
                                    <TextField
                                      fullWidth
                                      label="Street"
                                      value={address.street || ''}
                                      onChange={(e) => {
                                        const next = [...form.contacts];
                                        const addresses = [...next[contactIndex].addresses];
                                        addresses[addressIndex] = { ...addresses[addressIndex], street: e.target.value };
                                        next[contactIndex] = { ...next[contactIndex], addresses };
                                        setForm((prev) => ({ ...prev, contacts: next }));
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <FormControlLabel
                                        control={<Checkbox checked={!!address.is_primary} onChange={() => {
                                          const next = [...form.contacts];
                                          next[contactIndex] = {
                                            ...next[contactIndex],
                                            addresses: setPrimary(next[contactIndex].addresses, addressIndex),
                                          };
                                          setForm((prev) => ({ ...prev, contacts: next }));
                                        }} />}
                                        label="Primary"
                                      />
                                      <IconButton color="error" onClick={() => {
                                        const next = [...form.contacts];
                                        next[contactIndex] = {
                                          ...next[contactIndex],
                                          addresses: next[contactIndex].addresses.filter((_, idx) => idx !== addressIndex),
                                        };
                                        setForm((prev) => ({ ...prev, contacts: next }));
                                      }}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  </Grid>
                                </Grid>
                              ))}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                      <Box>
                        <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, contacts: [...prev.contacts, emptyContact()] }))}>
                          Add Contact Person
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" type="submit" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete {mode === 'project' ? 'Project' : 'Supplier'}</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget?.party_name || deleteTarget?.project_name || deleteTarget?.supplier_name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(successMessage)} autoHideDuration={2500} onClose={() => setSuccessMessage('')}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export function ProjectManagementPage() {
  return <PartyManagementPage mode="project" />;
}

export function SupplierManagementPage() {
  return <PartyManagementPage mode="supplier" />;
}
