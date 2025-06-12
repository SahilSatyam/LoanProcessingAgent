import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Divider,
  Avatar,
  Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const UserDataCard = ({ userData }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <Grid item xs={12}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar
          sx={{
            bgcolor: 'primary.light',
            width: 40,
            height: 40,
          }}
        >
          <Icon />
        </Avatar>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {value}
          </Typography>
        </Box>
      </Box>
    </Grid>
  );

  return (
    <Card sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3 }}>
          Your Information
        </Typography>
        <Grid container spacing={2}>
          <InfoRow
            icon={PersonIcon}
            label="Full Name"
            value={userData.name}
          />
          <InfoRow
            icon={TrendingUpIcon}
            label="Monthly Income"
            value={formatCurrency(userData.monthly_income)}
          />
          <InfoRow
            icon={TrendingDownIcon}
            label="Monthly Expenses"
            value={formatCurrency(userData.monthly_expenses)}
          />
          <InfoRow
            icon={MoneyIcon}
            label="Existing Loans"
            value={formatCurrency(userData.existing_loan)}
          />
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          <InfoRow
            icon={VerifiedUserIcon}
            label="Sanction Check Status"
            value={userData.ofac_status}
          />
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Chip
                label={userData.ofac_check ? 'Sanction Check Passed' : 'Sanction Check Failed'}
                color={userData.ofac_check ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default UserDataCard;
