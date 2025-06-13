import React, { Suspense } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography } from '@mui/material';
import ChatInterface from './components/ChatInterface';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// JP Morgan theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#003366', // JP Morgan Blue
      light: '#e8f4fd',
      dark: '#002244',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#d4af37', // JP Morgan Gold
      light: '#f4e9a6',
      dark: '#b8941f',
      contrastText: '#000000',
    },
    error: {
      main: '#d32f2f',
      light: '#ffebee',
    },
    warning: {
      main: '#ed6c02',
      light: '#fff3e0',
    },
    success: {
      main: '#2e7d32',
      light: '#e8f5e8',
    },
    info: {
      main: '#0288d1',
      light: '#e3f2fd',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.25px',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.25px',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 51, 102, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 51, 102, 0.25)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
  },
});

// Loading component
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      bgcolor: 'background.default',
    }}
  >
    <CircularProgress size={60} sx={{ mb: 2, color: 'primary.main' }} />
    <Typography variant="h6" color="primary.main" fontWeight="bold">
      Loading JP Morgan Loan Assistant...
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Please wait while we prepare your application
    </Typography>
  </Box>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Suspense fallback={<LoadingFallback />}>
          <Box
            sx={{
              minHeight: '100vh',
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ChatInterface />
          </Box>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
