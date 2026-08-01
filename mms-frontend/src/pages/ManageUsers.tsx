import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { accountApi, lookupApi } from '../shared/api/client.js';

interface UserListItem {
  account_id: number;
  user_name: string;
  full_name: string | null;
  role_codes: string[];
  primary_email: string | null;
  primary_phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserDetailShape {
  account_id: number;
  user_name: string;
  full_name: string | null;
  is_active: boolean;
  roles?: Array<{ role_code: string }>;
  addresses?: AddressInput[];
  phones?: PhoneInput[];
  emails?: EmailInput[];
  contacts?: ContactInput[];
  created_at?: string;
}

interface RoleItem {
  role_id: number;
  role_code: string;
  role_name: string;
}

interface PermissionItem {
  module_name: string;
  permission_code: string;
  permission_name: string;
  value: string;
}

interface AddressInput {
  address_id?: number;
  address_type_id?: number | null;
  address_type_name?: string | null;
  address_label?: string;
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
  phone_type_name?: string | null;
  phone_number: string;
  is_primary?: boolean;
}

interface EmailInput {
  email_id?: number;
  email_type_id?: number | null;
  email_type_name?: string | null;
  email_address: string;
  is_primary?: boolean;
}

interface LookupItem {
  look_up_id: number;
  look_up_type: string;
  code: string;
  name: string;
  description?: string;
}

interface ContactInput {
  contact_id?: number;
  prefix_id?: number | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix_id?: number | null;
  contact_name: string;
  addresses: AddressInput[];
  phones: PhoneInput[];
  emails: EmailInput[];
}

interface UserFormState {
  user_name: string;
  full_name: string;
  password: string;
  is_active: boolean;
  role_codes: string[];
  addresses: AddressInput[];
  phones: PhoneInput[];
  emails: EmailInput[];
  contacts: ContactInput[];
  deleted_contact_ids: number[];
}

type SortField = 'user_name' | 'full_name' | 'is_active' | 'created_at';
type SortDir = 'asc' | 'desc';

type FormErrorMap = Partial<Record<'user_name' | 'full_name' | 'password', string>>;

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
  phone_number: '',
  phone_type_id: null,
  is_primary: false,
});

const emptyEmail = (): EmailInput => ({
  email_address: '',
  email_type_id: null,
  is_primary: false,
});

const emptyContact = (): ContactInput => ({
  contact_name: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  addresses: [],
  phones: [],
  emails: [],
});

const initialFormState = (): UserFormState => ({
  user_name: '',
  full_name: '',
  password: '',
  is_active: true,
  role_codes: [],
  addresses: [],
  phones: [],
  emails: [],
  contacts: [],
  deleted_contact_ids: [],
});

function buildAddressLabel(address: AddressInput): string {
  const line1 = [address.house_no, address.street].filter(Boolean).join(' ').trim();
  const line2 = [address.barangay, address.city, address.province].filter(Boolean).join(', ').trim();
  const line3 = [address.region, address.postal_code].filter(Boolean).join(' ').trim();
  return [line1, line2, line3].filter(Boolean).join(', ');
}

function setPrimary<T extends { is_primary?: boolean }>(items: T[], index: number): T[] {
  return items.map((item, idx) => ({ ...item, is_primary: idx === index }));
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function ManageUsersPage() {
  const [items, setItems] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [loading, setLoading] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [tab, setTab] = useState(0);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<FormErrorMap>({});

  const [addressTypes, setAddressTypes] = useState<LookupItem[]>([]);
  const [phoneTypes, setPhoneTypes] = useState<LookupItem[]>([]);
  const [emailTypes, setEmailTypes] = useState<LookupItem[]>([]);

  const selectedRoleNames = useMemo(() => {
    const roleMap = new Map(roles.map((role) => [role.role_code, role.role_name]));
    return form.role_codes.map((roleCode) => roleMap.get(roleCode) || roleCode);
  }, [form.role_codes, roles]);

  const groupedPermissions = useMemo(() => {
    const grouped = new Map<string, PermissionItem[]>();
    for (const permission of permissions) {
      const key = permission.module_name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(permission);
    }
    return grouped;
  }, [permissions]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / rowsPerPage);
  const currentPageLabel = total === 0 ? 'Page 0 of 0' : `Page ${page + 1} of ${totalPages}`;

  useEffect(() => {
    void loadRoles();
    void loadLookupOptions();
  }, []);

  useEffect(() => {
    void loadData();
  }, [page, rowsPerPage, search, sortBy, sortDir]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await accountApi.listAccounts(
        rowsPerPage,
        page * rowsPerPage,
        search || undefined,
        sortBy,
        sortDir,
      );
      setItems(result.items || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await accountApi.listRoles();
      setRoles(data || []);
    } catch {
      setRoles([]);
    }
  };

  const loadLookupByTypes = async (types: string[]): Promise<LookupItem[]> => {
    for (const type of types) {
      try {
        const result = await lookupApi.listByType(type, 100);
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch {
        // Try next variant.
      }
    }
    return [];
  };

  const loadLookupOptions = async () => {
    const [addressTypeResult, phoneTypeResult, emailTypeResult] = await Promise.all([
      loadLookupByTypes(['address_type', 'ADDRESS_TYPE']),
      loadLookupByTypes(['PHONE_TYPE', 'phone_type']),
      loadLookupByTypes(['EMAIL_TYPE', 'email_type']),
    ]);

    setAddressTypes(addressTypeResult);
    setPhoneTypes(phoneTypeResult);
    setEmailTypes(emailTypeResult);
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrorMap = {};

    if (!form.user_name.trim()) {
      nextErrors.user_name = 'Username is required';
    }

    if (!form.full_name.trim()) {
      nextErrors.full_name = 'Full name is required';
    }

    if (!editingAccountId && form.password.trim().length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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

  const openCreate = () => {
    setEditingAccountId(null);
    setPermissions([]);
    setForm(initialFormState());
    setFormErrors({});
    setTab(0);
    setDialogOpen(true);
  };

  const openEdit = async (accountId: number) => {
    setDialogOpen(true);
    setDialogLoading(true);
    setError('');

    try {
      const [detail, userPermissions] = await Promise.all([
        accountApi.getAccount(accountId),
        accountApi.getPermissions(accountId),
      ]);

      setEditingAccountId(accountId);
      setPermissions(userPermissions || []);
      setFormErrors({});
      setForm({
        user_name: detail.user_name || '',
        full_name: detail.full_name || '',
        password: '',
        is_active: !!detail.is_active,
        role_codes: (detail.roles || []).map((role: any) => role.role_code),
        addresses: (detail.addresses || []).map((item: any) => ({
          address_id: item.address_id,
          address_type_id: item.address_type_id,
          address_type_name: item.address_type_name,
          address_label: item.address_label,
          house_no: item.house_no ?? '',
          street: item.street ?? '',
          barangay: item.barangay ?? '',
          city: item.city ?? '',
          province: item.province ?? '',
          region: item.region ?? '',
          postal_code: item.postal_code ?? '',
          is_primary: item.is_primary,
        })),
        phones: (detail.phones || []).map((item: any) => ({
          phone_id: item.phone_id,
          phone_type_id: item.phone_type_id,
          phone_type_name: item.phone_type_name,
          phone_number: item.phone_number,
          is_primary: item.is_primary,
        })),
        emails: (detail.emails || []).map((item: any) => ({
          email_id: item.email_id,
          email_type_id: item.email_type_id,
          email_type_name: item.email_type_name,
          email_address: item.email_address,
          is_primary: item.is_primary,
        })),
        contacts: (detail.contacts || []).map((contact: any) => ({
          contact_id: contact.contact_id,
          prefix_id: contact.prefix_id,
          first_name: contact.first_name,
          middle_name: contact.middle_name,
          last_name: contact.last_name,
          suffix_id: contact.suffix_id,
          contact_name: contact.contact_name,
          addresses: (contact.addresses || []).map((item: any) => ({
            address_id: item.address_id,
            address_type_id: item.address_type_id,
            address_type_name: item.address_type_name,
            address_label: item.address_label,
            house_no: item.house_no ?? '',
            street: item.street ?? '',
            barangay: item.barangay ?? '',
            city: item.city ?? '',
            province: item.province ?? '',
            region: item.region ?? '',
            postal_code: item.postal_code ?? '',
            is_primary: item.is_primary,
          })),
          phones: contact.phones || [],
          emails: contact.emails || [],
        })),
        deleted_contact_ids: [],
      });

      setTab(0);
    } catch (err: any) {
      setError(err.message || 'Failed to load account');
      setDialogOpen(false);
    } finally {
      setDialogLoading(false);
    }
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }
    setDialogOpen(false);
    setTab(0);
    setEditingAccountId(null);
    setFormErrors({});
  };

  const toggleRole = (roleCode: string) => {
    setForm((prev) => ({
      ...prev,
      role_codes: prev.role_codes.includes(roleCode)
        ? prev.role_codes.filter((code) => code !== roleCode)
        : [...prev.role_codes, roleCode],
    }));
  };

  const updateAddress = (addresses: AddressInput[], index: number, patch: Partial<AddressInput>) => {
    const next = [...addresses];
    next[index] = { ...next[index], ...patch };
    return next;
  };

  const updatePhone = (phones: PhoneInput[], index: number, patch: Partial<PhoneInput>) => {
    const next = [...phones];
    next[index] = { ...next[index], ...patch };
    return next;
  };

  const updateEmail = (emails: EmailInput[], index: number, patch: Partial<EmailInput>) => {
    const next = [...emails];
    next[index] = { ...next[index], ...patch };
    return next;
  };

  const submit = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    const payload: any = {
      user_name: form.user_name,
      full_name: form.full_name,
      is_active: form.is_active,
      role_codes: form.role_codes,
      addresses: form.addresses.map((item) => ({
        address_id: item.address_id,
        address_type_id: item.address_type_id ?? null,
        house_no: item.house_no ?? null,
        street: item.street ?? null,
        barangay: item.barangay ?? null,
        city: item.city ?? null,
        province: item.province ?? null,
        region: item.region ?? null,
        postal_code: item.postal_code ?? null,
        is_primary: item.is_primary ?? false,
      })),
      phones: form.phones.map((item) => ({
        phone_id: item.phone_id,
        phone_type_id: item.phone_type_id ?? null,
        phone_number: item.phone_number,
        is_primary: item.is_primary ?? false,
      })),
      emails: form.emails.map((item) => ({
        email_id: item.email_id,
        email_type_id: item.email_type_id ?? null,
        email_address: item.email_address,
        is_primary: item.is_primary ?? false,
      })),
      contacts: form.contacts.map((contact) => ({
        contact_id: contact.contact_id,
        prefix_id: contact.prefix_id ?? null,
        first_name: contact.first_name ?? null,
        middle_name: contact.middle_name ?? null,
        last_name: contact.last_name ?? null,
        suffix_id: contact.suffix_id ?? null,
        contact_name: contact.contact_name,
        addresses: (contact.addresses || []).map((item) => ({
          address_id: item.address_id,
          address_type_id: item.address_type_id ?? null,
          house_no: item.house_no ?? null,
          street: item.street ?? null,
          barangay: item.barangay ?? null,
          city: item.city ?? null,
          province: item.province ?? null,
          region: item.region ?? null,
          postal_code: item.postal_code ?? null,
          is_primary: item.is_primary ?? false,
        })),
        phones: (contact.phones || []).map((item) => ({
          phone_id: item.phone_id,
          phone_type_id: item.phone_type_id ?? null,
          phone_number: item.phone_number,
          is_primary: item.is_primary ?? false,
        })),
        emails: (contact.emails || []).map((item) => ({
          email_id: item.email_id,
          email_type_id: item.email_type_id ?? null,
          email_address: item.email_address,
          is_primary: item.is_primary ?? false,
        })),
      })),
      deleted_contact_ids: form.deleted_contact_ids,
    };

    if (form.password.trim()) {
      payload.password = form.password;
    }

    try {
      if (editingAccountId) {
        await accountApi.updateAccount(editingAccountId, payload);
        setSuccess('User updated successfully');
      } else {
        await accountApi.createAccount(payload);
        setSuccess('User created successfully');
      }

      closeDialog();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (account: UserListItem) => {
    setDeleteTarget(account);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await accountApi.deleteAccount(deleteTarget.account_id);
      setDeleteTarget(null);
      setSuccess('User deleted successfully');

      if (items.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Manage Users</Typography>
            <Typography variant="body2" color="text.secondary">
              {currentPageLabel} · {total.toLocaleString()} total records
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => void loadData()}>Refresh</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Create User</Button>
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
              placeholder="Search by username or full name"
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
            <Button type="submit" variant="outlined">Search</Button>
            <Button variant="text" onClick={handleClearSearch} disabled={!search && !searchInput}>Clear</Button>
          </Stack>
        </Box>
      </Paper>

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sortDirection={sortBy === 'user_name' ? sortDir : false}>
                  <TableSortLabel
                    active={sortBy === 'user_name'}
                    direction={sortBy === 'user_name' ? sortDir : 'asc'}
                    onClick={() => handleSort('user_name')}
                  >
                    Username
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortBy === 'full_name' ? sortDir : false}>
                  <TableSortLabel
                    active={sortBy === 'full_name'}
                    direction={sortBy === 'full_name' ? sortDir : 'asc'}
                    onClick={() => handleSort('full_name')}
                  >
                    Full Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Primary Email</TableCell>
                <TableCell>Primary Phone</TableCell>
                <TableCell sortDirection={sortBy === 'is_active' ? sortDir : false}>
                  <TableSortLabel
                    active={sortBy === 'is_active'}
                    direction={sortBy === 'is_active' ? sortDir : 'asc'}
                    onClick={() => handleSort('is_active')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={sortBy === 'created_at' ? sortDir : false}>
                  <TableSortLabel
                    active={sortBy === 'created_at'}
                    direction={sortBy === 'created_at' ? sortDir : 'asc'}
                    onClick={() => handleSort('created_at')}
                  >
                    Created Date
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.account_id} hover>
                    <TableCell>{item.user_name}</TableCell>
                    <TableCell>{item.full_name || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {item.role_codes.map((roleCode) => (
                          <Chip key={roleCode} label={roleCode} size="small" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{item.primary_email || '-'}</TableCell>
                    <TableCell>{item.primary_phone || '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={item.is_active ? 'Active' : 'Inactive'} color={item.is_active ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => void openEdit(item.account_id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => openDeleteDialog(item)}>
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="lg">
        <DialogTitle>{editingAccountId ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent dividers>
          {dialogLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                <Tab label="Account Information" />
                <Tab label="Roles & Permissions" />
                <Tab label="Account Contact Information" />
                <Tab label="Related Contacts" />
              </Tabs>

              {tab === 0 && (
                <SectionCard title="Basic Account Information">
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Username"
                        value={form.user_name}
                        error={Boolean(formErrors.user_name)}
                        helperText={formErrors.user_name}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, user_name: e.target.value }));
                          setFormErrors((prev) => ({ ...prev, user_name: undefined }));
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Full Name"
                        value={form.full_name}
                        error={Boolean(formErrors.full_name)}
                        helperText={formErrors.full_name}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, full_name: e.target.value }));
                          setFormErrors((prev) => ({ ...prev, full_name: undefined }));
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={editingAccountId ? 'New Password (optional)' : 'Password'}
                        type="password"
                        value={form.password}
                        error={Boolean(formErrors.password)}
                        helperText={formErrors.password || (editingAccountId ? 'Leave blank to keep current password' : 'Minimum 6 characters')}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, password: e.target.value }));
                          setFormErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={<Checkbox checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />}
                        label="Active"
                      />
                    </Grid>
                  </Grid>
                </SectionCard>
              )}

              {tab === 1 && (
                <Stack spacing={2}>
                  <SectionCard title="Available Roles">
                    <Grid container spacing={1}>
                      {roles.map((role) => (
                        <Grid item xs={12} md={6} lg={4} key={role.role_id}>
                          <FormControlLabel
                            control={<Checkbox checked={form.role_codes.includes(role.role_code)} onChange={() => toggleRole(role.role_code)} />}
                            label={`${role.role_name} (${role.role_code})`}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </SectionCard>

                  <SectionCard title="Selected Roles">
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      {selectedRoleNames.length > 0
                        ? selectedRoleNames.map((name) => <Chip key={name} label={name} size="small" />)
                        : <Typography variant="body2" color="text.secondary">No roles selected</Typography>}
                    </Box>
                  </SectionCard>

                  <SectionCard title="Effective Permissions">
                    {permissions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Permissions are shown when editing an existing user.
                      </Typography>
                    ) : (
                      Array.from(groupedPermissions.entries()).map(([moduleName, modulePermissions]) => (
                        <Box key={moduleName} sx={{ mb: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{moduleName}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                            {modulePermissions.map((permission) => (
                              <Chip key={permission.value} label={permission.permission_code} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      ))
                    )}
                  </SectionCard>
                </Stack>
              )}

              {tab === 2 && (
                <Stack spacing={2}>
                  <SectionCard title="Addresses">
                    <Stack spacing={1.5}>
                      {form.addresses.map((address, index) => (
                        <Card key={`address-${index}`} variant="outlined">
                          <CardContent>
                            <Grid container spacing={1.5}>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Address Type"
                                  select
                                  value={address.address_type_id ?? ''}
                                  onChange={(e) => setForm((prev) => ({
                                    ...prev,
                                    addresses: updateAddress(prev.addresses, index, {
                                      address_type_id: e.target.value ? Number(e.target.value) : null,
                                    }),
                                  }))}
                                >
                                  <MenuItem value="">Select type</MenuItem>
                                  {addressTypes.map((option) => (
                                    <MenuItem key={option.look_up_id} value={option.look_up_id}>{option.name}</MenuItem>
                                  ))}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField fullWidth size="small" label="House No." value={address.house_no || ''} onChange={(e) => setForm((prev) => ({ ...prev, addresses: updateAddress(prev.addresses, index, { house_no: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField fullWidth size="small" label="Street" value={address.street || ''} onChange={(e) => setForm((prev) => ({ ...prev, addresses: updateAddress(prev.addresses, index, { street: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField fullWidth size="small" label="Barangay" value={address.barangay || ''} onChange={(e) => setForm((prev) => ({ ...prev, addresses: updateAddress(prev.addresses, index, { barangay: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField fullWidth size="small" label="City" value={address.city || ''} onChange={(e) => setForm((prev) => ({ ...prev, addresses: updateAddress(prev.addresses, index, { city: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField fullWidth size="small" label="Province" value={address.province || ''} onChange={(e) => setForm((prev) => ({ ...prev, addresses: updateAddress(prev.addresses, index, { province: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField fullWidth size="small" label="Region" value={address.region || ''} onChange={(e) => setForm((prev) => ({ ...prev, addresses: updateAddress(prev.addresses, index, { region: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField fullWidth size="small" label="Postal Code" value={address.postal_code || ''} onChange={(e) => setForm((prev) => ({ ...prev, addresses: updateAddress(prev.addresses, index, { postal_code: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                  Address Label: {address.address_label || buildAddressLabel(address) || '-'}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <FormControlLabel
                                  control={<Checkbox checked={!!address.is_primary} onChange={() => setForm((prev) => ({ ...prev, addresses: setPrimary(prev.addresses, index) }))} />}
                                  label="Primary"
                                />
                                <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, addresses: prev.addresses.filter((_, idx) => idx !== index) }))}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                    <Button sx={{ mt: 1.5 }} startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, addresses: [...prev.addresses, emptyAddress()] }))}>Add Address</Button>
                  </SectionCard>

                  <SectionCard title="Phones">
                    <Stack spacing={1.5}>
                      {form.phones.map((phone, index) => (
                        <Card key={`phone-${index}`} variant="outlined">
                          <CardContent>
                            <Grid container spacing={1.5} alignItems="center">
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Phone Type"
                                  select
                                  value={phone.phone_type_id ?? ''}
                                  onChange={(e) => setForm((prev) => ({
                                    ...prev,
                                    phones: updatePhone(prev.phones, index, {
                                      phone_type_id: e.target.value ? Number(e.target.value) : null,
                                    }),
                                  }))}
                                >
                                  <MenuItem value="">Select type</MenuItem>
                                  {phoneTypes.map((option) => (
                                    <MenuItem key={option.look_up_id} value={option.look_up_id}>{option.name}</MenuItem>
                                  ))}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} md={5}>
                                <TextField fullWidth size="small" label="Phone Number" value={phone.phone_number} onChange={(e) => setForm((prev) => ({ ...prev, phones: updatePhone(prev.phones, index, { phone_number: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <FormControlLabel control={<Checkbox checked={!!phone.is_primary} onChange={() => setForm((prev) => ({ ...prev, phones: setPrimary(prev.phones, index) }))} />} label="Primary" />
                                <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, idx) => idx !== index) }))}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                    <Button sx={{ mt: 1.5 }} startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, emptyPhone()] }))}>Add Phone</Button>
                  </SectionCard>

                  <SectionCard title="Emails">
                    <Stack spacing={1.5}>
                      {form.emails.map((email, index) => (
                        <Card key={`email-${index}`} variant="outlined">
                          <CardContent>
                            <Grid container spacing={1.5} alignItems="center">
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Email Type"
                                  select
                                  value={email.email_type_id ?? ''}
                                  onChange={(e) => setForm((prev) => ({
                                    ...prev,
                                    emails: updateEmail(prev.emails, index, {
                                      email_type_id: e.target.value ? Number(e.target.value) : null,
                                    }),
                                  }))}
                                >
                                  <MenuItem value="">Select type</MenuItem>
                                  {emailTypes.map((option) => (
                                    <MenuItem key={option.look_up_id} value={option.look_up_id}>{option.name}</MenuItem>
                                  ))}
                                </TextField>
                              </Grid>
                              <Grid item xs={12} md={5}>
                                <TextField fullWidth size="small" label="Email Address" value={email.email_address} onChange={(e) => setForm((prev) => ({ ...prev, emails: updateEmail(prev.emails, index, { email_address: e.target.value }) }))} />
                              </Grid>
                              <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <FormControlLabel control={<Checkbox checked={!!email.is_primary} onChange={() => setForm((prev) => ({ ...prev, emails: setPrimary(prev.emails, index) }))} />} label="Primary" />
                                <IconButton color="error" onClick={() => setForm((prev) => ({ ...prev, emails: prev.emails.filter((_, idx) => idx !== index) }))}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                    <Button sx={{ mt: 1.5 }} startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, emails: [...prev.emails, emptyEmail()] }))}>Add Email</Button>
                  </SectionCard>
                </Stack>
              )}

              {tab === 3 && (
                <Stack spacing={2}>
                  {form.contacts.map((contact, contactIndex) => (
                    <SectionCard key={`contact-${contactIndex}`} title={`Contact ${contactIndex + 1}`}>
                      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                        <Grid item xs={12} md={6}>
                          <TextField fullWidth size="small" label="Contact Name" value={contact.contact_name} onChange={(e) => {
                            const next = [...form.contacts];
                            next[contactIndex] = { ...next[contactIndex], contact_name: e.target.value };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField fullWidth size="small" label="First Name" value={contact.first_name || ''} onChange={(e) => {
                            const next = [...form.contacts];
                            next[contactIndex] = { ...next[contactIndex], first_name: e.target.value };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField fullWidth size="small" label="Middle Name" value={contact.middle_name || ''} onChange={(e) => {
                            const next = [...form.contacts];
                            next[contactIndex] = { ...next[contactIndex], middle_name: e.target.value };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField fullWidth size="small" label="Last Name" value={contact.last_name || ''} onChange={(e) => {
                            const next = [...form.contacts];
                            next[contactIndex] = { ...next[contactIndex], last_name: e.target.value };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }} />
                        </Grid>
                      </Grid>

                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Contact Addresses</Typography>
                      <Stack spacing={1} sx={{ mb: 1.5 }}>
                        {(contact.addresses || []).map((address, addressIndex) => (
                          <Card key={`contact-${contactIndex}-address-${addressIndex}`} variant="outlined">
                            <CardContent>
                              <Grid container spacing={1.5}>
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Address Type"
                                    select
                                    value={address.address_type_id ?? ''}
                                    onChange={(e) => {
                                      const next = [...form.contacts];
                                      const addresses = [...next[contactIndex].addresses];
                                      addresses[addressIndex] = {
                                        ...addresses[addressIndex],
                                        address_type_id: e.target.value ? Number(e.target.value) : null,
                                      };
                                      next[contactIndex] = { ...next[contactIndex], addresses };
                                      setForm((prev) => ({ ...prev, contacts: next }));
                                    }}
                                  >
                                    <MenuItem value="">Select type</MenuItem>
                                    {addressTypes.map((option) => (
                                      <MenuItem key={option.look_up_id} value={option.look_up_id}>{option.name}</MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                                <Grid item xs={12} md={4}><TextField fullWidth size="small" label="House No." value={address.house_no || ''} onChange={(e) => {
                                  const next = [...form.contacts];
                                  const addresses = [...next[contactIndex].addresses];
                                  addresses[addressIndex] = { ...addresses[addressIndex], house_no: e.target.value };
                                  next[contactIndex] = { ...next[contactIndex], addresses };
                                  setForm((prev) => ({ ...prev, contacts: next }));
                                }} /></Grid>
                                <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Street" value={address.street || ''} onChange={(e) => {
                                  const next = [...form.contacts];
                                  const addresses = [...next[contactIndex].addresses];
                                  addresses[addressIndex] = { ...addresses[addressIndex], street: e.target.value };
                                  next[contactIndex] = { ...next[contactIndex], addresses };
                                  setForm((prev) => ({ ...prev, contacts: next }));
                                }} /></Grid>
                                  <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Barangay" value={address.barangay || ''} onChange={(e) => {
                                    const next = [...form.contacts];
                                    const addresses = [...next[contactIndex].addresses];
                                    addresses[addressIndex] = { ...addresses[addressIndex], barangay: e.target.value };
                                    next[contactIndex] = { ...next[contactIndex], addresses };
                                    setForm((prev) => ({ ...prev, contacts: next }));
                                  }} /></Grid>
                                  <Grid item xs={12} md={4}><TextField fullWidth size="small" label="City" value={address.city || ''} onChange={(e) => {
                                    const next = [...form.contacts];
                                    const addresses = [...next[contactIndex].addresses];
                                    addresses[addressIndex] = { ...addresses[addressIndex], city: e.target.value };
                                    next[contactIndex] = { ...next[contactIndex], addresses };
                                    setForm((prev) => ({ ...prev, contacts: next }));
                                  }} /></Grid>
                                  <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Province" value={address.province || ''} onChange={(e) => {
                                    const next = [...form.contacts];
                                    const addresses = [...next[contactIndex].addresses];
                                    addresses[addressIndex] = { ...addresses[addressIndex], province: e.target.value };
                                    next[contactIndex] = { ...next[contactIndex], addresses };
                                    setForm((prev) => ({ ...prev, contacts: next }));
                                  }} /></Grid>
                                  <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Region" value={address.region || ''} onChange={(e) => {
                                    const next = [...form.contacts];
                                    const addresses = [...next[contactIndex].addresses];
                                    addresses[addressIndex] = { ...addresses[addressIndex], region: e.target.value };
                                    next[contactIndex] = { ...next[contactIndex], addresses };
                                    setForm((prev) => ({ ...prev, contacts: next }));
                                  }} /></Grid>
                                  <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Postal Code" value={address.postal_code || ''} onChange={(e) => {
                                    const next = [...form.contacts];
                                    const addresses = [...next[contactIndex].addresses];
                                    addresses[addressIndex] = { ...addresses[addressIndex], postal_code: e.target.value };
                                    next[contactIndex] = { ...next[contactIndex], addresses };
                                    setForm((prev) => ({ ...prev, contacts: next }));
                                  }} /></Grid>
                                <Grid item xs={12}><Typography variant="caption" color="text.secondary">Address Label: {address.address_label || buildAddressLabel(address) || '-'}</Typography></Grid>
                                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
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
                                  }}><DeleteIcon fontSize="small" /></IconButton>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                      <Button size="small" startIcon={<AddIcon />} onClick={() => {
                        const next = [...form.contacts];
                        next[contactIndex] = { ...next[contactIndex], addresses: [...next[contactIndex].addresses, emptyAddress()] };
                        setForm((prev) => ({ ...prev, contacts: next }));
                      }}>Add Contact Address</Button>

                      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Contact Emails</Typography>
                      {(contact.emails || []).map((email, emailIndex) => (
                        <Grid key={`contact-${contactIndex}-email-${emailIndex}`} container spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Email Type"
                              select
                              value={email.email_type_id ?? ''}
                              onChange={(e) => {
                                const next = [...form.contacts];
                                const emails = [...next[contactIndex].emails];
                                emails[emailIndex] = {
                                  ...emails[emailIndex],
                                  email_type_id: e.target.value ? Number(e.target.value) : null,
                                };
                                next[contactIndex] = { ...next[contactIndex], emails };
                                setForm((prev) => ({ ...prev, contacts: next }));
                              }}
                            >
                              <MenuItem value="">Select type</MenuItem>
                              {emailTypes.map((option) => (
                                <MenuItem key={option.look_up_id} value={option.look_up_id}>{option.name}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <TextField fullWidth size="small" label="Email" value={email.email_address} onChange={(e) => {
                              const next = [...form.contacts];
                              const emails = [...next[contactIndex].emails];
                              emails[emailIndex] = { ...emails[emailIndex], email_address: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], emails };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }} />
                          </Grid>
                          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <FormControlLabel control={<Checkbox checked={!!email.is_primary} onChange={() => {
                              const next = [...form.contacts];
                              next[contactIndex] = {
                                ...next[contactIndex],
                                emails: setPrimary(next[contactIndex].emails, emailIndex),
                              };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }} />} label="Primary" />
                            <IconButton color="error" onClick={() => {
                              const next = [...form.contacts];
                              next[contactIndex] = {
                                ...next[contactIndex],
                                emails: next[contactIndex].emails.filter((_, idx) => idx !== emailIndex),
                              };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}><DeleteIcon fontSize="small" /></IconButton>
                          </Grid>
                        </Grid>
                      ))}
                      <Button size="small" startIcon={<AddIcon />} onClick={() => {
                        const next = [...form.contacts];
                        next[contactIndex] = { ...next[contactIndex], emails: [...next[contactIndex].emails, emptyEmail()] };
                        setForm((prev) => ({ ...prev, contacts: next }));
                      }}>Add Contact Email</Button>

                      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Contact Phones</Typography>
                      {(contact.phones || []).map((phone, phoneIndex) => (
                        <Grid key={`contact-${contactIndex}-phone-${phoneIndex}`} container spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Phone Type"
                              select
                              value={phone.phone_type_id ?? ''}
                              onChange={(e) => {
                                const next = [...form.contacts];
                                const phones = [...next[contactIndex].phones];
                                phones[phoneIndex] = {
                                  ...phones[phoneIndex],
                                  phone_type_id: e.target.value ? Number(e.target.value) : null,
                                };
                                next[contactIndex] = { ...next[contactIndex], phones };
                                setForm((prev) => ({ ...prev, contacts: next }));
                              }}
                            >
                              <MenuItem value="">Select type</MenuItem>
                              {phoneTypes.map((option) => (
                                <MenuItem key={option.look_up_id} value={option.look_up_id}>{option.name}</MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <TextField fullWidth size="small" label="Phone" value={phone.phone_number} onChange={(e) => {
                              const next = [...form.contacts];
                              const phones = [...next[contactIndex].phones];
                              phones[phoneIndex] = { ...phones[phoneIndex], phone_number: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], phones };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }} />
                          </Grid>
                          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <FormControlLabel control={<Checkbox checked={!!phone.is_primary} onChange={() => {
                              const next = [...form.contacts];
                              next[contactIndex] = {
                                ...next[contactIndex],
                                phones: setPrimary(next[contactIndex].phones, phoneIndex),
                              };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }} />} label="Primary" />
                            <IconButton color="error" onClick={() => {
                              const next = [...form.contacts];
                              next[contactIndex] = {
                                ...next[contactIndex],
                                phones: next[contactIndex].phones.filter((_, idx) => idx !== phoneIndex),
                              };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}><DeleteIcon fontSize="small" /></IconButton>
                          </Grid>
                        </Grid>
                      ))}
                      <Button size="small" startIcon={<AddIcon />} onClick={() => {
                        const next = [...form.contacts];
                        next[contactIndex] = { ...next[contactIndex], phones: [...next[contactIndex].phones, emptyPhone()] };
                        setForm((prev) => ({ ...prev, contacts: next }));
                      }}>Add Contact Phone</Button>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => {
                            const contactId = form.contacts[contactIndex].contact_id;
                            const nextContacts = form.contacts.filter((_, idx) => idx !== contactIndex);
                            setForm((prev) => ({
                              ...prev,
                              contacts: nextContacts,
                              deleted_contact_ids: contactId
                                ? [...prev.deleted_contact_ids, contactId]
                                : prev.deleted_contact_ids,
                            }));
                          }}
                        >
                          Remove Contact
                        </Button>
                      </Box>
                    </SectionCard>
                  ))}

                  <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, contacts: [...prev.contacts, emptyContact()] }))}>
                    Add Contact
                  </Button>
                </Stack>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void submit()} disabled={saving || dialogLoading}>
            {saving ? <CircularProgress size={20} /> : editingAccountId ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget?.full_name || deleteTarget?.user_name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(success)} autoHideDuration={2500} onClose={() => setSuccess('')}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
