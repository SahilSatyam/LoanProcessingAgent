import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Home,
  Work,
  AccountBalance,
  Security,
  CheckCircle,
  Warning,
  Error,
} from '@mui/icons-material';

const JP_MORGAN_BLUE = '#003366';
const JP_MORGAN_LIGHT = '#e8f4fd';

const EnhancedUserDataCard = ({ userData, ofacStatus, loading }) => {
  if (!userData) {
    return (
      <Card sx={{ mb: 2, border: `1px solid ${JP_MORGAN_BLUE}` }}>
        <CardContent>
          <Typography variant="h6" color="text.secondary">
            No user data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getOfacStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'clear':
        return 'success';
      case 'flagged':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getOfacStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'clear':
        return <CheckCircle />;
      case 'flagged':
        return <Error />;
      case 'pending':
        return <Warning />;
      default:
        return <Security />;
    }
  };

  const formatCurrency = (amount) => {
    if (typeof amount === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    }
    return amount;
  };

  const calculateCreditScore = (income, debt) => {
    // Simple credit score calculation for demo
    const debtToIncomeRatio = debt / income;
    if (debtToIncomeRatio < 0.2) return 'Excellent (750+)';
    if (debtToIncomeRatio < 0.4) return 'Good (700-749)';
    if (debtToIncomeRatio < 0.6) return 'Fair (650-699)';
    return 'Poor (<650)';
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        border: `2px solid ${JP_MORGAN_BLUE}`,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Person sx={{ color: JP_MORGAN_BLUE, mr: 1 }} />
          <Typography variant="h6" fontWeight="bold" color={JP_MORGAN_BLUE}>
            User Information
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Verifying information...
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          {/* Personal Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Personal Details
            </Typography>
            
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Name:</strong> {userData.name || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Email:</strong> {userData.email || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Phone:</strong> {userData.phone || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Home sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Address:</strong> {userData.address || 'N/A'}
              </Typography>
            </Box>
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Financial Profile
            </Typography>
            
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Work sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Annual Income:</strong> {formatCurrency(userData.annual_income)}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <AccountBalance sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Current Debt:</strong> {formatCurrency(userData.current_debt)}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Employment:</strong> {userData.employment_status || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Credit Score:</strong> {calculateCreditScore(userData.annual_income, userData.current_debt)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* OFAC Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight="bold">
            Security Verification
          </Typography>
          
          <Chip
            icon={getOfacStatusIcon(ofacStatus)}
            label={`OFAC Status: ${ofacStatus || 'Pending'}`}
            color={getOfacStatusColor(ofacStatus)}
            variant="outlined"
            size="small"
          />
        </Box>

        {ofacStatus === 'flagged' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            This application requires additional review due to security screening results.
          </Alert>
        )}

        {ofacStatus === 'clear' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Security verification completed successfully.
          </Alert>
        )}

        {/* Debt-to-Income Ratio Visualization */}
        {userData.annual_income && userData.current_debt && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Debt-to-Income Ratio:</strong>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min((userData.current_debt / userData.annual_income) * 100, 100)}
                sx={{
                  flexGrow: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: JP_MORGAN_LIGHT,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: (userData.current_debt / userData.annual_income) > 0.4 ? 'error.main' : 'success.main',
                  },
                }}
              />
              <Typography variant="body2" fontWeight="bold">
                {((userData.current_debt / userData.annual_income) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedUserDataCard;