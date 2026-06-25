import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    // Grounded, masculine identity: deep slate as the brand, warm amber for
    // action, teal for progress/success. Reads as "serious strategy for men,"
    // not relationship-wellness pink. Kept in light mode for component safety.
    primary: {
      main: '#1B2735',
      light: '#33455B',
      dark: '#0F1722',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E08A3C',
      light: '#F0A55C',
      dark: '#B86A22',
      contrastText: '#ffffff',
    },
    success: {
      main: '#0E9F8E',
      light: '#2DD4BF',
      dark: '#0A7368',
    },
    warning: {
      main: '#E08A3C',
      light: '#F0A55C',
      dark: '#B86A22',
    },
    error: {
      main: '#D14343',
      light: '#E36868',
      dark: '#A12B2B',
    },
    background: {
      default: '#F4F6F8',
      paper: '#ffffff',
    },
    text: {
      primary: '#0F1722',
      secondary: '#5A6B7B',
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

// Reusable brand gradients — the ONLY place gradients should be defined.
// Pages import these instead of hand-rolling pink/purple/rainbow strings, so
// the grounded slate/amber/teal identity stays coherent everywhere.
export const brandGradients = {
  hero: 'linear-gradient(135deg, #1B2735 0%, #33455B 100%)',   // deep slate — headers / dark heroes
  action: 'linear-gradient(135deg, #E08A3C 0%, #F0A55C 100%)', // amber — primary action / CTAs / FAB
  success: 'linear-gradient(135deg, #0E9F8E 0%, #2DD4BF 100%)', // teal — wins / progress / celebration
  warm: 'linear-gradient(135deg, #FBF1E6 0%, #ffffff 100%)',   // soft amber wash — love note / warm cards
  cool: 'linear-gradient(135deg, #E9EDF2 0%, #ffffff 100%)',   // soft slate wash — neutral cards
};

// Subtle per-section washes in the grounded palette (cool slate / warm amber /
// teal), keeping each area distinguishable without the old pastel-pink feel.
export const sectionColors = {
  dashboard: { gradient: 'linear-gradient(180deg, #EEF1F4 0%, #ffffff 100%)', accent: '#E08A3C' },
  assessments: { gradient: 'linear-gradient(180deg, #E9EDF2 0%, #ffffff 100%)', accent: '#33455B' },
  daily: { gradient: 'linear-gradient(180deg, #E3F2F0 0%, #ffffff 100%)', accent: '#0E9F8E' },
  strategies: { gradient: 'linear-gradient(180deg, #ECEFF3 0%, #ffffff 100%)', accent: '#1B2735' },
  gratitude: { gradient: 'linear-gradient(180deg, #FBF1E6 0%, #ffffff 100%)', accent: '#E08A3C' },
  together: { gradient: 'linear-gradient(180deg, #E3F2F0 0%, #ffffff 100%)', accent: '#0E9F8E' },
  reports: { gradient: 'linear-gradient(180deg, #FBF1E6 0%, #ffffff 100%)', accent: '#E08A3C' },
  course: { gradient: 'linear-gradient(180deg, #E9EDF2 0%, #ffffff 100%)', accent: '#33455B' },
  matchup: { gradient: 'linear-gradient(180deg, #E3F2F0 0%, #ffffff 100%)', accent: '#0E9F8E' },
  realTalk: { gradient: 'linear-gradient(180deg, #E9EDF2 0%, #ffffff 100%)', accent: '#33455B' },
};

export default responsiveFontSizes(theme);
