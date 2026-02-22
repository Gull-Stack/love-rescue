import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#e91e63',
      light: '#ff6090',
      dark: '#b0003a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#d05ce3',
      dark: '#6a0080',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23',
    },
    warning: {
      main: '#ff9800',
      light: '#ffc947',
      dark: '#c66900',
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#ba000d',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.1rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export const sectionColors = {
  dashboard: { gradient: 'linear-gradient(180deg, #FFF0EB 0%, #ffffff 100%)', accent: '#e91e63' },
  assessments: { gradient: 'linear-gradient(180deg, #E8EAF6 0%, #ffffff 100%)', accent: '#3f51b5' },
  daily: { gradient: 'linear-gradient(180deg, #E0F2F1 0%, #ffffff 100%)', accent: '#009688' },
  strategies: { gradient: 'linear-gradient(180deg, #EDE7F6 0%, #ffffff 100%)', accent: '#673ab7' },
  gratitude: { gradient: 'linear-gradient(180deg, #E8F5E9 0%, #ffffff 100%)', accent: '#4caf50' },
  together: { gradient: 'linear-gradient(180deg, #FCE4EC 0%, #ffffff 100%)', accent: '#e91e63' },
  reports: { gradient: 'linear-gradient(180deg, #FFF3E0 0%, #ffffff 100%)', accent: '#ff9800' },
  course: { gradient: 'linear-gradient(180deg, #E3F2FD 0%, #ffffff 100%)', accent: '#1976d2' },
  matchup: { gradient: 'linear-gradient(180deg, #FCE4EC 0%, #ffffff 100%)', accent: '#e91e63' },
};

export default responsiveFontSizes(theme);
