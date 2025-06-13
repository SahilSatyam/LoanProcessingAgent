import logging
import logging.handlers
import os
import sys
from datetime import datetime
from typing import Optional
from ..config import settings

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for console output"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        record.levelname = f"{log_color}{record.levelname}{self.COLORS['RESET']}"
        return super().format(record)

class LoanProcessingLogger:
    """Centralized logging system for the loan processing application"""
    
    def __init__(self):
        self.logger = logging.getLogger("loan_processing")
        self.logger.setLevel(getattr(logging, settings.log_level.upper()))
        
        # Prevent duplicate handlers
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """Setup file and console handlers"""
        
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(settings.log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # File handler with rotation
        file_handler = logging.handlers.RotatingFileHandler(
            settings.log_file,
            maxBytes=settings.log_max_size,
            backupCount=settings.log_backup_count
        )
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        
        # Console handler with colors
        console_handler = logging.StreamHandler(sys.stdout)
        console_formatter = ColoredFormatter(
            '%(asctime)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        
        # Add handlers
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
    
    def get_logger(self, name: Optional[str] = None) -> logging.Logger:
        """Get a logger instance"""
        if name:
            return logging.getLogger(f"loan_processing.{name}")
        return self.logger
    
    def log_api_request(self, endpoint: str, user_id: str, method: str = "POST"):
        """Log API request"""
        self.logger.info(f"API Request - {method} {endpoint} - User: {user_id}")
    
    def log_api_response(self, endpoint: str, user_id: str, status_code: int, response_time: float):
        """Log API response"""
        self.logger.info(
            f"API Response - {endpoint} - User: {user_id} - "
            f"Status: {status_code} - Time: {response_time:.3f}s"
        )
    
    def log_llm_request(self, user_id: str, prompt_length: int, context: dict):
        """Log LLM service request"""
        self.logger.info(
            f"LLM Request - User: {user_id} - Prompt Length: {prompt_length} - "
            f"Step: {context.get('step', 'unknown')}"
        )
    
    def log_llm_response(self, user_id: str, response_length: int, response_time: float, success: bool):
        """Log LLM service response"""
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(
            f"LLM Response - User: {user_id} - Status: {status} - "
            f"Response Length: {response_length} - Time: {response_time:.3f}s"
        )
    
    def log_ofac_check(self, user_id: str, user_name: str, result: bool, status: str):
        """Log OFAC check"""
        result_str = "PASSED" if result else "FAILED"
        self.logger.info(
            f"OFAC Check - User: {user_id} - Name: {user_name} - "
            f"Result: {result_str} - Status: {status}"
        )
    
    def log_loan_calculation(self, user_id: str, requested_amount: float, 
                           eligible_amount: float, is_eligible: bool):
        """Log loan eligibility calculation"""
        result = "ELIGIBLE" if is_eligible else "NOT_ELIGIBLE"
        self.logger.info(
            f"Loan Calculation - User: {user_id} - Requested: ${requested_amount:,.2f} - "
            f"Eligible: ${eligible_amount:,.2f} - Result: {result}"
        )
    
    def log_error(self, error: Exception, context: dict, user_id: Optional[str] = None):
        """Log error with context"""
        error_msg = f"Error: {str(error)} - Context: {context}"
        if user_id:
            error_msg = f"User: {user_id} - {error_msg}"
        self.logger.error(error_msg, exc_info=True)
    
    def log_security_event(self, event_type: str, user_id: str, details: dict):
        """Log security-related events"""
        self.logger.warning(
            f"Security Event - Type: {event_type} - User: {user_id} - Details: {details}"
        )
    
    def log_performance_metric(self, metric_name: str, value: float, unit: str = "ms"):
        """Log performance metrics"""
        self.logger.info(f"Performance - {metric_name}: {value:.3f}{unit}")

# Global logger instance
logger_instance = LoanProcessingLogger()
logger = logger_instance.get_logger()

# Convenience functions
def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get a logger instance"""
    return logger_instance.get_logger(name)

def log_api_request(endpoint: str, user_id: str, method: str = "POST"):
    """Log API request"""
    logger_instance.log_api_request(endpoint, user_id, method)

def log_api_response(endpoint: str, user_id: str, status_code: int, response_time: float):
    """Log API response"""
    logger_instance.log_api_response(endpoint, user_id, status_code, response_time)

def log_llm_request(user_id: str, prompt_length: int, context: dict):
    """Log LLM service request"""
    logger_instance.log_llm_request(user_id, prompt_length, context)

def log_llm_response(user_id: str, response_length: int, response_time: float, success: bool):
    """Log LLM service response"""
    logger_instance.log_llm_response(user_id, response_length, response_time, success)

def log_ofac_check(user_id: str, user_name: str, result: bool, status: str):
    """Log OFAC check"""
    logger_instance.log_ofac_check(user_id, user_name, result, status)

def log_loan_calculation(user_id: str, requested_amount: float, 
                        eligible_amount: float, is_eligible: bool):
    """Log loan eligibility calculation"""
    logger_instance.log_loan_calculation(user_id, requested_amount, eligible_amount, is_eligible)

def log_error(error: Exception, context: dict, user_id: Optional[str] = None):
    """Log error with context"""
    logger_instance.log_error(error, context, user_id)

def log_security_event(event_type: str, user_id: str, details: dict):
    """Log security-related events"""
    logger_instance.log_security_event(event_type, user_id, details)

def log_performance_metric(metric_name: str, value: float, unit: str = "ms"):
    """Log performance metrics"""
    logger_instance.log_performance_metric(metric_name, value, unit)