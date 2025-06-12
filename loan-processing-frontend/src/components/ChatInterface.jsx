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
      addMessage('Here are your eligibility results:');
      setCurrentStep('eligibility_result');
      
      // Get final confirmation
      const confirmResponse = await loanAPI.finalConfirmation(userId);
      addMessage(confirmResponse.data.message);
      setCurrentStep('complete');
    } catch (error) {
      addMessage('Error calculating eligibility. Please try again.');
    }
    setLoading(false);
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
        return (
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
                // Shift+Enter inserts a newline by default
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
      
      case 'eligibility_result':
      case 'complete':
        return (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Type your message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
                // Shift+Enter inserts a newline by default
              }}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
            >
              Send
            </Button>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
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
