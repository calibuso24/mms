import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { accountApi, systemSettingsApi } from '../shared/api/client.js';
import { useAuth } from '../shared/contexts/auth.js';
import { SystemSettingCategorySummary } from '../shared/types/systemSettings.js';
import { SettingsAccordion } from '../shared/components/systemSettings/SettingsAccordion.js';

function permissionValue(moduleName: string, permissionCode: string) {
  return `${moduleName}:${permissionCode}`;
}

export default function SystemSettingsPage() {
  const { account, isLoading: authLoading } = useAuth();
  const [categories, setCategories] = useState<SystemSettingCategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | false>(false);
  const [dirtyCategories, setDirtyCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [categoryData, permissionData] = await Promise.all([
          systemSettingsApi.listCategories(),
          account?.account_id ? accountApi.getPermissions(account.account_id) : Promise.resolve([]),
        ]);

        const categoryList: SystemSettingCategorySummary[] = Array.isArray(categoryData) ? categoryData : [];
        setCategories(categoryList);
        setExpandedCategory((current) => current || categoryList[0]?.category_code || false);
        setPermissions(
          Array.isArray(permissionData)
            ? permissionData.map((item: { module_name: string; permission_code: string }) =>
                permissionValue(item.module_name, item.permission_code)
              )
            : []
        );
      } catch (err: any) {
        setError(err.message || 'Failed to load system settings');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [account?.account_id, authLoading]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyCategories.size === 0) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyCategories]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const canView = permissionSet.has(permissionValue('System Settings', 'VIEW'));
  const canEdit = permissionSet.has(permissionValue('System Settings', 'EDIT'));
  const canSave = permissionSet.has(permissionValue('System Settings', 'SAVE'));
  const canReset = permissionSet.has(permissionValue('System Settings', 'RESET'));

  const handleDirtyChange = (categoryCode: string, dirty: boolean) => {
    setDirtyCategories((current) => {
      const next = new Set(current);
      if (dirty) {
        next.add(categoryCode);
      } else {
        next.delete(categoryCode);
      }
      return next;
    });
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canView) {
    return <Alert severity="error">You do not have permission to view system settings.</Alert>;
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            System Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage application behavior, defaults, and operational controls. Settings are loaded lazily by section and stored in the database.
          </Typography>
          {dirtyCategories.size > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              You have unsaved changes in {dirtyCategories.size} section{dirtyCategories.size === 1 ? '' : 's'}.
            </Alert>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {categories.map((category) => (
        <SettingsAccordion
          key={category.system_setting_category_id}
          category={category}
          expanded={expandedCategory === category.category_code}
          canEdit={canEdit}
          canSave={canSave}
          canReset={canReset}
          onToggle={(categoryCode) => setExpandedCategory((current) => (current === categoryCode ? false : categoryCode))}
          onDirtyChange={handleDirtyChange}
        />
      ))}

      {categories.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No system setting categories were found.</Typography>
        </Paper>
      )}
    </Box>
  );
}
