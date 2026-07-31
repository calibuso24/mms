import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useBeforeUnload, UNSAFE_NavigationContext } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import { accountApi, authApi, lookupApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import {
  AccountAddress,
  AccountEmail,
  AccountPhone,
  CurrentAccount,
  UpdateCurrentAccountProfileRequest,
} from '../shared/types/account.js';
import { getAccountAvatarSrc, getAccountDisplayName, getAccountInitials } from '../shared/utils/account.js';

type LookupItem = {
  look_up_id: number;
  look_up_type: string;
  code: string;
  name: string;
  description?: string;
};

type ProfileSection = 'personal' | 'contact' | 'photo' | 'password' | 'preferences' | 'security';

interface ProfileFormState {
  display_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  avatar_data_url: string | null;
  preferences: {
    theme: string;
    language: string;
    date_format: string;
    time_format: string;
    time_zone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      in_app: boolean;
    };
  };
  addresses: AddressDraft[];
  phones: PhoneDraft[];
  emails: EmailDraft[];
}

interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
  show_current: boolean;
  show_new: boolean;
  show_confirm: boolean;
}

interface AddressDraft {
  address_id?: number;
  address_type_id: number | '';
  house_no: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  region: string;
  postal_code: string;
  is_primary: boolean;
}

interface PhoneDraft {
  phone_id?: number;
  phone_type_id: number | '';
  phone_number: string;
  is_primary: boolean;
}

interface EmailDraft {
  email_id?: number;
  email_type_id: number | '';
  email_address: string;
  is_primary: boolean;
}

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function createEmptyAddress(): AddressDraft {
  return {
    address_type_id: '',
    house_no: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    postal_code: '',
    is_primary: false,
  };
}

function createEmptyPhone(): PhoneDraft {
  return {
    phone_type_id: '',
    phone_number: '',
    is_primary: false,
  };
}

function createEmptyEmail(): EmailDraft {
  return {
    email_type_id: '',
    email_address: '',
    is_primary: false,
  };
}

function createEmptyPasswordForm(): PasswordFormState {
  return {
    current_password: '',
    new_password: '',
    confirm_password: '',
    show_current: false,
    show_new: false,
    show_confirm: false,
  };
}

function createEmptyForm(account: CurrentAccount | null): ProfileFormState {
  const displayName = getAccountDisplayName(account);

  return {
    display_name: account?.full_name?.trim() || displayName,
    first_name: account?.contact?.first_name ?? '',
    middle_name: account?.contact?.middle_name ?? '',
    last_name: account?.contact?.last_name ?? '',
    avatar_data_url: getAccountAvatarSrc(account),
    preferences: {
      theme: account?.profile?.preferences?.theme ?? 'light',
      language: account?.profile?.preferences?.language ?? 'en',
      date_format: account?.profile?.preferences?.date_format ?? 'YYYY-MM-DD',
      time_format: account?.profile?.preferences?.time_format ?? 'HH:mm',
      time_zone: account?.profile?.preferences?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      notifications: {
        email: account?.profile?.preferences?.notifications.email ?? true,
        sms: account?.profile?.preferences?.notifications.sms ?? false,
        in_app: account?.profile?.preferences?.notifications.in_app ?? true,
      },
    },
    addresses: (account?.addresses || []).map((address) => ({
      address_id: address.address_id,
      address_type_id: address.address_type_id ?? '',
      house_no: address.house_no ?? '',
      street: address.street ?? '',
      barangay: address.barangay ?? '',
      city: address.city ?? '',
      province: address.province ?? '',
      region: address.region ?? '',
      postal_code: address.postal_code ?? '',
      is_primary: address.is_primary,
    })),
    phones: (account?.phones || []).map((phone) => ({
      phone_id: phone.phone_id,
      phone_type_id: phone.phone_type_id ?? '',
      phone_number: phone.phone_number,
      is_primary: phone.is_primary,
    })),
    emails: (account?.emails || []).map((email) => ({
      email_id: email.email_id,
      email_type_id: email.email_type_id ?? '',
      email_address: email.email_address,
      is_primary: email.is_primary,
    })),
  };
}

function strengthScore(password: string): number {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function useNavigationPrompt(when: boolean, message: string) {
  const navigationContext = useContext(UNSAFE_NavigationContext as any);

  useEffect(() => {
    if (!when || !navigationContext?.navigator?.block) {
      return;
    }

    const unblock = navigationContext.navigator.block((tx: any) => {
      if (window.confirm(message)) {
        unblock();
        tx.retry();
      }
    });

    return unblock;
  }, [message, navigationContext, when]);
}

function loadLookupOptions(types: string[]): Promise<LookupItem[]> {
  const tryTypes = async (): Promise<LookupItem[]> => {
    for (const type of types) {
      try {
        const result = await lookupApi.listByType(type, 100);
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch {
        // Try the next alias.
      }
    }

    return [];
  };

  return tryTypes();
}

export default function ProfilePage() {
  const { account, isLoading: authLoading, refreshAccount, setPassword: changePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState<ProfileFormState>(() => createEmptyForm(account));
  const [initialSnapshot, setInitialSnapshot] = useState<string>(JSON.stringify(createEmptyForm(account)));
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(createEmptyPasswordForm());
  const [expanded, setExpanded] = useState<Record<ProfileSection, boolean>>({
    personal: true,
    contact: true,
    photo: true,
    password: false,
    preferences: true,
    security: true,
  });
  const [addressTypes, setAddressTypes] = useState<LookupItem[]>([]);
  const [phoneTypes, setPhoneTypes] = useState<LookupItem[]>([]);
  const [emailTypes, setEmailTypes] = useState<LookupItem[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(getAccountAvatarSrc(account));
  const [avatarProgress, setAvatarProgress] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const sectionRefs = useRef<Record<ProfileSection, HTMLDivElement | null>>({
    personal: null,
    contact: null,
    photo: null,
    password: null,
    preferences: null,
    security: null,
  });

  useEffect(() => {
    if (!account) {
      return;
    }

    const nextForm = createEmptyForm(account);
    setForm(nextForm);
    setInitialSnapshot(JSON.stringify(nextForm));
    setAvatarPreview(getAccountAvatarSrc(account));
    setPasswordForm(createEmptyPasswordForm());
  }, [account]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'password') {
      setExpanded((current) => ({ ...current, password: true }));
      sectionRefs.current.password?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoadingLookups(true);
      try {
        const [address, phone, email] = await Promise.all([
          loadLookupOptions(['address_type', 'ADDRESS_TYPE']),
          loadLookupOptions(['PHONE_TYPE', 'phone_type']),
          loadLookupOptions(['EMAIL_TYPE', 'email_type']),
        ]);

        setAddressTypes(address);
        setPhoneTypes(phone);
        setEmailTypes(email);
      } finally {
        setLoadingLookups(false);
      }
    };

    load();
  }, []);

  const dirty = useMemo(() => JSON.stringify(form) !== initialSnapshot || Object.values(passwordForm).some((value) => typeof value === 'string' && value.length > 0), [form, initialSnapshot, passwordForm]);

  useBeforeUnload((event) => {
    if (!dirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  });

  useNavigationPrompt(dirty, 'You have unsaved changes. Leave this page anyway?');

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const validation = useMemo(() => {
    const nextErrors: Record<string, string> = {};
    if (!form.display_name.trim()) {
      nextErrors.display_name = 'Display name is required';
    }
    if (passwordForm.new_password || passwordForm.current_password || passwordForm.confirm_password) {
      if (!passwordForm.current_password) {
        nextErrors.current_password = 'Current password is required';
      }
      if (!passwordForm.new_password) {
        nextErrors.new_password = 'New password is required';
      } else if (passwordForm.new_password.length < 6) {
        nextErrors.new_password = 'Password must be at least 6 characters';
      }
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        nextErrors.confirm_password = 'Passwords do not match';
      }
    }
    return nextErrors;
  }, [form.display_name, passwordForm]);

  const passwordStrength = strengthScore(passwordForm.new_password);

  const handleToggleSection = (section: ProfileSection) => {
    setExpanded((current) => ({ ...current, [section]: !current[section] }));
  };

  const handleAddressChange = (index: number, field: keyof AddressDraft, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.map((address, itemIndex) =>
        itemIndex === index ? { ...address, [field]: value } : address
      ),
    }));
  };

  const handlePhoneChange = (index: number, field: keyof PhoneDraft, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      phones: current.phones.map((phone, itemIndex) =>
        itemIndex === index ? { ...phone, [field]: value } : phone
      ),
    }));
  };

  const handleEmailChange = (index: number, field: keyof EmailDraft, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      emails: current.emails.map((email, itemIndex) =>
        itemIndex === index ? { ...email, [field]: value } : email
      ),
    }));
  };

  const addAddress = () => setForm((current) => ({ ...current, addresses: [...current.addresses, createEmptyAddress()] }));
  const addPhone = () => setForm((current) => ({ ...current, phones: [...current.phones, createEmptyPhone()] }));
  const addEmail = () => setForm((current) => ({ ...current, emails: [...current.emails, createEmptyEmail()] }));

  const removeAddress = (index: number) =>
    setForm((current) => ({ ...current, addresses: current.addresses.filter((_, itemIndex) => itemIndex !== index) }));
  const removePhone = (index: number) =>
    setForm((current) => ({ ...current, phones: current.phones.filter((_, itemIndex) => itemIndex !== index) }));
  const removeEmail = (index: number) =>
    setForm((current) => ({ ...current, emails: current.emails.filter((_, itemIndex) => itemIndex !== index) }));

  const handleAvatarSelected = async (file: File | null) => {
    setAvatarError('');

    if (!file) {
      setForm((current) => ({ ...current, avatar_data_url: null }));
      setAvatarPreview(null);
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Upload a JPG, PNG, WEBP, or GIF image.');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError('The image must be 2 MB or smaller.');
      return;
    }

    setAvatarProgress(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setForm((current) => ({ ...current, avatar_data_url: result }));
      setAvatarPreview(result);
      setAvatarProgress(false);
    };
    reader.onerror = () => {
      setAvatarError('Could not read the selected image.');
      setAvatarProgress(false);
    };
    reader.readAsDataURL(file);
  };

  const profilePayload = useMemo<UpdateCurrentAccountProfileRequest>(() => ({
    display_name: form.display_name.trim(),
    first_name: form.first_name.trim() || null,
    middle_name: form.middle_name.trim() || null,
    last_name: form.last_name.trim() || null,
    avatar_data_url: form.avatar_data_url,
    preferences: {
      theme: form.preferences.theme || null,
      language: form.preferences.language || null,
      date_format: form.preferences.date_format || null,
      time_format: form.preferences.time_format || null,
      time_zone: form.preferences.time_zone || null,
      notifications: {
        email: form.preferences.notifications.email,
        sms: form.preferences.notifications.sms,
        in_app: form.preferences.notifications.in_app,
      },
    },
    addresses: form.addresses.map((address) => ({
      address_id: address.address_id,
      address_type_id: address.address_type_id === '' ? null : address.address_type_id,
      house_no: address.house_no.trim() || null,
      street: address.street.trim() || null,
      barangay: address.barangay.trim() || null,
      city: address.city.trim() || null,
      province: address.province.trim() || null,
      region: address.region.trim() || null,
      postal_code: address.postal_code.trim() || null,
      is_primary: address.is_primary,
    })),
    phones: form.phones.map((phone) => ({
      phone_id: phone.phone_id,
      phone_type_id: phone.phone_type_id === '' ? null : phone.phone_type_id,
      phone_number: phone.phone_number.trim(),
      is_primary: phone.is_primary,
    })),
    emails: form.emails.map((email) => ({
      email_id: email.email_id,
      email_type_id: email.email_type_id === '' ? null : email.email_type_id,
      email_address: email.email_address.trim(),
      is_primary: email.is_primary,
    })),
  }), [form]);

  const handleSaveProfile = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.display_name.trim()) {
      nextErrors.display_name = 'Display name is required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSavingProfile(true);
    setError('');
    setFieldErrors({});

    try {
      await accountApi.updateMe(profilePayload);
      await refreshAccount();
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const nextErrors: Record<string, string> = {};
    if (!passwordForm.current_password) {
      nextErrors.current_password = 'Current password is required';
    }
    if (!passwordForm.new_password) {
      nextErrors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 6) {
      nextErrors.new_password = 'Password must be at least 6 characters';
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      nextErrors.confirm_password = 'Passwords do not match';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSavingPassword(true);
    setError('');
    try {
      await changePassword(passwordForm.new_password, passwordForm.current_password);
      setPasswordForm(createEmptyPasswordForm());
      await refreshAccount();
      setSuccess('Password updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const profileAvatar = avatarPreview || getAccountAvatarSrc(account);
  const displayName = getAccountDisplayName(account);
  const initials = getAccountInitials(displayName);
  const passwordMeterLabel = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength - 1] || 'Very weak';

  if (authLoading || !account || loadingLookups) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            My Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Update your name, contact details, avatar, password, and profile preferences.
          </Typography>
          {dirty && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              You have unsaved changes.
            </Alert>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <Accordion expanded={expanded.personal} onChange={() => handleToggleSection('personal')} ref={(node) => { sectionRefs.current.personal = node; }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>Personal Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2} alignItems="center" textAlign="center">
                      <Avatar src={profileAvatar ?? undefined} alt={displayName} sx={{ width: 96, height: 96, bgcolor: '#005A9E', fontSize: '1.5rem', fontWeight: 700 }}>
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.user_name}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Display Name"
                      value={form.display_name}
                      onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                      error={Boolean(fieldErrors.display_name)}
                      helperText={fieldErrors.display_name}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Username" value={account.user_name} disabled />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="First Name" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Middle Name" value={form.middle_name} onChange={(event) => setForm((current) => ({ ...current, middle_name: event.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Last Name" value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Employee Number" value="Not configured" disabled />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Department" value="Not configured" disabled />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Position" value="Not configured" disabled />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded.contact} onChange={() => handleToggleSection('contact')} ref={(node) => { sectionRefs.current.contact = node; }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>Contact Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Addresses</Typography>
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={addAddress}>Add Address</Button>
                </Stack>
                <Stack spacing={2}>
                  {form.addresses.map((address, index) => (
                    <Card variant="outlined" key={address.address_id ?? `address-${index}`}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={600}>Address {index + 1}</Typography>
                            <IconButton color="error" onClick={() => removeAddress(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <TextField select fullWidth label="Address Type" value={address.address_type_id} onChange={(event) => handleAddressChange(index, 'address_type_id', event.target.value)}>
                                <MenuItem value="">Select type</MenuItem>
                                {addressTypes.map((type) => (
                                  <MenuItem key={type.look_up_id} value={type.look_up_id}>{type.name}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField fullWidth label="House No." value={address.house_no} onChange={(event) => handleAddressChange(index, 'house_no', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField fullWidth label="Street" value={address.street} onChange={(event) => handleAddressChange(index, 'street', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField fullWidth label="Barangay" value={address.barangay} onChange={(event) => handleAddressChange(index, 'barangay', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField fullWidth label="City" value={address.city} onChange={(event) => handleAddressChange(index, 'city', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField fullWidth label="Province" value={address.province} onChange={(event) => handleAddressChange(index, 'province', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField fullWidth label="Region" value={address.region} onChange={(event) => handleAddressChange(index, 'region', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField fullWidth label="Postal Code" value={address.postal_code} onChange={(event) => handleAddressChange(index, 'postal_code', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <FormControlLabel control={<Switch checked={address.is_primary} onChange={(event) => handleAddressChange(index, 'is_primary', event.target.checked)} />} label="Primary" />
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Phone Numbers</Typography>
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={addPhone}>Add Phone</Button>
                </Stack>
                <Stack spacing={2}>
                  {form.phones.map((phone, index) => (
                    <Card variant="outlined" key={phone.phone_id ?? `phone-${index}`}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={600}>Phone {index + 1}</Typography>
                            <IconButton color="error" onClick={() => removePhone(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <TextField select fullWidth label="Phone Type" value={phone.phone_type_id} onChange={(event) => handlePhoneChange(index, 'phone_type_id', event.target.value)}>
                                <MenuItem value="">Select type</MenuItem>
                                {phoneTypes.map((type) => (
                                  <MenuItem key={type.look_up_id} value={type.look_up_id}>{type.name}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={5}>
                              <TextField fullWidth label="Phone Number" value={phone.phone_number} onChange={(event) => handlePhoneChange(index, 'phone_number', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <FormControlLabel control={<Switch checked={phone.is_primary} onChange={(event) => handlePhoneChange(index, 'is_primary', event.target.checked)} />} label="Primary" />
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>Email Addresses</Typography>
                  <Button startIcon={<AddIcon />} variant="outlined" onClick={addEmail}>Add Email</Button>
                </Stack>
                <Stack spacing={2}>
                  {form.emails.map((email, index) => (
                    <Card variant="outlined" key={email.email_id ?? `email-${index}`}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={600}>Email {index + 1}</Typography>
                            <IconButton color="error" onClick={() => removeEmail(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <TextField select fullWidth label="Email Type" value={email.email_type_id} onChange={(event) => handleEmailChange(index, 'email_type_id', event.target.value)}>
                                <MenuItem value="">Select type</MenuItem>
                                {emailTypes.map((type) => (
                                  <MenuItem key={type.look_up_id} value={type.look_up_id}>{type.name}</MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={5}>
                              <TextField fullWidth label="Email Address" value={email.email_address} onChange={(event) => handleEmailChange(index, 'email_address', event.target.value)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <FormControlLabel control={<Switch checked={email.is_primary} onChange={(event) => handleEmailChange(index, 'is_primary', event.target.checked)} />} label="Primary" />
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded.photo} onChange={() => handleToggleSection('photo')} ref={(node) => { sectionRefs.current.photo = node; }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>Profile Photo</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {avatarProgress && <LinearProgress />}
              {avatarError && <Alert severity="error">{avatarError}</Alert>}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <Avatar src={avatarPreview ?? undefined} alt={displayName} sx={{ width: 112, height: 112, bgcolor: '#005A9E', fontSize: '1.75rem', fontWeight: 700 }}>
                  {initials}
                </Avatar>
                <Stack spacing={1}>
                  <Typography variant="body1" fontWeight={600}>Upload or replace your profile image.</Typography>
                  <Typography variant="body2" color="text.secondary">
                    JPG, PNG, WEBP, or GIF up to 2 MB.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />}>
                      {avatarPreview ? 'Replace Image' : 'Upload Image'}
                      <input hidden type="file" accept={ALLOWED_AVATAR_TYPES.join(',')} onChange={(event) => handleAvatarSelected(event.target.files?.[0] ?? null)} />
                    </Button>
                    <Button variant="outlined" color="inherit" onClick={() => handleAvatarSelected(null)} disabled={!avatarPreview}>
                      Remove Image
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded.password} onChange={() => handleToggleSection('password')} ref={(node) => { sectionRefs.current.password = node; }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>Change Password</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type={passwordForm.show_current ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                    error={Boolean(fieldErrors.current_password)}
                    helperText={fieldErrors.current_password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setPasswordForm((current) => ({ ...current, show_current: !current.show_current }))} edge="end">
                            {passwordForm.show_current ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type={passwordForm.show_new ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                    error={Boolean(fieldErrors.new_password)}
                    helperText={fieldErrors.new_password || 'At least 6 characters.'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setPasswordForm((current) => ({ ...current, show_new: !current.show_new }))} edge="end">
                            {passwordForm.show_new ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={passwordForm.show_confirm ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                    error={Boolean(fieldErrors.confirm_password)}
                    helperText={fieldErrors.confirm_password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setPasswordForm((current) => ({ ...current, show_confirm: !current.show_confirm }))} edge="end">
                            {passwordForm.show_confirm ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>Password Strength</Typography>
                  <Typography variant="body2" color="text.secondary">{passwordMeterLabel}</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={(passwordStrength / 5) * 100} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<LockIcon />} onClick={handleChangePassword} disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded.preferences} onChange={() => handleToggleSection('preferences')} ref={(node) => { sectionRefs.current.preferences = node; }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>Preferences</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Theme" value={form.preferences.theme} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, theme: event.target.value } }))}>
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Language" value={form.preferences.language} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, language: event.target.value } }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Date Format" value={form.preferences.date_format} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, date_format: event.target.value } }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Time Format" value={form.preferences.time_format} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, time_format: event.target.value } }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Time Zone" value={form.preferences.time_zone} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, time_zone: event.target.value } }))} />
              </Grid>
              <Grid item xs={12} md={12}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={600}>Notification Preferences</Typography>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <FormControlLabel control={<Switch checked={form.preferences.notifications.email} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, notifications: { ...current.preferences.notifications, email: event.target.checked } } }))} />} label="Email" />
                    <FormControlLabel control={<Switch checked={form.preferences.notifications.sms} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, notifications: { ...current.preferences.notifications, sms: event.target.checked } } }))} />} label="SMS" />
                    <FormControlLabel control={<Switch checked={form.preferences.notifications.in_app} onChange={(event) => setForm((current) => ({ ...current, preferences: { ...current.preferences, notifications: { ...current.preferences.notifications, in_app: event.target.checked } } }))} />} label="In-app" />
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded.security} onChange={() => handleToggleSection('security')} ref={(node) => { sectionRefs.current.security = node; }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>Security</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Last Login" value={formatDateTime(account.profile?.security?.last_login_at ?? null)} disabled />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Last Password Change" value={formatDateTime(account.profile?.security?.last_password_change_at ?? null)} disabled />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">Active sessions and login history are not currently tracked in this build.</Alert>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveProfile}
          disabled={savingProfile || avatarProgress}
        >
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </Button>
      </Box>

      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}