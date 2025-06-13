from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import traceback
from .utils.logger import log_error, get_logger

logger = get_logger("exceptions")

class LoanProcessingException(Exception):
    """Base exception for loan processing application"""
    
    def __init__(self, message: str, error_code: str = "GENERAL_ERROR", 
                 details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class UserNotFoundException(LoanProcessingException):
    """Raised when user is not found"""
    
    def __init__(self, user_id: str):
        super().__init__(
            message=f"User with ID '{user_id}' not found",
            error_code="USER_NOT_FOUND",
            details={"user_id": user_id}
        )

class SessionNotFoundException(LoanProcessingException):
    """Raised when user session is not found"""
    
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Session for user '{user_id}' not found",
            error_code="SESSION_NOT_FOUND",
            details={"user_id": user_id}
        )

class OFACCheckException(LoanProcessingException):
    """Raised when OFAC check fails"""
    
    def __init__(self, user_name: str, reason: str):
        super().__init__(
            message=f"OFAC check failed for user '{user_name}': {reason}",
            error_code="OFAC_CHECK_FAILED",
            details={"user_name": user_name, "reason": reason}
        )

class LLMServiceException(LoanProcessingException):
    """Raised when LLM service encounters an error"""
    
    def __init__(self, message: str, api_error: Optional[str] = None):
        super().__init__(
            message=f"LLM service error: {message}",
            error_code="LLM_SERVICE_ERROR",
            details={"api_error": api_error} if api_error else {}
        )

class ExcelServiceException(LoanProcessingException):
    """Raised when Excel service encounters an error"""
    
    def __init__(self, message: str, file_path: Optional[str] = None):
        super().__init__(
            message=f"Excel service error: {message}",
            error_code="EXCEL_SERVICE_ERROR",
            details={"file_path": file_path} if file_path else {}
        )

class ValidationException(LoanProcessingException):
    """Raised when data validation fails"""
    
    def __init__(self, field: str, value: Any, reason: str):
        super().__init__(
            message=f"Validation failed for field '{field}': {reason}",
            error_code="VALIDATION_ERROR",
            details={"field": field, "value": str(value), "reason": reason}
        )

class LoanCalculationException(LoanProcessingException):
    """Raised when loan calculation encounters an error"""
    
    def __init__(self, message: str, calculation_data: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Loan calculation error: {message}",
            error_code="LOAN_CALCULATION_ERROR",
            details=calculation_data or {}
        )

class RateLimitException(LoanProcessingException):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, user_id: str, limit: int, window: int):
        super().__init__(
            message=f"Rate limit exceeded for user '{user_id}': {limit} requests per {window} seconds",
            error_code="RATE_LIMIT_EXCEEDED",
            details={"user_id": user_id, "limit": limit, "window": window}
        )

class FileNotFoundException(LoanProcessingException):
    """Raised when a required file is not found"""
    
    def __init__(self, file_path: str):
        super().__init__(
            message=f"Required file not found: {file_path}",
            error_code="FILE_NOT_FOUND",
            details={"file_path": file_path}
        )

class ConfigurationException(LoanProcessingException):
    """Raised when configuration is invalid"""
    
    def __init__(self, config_key: str, reason: str):
        super().__init__(
            message=f"Configuration error for '{config_key}': {reason}",
            error_code="CONFIGURATION_ERROR",
            details={"config_key": config_key, "reason": reason}
        )

# Exception handlers
async def loan_processing_exception_handler(request: Request, exc: LoanProcessingException):
    """Handle custom loan processing exceptions"""
    
    # Log the exception
    log_error(
        exc, 
        {
            "endpoint": str(request.url),
            "method": request.method,
            "error_code": exc.error_code,
            "details": exc.details
        }
    )
    
    # Determine HTTP status code based on exception type
    status_code = 500
    if isinstance(exc, (UserNotFoundException, SessionNotFoundException, FileNotFoundException)):
        status_code = 404
    elif isinstance(exc, ValidationException):
        status_code = 400
    elif isinstance(exc, RateLimitException):
        status_code = 429
    elif isinstance(exc, OFACCheckException):
        status_code = 403
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": True,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": str(request.state.start_time) if hasattr(request.state, 'start_time') else None
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    
    # Log the exception with full traceback
    log_error(
        exc,
        {
            "endpoint": str(request.url),
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again later.",
            "details": {},
            "timestamp": str(request.state.start_time) if hasattr(request.state, 'start_time') else None
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions"""
    
    # Log HTTP exceptions
    logger.warning(
        f"HTTP Exception - {request.method} {request.url} - "
        f"Status: {exc.status_code} - Detail: {exc.detail}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "error_code": f"HTTP_{exc.status_code}",
            "message": exc.detail,
            "details": {},
            "timestamp": str(request.state.start_time) if hasattr(request.state, 'start_time') else None
        }
    )

# Utility functions for raising exceptions
def raise_user_not_found(user_id: str):
    """Convenience function to raise UserNotFoundException"""
    raise UserNotFoundException(user_id)

def raise_session_not_found(user_id: str):
    """Convenience function to raise SessionNotFoundException"""
    raise SessionNotFoundException(user_id)

def raise_validation_error(field: str, value: Any, reason: str):
    """Convenience function to raise ValidationException"""
    raise ValidationException(field, value, reason)

def raise_file_not_found(file_path: str):
    """Convenience function to raise FileNotFoundException"""
    raise FileNotFoundException(file_path)