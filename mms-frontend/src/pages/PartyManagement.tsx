import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
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

interface PartyFormState {
  status_id: string;
  description: string;
  project_code: string;
  project_name: string;
  project_type_id: string;
  supplier_code: string;
  supplier_name: string;
  payment_terms_id: string;
  business_hours: string;
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
  business_hours?: string | null;
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

const initialFormState = (): PartyFormState => ({
  status_id: '',
  description: '',
  project_code: '',
  project_name: '',
  project_type_id: '',
  supplier_code: '',
  supplier_name: '',
  payment_terms_id: '',
  business_hours: '',
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState<number | null>(null);
  const [form, setForm] = useState<PartyFormState>(initialFormState);

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
    void loadData();
  }, [mode]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [listResult, statuses, projectTypes, paymentTerms, addressTypes, phoneTypes, emailTypes] =
        await Promise.all([
          listApi.list(100, 0, search || undefined) as Promise<PartyListResponse>,
          lookupApi.listByType('party_status', 100),
          lookupApi.listByType('project_type', 100).catch(() => []),
          lookupApi.listByType('payment_terms', 100).catch(() => []),
          lookupApi.listByType('address_type', 100).catch(() => []),
          lookupApi.listByType('PHONE_TYPE', 100).catch(() => []),
          lookupApi.listByType('EMAIL_TYPE', 100).catch(() => []),
        ]);

      setItems(Array.isArray(listResult?.items) ? listResult.items : []);
      setTotal(listResult?.total || 0);
      setStatusOptions(Array.isArray(statuses) ? statuses : []);
      setProjectTypeOptions(Array.isArray(projectTypes) ? projectTypes : []);
      setPaymentTermsOptions(Array.isArray(paymentTerms) ? paymentTerms : []);
      setAddressTypeOptions(Array.isArray(addressTypes) ? addressTypes : []);
      setPhoneTypeOptions(Array.isArray(phoneTypes) ? phoneTypes : []);
      setEmailTypeOptions(Array.isArray(emailTypes) ? emailTypes : []);
    } catch (err: any) {
      setError(err.message || `Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(initialFormState());
    setEditingPartyId(null);
    setDialogOpen(true);
  };

  const openEdit = async (partyId: number) => {
    setLoading(true);
    setError('');

    try {
      const detail = await listApi.get(partyId);
      setEditingPartyId(partyId);
      setForm({
        status_id: detail.status_id ? String(detail.status_id) : '',
        description: detail.description || '',
        project_code: detail.project_code || '',
        project_name: detail.project_name || '',
        project_type_id: detail.project_type_id ? String(detail.project_type_id) : '',
        supplier_code: detail.supplier_code || '',
        supplier_name: detail.supplier_name || '',
        payment_terms_id: detail.payment_terms_id ? String(detail.payment_terms_id) : '',
        business_hours: detail.business_hours || '',
        addresses: detail.addresses || [],
        phones: detail.phones || [],
        emails: detail.emails || [],
        contacts: detail.contacts || [],
        deleted_contact_ids: [],
      });
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.message || `Failed to load ${title.toLowerCase()} details`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
          business_hours: form.business_hours?.trim() || null,
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
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to save ${title.toLowerCase()}`);
    }
  };

  const handleDelete = async (partyId: number) => {
    const confirmed = window.confirm(`Delete this ${mode}?`);
    if (!confirmed) {
      return;
    }

    setError('');
    try {
      if (mode === 'project') {
        await projectApi.delete(partyId);
      } else {
        await supplierApi.delete(partyId);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to delete ${mode}`);
    }
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return items;
    }
    const needle = search.toLowerCase();
    return items.filter((item) => {
      const code = mode === 'project' ? item.project_code || '' : item.supplier_code || '';
      const name = mode === 'project' ? item.project_name || '' : item.supplier_name || '';
      return code.toLowerCase().includes(needle) || name.toLowerCase().includes(needle);
    });
  }, [items, mode, search]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label={`Search ${mode}s`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />
          <Button variant="outlined" onClick={() => void loadData()}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add {mode === 'project' ? 'Project' : 'Supplier'}
          </Button>
          <Typography variant="body2" color="text.secondary">Total: {total}</Typography>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{codeLabel}</TableCell>
                <TableCell>{nameLabel}</TableCell>
                {mode === 'project' ? <TableCell>Project Type</TableCell> : <TableCell>Payment Terms</TableCell>}
                {mode === 'supplier' ? <TableCell>Business Hours</TableCell> : null}
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.party_id} hover>
                  <TableCell>{mode === 'project' ? item.project_code : item.supplier_code}</TableCell>
                  <TableCell>{mode === 'project' ? item.project_name : item.supplier_name}</TableCell>
                  {mode === 'project' ? (
                    <TableCell>{item.project_type_name || '-'}</TableCell>
                  ) : (
                    <TableCell>{item.payment_terms_name || '-'}</TableCell>
                  )}
                  {mode === 'supplier' ? <TableCell>{item.business_hours || '-'}</TableCell> : null}
                  <TableCell>{item.status_name}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => void openEdit(item.party_id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" onClick={() => void handleDelete(item.party_id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={mode === 'supplier' ? 6 : 5} align="center">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="lg">
        <form onSubmit={handleSave}>
          <DialogTitle>
            {editingPartyId ? `Edit ${mode === 'project' ? 'Project' : 'Supplier'}` : `Create ${mode === 'project' ? 'Project' : 'Supplier'}`}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
              {mode === 'project' ? (
                <>
                  <TextField
                    required
                    label="Project Code"
                    value={form.project_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, project_code: e.target.value }))}
                  />
                  <TextField
                    required
                    label="Project Name"
                    value={form.project_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, project_name: e.target.value }))}
                  />
                  <TextField
                    label="Project Type"
                    select
                    value={form.project_type_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, project_type_id: e.target.value }))}
                  >
                    <MenuItem value="">None</MenuItem>
                    {projectTypeOptions.map((item) => (
                      <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                    ))}
                  </TextField>
                </>
              ) : (
                <>
                  <TextField
                    required
                    label="Supplier Code"
                    value={form.supplier_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplier_code: e.target.value }))}
                  />
                  <TextField
                    required
                    label="Supplier Name"
                    value={form.supplier_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
                  />
                  <TextField
                    label="Payment Terms"
                    select
                    value={form.payment_terms_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, payment_terms_id: e.target.value }))}
                  >
                    <MenuItem value="">None</MenuItem>
                    {paymentTermsOptions.map((item) => (
                      <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Business Hours"
                    value={form.business_hours}
                    onChange={(e) => setForm((prev) => ({ ...prev, business_hours: e.target.value }))}
                  />
                </>
              )}

              {editingPartyId ? (
                <TextField
                  label="Status"
                  select
                  value={form.status_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, status_id: e.target.value }))}
                >
                  {statusOptions.map((item) => (
                    <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                  ))}
                </TextField>
              ) : null}

              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                minRows={2}
              />
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>Addresses</Typography>
            {(form.addresses || []).map((address, index) => (
              <Box key={`address-${index}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1, mb: 1 }}>
                <TextField
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
                  {addressTypeOptions.map((item) => (
                    <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="House No"
                  value={address.house_no || ''}
                  onChange={(e) => {
                    const next = [...form.addresses];
                    next[index] = { ...next[index], house_no: e.target.value };
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}
                />
                <TextField
                  label="Street"
                  value={address.street || ''}
                  onChange={(e) => {
                    const next = [...form.addresses];
                    next[index] = { ...next[index], street: e.target.value };
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}
                />
                <TextField
                  label="Barangay"
                  value={address.barangay || ''}
                  onChange={(e) => {
                    const next = [...form.addresses];
                    next[index] = { ...next[index], barangay: e.target.value };
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}
                />
                <TextField
                  label="City"
                  value={address.city || ''}
                  onChange={(e) => {
                    const next = [...form.addresses];
                    next[index] = { ...next[index], city: e.target.value };
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}
                />
                <TextField
                  label="Province"
                  value={address.province || ''}
                  onChange={(e) => {
                    const next = [...form.addresses];
                    next[index] = { ...next[index], province: e.target.value };
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}
                />
                <TextField
                  label="Region"
                  value={address.region || ''}
                  onChange={(e) => {
                    const next = [...form.addresses];
                    next[index] = { ...next[index], region: e.target.value };
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}
                />
                <TextField
                  label="Postal Code"
                  value={address.postal_code || ''}
                  onChange={(e) => {
                    const next = [...form.addresses];
                    next[index] = { ...next[index], postal_code: e.target.value };
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={!!address.is_primary}
                      onChange={() => setForm((prev) => ({ ...prev, addresses: setPrimary(prev.addresses, index) }))}
                    />
                    <Typography variant="body2">Primary</Typography>
                  </Box>
                  <IconButton color="error" onClick={() => {
                    const next = form.addresses.filter((_, idx) => idx !== index);
                    setForm((prev) => ({ ...prev, addresses: next }));
                  }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, addresses: [...prev.addresses, emptyAddress()] }))}>
              Add Address
            </Button>

            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Phone Numbers</Typography>
            {(form.phones || []).map((phone, index) => (
              <Box key={`phone-${index}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 2fr 1fr auto' }, gap: 1, mb: 1 }}>
                <TextField
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
                  {phoneTypeOptions.map((item) => (
                    <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  label="Phone Number"
                  value={phone.phone_number}
                  onChange={(e) => {
                    const next = [...form.phones];
                    next[index] = { ...next[index], phone_number: e.target.value };
                    setForm((prev) => ({ ...prev, phones: next }));
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox checked={!!phone.is_primary} onChange={() => setForm((prev) => ({ ...prev, phones: setPrimary(prev.phones, index) }))} />
                  <Typography variant="body2">Primary</Typography>
                </Box>
                <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, idx) => idx !== index) }))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, emptyPhone()] }))}>
              Add Phone
            </Button>

            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Email Addresses</Typography>
            {(form.emails || []).map((email, index) => (
              <Box key={`email-${index}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 2fr 1fr auto' }, gap: 1, mb: 1 }}>
                <TextField
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
                  {emailTypeOptions.map((item) => (
                    <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  label="Email Address"
                  value={email.email_address}
                  onChange={(e) => {
                    const next = [...form.emails];
                    next[index] = { ...next[index], email_address: e.target.value };
                    setForm((prev) => ({ ...prev, emails: next }));
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox checked={!!email.is_primary} onChange={() => setForm((prev) => ({ ...prev, emails: setPrimary(prev.emails, index) }))} />
                  <Typography variant="body2">Primary</Typography>
                </Box>
                <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, emails: prev.emails.filter((_, idx) => idx !== index) }))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, emails: [...prev.emails, emptyEmail()] }))}>
              Add Email
            </Button>

            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Contact Persons</Typography>
            {(form.contacts || []).map((contact, contactIndex) => (
              <Paper key={`contact-${contactIndex}`} variant="outlined" sx={{ p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
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
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
                </Box>

                {(contact.phones || []).map((phone, phoneIndex) => (
                  <Box key={`cp-${contactIndex}-ph-${phoneIndex}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 2fr auto' }, gap: 1, mb: 1 }}>
                    <TextField
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
                      {phoneTypeOptions.map((item) => (
                        <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
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
                    <IconButton color="error" onClick={() => {
                      const next = [...form.contacts];
                      const phones = next[contactIndex].phones.filter((_, idx) => idx !== phoneIndex);
                      next[contactIndex] = { ...next[contactIndex], phones };
                      setForm((prev) => ({ ...prev, contacts: next }));
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                {(contact.emails || []).map((email, emailIndex) => (
                  <Box key={`cp-${contactIndex}-em-${emailIndex}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 2fr auto' }, gap: 1, mb: 1 }}>
                    <TextField
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
                      {emailTypeOptions.map((item) => (
                        <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
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
                    <IconButton color="error" onClick={() => {
                      const next = [...form.contacts];
                      const emails = next[contactIndex].emails.filter((_, idx) => idx !== emailIndex);
                      next[contactIndex] = { ...next[contactIndex], emails };
                      setForm((prev) => ({ ...prev, contacts: next }));
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                {(contact.addresses || []).map((address, addressIndex) => (
                  <Box key={`cp-${contactIndex}-ad-${addressIndex}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1, mb: 1 }}>
                    <TextField
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
                      {addressTypeOptions.map((item) => (
                        <MenuItem key={item.look_up_id} value={String(item.look_up_id)}>{item.name}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Checkbox
                        checked={!!address.is_primary}
                        onChange={() => {
                          const next = [...form.contacts];
                          next[contactIndex] = {
                            ...next[contactIndex],
                            addresses: setPrimary(next[contactIndex].addresses, addressIndex),
                          };
                          setForm((prev) => ({ ...prev, contacts: next }));
                        }}
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
                    </Box>
                  </Box>
                ))}
              </Paper>
            ))}

            <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, contacts: [...prev.contacts, emptyContact()] }))}>
              Add Contact Person
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" type="submit">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export function ProjectManagementPage() {
  return <PartyManagementPage mode="project" />;
}

export function SupplierManagementPage() {
  return <PartyManagementPage mode="supplier" />;
}
