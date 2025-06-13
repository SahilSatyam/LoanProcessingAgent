import requests
import json
import time
import asyncio
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache
from ..config import settings
from ..utils.logger import log_llm_request, log_llm_response, log_error, get_logger
from ..exceptions import LLMServiceException, ConfigurationException

@dataclass
class ConversationContext:
    messages: List[Dict[str, str]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    token_count: int = 0
    max_messages: int = 10
    
    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self.last_updated = datetime.now()
        self.token_count += len(content.split())  # Rough token estimation
        
        # Keep only last N messages to manage context length
        if len(self.messages) > self.max_messages:
            removed_message = self.messages.pop(0)
            self.token_count -= len(removed_message["content"].split())
    
    def get_context_summary(self) -> Dict[str, Any]:
        return {
            "message_count": len(self.messages),
            "token_count": self.token_count,
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat()
        }

class LLMService:
    def __init__(self):
        self.logger = get_logger("llm_service")
        self._validate_configuration()
        
        self.api_key = settings.deepseek_api_key
        self.api_url = settings.deepseek_api_url
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.max_retries = settings.llm_max_retries
        self.retry_delay = settings.llm_retry_delay
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens
        self.conversations: Dict[str, ConversationContext] = {}
        self.response_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = settings.cache_ttl
    
    def _validate_configuration(self):
        """Validate LLM service configuration"""
        if not settings.deepseek_api_url:
            raise ConfigurationException("deepseek_api_url", "API URL is required")
        
        if settings.llm_max_retries < 1:
            raise ConfigurationException("llm_max_retries", "Must be at least 1")
        
        if settings.llm_retry_delay < 0:
            raise ConfigurationException("llm_retry_delay", "Must be non-negative")

    @lru_cache(maxsize=1)
    def _get_system_prompt(self) -> str:
        return """You are a professional loan processing agent working for LoanAgent Pro. Your role is to help customers apply for loans by collecting necessary information through natural conversation.

IMPORTANT GUIDELINES:
1. Be professional, friendly, and helpful
2. Ask follow-up questions to clarify or validate information
3. Provide helpful guidance about loan requirements and processes
4. Keep responses concise but informative (max 150 words)
5. Always maintain a conversational tone
6. Use the conversation history to maintain context and provide relevant responses
7. If you notice any inconsistencies in user information, politely ask for clarification
8. Focus on the current step in the loan application process
9. Provide clear next steps when appropriate
10. Be empathetic and understanding of customer concerns

CONTEXT AWARENESS:
- Always consider the current step in the loan process
- Reference previous information when relevant
- Maintain consistency throughout the conversation
- Adapt your tone based on the situation (approval, denial, information gathering)"""

    def get_or_create_conversation(self, user_id: str) -> ConversationContext:
        if user_id not in self.conversations:
            self.conversations[user_id] = ConversationContext()
        return self.conversations[user_id]

    def _generate_cache_key(self, prompt: str, context: Optional[dict], user_id: Optional[str]) -> str:
        """Generate cache key for response caching"""
        import hashlib
        cache_data = {
            "prompt": prompt,
            "context": context or {},
            "user_id": user_id or "anonymous"
        }
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid"""
        return time.time() - cache_entry["timestamp"] < self.cache_ttl
    
    def _clean_cache(self):
        """Remove expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self.response_cache.items()
            if current_time - entry["timestamp"] > self.cache_ttl
        ]
        for key in expired_keys:
            del self.response_cache[key]
    
    async def generate_response_async(self, prompt: str, context: Optional[dict] = None, user_id: Optional[str] = None) -> str:
        """Async version of generate_response"""
        return await asyncio.to_thread(self.generate_response, prompt, context, user_id)
    
    def generate_response(self, prompt: str, context: Optional[dict] = None, user_id: Optional[str] = None) -> str:
        """Generate conversational response using Deepseek API with context awareness"""
        start_time = time.time()
        
        try:
            # Log the request
            log_llm_request(user_id or "anonymous", len(prompt), context or {})
            
            # Check cache first
            cache_key = self._generate_cache_key(prompt, context, user_id)
            if cache_key in self.response_cache and self._is_cache_valid(self.response_cache[cache_key]):
                cached_response = self.response_cache[cache_key]["response"]
                self.logger.info(f"Cache hit for user {user_id}")
                log_llm_response(user_id or "anonymous", len(cached_response), time.time() - start_time, True)
                return cached_response
            
            # Clean expired cache entries periodically
            if len(self.response_cache) > 100:  # Clean when cache gets large
                self._clean_cache()
            
            # For demo purposes, if API key is not set, use mock responses
            if self.api_key == "YOUR_DEEPSEEK_API_KEY":
                mock_response = self._get_mock_response(prompt, context)
                log_llm_response(user_id or "anonymous", len(mock_response), time.time() - start_time, True)
                return mock_response

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
            last_exception = None
            for attempt in range(self.max_retries):
                try:
                    payload = {
                        "model": "deepseek-chat",
                        "messages": messages,
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens,
                        "stream": False
                    }
                    
                    response = requests.post(
                        self.api_url, 
                        headers=self.headers, 
                        json=payload,
                        timeout=30  # Add timeout
                    )
                    
                    if response.status_code == 200:
                        response_data = response.json()
                        response_text = response_data['choices'][0]['message']['content']
                        
                        # Update conversation history
                        if conv_context:
                            conv_context.add_message("user", prompt)
                            conv_context.add_message("assistant", response_text)
                        
                        # Cache the response
                        self.response_cache[cache_key] = {
                            "response": response_text,
                            "timestamp": time.time()
                        }
                        
                        # Log successful response
                        log_llm_response(user_id or "anonymous", len(response_text), time.time() - start_time, True)
                        
                        return response_text
                    
                    elif response.status_code == 429:  # Rate limit
                        self.logger.warning(f"Rate limit hit, attempt {attempt + 1}")
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                            continue
                    
                    elif response.status_code >= 500:  # Server error
                        self.logger.warning(f"Server error {response.status_code}, attempt {attempt + 1}")
                        if attempt < self.max_retries - 1:
                            time.sleep(self.retry_delay)
                            continue
                    
                    else:
                        # Client error, don't retry
                        error_msg = f"API error {response.status_code}: {response.text}"
                        raise LLMServiceException(error_msg, response.text)
                        
                except requests.exceptions.RequestException as e:
                    last_exception = e
                    self.logger.warning(f"Request exception on attempt {attempt + 1}: {e}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay)
                        continue
                
                except Exception as e:
                    last_exception = e
                    self.logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay)
                        continue
            
            # All retries failed, use mock response
            self.logger.error(f"All LLM API attempts failed, using mock response. Last error: {last_exception}")
            mock_response = self._get_mock_response(prompt, context)
            log_llm_response(user_id or "anonymous", len(mock_response), time.time() - start_time, False)
            return mock_response
                    
        except Exception as e:
            # Log the error
            log_error(e, {"prompt": prompt, "context": context, "user_id": user_id}, user_id)
            
            # Return mock response as fallback
            mock_response = self._get_mock_response(prompt, context)
            log_llm_response(user_id or "anonymous", len(mock_response), time.time() - start_time, False)
            return mock_response

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
