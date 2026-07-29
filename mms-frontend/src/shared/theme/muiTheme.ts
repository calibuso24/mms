import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#0078D4',
      hover: '#106EBE',
      light: '#0078D4',
      dark: '#0078D4',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#005A9E',
      light: '#106EBE',
      dark: '#0F3B68',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    success: {
      main: '#107C10',
    },
    warning: {
      main: '#FFB900',
    },
    error: {
      main: '#D13438',
    },
    divider: '#E1DFDD',
  },
  typography: {
    fontFamily: '"Segoe UI", "Inter", "Roboto", "Arial", sans-serif',
    fontSize: 13,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '0.9rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.9rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.85rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '0.9rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.8rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    button: {
      fontSize: '0.9rem',
      fontWeight: 500,
      textTransform: 'none',
      lineHeight: 1.4,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#0b2748',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          borderBottom: '1px solid #E1DFDD',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0F3B68',
          color: '#FFFFFF',
          width: 280,
          boxSizing: 'border-box',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9rem',
          padding: '8px 16px',
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          },
        },
        outlined: {
          borderColor: '#E1DFDD',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E1DFDD',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0078D4',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0078D4',
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 120, 212, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: '#005A9E',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#106EBE',
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 120, 212, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: '#005A9E',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#106EBE',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#0078D4',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E1DFDD',
          borderRadius: 8,
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #E1DFDD',
          },
          '& .MuiDataGrid-columnHeader': {
            backgroundColor: '#F5F7FA',
            borderBottom: '1px solid #E1DFDD',
            fontWeight: 600,
            color: '#0b2748',
          },
          '& .MuiDataGrid-row': {
            '&:hover': {
              backgroundColor: '#F5F7FA',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(0, 120, 212, 0.08)',
              '&:hover': {
                backgroundColor: 'rgba(0, 120, 212, 0.12)',
              },
            },
          },
          '& .MuiTablePagination-root': {
            borderTop: '1px solid #E1DFDD',
          },
        },
      },
    },
  },
});
