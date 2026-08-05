import React from 'react';
import { Box, Button, Grid, Stack, TextField, Typography, Avatar, FormControlLabel, Switch, MenuItem } from '@mui/material';
import { SystemSettingItem } from '../../types/systemSettings.js';
import { useBranding } from '../../contexts/branding.js';

interface BrandingEditorProps {
  setting: SystemSettingItem;
  value: unknown;
  onChange: (value: unknown) => void;
}

function readPayload(value: unknown) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value as Record<string, any>;
}

export function BrandingEditor({ setting, value, onChange }: BrandingEditorProps) {
  const { applyPreview, resetToPersisted } = useBranding();
  const payload = readPayload(value);

  const setField = (path: string, v: any) => {
    const next = { ...(payload || {}) } as any;
    const parts = path.split('.');
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      cur[p] = cur[p] ?? {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = v;
    const serialized = JSON.stringify(next);
    onChange(serialized);
    try {
      applyPreview(next);
    } catch {
      // ignore
    }
  };

  const handleFile = (path: string, file: File | null) => {
    if (!file) {
      setField(path, null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setField(path, typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight={600}>General</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Company Name" value={payload.companyName ?? ''} onChange={(e) => setField('companyName', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="System Title" value={payload.systemTitle ?? ''} onChange={(e) => setField('systemTitle', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Browser Title" value={payload.browserTitle ?? ''} onChange={(e) => setField('browserTitle', e.target.value)} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="System Title"
              value={payload.systemTitle ?? ''}
              onChange={(e) => {
                setField('systemTitle', e.target.value);
                // keep header.systemTitle in sync for components that read nested value
                setField('header.systemTitle', e.target.value);
              }}
            />
          </Grid>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar src={payload.companyLogo ?? undefined} alt={payload.companyName ?? 'Logo'} sx={{ width: 64, height: 64 }} />
                <Button variant="outlined" component="label">Upload<input hidden type="file" accept="image/*" onChange={(e) => handleFile('companyLogo', e.target.files?.[0] ?? null)} /></Button>
                <Button variant="outlined" color="inherit" onClick={() => setField('companyLogo', null)}>Remove</Button>
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight={600}>Favicon</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar src={payload.favicon ?? undefined} alt="favicon" sx={{ width: 40, height: 40 }} />
                <Button variant="outlined" component="label">Upload<input hidden type="file" accept="image/*" onChange={(e) => handleFile('favicon', e.target.files?.[0] ?? null)} /></Button>
                <Button variant="outlined" color="inherit" onClick={() => setField('favicon', null)}>Remove</Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Typography variant="subtitle1" fontWeight={600}>Login Page</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Login Title" value={payload.login?.loginTitle ?? ''} onChange={(e) => setField('login.loginTitle', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Login Subtitle" value={payload.login?.loginSubtitle ?? ''} onChange={(e) => setField('login.loginSubtitle', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Footer Text" value={payload.login?.footerText ?? ''} onChange={(e) => setField('login.footerText', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack>
              <Typography variant="body2" fontWeight={600}>Background Image</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  src={payload.login?.backgroundImage ?? undefined}
                  alt="Background"
                  variant="square"
                  sx={{ width: 80, height: 56, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}
                />
                <Button variant="outlined" component="label">Upload<input hidden type="file" accept="image/*" onChange={(e) => handleFile('login.backgroundImage', e.target.files?.[0] ?? null)} /></Button>
                <Button variant="outlined" color="inherit" onClick={() => setField('login.backgroundImage', null)}>Remove</Button>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack>
              <Typography variant="body2" fontWeight={600}>Banner Image</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  src={payload.login?.bannerImage ?? payload.companyLogo ?? undefined}
                  alt="Banner"
                  variant="square"
                  sx={{ width: 120, height: 56, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}
                />
                <Button variant="outlined" component="label">Upload<input hidden type="file" accept="image/*" onChange={(e) => handleFile('login.bannerImage', e.target.files?.[0] ?? null)} /></Button>
                <Button variant="outlined" color="inherit" onClick={() => setField('login.bannerImage', null)}>Remove</Button>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControlLabel control={<Switch checked={payload.login?.showLogo ?? true} onChange={(e) => setField('login.showLogo', e.target.checked)} />} label="Show Logo" />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControlLabel control={<Switch checked={payload.login?.showBanner ?? true} onChange={(e) => setField('login.showBanner', e.target.checked)} />} label="Show Banner" />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" fontWeight={600}>Theme</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Preset" value={payload.theme?.preset ?? 'Office Colorful'} onChange={(e) => setField('theme.preset', e.target.value)}>
              {['Office Colorful', 'Light', 'Dark', 'Blue', 'Green'].map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {['primary','secondary','background','header','sidebar','success','warning','error'].map((c) => (
                <Grid item xs={6} md={3} key={c}>
                  <TextField type="color" fullWidth label={c} value={payload.theme?.custom?.[c] ?? '#000000'} onChange={(e) => setField(`theme.custom.${c}`, e.target.value)} />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        <Typography variant="subtitle1" fontWeight={600}>Sidebar & Header</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Sidebar Display" value={payload.sidebar?.display ?? 'logo-and-text'} onChange={(e) => setField('sidebar.display', e.target.value)}>
              {['logo-only','logo-and-text','text-only'].map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel control={<Switch checked={payload.sidebar?.compact ?? false} onChange={(e) => setField('sidebar.compact', e.target.checked)} />} label="Compact Sidebar" />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControlLabel control={<Switch checked={payload.header?.headerLogoVisible ?? true} onChange={(e) => setField('sidebar.headerLogoVisible', e.target.checked)} />} label="Header Logo Visible" />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" fontWeight={600}>Login Layout & Dashboard</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Login Layout" value={payload.loginLayout ?? 'centered'} onChange={(e) => setField('loginLayout', e.target.value)}>
              {['centered','left-image-right-login','full-background','top-banner'].map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Background Fit" value={payload.login?.backgroundFit ?? 'cover'} onChange={(e) => setField('login.backgroundFit', e.target.value)}>
                  {['cover','contain','stretch','auto'].map((v) => (<MenuItem key={v} value={v}>{v}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Background Position" value={payload.login?.backgroundPosition ?? 'center'} onChange={(e) => setField('login.backgroundPosition', e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField type="color" fullWidth label="Overlay Color" value={payload.login?.overlayColor ?? '#000000'} onChange={(e) => setField('login.overlayColor', e.target.value)} />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField type="number" fullWidth label="Overlay Opacity (%)" inputProps={{ min: 0, max: 100 }} value={payload.login?.overlayOpacity ?? 35} onChange={(e) => setField('login.overlayOpacity', Number(e.target.value))} />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField type="number" fullWidth label="Card Opacity (%)" inputProps={{ min: 0, max: 100 }} value={payload.login?.cardOpacity ?? 90} onChange={(e) => setField('login.cardOpacity', Number(e.target.value))} />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth label="Welcome Message" value={payload.dashboard?.welcomeMessage ?? ''} onChange={(e) => setField('dashboard.welcomeMessage', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Dashboard Title" value={payload.dashboard?.dashboardTitle ?? ''} onChange={(e) => setField('dashboard.dashboardTitle', e.target.value)} />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => { resetToPersisted(); }}>Discard Preview</Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default BrandingEditor;
