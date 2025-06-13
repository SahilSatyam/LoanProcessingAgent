import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Divider,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh,
  Home,
  BugReport,
} from '@mui/icons-material';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

const JP_MORGAN_BLUE = '#003366';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const handleReportError = () => {
    // In a real application, you would send this to your error reporting service
    console.error('Error reported:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
    
    // Show user feedback
    alert('Error report sent. Thank you for helping us improve!');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Card
        sx={{
          textAlign: 'center',
          p: 4,
          border: `2px solid ${JP_MORGAN_BLUE}`,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <CardContent>
          <ErrorIcon
            sx={{
              fontSize: 80,
              color: 'error.main',
              mb: 2,
            }}
          />
          
          <Typography variant="h4" gutterBottom color={JP_MORGAN_BLUE} fontWeight="bold">
            Oops! Something went wrong
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            We're sorry for the inconvenience
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            The loan application encountered an unexpected error. Our team has been notified 
            and is working to resolve this issue. Please try refreshing the page or contact 
            our support team if the problem persists.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={resetErrorBoundary}
              sx={{
                bgcolor: JP_MORGAN_BLUE,
                '&:hover': {
                  bgcolor: '#002244',
                },
              }}
            >
              Try Again
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              sx={{
                borderColor: JP_MORGAN_BLUE,
                color: JP_MORGAN_BLUE,
                '&:hover': {
                  borderColor: '#002244',
                  bgcolor: 'rgba(0, 51, 102, 0.04)',
                },
              }}
            >
              Refresh Page
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Home />}
              onClick={handleGoHome}
              sx={{
                borderColor: JP_MORGAN_BLUE,
                color: JP_MORGAN_BLUE,
                '&:hover': {
                  borderColor: '#002244',
                  bgcolor: 'rgba(0, 51, 102, 0.04)',
                },
              }}
            >
              Go Home
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
            <Typography variant="body2">
              <strong>What you can do:</strong>
            </Typography>
            <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Try refreshing the page</li>
              <li>Clear your browser cache and cookies</li>
              <li>Check your internet connection</li>
              <li>Contact our support team at support@jpmorgan.com</li>
            </Typography>
          </Alert>

          <Button
            variant="text"
            startIcon={<BugReport />}
            onClick={handleReportError}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            Report this error
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" color="error" gutterBottom>
                Development Error Details:
              </Typography>
              <Box
                sx={
                  {
                    bgcolor: '#f5f5f5',
                    p: 2,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    maxHeight: 200,
                  }
                }
              >
                <Typography variant="body2" color="error">
                  {error.message}
                </Typography>
                {error.stack && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {error.stack}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

const ErrorBoundary = ({ children }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error Boundary caught an error:', error, errorInfo);
        }
        
        // In production, you would send this to your error reporting service
        // Example: Sentry, LogRocket, Bugsnag, etc.
        // errorReportingService.captureException(error, {
        //   extra: errorInfo,
        //   tags: {
        //     component: 'ErrorBoundary',
        //   },
        // });
      }}
      onReset={() => {
        // Clear any state that might have caused the error
        // For example, clear localStorage, reset Redux store, etc.
        console.log('Error boundary reset');
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;