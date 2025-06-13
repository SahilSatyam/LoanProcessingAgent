from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from .models import *
from .services.excel_service import ExcelService
from .services.ofac_service import OFACService
from .services.llm_service import LLMService
from .config import settings
from .middleware import (
    TimingMiddleware,
    LoggingMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    ErrorHandlingMiddleware,
    CacheControlMiddleware,
    HealthCheckMiddleware
)
from .exceptions import (
    LoanProcessingException,
    UserNotFoundException,
    SessionNotFoundException,
    loan_processing_exception_handler,
    general_exception_handler,
    http_exception_handler,
    raise_user_not_found,
    raise_session_not_found
)
from .utils.logger import (
    get_logger,
    log_api_request,
    log_api_response,
    log_loan_calculation,
    log_error
)
import time
import os
from typing import Dict, Any

# Initialize FastAPI app with enhanced configuration
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    description="Enhanced AI-powered loan processing system with comprehensive logging, error handling, and security features."
)

# Add exception handlers
app.add_exception_handler(LoanProcessingException, loan_processing_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Add middleware (order matters - first added is outermost)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CacheControlMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(HealthCheckMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize services with error handling
try:
    excel_service = ExcelService()
    ofac_service = OFACService()
    llm_service = LLMService()
except Exception as e:
    logger = get_logger("startup")
    logger.error(f"Failed to initialize services: {e}")
    raise

# Store user sessions (in production, use Redis or database)
user_sessions: Dict[str, Dict[str, Any]] = {}

# Get logger for API
logger = get_logger("api")

@app.get("/")
async def root():
    return {"message": "AI Loan Processing API"}

@app.post("/greet_user", response_model=LLMResponse)
async def greet_user(request: UserRequest):
    """Generate AI greeting and ask for loan type"""
    try:
        user_data = excel_service.get_user_data(request.user_id)
        if not user_data:
            raise_user_not_found(request.user_id)
        
        context = {
            'name': user_data.get('Name', 'valued customer'),
            'step': 'greeting',
            'timestamp': time.time(),
            'user_id': request.user_id
        }
        
        message = llm_service.generate_response(
            f"Greet the user {context['name']} and ask what type of loan they're interested in",
            context,
            request.user_id
        )
        
        # Store session
        user_sessions[request.user_id] = {
            'step': 'loan_type_selection',
            'context': context,
            'created_at': time.time()
        }
        
        logger.info(f"User greeting completed for: {request.user_id}")
        return LLMResponse(message=message, next_step="select_loan_type")
        
    except (UserNotFoundException, SessionNotFoundException):
        raise
    except Exception as e:
        log_error(e, {"endpoint": "greet_user", "user_id": request.user_id}, request.user_id)
        raise HTTPException(status_code=500, detail="Failed to process greeting request")

@app.post("/fetch_user_data", response_model=UserData)
async def fetch_user_data(request: LoanTypeRequest):
    """Fetch user data and perform OFAC check"""
    try:
        user_data = excel_service.get_user_data(request.user_id)
        if not user_data:
            raise_user_not_found(request.user_id)
        
        # Perform OFAC check with enhanced error handling
        ofac_clear, ofac_status = ofac_service.check_sanctions(
            user_data['Name'], 
            request.user_id
        )
        
        # Generate LLM response with user data context
        context = {
            'name': user_data['Name'],
            'monthly_income': user_data['Monthly Income'],
            'monthly_expenses': user_data['Monthly Expenses'],
            'existing_loan': user_data.get('Existing Loan', 0),
            'loan_type': request.loan_type,
            'ofac_status': ofac_status,
            'ofac_clear': ofac_clear,
            'step': 'data_verification',
            'timestamp': time.time(),
            'user_id': request.user_id
        }
        
        # Different prompts based on OFAC check result
        if not ofac_clear:
            message = f"Thank you for your interest in applying for a loan, {user_data['Name']}. After reviewing your application, we regret to inform you that we are unable to proceed due to compliance requirements. Unfortunately, we cannot move forward with processing your request at this time.\n\nWe appreciate your understanding, and if you have any questions, please don't hesitate to reach out. Thank you."
            
            # Update session to indicate process should stop
            user_sessions[request.user_id] = {
                'step': 'ofac_failed',
                'loan_type': request.loan_type,
                'user_data': user_data,
                'context': context,
                'llm_message': message,
                'process_complete': True,
                'created_at': time.time()
            }
            
            logger.warning(f"OFAC check failed for user {request.user_id}: {ofac_status}")
        else:
            message = llm_service.generate_response(
                f"Mention they are interested in a {request.loan_type} loan. Ask them to press the button to confirm if the data rendered in the UI is correct, without providing them any information. The button and data is rendered in the UI, you do not need to do any thing",
                context,
                request.user_id
            )
            # Update session for normal flow
            user_sessions[request.user_id] = {
                'step': 'data_confirmation',
                'loan_type': request.loan_type,
                'user_data': user_data,
                'context': context,
                'llm_message': message,
                'process_complete': False,
                'created_at': time.time()
            }
            
            logger.info(f"User data fetched and OFAC check passed for: {request.user_id}")
        
        return UserData(
            user_id=request.user_id,
            name=user_data['Name'],
            monthly_income=float(user_data['Monthly Income']),
            monthly_expenses=float(user_data['Monthly Expenses']),
            existing_loan=float(user_data.get('Existing Loan', 0)),
            ofac_check=ofac_clear,
            ofac_status=ofac_status,
            llm_message=message
        )
        
    except (UserNotFoundException, SessionNotFoundException):
        raise
    except Exception as e:
        log_error(e, {"endpoint": "fetch_user_data", "user_id": request.user_id, "loan_type": request.loan_type}, request.user_id)
        raise HTTPException(status_code=500, detail="Failed to fetch user data or perform OFAC check")

@app.post("/confirm_user_data", response_model=LLMResponse)
async def confirm_user_data(request: UserRequest):
    """Confirm user data and proceed to loan amount"""
    if request.user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Session not found")
    
    session = user_sessions[request.user_id]
    
    # Check if process should be stopped
    if session.get('process_complete', False):
        return LLMResponse(
            message=session.get('llm_message', 'Process cannot continue.'),
            next_step="complete"
        )
    
    context = {
        **session.get('context', {}),
        'step': 'data_confirmation',
        'timestamp': time.time()
    }
    
    message = llm_service.generate_response(
        "Ask user to confirm their data and explain next step is to enter loan amount",
        context,
        request.user_id
    )
    
    user_sessions[request.user_id]['step'] = 'loan_amount_input'
    user_sessions[request.user_id]['context'] = context
    
    return LLMResponse(message=message, next_step="enter_loan_amount")

@app.post("/ask_loan_amount", response_model=LLMResponse)
async def ask_loan_amount(request: UserRequest):
    """Ask for desired loan amount"""
    if request.user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Session not found")
    
    session = user_sessions[request.user_id]
    
    # Check if process should be stopped
    if session.get('process_complete', False):
        return LLMResponse(
            message=session.get('llm_message', 'Process cannot continue.'),
            next_step="complete"
        )
    
    context = {
        **session.get('context', {}),
        'step': 'loan_amount_input',
        'timestamp': time.time()
    }
    
    message = llm_service.generate_response(
        "Ask the user to enter their desired loan amount",
        context,
        request.user_id
    )
    
    user_sessions[request.user_id]['context'] = context
    
    return LLMResponse(message=message, next_step="calculate_eligibility")

@app.post("/calculate_eligibility", response_model=LoanEligibility)
async def calculate_eligibility(request: LoanAmountRequest):
    """Calculate loan eligibility based on enhanced formula with validation"""
    try:
        if request.user_id not in user_sessions:
            raise_session_not_found(request.user_id)
        
        session = user_sessions[request.user_id]
        
        # Check if process should be stopped
        if session.get('process_complete', False):
            return LoanEligibility(
                total_loan_eligibility=0,
                eligible_loan_amount=0,
                requested_amount=0,
                is_eligible=False,
                message=session.get('llm_message', 'Process cannot continue.')
            )
        
        # Validate loan amount
        if request.loan_amount <= 0:
            raise ValidationException('loan_amount', request.loan_amount, "Loan amount must be positive")
        
        if request.loan_amount > 10000000:  # 10 million limit
            raise ValidationException('loan_amount', request.loan_amount, "Loan amount exceeds maximum limit")
        
        user_data = session['user_data']
        
        # Calculate eligibility using enhanced formula
        monthly_income = float(user_data['Monthly Income'])
        monthly_expenses = float(user_data['Monthly Expenses'])
        existing_loan = float(user_data.get('Existing Loan', 0))
        
        # Validate financial data
        if monthly_income <= monthly_expenses:
            logger.warning(f"User {request.user_id} has insufficient income after expenses")
        
        # Enhanced calculation with configurable parameters
        disposable_income = monthly_income - monthly_expenses
        annual_disposable_income = disposable_income * settings.loan_term_years
        total_loan_eligibility = annual_disposable_income * settings.loan_multiplier
        eligible_loan_amount = max(0, total_loan_eligibility - existing_loan)
        
        is_eligible = (
            request.loan_amount <= eligible_loan_amount and 
            eligible_loan_amount > 0 and 
            disposable_income > 0
        )
        
        context = {
            **session.get('context', {}),
            'step': 'eligibility_calculation',
            'requested_amount': request.loan_amount,
            'total_eligibility': total_loan_eligibility,
            'eligible_amount': eligible_loan_amount,
            'disposable_income': disposable_income,
            'is_eligible': is_eligible,
            'timestamp': time.time(),
            'user_id': request.user_id
        }
        
        # Generate detailed message
        if is_eligible:
            message = f"Congratulations! You are eligible for a loan of ${request.loan_amount:,.2f}"
        else:
            if eligible_loan_amount <= 0:
                message = "Unfortunately, you are not eligible for a loan at this time due to insufficient disposable income."
            else:
                message = f"You are eligible for a maximum loan amount of ${eligible_loan_amount:,.2f}, but your requested amount of ${request.loan_amount:,.2f} exceeds this limit."
        
        # Log the calculation
        log_loan_calculation(
            request.user_id,
            request.loan_amount,
            eligible_loan_amount,
            is_eligible
        )
        
        # Update session
        user_sessions[request.user_id].update({
            'loan_amount': request.loan_amount,
            'eligibility': is_eligible,
            'eligible_amount': eligible_loan_amount,
            'total_eligibility': total_loan_eligibility,
            'context': context,
            'calculation_timestamp': time.time()
        })
        
        logger.info(f"Loan eligibility calculated for {request.user_id}: {is_eligible}")
        
        return LoanEligibility(
            total_loan_eligibility=total_loan_eligibility,
            eligible_loan_amount=eligible_loan_amount,
            requested_amount=request.loan_amount,
            is_eligible=is_eligible,
            message=message
        )
        
    except (SessionNotFoundException, ValidationException):
        raise
    except Exception as e:
        log_error(e, {
            "endpoint": "calculate_eligibility", 
            "user_id": request.user_id, 
            "loan_amount": request.loan_amount
        }, request.user_id)
        raise HTTPException(status_code=500, detail="Failed to calculate loan eligibility")

@app.post("/final_confirmation", response_model=LLMResponse)
async def final_confirmation(request: UserRequest):
    """Generate final confirmation message"""
    if request.user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Session not found")
    
    session = user_sessions[request.user_id]
    
    # Check if process should be stopped
    if session.get('process_complete', False):
        return LLMResponse(
            message=session.get('llm_message', 'Process cannot continue.'),
            next_step="complete"
        )
    
    is_eligible = session.get('eligibility', False)
    loan_amount = session.get('loan_amount', 0)
    
    context = {
        **session.get('context', {}),
        'step': 'final_confirmation',
        'amount': loan_amount,
        'is_eligible': is_eligible,
        'timestamp': time.time()
    }
    
    if is_eligible:
        message = "Congratulations you have In-Principal approval for the amount. The amount will be released post execution of the Loan Agreement. Request you to review and sign the loan agreement shared to you."
    else:
        message = llm_service.generate_response(
            "Generate a denial message for the loan application",
            context,
            request.user_id
        )
    
    # Clear session
    del user_sessions[request.user_id]
    
    return LLMResponse(message=message, next_step="complete")

@app.post("/chat")
async def chat(user_id: str = Body(...), message: str = Body(...)):
    """Handle ongoing chat conversation with the assistant"""
    if user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Session not found")
    
    session = user_sessions[user_id]
    
    # Check if process should be stopped
    if session.get('process_complete', False):
        return {"message": session.get('llm_message', 'Process cannot continue.')}
    
    context = {
        **session.get('context', {}),
        'step': 'chat',
        'timestamp': time.time()
    }
    
    reply = llm_service.generate_response(message, context, user_id)
    return {"message": reply}

@app.get("/download-loan-agreement")
async def download_loan_agreement():
    """Serve the loan agreement document with enhanced security"""
    try:
        file_path = settings.loan_agreement_file
        
        if not os.path.exists(file_path):
            logger.error(f"Loan agreement file not found: {file_path}")
            raise FileNotFoundException(file_path)
        
        # Log the download
        logger.info(f"Loan agreement downloaded from: {file_path}")
        
        return FileResponse(
            path=file_path,
            filename="Loan_Agreement.doc",
            media_type="application/msword",
            headers={
                "Content-Disposition": "attachment; filename=Loan_Agreement.doc",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except FileNotFoundException:
        raise
    except Exception as e:
        log_error(e, {"endpoint": "download_loan_agreement", "file_path": settings.loan_agreement_file})
        raise HTTPException(status_code=500, detail="Failed to serve loan agreement document")

# Additional API endpoints for monitoring and management
@app.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    try:
        # Check service health
        excel_stats = excel_service.get_file_stats()
        ofac_stats = ofac_service.get_cache_stats()
        
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "version": settings.app_version,
            "environment": "development" if settings.debug else "production",
            "services": {
                "excel_service": {
                    "status": "healthy",
                    "stats": excel_stats
                },
                "ofac_service": {
                    "status": "healthy",
                    "stats": ofac_stats
                },
                "llm_service": {
                    "status": "healthy",
                    "api_configured": settings.deepseek_api_key != "YOUR_DEEPSEEK_API_KEY"
                }
            },
            "active_sessions": len(user_sessions)
        }
    except Exception as e:
        log_error(e, {"endpoint": "health_check"})
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": time.time(),
                "error": str(e)
            }
        )

@app.get("/stats")
async def get_system_stats():
    """Get system statistics for monitoring"""
    try:
        return {
            "active_sessions": len(user_sessions),
            "excel_service_stats": excel_service.get_file_stats(),
            "ofac_service_stats": ofac_service.get_cache_stats(),
            "settings": {
                "rate_limit_requests": settings.rate_limit_requests,
                "rate_limit_window": settings.rate_limit_window,
                "cache_ttl": settings.cache_ttl,
                "loan_multiplier": settings.loan_multiplier
            }
        }
    except Exception as e:
        log_error(e, {"endpoint": "get_system_stats"})
        raise HTTPException(status_code=500, detail="Failed to retrieve system statistics")

@app.post("/admin/clear-cache")
async def clear_caches():
    """Clear all service caches (admin endpoint)"""
    try:
        ofac_service.clear_cache()
        # Clear LLM cache if needed
        if hasattr(llm_service, 'response_cache'):
            llm_service.response_cache.clear()
        
        logger.info("All caches cleared by admin")
        return {"message": "All caches cleared successfully"}
    except Exception as e:
        log_error(e, {"endpoint": "clear_caches"})
        raise HTTPException(status_code=500, detail="Failed to clear caches")
