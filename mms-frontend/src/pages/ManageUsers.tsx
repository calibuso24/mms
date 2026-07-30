import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
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
  primary_email?: string | null;
  primary_phone?: string | null;
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
const emptyPhone = (): PhoneInput => ({ phone_number: '', phone_type_id: null, is_primary: false });
const emptyEmail = (): EmailInput => ({ email_address: '', email_type_id: null, is_primary: false });
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

export default function ManageUsersPage() {
  const [items, setItems] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(initialFormState);
  const [addressTypes, setAddressTypes] = useState<LookupItem[]>([]);
  const [phoneTypes, setPhoneTypes] = useState<LookupItem[]>([]);
  const [emailTypes, setEmailTypes] = useState<LookupItem[]>([]);

  const selectedRoleNames = useMemo(() => {
    const roleMap = new Map(roles.map((role) => [role.role_code, role.role_name]));
    return form.role_codes.map((roleCode) => roleMap.get(roleCode) || roleCode);
  }, [form.role_codes, roles]);

  useEffect(() => {
    loadData();
    loadRoles();
    loadLookupOptions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await accountApi.listAccounts(100, 0, search || undefined);
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

  const openCreate = () => {
    setEditingAccountId(null);
    setPermissions([]);
    setForm(initialFormState());
    setTab(0);
    setDialogOpen(true);
  };

  const openEdit = async (accountId: number) => {
    setLoading(true);
    setError('');

    try {
      const detail = await accountApi.getAccount(accountId);
      const userPermissions = await accountApi.getPermissions(accountId);

      setEditingAccountId(accountId);
      setPermissions(userPermissions || []);
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
      setDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setTab(0);
  };

  const toggleRole = (roleCode: string) => {
    setForm((prev) => ({
      ...prev,
      role_codes: prev.role_codes.includes(roleCode)
        ? prev.role_codes.filter((code) => code !== roleCode)
        : [...prev.role_codes, roleCode],
    }));
  };

  const setPrimary = <T extends { is_primary?: boolean }>(items: T[], index: number): T[] => {
    return items.map((item, idx) => ({ ...item, is_primary: idx === index }));
  };

  const toListItem = (detail: UserDetailShape): UserListItem => ({
    account_id: detail.account_id,
    user_name: detail.user_name,
    full_name: detail.full_name,
    role_codes: (detail.roles || []).map((role) => role.role_code),
    primary_email: detail.primary_email ?? null,
    primary_phone: detail.primary_phone ?? null,
    is_active: detail.is_active,
    created_at: detail.created_at || new Date().toISOString(),
  });

  const buildAddressLabel = (address: AddressInput): string => {
    const line1 = [address.house_no, address.street].filter(Boolean).join(' ').trim();
    const line2 = [address.barangay, address.city, address.province].filter(Boolean).join(', ').trim();
    const line3 = [address.region, address.postal_code].filter(Boolean).join(' ').trim();

    return [line1, line2, line3].filter(Boolean).join(', ');
  };

  const submit = async () => {
    setError('');

    if (!form.user_name.trim()) {
      setError('Username is required');
      return;
    }
    if (!form.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    if (!editingAccountId && form.password.length < 6) {
      setError('Password must be at least 6 characters for new users');
      return;
    }

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
      } else {
        await accountApi.createAccount(payload);
      }

      closeDialog();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    }
  };

  const removeUser = async (accountId: number) => {
    if (!confirm('Soft delete this user and related records?')) {
      return;
    }

    setError('');
    try {
      await accountApi.deleteAccount(accountId);
      setItems((prev) => prev.filter((item) => item.account_id !== accountId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const filteredPermissions = useMemo(() => {
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

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Search users"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" onClick={loadData}>
            Search
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Create User
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Total: {total}
          </Typography>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Primary Email</TableCell>
              <TableCell>Primary Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.account_id}>
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
                  <Chip
                    size="small"
                    label={item.is_active ? 'Active' : 'Inactive'}
                    color={item.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(item.account_id)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => removeUser(item.account_id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="lg">
        <DialogTitle>{editingAccountId ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent dividers>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab label="Account Information" />
            <Tab label="Roles & Permissions" />
            <Tab label="Account Contact Information" />
            <Tab label="Related Contacts" />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField
                label="Username"
                value={form.user_name}
                onChange={(e) => setForm((prev) => ({ ...prev, user_name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Full Name"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                fullWidth
              />
              <TextField
                label={editingAccountId ? 'New Password (optional)' : 'Password'}
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Box>
          )}

          {tab === 1 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Available Roles
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5 }}>
                {roles.map((role) => (
                  <FormControlLabel
                    key={role.role_id}
                    control={
                      <Checkbox
                        checked={form.role_codes.includes(role.role_code)}
                        onChange={() => toggleRole(role.role_code)}
                      />
                    }
                    label={`${role.role_name} (${role.role_code})`}
                  />
                ))}
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Selected Roles
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {selectedRoleNames.length > 0
                  ? selectedRoleNames.map((name) => <Chip key={name} label={name} size="small" />)
                  : <Typography variant="body2" color="text.secondary">No roles selected</Typography>}
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Effective Permissions
              </Typography>
              {permissions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Permissions are shown when editing an existing user.
                </Typography>
              ) : (
                Array.from(filteredPermissions.entries()).map(([moduleName, modulePermissions]) => (
                  <Box key={moduleName} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{moduleName}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                      {modulePermissions.map((permission) => (
                        <Chip
                          key={permission.value}
                          label={permission.permission_code}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography variant="subtitle2">Addresses</Typography>
              {form.addresses.map((address, index) => (
                <Paper key={`address-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'grid', gap: 1 }}>
                    <TextField
                      label="Address Type"
                      select
                      value={address.address_type_id ?? ''}
                      onChange={(e) => {
                        const next = [...form.addresses];
                        next[index] = {
                          ...next[index],
                          address_type_id: e.target.value ? Number(e.target.value) : null,
                        };
                        setForm((prev) => ({ ...prev, addresses: next }));
                      }}
                      size="small"
                    >
                      <MenuItem value="">Select type</MenuItem>
                      {addressTypes.map((option) => (
                        <MenuItem key={option.look_up_id} value={option.look_up_id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                      <TextField
                        label="House No."
                        value={address.house_no || ''}
                        onChange={(e) => {
                          const next = [...form.addresses];
                          next[index] = { ...next[index], house_no: e.target.value };
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="Street"
                        value={address.street || ''}
                        onChange={(e) => {
                          const next = [...form.addresses];
                          next[index] = { ...next[index], street: e.target.value };
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="Barangay"
                        value={address.barangay || ''}
                        onChange={(e) => {
                          const next = [...form.addresses];
                          next[index] = { ...next[index], barangay: e.target.value };
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="City"
                        value={address.city || ''}
                        onChange={(e) => {
                          const next = [...form.addresses];
                          next[index] = { ...next[index], city: e.target.value };
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="Province"
                        value={address.province || ''}
                        onChange={(e) => {
                          const next = [...form.addresses];
                          next[index] = { ...next[index], province: e.target.value };
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="Region"
                        value={address.region || ''}
                        onChange={(e) => {
                          const next = [...form.addresses];
                          next[index] = { ...next[index], region: e.target.value };
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="Postal Code"
                        value={address.postal_code || ''}
                        onChange={(e) => {
                          const next = [...form.addresses];
                          next[index] = { ...next[index], postal_code: e.target.value };
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Address Label: {address.address_label || buildAddressLabel(address) || '-'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!address.is_primary}
                            onChange={() => {
                              setForm((prev) => ({ ...prev, addresses: setPrimary(prev.addresses, index) }));
                            }}
                          />
                        }
                        label="Primary"
                      />
                      <IconButton
                        color="error"
                        onClick={() => {
                          const next = form.addresses.filter((_, idx) => idx !== index);
                          setForm((prev) => ({ ...prev, addresses: next }));
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, addresses: [...prev.addresses, emptyAddress()] }))}>
                Add Address
              </Button>

              <Typography variant="subtitle2">Phones</Typography>
              {form.phones.map((phone, index) => (
                <Paper key={`phone-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    <TextField
                      label="Phone Type"
                      select
                      value={phone.phone_type_id ?? ''}
                      onChange={(e) => {
                        const next = [...form.phones];
                        next[index] = {
                          ...next[index],
                          phone_type_id: e.target.value ? Number(e.target.value) : null,
                        };
                        setForm((prev) => ({ ...prev, phones: next }));
                      }}
                      size="small"
                    >
                      <MenuItem value="">Select type</MenuItem>
                      {phoneTypes.map((option) => (
                        <MenuItem key={option.look_up_id} value={option.look_up_id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Phone Number"
                      value={phone.phone_number}
                      onChange={(e) => {
                        const next = [...form.phones];
                        next[index] = { ...next[index], phone_number: e.target.value };
                        setForm((prev) => ({ ...prev, phones: next }));
                      }}
                      size="small"
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!phone.is_primary}
                            onChange={() => setForm((prev) => ({ ...prev, phones: setPrimary(prev.phones, index) }))}
                          />
                        }
                        label="Primary"
                      />
                      <IconButton
                        color="error"
                        onClick={() => {
                          const next = form.phones.filter((_, idx) => idx !== index);
                          setForm((prev) => ({ ...prev, phones: next }));
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, emptyPhone()] }))}>
                Add Phone
              </Button>

              <Typography variant="subtitle2">Emails</Typography>
              {form.emails.map((email, index) => (
                <Paper key={`email-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    <TextField
                      label="Email Type"
                      select
                      value={email.email_type_id ?? ''}
                      onChange={(e) => {
                        const next = [...form.emails];
                        next[index] = {
                          ...next[index],
                          email_type_id: e.target.value ? Number(e.target.value) : null,
                        };
                        setForm((prev) => ({ ...prev, emails: next }));
                      }}
                      size="small"
                    >
                      <MenuItem value="">Select type</MenuItem>
                      {emailTypes.map((option) => (
                        <MenuItem key={option.look_up_id} value={option.look_up_id}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Email Address"
                      value={email.email_address}
                      onChange={(e) => {
                        const next = [...form.emails];
                        next[index] = { ...next[index], email_address: e.target.value };
                        setForm((prev) => ({ ...prev, emails: next }));
                      }}
                      size="small"
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!email.is_primary}
                            onChange={() => setForm((prev) => ({ ...prev, emails: setPrimary(prev.emails, index) }))}
                          />
                        }
                        label="Primary"
                      />
                      <IconButton
                        color="error"
                        onClick={() => {
                          const next = form.emails.filter((_, idx) => idx !== index);
                          setForm((prev) => ({ ...prev, emails: next }));
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
              <Button startIcon={<AddIcon />} onClick={() => setForm((prev) => ({ ...prev, emails: [...prev.emails, emptyEmail()] }))}>
                Add Email
              </Button>
            </Box>
          )}

          {tab === 3 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {form.contacts.map((contact, contactIndex) => (
                <Paper key={`contact-${contactIndex}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                      <TextField
                        label="Contact Name"
                        value={contact.contact_name}
                        onChange={(e) => {
                          const next = [...form.contacts];
                          next[contactIndex] = { ...next[contactIndex], contact_name: e.target.value };
                          setForm((prev) => ({ ...prev, contacts: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="First Name"
                        value={contact.first_name || ''}
                        onChange={(e) => {
                          const next = [...form.contacts];
                          next[contactIndex] = { ...next[contactIndex], first_name: e.target.value };
                          setForm((prev) => ({ ...prev, contacts: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="Middle Name"
                        value={contact.middle_name || ''}
                        onChange={(e) => {
                          const next = [...form.contacts];
                          next[contactIndex] = { ...next[contactIndex], middle_name: e.target.value };
                          setForm((prev) => ({ ...prev, contacts: next }));
                        }}
                        size="small"
                      />
                      <TextField
                        label="Last Name"
                        value={contact.last_name || ''}
                        onChange={(e) => {
                          const next = [...form.contacts];
                          next[contactIndex] = { ...next[contactIndex], last_name: e.target.value };
                          setForm((prev) => ({ ...prev, contacts: next }));
                        }}
                        size="small"
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary">Contact Addresses</Typography>
                    {(contact.addresses || []).map((address, addressIndex) => (
                      <Box key={`contact-${contactIndex}-address-${addressIndex}`} sx={{ display: 'grid', gap: 1 }}>
                        <TextField
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
                            <MenuItem key={option.look_up_id} value={option.look_up_id}>
                              {option.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                          <TextField
                            size="small"
                            label="House No."
                            value={address.house_no || ''}
                            onChange={(e) => {
                              const next = [...form.contacts];
                              const addresses = [...next[contactIndex].addresses];
                              addresses[addressIndex] = { ...addresses[addressIndex], house_no: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], addresses };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}
                          />
                          <TextField
                            size="small"
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
                          <TextField
                            size="small"
                            label="Barangay"
                            value={address.barangay || ''}
                            onChange={(e) => {
                              const next = [...form.contacts];
                              const addresses = [...next[contactIndex].addresses];
                              addresses[addressIndex] = { ...addresses[addressIndex], barangay: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], addresses };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}
                          />
                          <TextField
                            size="small"
                            label="City"
                            value={address.city || ''}
                            onChange={(e) => {
                              const next = [...form.contacts];
                              const addresses = [...next[contactIndex].addresses];
                              addresses[addressIndex] = { ...addresses[addressIndex], city: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], addresses };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}
                          />
                          <TextField
                            size="small"
                            label="Province"
                            value={address.province || ''}
                            onChange={(e) => {
                              const next = [...form.contacts];
                              const addresses = [...next[contactIndex].addresses];
                              addresses[addressIndex] = { ...addresses[addressIndex], province: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], addresses };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}
                          />
                          <TextField
                            size="small"
                            label="Region"
                            value={address.region || ''}
                            onChange={(e) => {
                              const next = [...form.contacts];
                              const addresses = [...next[contactIndex].addresses];
                              addresses[addressIndex] = { ...addresses[addressIndex], region: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], addresses };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}
                          />
                          <TextField
                            size="small"
                            label="Postal Code"
                            value={address.postal_code || ''}
                            onChange={(e) => {
                              const next = [...form.contacts];
                              const addresses = [...next[contactIndex].addresses];
                              addresses[addressIndex] = { ...addresses[addressIndex], postal_code: e.target.value };
                              next[contactIndex] = { ...next[contactIndex], addresses };
                              setForm((prev) => ({ ...prev, contacts: next }));
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Address Label: {address.address_label || buildAddressLabel(address) || '-'}
                        </Typography>
                        <FormControlLabel
                          control={
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
                          }
                          label="Primary"
                        />
                        <IconButton
                          color="error"
                          onClick={() => {
                            const next = [...form.contacts];
                            next[contactIndex] = {
                              ...next[contactIndex],
                              addresses: next[contactIndex].addresses.filter((_, idx) => idx !== addressIndex),
                            };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const next = [...form.contacts];
                        next[contactIndex] = {
                          ...next[contactIndex],
                          addresses: [...next[contactIndex].addresses, emptyAddress()],
                        };
                        setForm((prev) => ({ ...prev, contacts: next }));
                      }}
                    >
                      Add Contact Address
                    </Button>

                    <Typography variant="caption" color="text.secondary">Contact Emails</Typography>
                    {(contact.emails || []).map((email, emailIndex) => (
                      <Box key={`contact-${contactIndex}-email-${emailIndex}`} sx={{ display: 'flex', gap: 1 }}>
                        <TextField
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
                            <MenuItem key={option.look_up_id} value={option.look_up_id}>
                              {option.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="Email"
                          value={email.email_address}
                          onChange={(e) => {
                            const next = [...form.contacts];
                            const emails = [...next[contactIndex].emails];
                            emails[emailIndex] = { ...emails[emailIndex], email_address: e.target.value };
                            next[contactIndex] = { ...next[contactIndex], emails };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }}
                          sx={{ flex: 1 }}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!!email.is_primary}
                              onChange={() => {
                                const next = [...form.contacts];
                                next[contactIndex] = {
                                  ...next[contactIndex],
                                  emails: setPrimary(next[contactIndex].emails, emailIndex),
                                };
                                setForm((prev) => ({ ...prev, contacts: next }));
                              }}
                            />
                          }
                          label="Primary"
                        />
                        <IconButton
                          color="error"
                          onClick={() => {
                            const next = [...form.contacts];
                            next[contactIndex] = {
                              ...next[contactIndex],
                              emails: next[contactIndex].emails.filter((_, idx) => idx !== emailIndex),
                            };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const next = [...form.contacts];
                        next[contactIndex] = {
                          ...next[contactIndex],
                          emails: [...next[contactIndex].emails, emptyEmail()],
                        };
                        setForm((prev) => ({ ...prev, contacts: next }));
                      }}
                    >
                      Add Contact Email
                    </Button>

                    <Typography variant="caption" color="text.secondary">Contact Phones</Typography>
                    {(contact.phones || []).map((phone, phoneIndex) => (
                      <Box key={`contact-${contactIndex}-phone-${phoneIndex}`} sx={{ display: 'flex', gap: 1 }}>
                        <TextField
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
                            <MenuItem key={option.look_up_id} value={option.look_up_id}>
                              {option.name}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="Phone"
                          value={phone.phone_number}
                          onChange={(e) => {
                            const next = [...form.contacts];
                            const phones = [...next[contactIndex].phones];
                            phones[phoneIndex] = { ...phones[phoneIndex], phone_number: e.target.value };
                            next[contactIndex] = { ...next[contactIndex], phones };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }}
                          sx={{ flex: 1 }}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!!phone.is_primary}
                              onChange={() => {
                                const next = [...form.contacts];
                                next[contactIndex] = {
                                  ...next[contactIndex],
                                  phones: setPrimary(next[contactIndex].phones, phoneIndex),
                                };
                                setForm((prev) => ({ ...prev, contacts: next }));
                              }}
                            />
                          }
                          label="Primary"
                        />
                        <IconButton
                          color="error"
                          onClick={() => {
                            const next = [...form.contacts];
                            next[contactIndex] = {
                              ...next[contactIndex],
                              phones: next[contactIndex].phones.filter((_, idx) => idx !== phoneIndex),
                            };
                            setForm((prev) => ({ ...prev, contacts: next }));
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const next = [...form.contacts];
                        next[contactIndex] = {
                          ...next[contactIndex],
                          phones: [...next[contactIndex].phones, emptyPhone()],
                        };
                        setForm((prev) => ({ ...prev, contacts: next }));
                      }}
                    >
                      Add Contact Phone
                    </Button>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                  </Box>
                </Paper>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={() => setForm((prev) => ({ ...prev, contacts: [...prev.contacts, emptyContact()] }))}
              >
                Add Contact
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={submit}>
            {editingAccountId ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
