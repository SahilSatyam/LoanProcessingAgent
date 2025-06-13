import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:8000'; // temporary fix
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and adding request ID
api.interceptors.request.use(
  (config) => {
    // Add request timestamp and ID for tracking
    config.metadata = {
      startTime: Date.now(),
      requestId: Math.random().toString(36).substr(2, 9)
    };
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      requestId: config.metadata.requestId,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
// Enhanced error handling in interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Add error classification for monitoring
    const errorType = error.response?.status >= 500 ? 'server' : 
                    error.response?.status >= 400 ? 'client' : 'network';
    
    console.error(`[API Error][${errorType}]`, {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    
    const duration = error.config?.metadata ? Date.now() - error.config.metadata.startTime : 0;
    
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      requestId: error.config?.metadata?.requestId,
      status: error.response?.status,
      duration: `${duration}ms`,
      message: error.message,
      data: error.response?.data
    });
    
    // Enhanced error handling based on status codes
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data?.detail || 'Invalid request. Please check your input.');
        case 401:
          throw new Error('Authentication required. Please log in.');
        case 403:
          throw new Error('Access denied. You don\'t have permission for this action.');
        case 404:
          throw new Error(data?.detail || 'The requested resource was not found.');
        case 429:
          throw new Error('Too many requests. Please wait a moment and try again.');
        case 500:
          throw new Error(data?.detail || 'Server error. Please try again later.');
        case 503:
          throw new Error('Service temporarily unavailable. Please try again later.');
        default:
          throw new Error(data?.detail || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
);

// Retry utility function
const retryRequest = async (requestFn, maxRetries = MAX_RETRIES) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[API Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export const loanAPI = {
  // Core loan processing endpoints
  greetUser: (userId, name) => 
    retryRequest(() => api.post('/greet_user', { user_id: userId, name })),
  
  fetchUserData: (userId, loanType) => 
    retryRequest(() => api.post('/fetch_user_data', { user_id: userId, loan_type: loanType })),
  
  confirmUserData: (userId) => 
    retryRequest(() => api.post('/confirm_user_data', { user_id: userId })),
  
  askLoanAmount: (userId) => 
    retryRequest(() => api.post('/ask_loan_amount', { user_id: userId })),
  
  calculateEligibility: (userId, loanAmount) => 
    retryRequest(() => api.post('/calculate_eligibility', { user_id: userId, loan_amount: loanAmount })),
  
  finalConfirmation: (userId) => 
    retryRequest(() => api.post('/final_confirmation', { user_id: userId })),

  continueConversation: (userId, message) =>
    retryRequest(() => api.post('/chat', { user_id: userId, message })),

  downloadLoanAgreement: async () => {
    return retryRequest(async () => {
      const response = await api.get('/download-loan-agreement', {
        responseType: 'blob',
        timeout: 60000 // Longer timeout for file downloads
      });
      return response.data;
    });
  },

  // Health and monitoring endpoints
  checkHealth: () => 
    api.get('/health'),
  
  getStats: () => 
    api.get('/stats'),
  
  // Admin endpoints (if needed)
  clearCache: () => 
    api.post('/admin/clear-cache'),
};

// Utility functions for error handling
export const handleApiError = (error, context = '') => {
  console.error(`[API Error${context ? ` - ${context}` : ''}]`, error);
  
  // Return user-friendly error message
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Connection status checker
export const checkConnection = async () => {
  try {
    await loanAPI.checkHealth();
    return { connected: true, message: 'Connected to server' };
  } catch (error) {
    return { 
      connected: false, 
      message: handleApiError(error, 'Connection Check')
    };
  }
};

// Export API instance for direct use if needed
export { api };
