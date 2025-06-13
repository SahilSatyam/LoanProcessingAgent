import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Grid,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Info,
  AccountBalance,
  AttachMoney,
  CalendarToday,
  TrendingUp,
  HelpOutline,
} from '@mui/icons-material';

const JP_MORGAN_BLUE = '#003366';
const JP_MORGAN_LIGHT = '#e8f4fd';
const JP_MORGAN_GOLD = '#d4af37';

const EnhancedEligibilityCard = ({ eligibilityData }) => {
  if (!eligibilityData) {
    return (
      <Card sx={{ mb: 2, border: `1px solid ${JP_MORGAN_BLUE}` }}>
        <CardContent>
          <Typography variant="h6" color="text.secondary">
            No eligibility data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const {
    eligible,
    loan_amount,
    interest_rate,
    loan_term_years,
    monthly_payment,
    total_payment,
    total_interest,
    reason,
    risk_score,
    max_eligible_amount,
  } = eligibilityData;

  const formatCurrency = (amount) => {
    if (typeof amount === 'number' || !isNaN(parseFloat(amount))) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return amount;
  };

  const formatPercentage = (value) => {
    if (typeof value === 'number' || !isNaN(parseFloat(value))) {
      return `${parseFloat(value).toFixed(2)}%`;
    }
    return value;
  };

  const getRiskColor = (score) => {
    if (score <= 25) return 'success.main';
    if (score <= 50) return 'info.main';
    if (score <= 75) return 'warning.main';
    return 'error.main';
  };

  const getEligibilityStatus = () => {
    if (eligible) {
      return {
        icon: <CheckCircle />,
        label: 'Approved',
        color: 'success',
      };
    } else if (max_eligible_amount > 0) {
      return {
        icon: <Warning />,
        label: 'Partially Eligible',
        color: 'warning',
      };
    } else {
      return {
        icon: <Cancel />,
        label: 'Not Eligible',
        color: 'error',
      };
    }
  };

  const status = getEligibilityStatus();

  return (
    <Card
      sx={{
        mb: 2,
        border: `2px solid ${eligible ? 'success.main' : (max_eligible_amount > 0 ? 'warning.main' : 'error.main')}`,
        borderRadius: 2,
        boxShadow: 3,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Status Badge */}
      <Box
        sx={{
          position: 'absolute',
          top: -15,
          right: 20,
          bgcolor: `${status.color}.main`,
          color: 'white',
          borderRadius: 2,
          px: 2,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          boxShadow: 2,
        }}
      >
        {status.icon}
        <Typography variant="subtitle2" fontWeight="bold">
          {status.label}
        </Typography>
      </Box>

      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AccountBalance sx={{ color: JP_MORGAN_BLUE, mr: 1 }} />
          <Typography variant="h6" fontWeight="bold" color={JP_MORGAN_BLUE}>
            Loan Eligibility Results
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Loan Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Loan Details
            </Typography>

            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <AttachMoney sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Requested Amount:</strong> {formatCurrency(loan_amount)}
              </Typography>
            </Box>

            {max_eligible_amount > 0 && max_eligible_amount < loan_amount && (
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ fontSize: 16, mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="warning.main" fontWeight="bold">
                  <strong>Maximum Eligible Amount:</strong> {formatCurrency(max_eligible_amount)}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Interest Rate:</strong> {formatPercentage(interest_rate)}
              </Typography>
              <Tooltip title="Annual Percentage Rate based on your credit profile and loan amount">
                <IconButton size="small" sx={{ ml: 0.5 }}>
                  <HelpOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2">
                <strong>Loan Term:</strong> {loan_term_years} years
              </Typography>
            </Box>
          </Grid>

          {/* Payment Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Payment Information
            </Typography>

            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Monthly Payment:</strong> {formatCurrency(monthly_payment)}
              </Typography>
            </Box>

            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Total Payment:</strong> {formatCurrency(total_payment)}
              </Typography>
            </Box>

            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>Total Interest:</strong> {formatCurrency(total_interest)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Risk Assessment */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Risk Assessment
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2">
              <strong>Risk Score:</strong>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={risk_score}
              sx={{
                flexGrow: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: JP_MORGAN_LIGHT,
                '& .MuiLinearProgress-bar': {
                  bgcolor: getRiskColor(risk_score),
                },
              }}
            />
            <Chip
              label={`${risk_score}%`}
              size="small"
              sx={{
                bgcolor: getRiskColor(risk_score),
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Box>
        </Box>

        {/* Decision Explanation */}
        {reason && (
          <Alert
            severity={eligible ? 'success' : (max_eligible_amount > 0 ? 'warning' : 'error')}
            icon={eligible ? <CheckCircle /> : (max_eligible_amount > 0 ? <Warning /> : <Info />)}
            sx={{ mt: 2 }}
          >
            <Typography variant="body2">{reason}</Typography>
          </Alert>
        )}

        {/* Interest Breakdown */}
        {eligible && (
          <Box sx={{ mt: 2, p: 1, bgcolor: JP_MORGAN_LIGHT, borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Payment Breakdown
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  flexGrow: 1,
                  height: 20,
                  display: 'flex',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${(loan_amount / total_payment) * 100}%`,
                    bgcolor: JP_MORGAN_BLUE,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="caption" color="white" fontWeight="bold">
                    Principal
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: `${(total_interest / total_payment) * 100}%`,
                    bgcolor: JP_MORGAN_GOLD,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="caption" color="white" fontWeight="bold">
                    Interest
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="caption">
                Principal: {((loan_amount / total_payment) * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption">
                Interest: {((total_interest / total_payment) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedEligibilityCard;