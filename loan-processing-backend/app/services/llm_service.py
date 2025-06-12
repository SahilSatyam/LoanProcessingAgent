import requests
import json
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        # Configure Deepseek API
        self.api_url = "https://api.deepseek.com/v1/chat/completions"
        self.api_key = os.environ.get("DEEPSEEK_API_KEY", "YOUR_DEEPSEEK_API_KEY")  # Load from env
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def generate_response(self, prompt: str, context: Optional[dict] = None) -> str:
        """Generate conversational response using Deepseek API"""
        try:
            # For demo purposes, if API key is not set, use mock responses
            if self.api_key == "YOUR_DEEPSEEK_API_KEY":
                return self._get_mock_response(prompt, context)
            
            # Actual API call
            payload = {
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": """You are a professional loan processing agent working for LoanAgent Pro. Your role is to help customers apply for loans by collecting necessary information through natural conversation.

IMPORTANT GUIDELINES:
1. Be professional, friendly, and helpful
2. Ask follow-up questions to clarify or validate information
3. Provide helpful guidance about loan requirements and processes
4. Keep responses concise but informative
5. Always maintain a conversational tone"""},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1000,
                "stream": False
            }
            
            response = requests.post(self.api_url, headers=self.headers, json=payload)
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                return self._get_mock_response(prompt, context)
                
        except Exception as e:
            print(f"LLM API error: {e}")
            return self._get_mock_response(prompt, context)
    
    def _get_mock_response(self, prompt: str, context: Optional[dict] = None) -> str:
        """Fallback mock responses for demo"""
        if "greet" in prompt.lower():
            name = context.get('name', 'valued customer') if context else 'valued customer'
            return f"Hello {name}! Welcome to our loan processing system. I'm here to help you with your loan application. What type of loan are you interested in today? We offer:\n\n• Personal Loans\n• Home Loans\n• Auto Loans\n• Business Loans"
        
        elif "confirm" in prompt.lower() and "data" in prompt.lower():
            return "I've retrieved your information from our system. Please review the details above and confirm if everything looks correct. You can type 'confirm' to proceed or 'edit' if you need to make any changes."
        
        elif "loan amount" in prompt.lower():
            return "Great! Now, please enter the loan amount you'd like to apply for. I'll check your eligibility based on your financial profile."
        
        elif "approved" in prompt.lower():
            amount = context.get('amount', 0) if context else 0
            return f"🎉 Congratulations! Your loan application for ${amount:,.2f} has been approved! Our team will contact you within 24-48 hours to discuss the next steps and finalize the documentation. Thank you for choosing our services!"
        
        elif "denied" in prompt.lower():
            return "I'm sorry, but based on our current assessment, we're unable to approve your loan request at this time. This could be due to various factors including debt-to-income ratio or credit requirements. Our financial advisors can help you improve your eligibility. Would you like to schedule a consultation?"
        
        return "I'm here to help with your loan application. Please let me know how I can assist you."
