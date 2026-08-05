import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { systemSettingsApi } from '../api/client.js';
import { muiTheme as baseTheme } from '../theme/muiTheme.js';

type BrandingPayload = Record<string, any>;

interface BrandingContextValue {
  branding: BrandingPayload | null;
  applyPreview: (payload: BrandingPayload | null) => void;
  resetToPersisted: () => void;
  reload: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

function mergeThemeFromBranding(payload: BrandingPayload | null) {
  if (!payload) return baseTheme;
  const custom = payload?.theme?.custom ?? {};
  const preset = (payload?.theme?.preset || '').toString();

  const presets: Record<string, Record<string, string>> = {
    'Office Colorful': {
      primary: '#0078D4',
      secondary: '#005A9E',
      background: '#F5F7FA',
      header: '#FFFFFF',
      sidebar: '#0F3B68',
      success: '#107C10',
      warning: '#D83B01',
      error: '#A80000',
      divider: '#E1DFDD',
    },
    Light: {
      primary: '#0B5FFF',
      secondary: '#6C757D',
      background: '#FFFFFF',
      header: '#FFFFFF',
      sidebar: '#F8F9FA',
      success: '#198754',
      warning: '#FFC107',
      error: '#DC3545',
      divider: '#E9ECEF',
    },
    Dark: {
      primary: '#90CAF9',
      secondary: '#80CBC4',
      background: '#121212',
      header: '#1F2933',
      sidebar: '#0B1220',
      success: '#4CAF50',
      warning: '#FFB300',
      error: '#F44336',
      divider: '#2A2A2A',
    },
    Blue: {
      primary: '#0B69FF',
      secondary: '#005A9E',
      background: '#F0F6FF',
      header: '#EAF3FF',
      sidebar: '#083463',
      success: '#0EA5A4',
      warning: '#F59E0B',
      error: '#EF4444',
      divider: '#DCEEFF',
    },
    Green: {
      primary: '#117A65',
      secondary: '#0B6B4A',
      background: '#F3FFF6',
      header: '#EAF9EE',
      sidebar: '#064F3B',
      success: '#16A34A',
      warning: '#F97316',
      error: '#DC2626',
      divider: '#DFF3E8',
    },
  };

  const presetColors = presets[preset] ?? presets['Office Colorful'];
  const effective = {
    primary: custom.primary ?? presetColors.primary,
    secondary: custom.secondary ?? presetColors.secondary,
    background: custom.background ?? presetColors.background,
    header: custom.header ?? presetColors.header,
    sidebar: custom.sidebar ?? presetColors.sidebar,
    success: custom.success ?? presetColors.success,
    warning: custom.warning ?? presetColors.warning,
    error: custom.error ?? presetColors.error,
    divider: custom.divider ?? presetColors.divider,
  };

  try {
    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        primary: { ...(baseTheme.palette as any).primary, main: effective.primary },
        secondary: { ...(baseTheme.palette as any).secondary, main: effective.secondary },
        background: { ...(baseTheme.palette as any).background, default: effective.background },
        success: { ...(baseTheme.palette as any).success, main: effective.success },
        warning: { ...(baseTheme.palette as any).warning, main: effective.warning },
        error: { ...(baseTheme.palette as any).error, main: effective.error },
        divider: effective.divider,
      },
      components: {
        ...baseTheme.components,
        MuiAppBar: {
          ...((baseTheme as any).components?.MuiAppBar ?? {}),
          styleOverrides: {
            ...(baseTheme as any).components?.MuiAppBar?.styleOverrides,
            root: {
              backgroundColor: payload?.header?.headerColor ?? effective.header,
              color: '#0b2748',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
              borderBottom: `1px solid ${effective.divider}`,
            },
          },
        },
        MuiDrawer: {
          ...((baseTheme as any).components?.MuiDrawer ?? {}),
          styleOverrides: {
            ...(baseTheme as any).components?.MuiDrawer?.styleOverrides,
            paper: {
              backgroundColor: payload?.sidebar?.sidebar ?? effective.sidebar,
              color: '#FFFFFF',
              width: 280,
              boxSizing: 'border-box',
            },
          },
        },
      },
    });
  } catch (e) {
    return baseTheme;
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [persistedBranding, setPersistedBranding] = useState<BrandingPayload | null>(null);
  const [theme, setTheme] = useState(() => baseTheme);

  const load = async () => {
    try {
      // Try public branding endpoint first (works when unauthenticated)
      let settings: any;
      try {
        settings = await systemSettingsApi.getPublicBranding();
      } catch (publicErr) {
        // If we have an auth token, attempt authenticated fetch as a fallback (admin UI).
        const token = localStorage.getItem('authToken');
        if (token) {
          settings = await systemSettingsApi.listCategorySettings('branding');
        } else {
          // No token and public fetch failed — bail out to avoid 401 noise.
          settings = [];
        }
      }
      const setting = Array.isArray(settings) ? settings.find((s: any) => s.setting_key === 'branding') : null;
      const value = setting?.setting_value ?? setting?.default_value ?? null;
      let parsed = null;
      if (value) {
        try {
          if (typeof value === 'string') {
            // Try parsing once; if result is still a string (double-encoded), parse again.
            let p = JSON.parse(value);
            if (typeof p === 'string') {
              try {
                p = JSON.parse(p);
              } catch {
                // ignore second-parse errors
              }
            }
            parsed = p;
          } else {
            parsed = value;
          }
        } catch {
          parsed = null;
        }
      }

      setBranding(parsed);
      setPersistedBranding(parsed);
      setTheme(mergeThemeFromBranding(parsed));
    } catch (e) {
      // ignore and keep base theme
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Keep document title and favicon in sync with branding
  useEffect(() => {
    try {
      const title = branding?.browserTitle ?? branding?.systemTitle ?? document.title;
      if (title) document.title = title;

      const faviconHref = branding?.favicon ?? null;
      if (faviconHref) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconHref;
      }
    } catch {
      // ignore DOM update errors in non-browser environments
    }
  }, [branding]);

  const applyPreview = (payload: BrandingPayload | null) => {
    setBranding(payload);
    setTheme(mergeThemeFromBranding(payload));
  };

  const resetToPersisted = () => {
    setBranding(persistedBranding);
    setTheme(mergeThemeFromBranding(persistedBranding));
  };

  const reload = async () => {
    await load();
  };

  return (
    <BrandingContext.Provider value={{ branding, applyPreview, resetToPersisted, reload }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}
