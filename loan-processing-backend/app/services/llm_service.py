import requests
import json
import os
from typing import Optional, List, Dict
from dotenv import load_dotenv
from datetime import datetime
import time

load_dotenv()

class ConversationContext:
    def __init__(self, max_history: int = 10):
        self.messages: List[Dict] = []
        self.max_history = max_history
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
        self.metadata: Dict = {}

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self.last_updated = datetime.now()
        if len(self.messages) > self.max_history:
            self.messages.pop(0)

    def get_context_summary(self) -> str:
        """Generate a summary of the conversation context"""
        summary = []
        for msg in self.messages[-3:]:  # Only include last 3 messages for summary
            summary.append(f"{msg['role']}: {msg['content']}")
        return "\n".join(summary)

class LLMService:
    def __init__(self):
        # Configure Deepseek API
        self.api_url = "https://api.deepseek.com/v1/chat/completions"
        self.api_key = os.environ.get("DEEPSEEK_API_KEY", "YOUR_DEEPSEEK_API_KEY")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.conversations: Dict[str, ConversationContext] = {}
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    def _get_system_prompt(self) -> str:
        return """You are a professional loan processing agent working for LoanAgent Pro. Your role is to help customers apply for loans by collecting necessary information through natural conversation.

IMPORTANT GUIDELINES:
1. Be professional, friendly, and helpful
2. Ask follow-up questions to clarify or validate information
3. Provide helpful guidance about loan requirements and processes
4. Keep responses concise but informative
5. Always maintain a conversational tone
6. Use the conversation history to maintain context and provide relevant responses
7. If you notice any inconsistencies in user information, politely ask for clarification"""

    def get_or_create_conversation(self, user_id: str) -> ConversationContext:
        if user_id not in self.conversations:
            self.conversations[user_id] = ConversationContext()
        return self.conversations[user_id]

    def generate_response(self, prompt: str, context: Optional[dict] = None, user_id: Optional[str] = None) -> str:
        """Generate conversational response using Deepseek API with context awareness"""
        try:
            # For demo purposes, if API key is not set, use mock responses
            if self.api_key == "YOUR_DEEPSEEK_API_KEY":
                return self._get_mock_response(prompt, context)

            # Get or create conversation context
            conv_context = self.get_or_create_conversation(user_id) if user_id else None
            
            # Prepare messages with context
            messages = [{"role": "system", "content": self._get_system_prompt()}]
            
            # Add conversation history if available
            if conv_context:
                for msg in conv_context.messages:
                    messages.append(msg)
            
            # Add current prompt with context
            if context:
                context_str = json.dumps(context, indent=2)
                enhanced_prompt = f"Context: {context_str}\n\nUser: {prompt}"
            else:
                enhanced_prompt = prompt
            
            messages.append({"role": "user", "content": enhanced_prompt})
            
            # Make API call with retries
            for attempt in range(self.max_retries):
                try:
                    payload = {
                        "model": "deepseek-chat",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1000,
                        "stream": False
                    }
                    
                    response = requests.post(self.api_url, headers=self.headers, json=payload)
                    if response.status_code == 200:
                        response_text = response.json()['choices'][0]['message']['content']
                        
                        # Update conversation history
                        if conv_context:
                            conv_context.add_message("user", prompt)
                            conv_context.add_message("assistant", response_text)
                        
                        return response_text
                    else:
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay)
                            continue
                        return self._get_mock_response(prompt, context)
                        
                except Exception as e:
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay)
                        continue
                    print(f"LLM API error: {e}")
                    return self._get_mock_response(prompt, context)
                    
        except Exception as e:
            print(f"LLM Service error: {e}")
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
