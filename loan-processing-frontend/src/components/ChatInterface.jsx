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
} from '@mui/material';
import MessageBubble from './MessageBubble';
import UserDataCard from './UserDataCard';
import { loanAPI } from '../services/api';

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
  // Randomly select a user ID for this session
  const [userId] = useState(() => userIds[Math.floor(Math.random() * userIds.length)]);

  useEffect(() => {
    if (!greetingSentRef.current) {
      handleGreeting();
      greetingSentRef.current = true;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await loanAPI.greetUser(userId, 'John Doe');
      setTimeout(() => {
        addMessage(response.data.message);
        setCurrentStep('loan_type');
        setTypingIndicator(false);
      }, 1000);
    } catch (error) {
      setError('Error connecting to server. Please try again.');
      addMessage('Error connecting to server. Please try again.');
    }
    setLoading(false);
  };

  const handleLoanTypeSelect = async () => {
    if (!loanType) return;
    
    addMessage(`I'm interested in a ${loanType} loan`, true);
    setLoading(true);
    setTypingIndicator(true);
    
    try {
      const response = await loanAPI.fetchUserData(userId, loanType);
      setTimeout(() => {
        setUserData(response.data);
        addMessage(response.data.llm_message);
        setCurrentStep('confirm_data');
        setTypingIndicator(false);
      }, 1500);
    } catch (error) {
      setError('Error fetching your data. Please try again.');
      addMessage('Error fetching your data. Please try again.');
    }
    setLoading(false);
  };

  const handleDataConfirmation = async (confirmed) => {
    addMessage(confirmed ? 'Yes, everything looks correct' : 'No, I need to make changes', true);
    
    if (confirmed) {
      setLoading(true);
      try {
        const response = await loanAPI.askLoanAmount(userId);
        addMessage(response.data.message);
        setCurrentStep('loan_amount');
      } catch (error) {
        addMessage('Error processing confirmation. Please try again.');
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
    
    addMessage(`I'd like to apply for $${amount.toLocaleString()}`, true);
    setInput('');
    setLoading(true);
    
    try {
      const response = await loanAPI.calculateEligibility(userId, amount);
      setEligibilityData(response.data);
      
      if (response.data.is_eligible) {
        addMessage('Here are your eligibility results:');
        addMessage('Please review the loan agreement document and provide your e-signature.', false);
        setCurrentStep('document_review');
      } else {
        addMessage('Here are your eligibility results:');
        addMessage('You are not eligible to proceed with the loan application.', false);
        setCurrentStep('final_decision');
      }
    } catch (error) {
      setError('Error calculating eligibility. Please try again.');
      addMessage('Error calculating eligibility. Please try again.', false);
      setCurrentStep('final_decision');
    }
    setLoading(false);
  };

  const handleDocumentDownload = () => {
    addMessage('Loan agreement document simulated for download.', false);
    setDocumentDownloaded(true);
  };

  const handleAgreementAccept = async () => {
    setLoading(true);
    addMessage('I agree with the terms and conditions.', true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
      addMessage('Congratulations! Your loan has been processed. We will shortly send the documents for your signature.', false);
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
              You are not eligible to proceed with the loan application. // please contact the nearest branch to get more information
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
                {agreementAccepted === false ? 'Please contact the nearest branch.' : 'You are not eligible to proceed with the loan application.'}
              </Typography>
            </Box>
          );
        }
        // If agreement was accepted and eligible
        if (eligibilityData && eligibilityData.is_eligible && agreementAccepted === true) {
          return (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography color="success.main" variant="body1">
                We will shortly send the documents for your signature.
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={9}>
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 1, sm: 3 },
              height: '85vh', 
              display: 'flex', 
              flexDirection: 'column',
              background: `linear-gradient(135deg, ${JP_MORGAN_LIGHT} 0%, #eaf1f8 100%)`,
              borderRadius: 5,
              boxShadow: JP_MORGAN_SHADOW,
              border: `1.5px solid ${JP_MORGAN_GRAY}`,
            }}
          >
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                textAlign: 'center',
                color: JP_MORGAN_BLUE,
                mb: 3,
                fontWeight: 700,
                letterSpacing: '-0.5px',
                fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
              }}
            >
              AI Loan Assistant
            </Typography>
            
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
                          <UserDataCard userData={userData} />
                        </Box>
                      </Zoom>
                    )}
                  {eligibilityData &&
                    !msg.isUser &&
                    msg.text &&
                    msg.text.toLowerCase().includes('here are your eligibility results') && (
                      <Zoom in={true}>
                        <Card sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom color="primary">
                              Eligibility Results
                            </Typography>
                            <Grid container spacing={3}>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                  Maximum Eligible Amount
                                </Typography>
                                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 600 }}>
                                  ${eligibilityData.eligible_loan_amount.toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                  Requested Amount
                                </Typography>
                                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 600 }}>
                                  ${eligibilityData.requested_amount.toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Chip
                                  label={eligibilityData.is_eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                                  color={eligibilityData.is_eligible ? 'success' : 'error'}
                                  size="large"
                                  sx={{ 
                                    mt: 2,
                                    px: 2,
                                    py: 1,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                  }}
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
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

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ChatInterface;
