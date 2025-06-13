import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  Fade,
  Zoom,
  Alert,
  Snackbar,
  Stepper,
  Step,
  StepLabel,
  Badge,
  Tooltip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Download,
  Send,
  Person,
  SmartToy,
  Refresh,
  SignalWifiOff,
  SignalWifi4Bar,
  Speed,
  Security,
  Assessment,
} from '@mui/icons-material';
import MessageBubble from './MessageBubble';
import UserDataCard from './UserDataCard';
import EnhancedUserDataCard from './EnhancedUserDataCard';
import EnhancedEligibilityCard from './EnhancedEligibilityCard';
import { loanAPI, handleApiError, checkConnection } from '../services/api';

const JP_MORGAN_BLUE = '#003366';
const JP_MORGAN_LIGHT = '#f4f6fa';
const JP_MORGAN_ACCENT = '#00a3e0';
const JP_MORGAN_GRAY = '#e5e8ed';
const JP_MORGAN_SHADOW = '0 4px 24px rgba(0, 51, 102, 0.08)';

const userIds = ['USR001', 'USR002', 'USR003', 'USR004'];

const steps = [
  { label: 'Loan Type', value: 'loan_type' },
  { label: 'Data Verification', value: 'confirm_data' },
  { label: 'Loan Amount', value: 'loan_amount' },
  { label: 'Eligibility Check', value: 'eligibility_check' },
  { label: 'Document Review', value: 'document_review' },
  { label: 'Final Decision', value: 'final_decision' }
];

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('greeting');
  const [userData, setUserData] = useState(null);
  const [loanType, setLoanType] = useState('');
  const [eligibilityData, setEligibilityData] = useState(null);
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const greetingSentRef = useRef(false);
  const [documentDownloaded, setDocumentDownloaded] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(null); // null: no decision, true: accepted, false: rejected
  const [connectionStatus, setConnectionStatus] = useState({ connected: true, message: '' });
  const [retryCount, setRetryCount] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [requestInProgress, setRequestInProgress] = useState(false);
  // Randomly select a user ID for this session
  const [userId] = useState(() => userIds[Math.floor(Math.random() * userIds.length)]);
  const connectionCheckInterval = useRef(null);

  useEffect(() => {
    if (!greetingSentRef.current) {
      handleGreeting();
      startConnectionMonitoring();
      greetingSentRef.current = true;
    }
    
    // Cleanup on unmount
    return () => {
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connection monitoring
  const startConnectionMonitoring = () => {
    // Check connection immediately
    checkConnectionStatus();
    
    // Set up periodic connection checks (every 30 seconds)
    connectionCheckInterval.current = setInterval(checkConnectionStatus, 30000);
  };

  const checkConnectionStatus = async () => {
    try {
      const status = await checkConnection();
      setConnectionStatus(status);
      if (status.connected && retryCount > 0) {
        setRetryCount(0); // Reset retry count on successful connection
      }
    } catch (error) {
      setConnectionStatus({ 
        connected: false, 
        message: 'Unable to connect to server' 
      });
    }
  };

  // Enhanced error handling with retry logic
  const handleApiCall = async (apiCall, context = '') => {
    setRequestInProgress(true);
    try {
      const result = await apiCall();
      setRetryCount(0); // Reset on success
      return result;
    } catch (error) {
      const errorMessage = handleApiError(error, context);
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
      throw error;
    } finally {
      setRequestInProgress(false);
    }
  };

  // System stats fetcher
  const fetchSystemStats = async () => {
    try {
      const response = await loanAPI.getStats();
      setSystemStats(response.data);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message, isUser = false) => {
    setMessages(prev => [...prev, { text: message, isUser, timestamp: new Date() }]);
  };

  const handleGreeting = async () => {
    if (messages.length > 0) return;
    setLoading(true);
    setTypingIndicator(true);
    try {
      const response = await handleApiCall(
        () => loanAPI.greetUser(userId, 'John Doe'),
        'Initial Greeting'
      );
      setTimeout(() => {
        addMessage(response.data.message);
        setCurrentStep('loan_type');
        setTypingIndicator(false);
      }, 1000);
    } catch (error) {
      setTypingIndicator(false);
      // Error already handled by handleApiCall
    }
    setLoading(false);
  };

  const handleLoanTypeSelect = async () => {
    if (!loanType) return;
    
    addMessage(`I'm interested in a ${loanType} loan`, true);
    setLoading(true);
    setTypingIndicator(true);
    
    try {
      const response = await handleApiCall(
        () => loanAPI.fetchUserData(userId, loanType),
        'Fetch User Data'
      );
      setTimeout(() => {
        setUserData(response.data);
        addMessage(response.data.llm_message);
        setCurrentStep('confirm_data');
        setTypingIndicator(false);
      }, 1500);
    } catch (error) {
      setTypingIndicator(false);
      // Error already handled by handleApiCall
    }
    setLoading(false);
  };

  const handleDataConfirmation = async (confirmed) => {
    addMessage(confirmed ? 'Yes, everything looks correct' : 'No, I need to make changes', true);
    
    if (confirmed) {
      setLoading(true);
      try {
        const response = await handleApiCall(
          () => loanAPI.askLoanAmount(userId),
          'Confirm User Data'
        );
        addMessage(response.data.message);
        setCurrentStep('loan_amount');
      } catch (error) {
        // Error already handled by handleApiCall
      }
      setLoading(false);
    } else {
      addMessage('Please contact our support team to update your information.');
    }
  };

  const handleLoanAmountSubmit = async () => {
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) {
      addMessage('Please enter a valid loan amount.');
      return;
    }
    
    if (amount > 10000000) {
      setError('Loan amount cannot exceed $10,000,000');
      return;
    }
    
    addMessage(`I'd like to apply for $${amount.toLocaleString()}`, true);
    setInput('');
    setLoading(true);
    
    try {
      const response = await handleApiCall(
        () => loanAPI.calculateEligibility(userId, amount),
        'Calculate Eligibility'
      );
      setEligibilityData(response.data);
      
      if (response.data.is_eligible) {
        addMessage('Here are your eligibility results:');
        addMessage('Please review the loan agreement document and provide your e-signature.', false);
        setCurrentStep('document_review');
      } else {
        addMessage('Here are your eligibility results:');
        addMessage('Please contact the nearest branch for further assistance.', false);
        setCurrentStep('final_decision');
      }
    } catch (error) {
      setCurrentStep('final_decision');
      // Error already handled by handleApiCall
    }
    setLoading(false);
  };

  const handleDocumentDownload = async () => {
    setLoading(true);
    try {
      const blob = await handleApiCall(
        () => loanAPI.downloadLoanAgreement(),
        'Download Agreement'
      );
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Loan_Agreement.doc');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addMessage('Loan agreement document downloaded successfully.', false);
      setDocumentDownloaded(true);
    } catch (error) {
      // Error already handled by handleApiCall
    }
    setLoading(false);
  };

  const handleAgreementAccept = async () => {
    setLoading(true);
    addMessage('I agree with the terms and conditions.', true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
      addMessage('Congratulations! Your loan has been processed.', false);
      setAgreementAccepted(true);
      setCurrentStep('final_decision');
    } catch (error) {
      setError('Error processing your agreement. Please try again.');
      addMessage('Error processing your agreement. Please try again.', false);
      setAgreementAccepted(false);
      setCurrentStep('final_decision');
    }
    setLoading(false);
  };

  const handleAgreementReject = () => {
    addMessage('I do not agree with the terms and conditions.', true);
    addMessage('Please contact the nearest branch for further assistance.', false);
    setAgreementAccepted(false);
    setCurrentStep('final_decision');
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    addMessage(input, true);
    setLoading(true);
    try {
      const response = await loanAPI.continueConversation(userId, input);
      addMessage(response.data.message);
    } catch (error) {
      setError("Error sending message. Please try again.");
    }
    setInput("");
    setLoading(false);
  };

  const getActiveStepperStep = () => {
    if (currentStep === 'final_decision') {
      if (userData && !userData.ofac_check) {
        return steps.findIndex(step => step.value === 'confirm_data');
      }
      if (eligibilityData && !eligibilityData.is_eligible) {
        return steps.findIndex(step => step.value === 'eligibility_check');
      }
      if (documentDownloaded && agreementAccepted === false) {
        return steps.findIndex(step => step.value === 'document_review');
      }
      if (agreementAccepted === true) {
        return steps.findIndex(step => step.value === 'final_decision');
      }
    }
    return steps.findIndex(step => step.value === currentStep);
  };

  const renderInput = () => {
    switch (currentStep) {
      case 'loan_type':
        return (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Loan Type</InputLabel>
              <Select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                label="Select Loan Type"
              >
                <MenuItem value="personal">Personal Loan</MenuItem>
                <MenuItem value="home">Home Loan</MenuItem>
                <MenuItem value="auto">Auto Loan</MenuItem>
                <MenuItem value="business">Business Loan</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleLoanTypeSelect}
              disabled={!loanType || loading}
            >
              Select
            </Button>
          </Box>
        );
      
      case 'confirm_data':
        return userData && !userData.ofac_check ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography color="error" variant="body1">
              Please contact the nearest branch to get more information.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleDataConfirmation(true)}
              disabled={loading}
            >
              Confirm
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleDataConfirmation(false)}
              disabled={loading}
            >
              Edit
            </Button>
          </Box>
        );
      
      case 'loan_amount':
        return (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Loan Amount ($)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleLoanAmountSubmit();
                }
              }}
            />
            <Button
              variant="contained"
              onClick={handleLoanAmountSubmit}
              disabled={loading}
            >
              Submit
            </Button>
          </Box>
        );
      
      case 'eligibility_check':
        // The input area for eligibility_check is handled by the final_decision case below
        // The eligibility card is rendered outside this renderInput function
        return null;

      case 'document_review':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!documentDownloaded && (
              <Button
                variant="contained"
                onClick={handleDocumentDownload}
                disabled={loading}
                sx={{ bgcolor: JP_MORGAN_ACCENT, '&:hover': { bgcolor: '#007bbd' } }}
              >
                Download Loan Agreement
              </Button>
            )}
            {documentDownloaded && agreementAccepted === null && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleAgreementAccept}
                  disabled={loading}
                >
                  Agree to Terms
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleAgreementReject}
                  disabled={loading}
                >
                  Disagree
                </Button>
              </Box>
            )}
          </Box>
        );
      
      case 'final_decision':
        // If OFAC failed OR eligibility failed OR agreement was rejected
        if ((userData && !userData.ofac_check) || (eligibilityData && !eligibilityData.is_eligible) || (agreementAccepted === false)) {
          return (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography color="error" variant="body1">
                {agreementAccepted === false ? 'Please contact the nearest branch.' : 'Please contact the nearest branch to get your issue resolved.'}
              </Typography>
            </Box>
          );
        }
        // If agreement was accepted and eligible
        if (eligibilityData && eligibilityData.is_eligible && agreementAccepted === true) {
          return (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography color="success.main" variant="body1">
                Congratulations, your loan is processed. We will send the amount shortly.
              </Typography>
            </Box>
          );
        }
        return null; // Should ideally not reach here if flow is correct
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={3} sx={{ flexGrow: 1, height: '100%' }}>
        {/* Main Chat Area */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper
            elevation={3}
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#f8f9fa',
              border: `2px solid ${JP_MORGAN_BLUE}`,
              borderRadius: 2,
            }}
          >
            {/* Header with Connection Status */}
            <Box
              sx={{
                bgcolor: JP_MORGAN_BLUE,
                color: 'white',
                p: 2,
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartToy />
                <Typography variant="h6" fontWeight="bold">
                  JP Morgan Loan Assistant
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Connection Status Indicator */}
                <Tooltip title={connectionStatus.message || (connectionStatus.connected ? 'Connected' : 'Disconnected')}>
                  <Badge
                    color={connectionStatus.connected ? 'success' : 'error'}
                    variant="dot"
                    sx={{
                      '& .MuiBadge-badge': {
                        animation: connectionStatus.connected ? 'none' : 'pulse 2s infinite',
                      },
                    }}
                  >
                    {connectionStatus.connected ? <SignalWifi4Bar /> : <SignalWifiOff />}
                  </Badge>
                </Tooltip>
                
                {/* Retry indicator */}
                {retryCount > 0 && (
                  <Tooltip title={`Retry attempt: ${retryCount}`}>
                    <Chip
                      size="small"
                      label={retryCount}
                      color="warning"
                      sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                    />
                  </Tooltip>
                )}
                
                {/* System Stats Button */}
                <Tooltip title="System Statistics">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setShowStats(true);
                      fetchSystemStats();
                    }}
                    sx={{ color: 'white' }}
                  >
                    <Assessment />
                  </IconButton>
                </Tooltip>
                
                {/* Manual Refresh Button */}
                <Tooltip title="Refresh Connection">
                  <IconButton
                    size="small"
                    onClick={checkConnectionStatus}
                    sx={{ color: 'white' }}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            {/* Request Progress Indicator */}
            {requestInProgress && (
              <LinearProgress 
                sx={{ 
                  bgcolor: 'rgba(0,51,102,0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: JP_MORGAN_BLUE
                  }
                }} 
              />
            )}
            
            <Box 
              sx={{ 
                flexGrow: 1, 
                overflow: 'auto', 
                mb: 2,
                px: { xs: 0, sm: 2 },
                '&::-webkit-scrollbar': {
                  width: '8px',
                  background: JP_MORGAN_LIGHT,
                },
                '&::-webkit-scrollbar-thumb': {
                  background: JP_MORGAN_GRAY,
                  borderRadius: '4px',
                },
              }}
            >
              {messages.map((msg, index) => (
                <React.Fragment key={index}>
                  <Fade in={true}>
                    <Box>
                      <MessageBubble 
                        message={msg.text} 
                        isUser={msg.isUser}
                        timestamp={msg.timestamp}
                      />
                    </Box>
                  </Fade>
                  {userData &&
                    !msg.isUser &&
                    msg.text &&
                    msg.text === userData.llm_message && (
                      <Zoom in={true}>
                        <Box sx={{ my: 2 }}>
                          <EnhancedUserDataCard 
                            userData={userData} 
                            ofacStatus={userData.ofac_status || 'clear'}
                            loading={loading && currentStep === 'user_data'}
                          />
                        </Box>
                      </Zoom>
                    )}
                  {eligibilityData &&
                    !msg.isUser &&
                    msg.text &&
                    msg.text.toLowerCase().includes('here are your eligibility results') && (
                      <Zoom in={true}>
                        <Box sx={{ my: 2 }}>
                          <EnhancedEligibilityCard eligibilityData={eligibilityData} />
                        </Box>
                      </Zoom>
                    )}
                </React.Fragment>
              ))}
              
              {typingIndicator && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, mb: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    AI is typing...
                  </Typography>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </Box>
            
            <Box sx={{ mt: 'auto', pt: 2, borderTop: `1.5px solid ${JP_MORGAN_GRAY}`, background: JP_MORGAN_LIGHT, borderRadius: '0 0 32px 32px' }}>
              {renderInput()}
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
              height: '85vh',
              background: JP_MORGAN_LIGHT,
              borderRadius: 5,
              boxShadow: JP_MORGAN_SHADOW,
              border: `1.5px solid ${JP_MORGAN_GRAY}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                color: JP_MORGAN_BLUE,
                fontWeight: 600,
                mb: 3,
              }}
            >
              Application Progress
            </Typography>
            
            <Stepper 
              activeStep={getActiveStepperStep()} 
              orientation="vertical"
              sx={{
                '& .MuiStepLabel-label': {
                  color: JP_MORGAN_BLUE,
                  fontWeight: 500,
                },
                '& .MuiStepLabel-label.Mui-active': {
                  color: JP_MORGAN_ACCENT,
                  fontWeight: 600,
                },
                '& .MuiStepLabel-label.Mui-completed': {
                  color: JP_MORGAN_BLUE,
                },
                '& .MuiStepIcon-root': {
                  color: JP_MORGAN_GRAY,
                },
                '& .MuiStepIcon-root.Mui-active': {
                  color: JP_MORGAN_ACCENT,
                },
                '& .MuiStepIcon-root.Mui-completed': {
                  color: JP_MORGAN_BLUE,
                },
                '& .MuiStepIcon-root.Mui-error': {
                  color: 'error.main', // Red color for error
                },
              }}
            >
              {steps.map((step, index) => {
                const isActive = index === getActiveStepperStep();
                const isCompleted = index < getActiveStepperStep();
                let isError = false;

                if (step.value === 'confirm_data' && userData && !userData.ofac_check) {
                  isError = true;
                }
                if (step.value === 'eligibility_check' && eligibilityData && !eligibilityData.is_eligible) {
                  isError = true;
                }
                if (step.value === 'document_review' && documentDownloaded && agreementAccepted === false) {
                  isError = true;
                }

                return (
                  <Step 
                    key={step.label}
                    completed={isCompleted || (step.value === 'final_decision' && currentStep === 'final_decision' && agreementAccepted === true)}
                    error={isError || (step.value === 'final_decision' && currentStep === 'final_decision' && agreementAccepted === false)}
                  >
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          </Paper>
        </Grid>
      </Grid>

      {/* System Stats Dialog */}
      <Dialog
        open={showStats}
        onClose={() => setShowStats(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: JP_MORGAN_BLUE, color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment />
            System Statistics
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {systemStats ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Performance
                    </Typography>
                    <Typography variant="body2">
                      Active Sessions: {systemStats.session_count || 0}
                    </Typography>
                    <Typography variant="body2">
                      Server Status: {systemStats.status || 'Unknown'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Security
                    </Typography>
                    <Typography variant="body2">
                      OFAC Cache: {systemStats.ofac_cache_size || 0} entries
                    </Typography>
                    <Typography variant="body2">
                      Excel Cache: {systemStats.excel_cache_size || 0} entries
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Connection Status
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {connectionStatus.connected ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="Connected"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<Error />}
                          label="Disconnected"
                          color="error"
                          size="small"
                        />
                      )}
                      <Typography variant="body2">
                        {connectionStatus.message}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStats(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={8000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError('')} 
          severity="error" 
          sx={{ 
            width: '100%',
            '& .MuiAlert-action': {
              alignItems: 'center'
            }
          }}
          action={
            !connectionStatus.connected && (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setError('');
                  checkConnectionStatus();
                }}
                startIcon={<Refresh />}
              >
                Retry
              </Button>
            )
          }
        >
          {error}
        </Alert>
      </Snackbar>
      
      {/* CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Container>
  );
};

export default ChatInterface;
