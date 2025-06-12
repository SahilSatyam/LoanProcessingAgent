import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const loanAPI = {
  greetUser: (userId, name) => 
    api.post('/greet_user', { user_id: userId, name }),
  
  fetchUserData: (userId, loanType) => 
    api.post('/fetch_user_data', { user_id: userId, loan_type: loanType }),
  
  confirmUserData: (userId) => 
    api.post('/confirm_user_data', { user_id: userId }),
  
  askLoanAmount: (userId) => 
    api.post('/ask_loan_amount', { user_id: userId }),
  
  calculateEligibility: (userId, loanAmount) => 
    api.post('/calculate_eligibility', { user_id: userId, loan_amount: loanAmount }),
  
  finalConfirmation: (userId) => 
    api.post('/final_confirmation', { user_id: userId }),

  continueConversation: (userId, message) =>
    api.post('/chat', { user_id: userId, message }),

  downloadLoanAgreement: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/download-loan-agreement`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
