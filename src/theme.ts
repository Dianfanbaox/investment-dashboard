import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF8E6E',
      light: '#FFB299',
      dark: '#FF7A5C',
    },
    secondary: {
      main: '#5E5CE6',
      light: '#7B78E8',
      dark: '#4A48CC',
    },
    success: {
      main: '#34C759',
    },
    error: {
      main: '#FF3B30',
    },
    background: {
      default: '#F8F9FC',
      paper: 'rgba(255, 255, 255, 0.85)',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#6B7280',
    },
    divider: 'rgba(0, 0, 0, 0.06)',
  },
  typography: {
    fontFamily: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'sans-serif'].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.5rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    body1: {
      fontSize: '0.875rem',
    },
    body2: {
      fontSize: '0.75rem',
    },
  },
  shape: {
    borderRadius: 24,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
          borderRadius: 24,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minWidth: 80,
          padding: '10px 20px',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF8E6E',
      light: '#FFB299',
      dark: '#FF7A5C',
    },
    secondary: {
      main: '#5E5CE6',
      light: '#7B78E8',
      dark: '#4A48CC',
    },
    background: {
      default: '#1A1A2E',
      paper: '#252540',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#9CA3AF',
    },
  },
  typography: {
    fontFamily: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'sans-serif'].join(','),
  },
  shape: {
    borderRadius: 24,
  },
});