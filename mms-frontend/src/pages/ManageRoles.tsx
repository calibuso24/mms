import { useEffect, useState, useCallback } from 'react';
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { roleManagementApi } from '../shared/api/client.js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PermissionItem {
  permission_id: number;
  module_name: string;
  permission_code: string;
  permission_name: string;
  description: string | null;
}

interface PermissionGroup {
  module_name: string;
  permissions: PermissionItem[];
}

interface RoleListItem {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  account_count: number;
  permission_count: number;
  created_at: string | null;
}

interface RoleDetail {
  role_id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  account_count: number;
  permissions: PermissionItem[];
  created_at: string | null;
  updated_at: string | null;
}

interface RoleFormState {
  role_code: string;
  role_name: string;
  description: string;
  is_active: boolean;
  permission_ids: number[];
}

const SYSTEM_ROLE_CODES = new Set(['SUPER_ADMIN', 'ADMIN']);

const emptyForm = (): RoleFormState => ({
  role_code: '',
  role_name: '',
  description: '',
  is_active: true,
  permission_ids: [],
});

type SortField = 'role_name' | 'role_code' | 'is_active' | 'log_date_created';
type SortDir = 'asc' | 'desc';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManageRolesPage() {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  // Pagination / Search / Sort
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('role_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Permissions master list
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [viewingRole, setViewingRole] = useState<RoleDetail | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleListItem | null>(null);
  const [formState, setFormState] = useState<RoleFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Load data ──────────────────────────────────────────────────────────

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await roleManagementApi.list({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        search: search || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setRoles(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, sortBy, sortDir]);

  const loadPermissions = useCallback(async () => {
    try {
      const groups = await roleManagementApi.listPermissions();
      setPermissionGroups(groups ?? []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleOpenCreate = () => {
    setEditingRoleId(null);
    setFormState(emptyForm());
    setFormError('');
    setShowFormDialog(true);
  };

  const handleOpenEdit = async (role: RoleListItem) => {
    setFormError('');
    try {
      const detail: RoleDetail = await roleManagementApi.get(role.role_id);
      setEditingRoleId(role.role_id);
      setFormState({
        role_code: detail.role_code,
        role_name: detail.role_name,
        description: detail.description ?? '',
        is_active: detail.is_active,
        permission_ids: detail.permissions.map((p) => p.permission_id),
      });
      setShowFormDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load role');
    }
  };

  const handleOpenView = async (role: RoleListItem) => {
    try {
      const detail: RoleDetail = await roleManagementApi.get(role.role_id);
      setViewingRole(detail);
      setShowViewDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load role');
    }
  };

  const handleOpenDelete = (role: RoleListItem) => {
    setDeletingRole(role);
    setShowDeleteDialog(true);
  };

  const handleCloseForm = () => {
    setShowFormDialog(false);
    setEditingRoleId(null);
    setFormState(emptyForm());
    setFormError('');
  };

  const handleSave = async () => {
    setFormError('');
    if (!formState.role_name.trim()) {
      setFormError('Role name is required');
      return;
    }
    if (!editingRoleId && !formState.role_code.trim()) {
      setFormError('Role code is required');
      return;
    }

    setSaving(true);
    try {
      if (editingRoleId) {
        await roleManagementApi.update(editingRoleId, {
          role_name: formState.role_name.trim(),
          description: formState.description.trim() || null,
          is_active: formState.is_active,
          permission_ids: formState.permission_ids,
        });
      } else {
        await roleManagementApi.create({
          role_code: formState.role_code.trim().toUpperCase(),
          role_name: formState.role_name.trim(),
          description: formState.description.trim() || null,
          is_active: formState.is_active,
          permission_ids: formState.permission_ids,
        });
      }
      handleCloseForm();
      loadRoles();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setDeleting(true);
    try {
      await roleManagementApi.delete(deletingRole.role_id);
      setShowDeleteDialog(false);
      setDeletingRole(null);
      loadRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
      setShowDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handlePermissionToggle = (permissionId: number) => {
    setFormState((prev) => {
      const ids = prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter((id) => id !== permissionId)
        : [...prev.permission_ids, permissionId];
      return { ...prev, permission_ids: ids };
    });
  };

  const handleModuleToggle = (group: PermissionGroup) => {
    const groupIds = group.permissions.map((p) => p.permission_id);
    const allSelected = groupIds.every((id) => formState.permission_ids.includes(id));
    setFormState((prev) => {
      const ids = allSelected
        ? prev.permission_ids.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...prev.permission_ids, ...groupIds]));
      return { ...prev, permission_ids: ids };
    });
  };

  const handleSelectAllPermissions = () => {
    const allIds = permissionGroups.flatMap((g) => g.permissions.map((p) => p.permission_id));
    const allSelected = allIds.every((id) => formState.permission_ids.includes(id));
    setFormState((prev) => ({
      ...prev,
      permission_ids: allSelected ? [] : allIds,
    }));
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  const isSystemRole = (roleCode: string) => SYSTEM_ROLE_CODES.has(roleCode);

  const allPermissionIds = permissionGroups.flatMap((g) => g.permissions.map((p) => p.permission_id));
  const allPermissionsSelected =
    allPermissionIds.length > 0 && allPermissionIds.every((id) => formState.permission_ids.includes(id));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Manage Roles
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          New Role
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search by name, code, or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="outlined" size="small">
            Search
          </Button>
          {search && (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(0);
              }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'role_code'}
                    direction={sortBy === 'role_code' ? sortDir : 'asc'}
                    onClick={() => handleSort('role_code')}
                  >
                    Code
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'role_name'}
                    direction={sortBy === 'role_name' ? sortDir : 'asc'}
                    onClick={() => handleSort('role_name')}
                  >
                    Role Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Permissions</TableCell>
                <TableCell align="center">Accounts</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'is_active'}
                    direction={sortBy === 'is_active' ? sortDir : 'asc'}
                    onClick={() => handleSort('is_active')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No roles found
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.role_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {role.role_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {role.role_name}
                        {isSystemRole(role.role_code) && (
                          <Chip label="System" size="small" color="secondary" sx={{ ml: 0.5, height: 18, fontSize: 10 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {role.description ?? '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={role.permission_count} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={role.account_count} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={role.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => handleOpenView(role)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEdit(role)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isSystemRole(role.role_code) ? 'System roles cannot be deleted' : 'Delete'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDelete(role)}
                            disabled={isSystemRole(role.role_code)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
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
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {/* ─── Create / Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={showFormDialog} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>{editingRoleId ? 'Edit Role' : 'New Role'}</DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Role Code (create only) */}
            {!editingRoleId && (
              <TextField
                label="Role Code *"
                size="small"
                value={formState.role_code}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, role_code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))
                }
                helperText="Uppercase letters, digits, underscores only (e.g. INV_MANAGER)"
                fullWidth
              />
            )}

            {/* Role Name */}
            <TextField
              label="Role Name *"
              size="small"
              value={formState.role_name}
              onChange={(e) => setFormState((p) => ({ ...p, role_name: e.target.value }))}
              fullWidth
            />

            {/* Description */}
            <TextField
              label="Description"
              size="small"
              multiline
              rows={2}
              value={formState.description}
              onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
              fullWidth
            />

            {/* Status */}
            <FormControlLabel
              control={
                <Switch
                  checked={formState.is_active}
                  onChange={(e) => setFormState((p) => ({ ...p, is_active: e.target.checked }))}
                />
              }
              label="Active"
            />

            <Divider />

            {/* Permissions */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Permissions</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={allPermissionsSelected}
                      indeterminate={
                        formState.permission_ids.length > 0 && !allPermissionsSelected
                      }
                      onChange={handleSelectAllPermissions}
                    />
                  }
                  label={<Typography variant="caption">Select All</Typography>}
                />
              </Box>
              {permissionGroups.map((group) => {
                const groupIds = group.permissions.map((p) => p.permission_id);
                const allGroupSelected = groupIds.every((id) => formState.permission_ids.includes(id));
                const someGroupSelected = groupIds.some((id) => formState.permission_ids.includes(id));
                return (
                  <Accordion key={group.module_name} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 0.5 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          size="small"
                          checked={allGroupSelected}
                          indeterminate={someGroupSelected && !allGroupSelected}
                          onChange={() => handleModuleToggle(group)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {group.module_name}
                        </Typography>
                        <Chip
                          label={`${groupIds.filter((id) => formState.permission_ids.includes(id)).length}/${groupIds.length}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {group.permissions.map((perm) => (
                          <FormControlLabel
                            key={perm.permission_id}
                            control={
                              <Checkbox
                                size="small"
                                checked={formState.permission_ids.includes(perm.permission_id)}
                                onChange={() => handlePermissionToggle(perm.permission_id)}
                              />
                            }
                            label={
                              <Tooltip title={perm.description ?? ''} placement="top">
                                <Typography variant="caption">{perm.permission_code}</Typography>
                              </Tooltip>
                            }
                            sx={{ mr: 1, minWidth: 90 }}
                          />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editingRoleId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── View Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={showViewDialog} onClose={() => setShowViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Role Details</DialogTitle>
        <DialogContent dividers>
          {viewingRole && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Role Code</Typography>
                  <Typography fontFamily="monospace">{viewingRole.role_code}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box>
                    <Chip
                      label={viewingRole.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={viewingRole.is_active ? 'success' : 'default'}
                    />
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary">Role Name</Typography>
                  <Typography>{viewingRole.role_name}</Typography>
                </Box>
                {viewingRole.description && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography>{viewingRole.description}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">Assigned Accounts</Typography>
                  <Typography>{viewingRole.account_count}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Created At</Typography>
                  <Typography>{viewingRole.created_at ? new Date(viewingRole.created_at).toLocaleDateString() : '—'}</Typography>
                </Box>
              </Box>

              <Divider />
              <Typography variant="subtitle2">
                Permissions ({viewingRole.permissions.length})
              </Typography>
              {viewingRole.permissions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No permissions assigned</Typography>
              ) : (
                (() => {
                  const grouped = viewingRole.permissions.reduce((acc, p) => {
                    (acc[p.module_name] = acc[p.module_name] || []).push(p);
                    return acc;
                  }, {} as Record<string, PermissionItem[]>);
                  return Object.entries(grouped).map(([module, perms]) => (
                    <Box key={module} sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {module}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {perms.map((p) => (
                          <Chip key={p.permission_id} label={p.permission_code} size="small" />
                        ))}
                      </Box>
                    </Box>
                  ));
                })()
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewDialog(false)}>Close</Button>
          {viewingRole && (
            <Button
              variant="outlined"
              onClick={() => {
                setShowViewDialog(false);
                handleOpenEdit({ ...viewingRole, permission_count: viewingRole.permissions.length } as RoleListItem);
              }}
            >
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────────── */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the role{' '}
            <strong>{deletingRole?.role_name}</strong>?
          </Typography>
          {deletingRole && deletingRole.account_count > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              This role is assigned to {deletingRole.account_count} account(s). Deletion will be blocked.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
