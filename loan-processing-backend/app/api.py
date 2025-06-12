from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from .models import *
from .services.excel_service import ExcelService
from .services.ofac_service import OFACService
from .services.llm_service import LLMService
import time
import os

app = FastAPI(title="AI Loan Processing API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "localhost:3000",
    "localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize services
excel_service = ExcelService()
ofac_service = OFACService()
llm_service = LLMService()

# Store user sessions (in production, use Redis or database)
user_sessions = {}

@app.get("/")
async def root():
    return {"message": "AI Loan Processing API"}

@app.post("/greet_user", response_model=LLMResponse)
async def greet_user(request: UserRequest):
    """Generate AI greeting and ask for loan type"""
    user_data = excel_service.get_user_data(request.user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    context = {
        'name': user_data.get('Name', 'valued customer'),
        'step': 'greeting',
        'timestamp': time.time()
    }
    
    message = llm_service.generate_response(
        f"Greet the user {context['name']} and ask what type of loan they're interested in",
        context,
        request.user_id
    )
    
    # Store session
    user_sessions[request.user_id] = {
        'step': 'loan_type_selection',
        'context': context
    }
    
    return LLMResponse(message=message, next_step="select_loan_type")

@app.post("/fetch_user_data", response_model=UserData)
async def fetch_user_data(request: LoanTypeRequest):
    """Fetch user data and perform OFAC check"""
    user_data = excel_service.get_user_data(request.user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Perform OFAC check
    ofac_clear, ofac_status = ofac_service.check_sanctions(user_data['Name'])
    
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
        'timestamp': time.time()
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
            'process_complete': True  # Flag to indicate process should stop
        }
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
            'process_complete': False
        }
    
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
    """Calculate loan eligibility based on formula"""
    if request.user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Session not found")
    
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
    
    user_data = session['user_data']
    
    # Calculate eligibility using provided formula
    monthly_income = user_data['Monthly Income']
    monthly_expenses = user_data['Monthly Expenses']
    existing_loan = user_data.get('Existing Loan', 0)
    
    total_loan_eligibility = ((monthly_income - monthly_expenses) * 12) * 5
    eligible_loan_amount = total_loan_eligibility - existing_loan
    
    is_eligible = request.loan_amount <= eligible_loan_amount and eligible_loan_amount > 0
    
    context = {
        **session.get('context', {}),
        'step': 'eligibility_calculation',
        'requested_amount': request.loan_amount,
        'total_eligibility': total_loan_eligibility,
        'eligible_amount': eligible_loan_amount,
        'is_eligible': is_eligible,
        'timestamp': time.time()
    }
    
    message = "Eligible" if is_eligible else "Not Eligible"
    
    # Update session
    user_sessions[request.user_id].update({
        'loan_amount': request.loan_amount,
        'eligibility': is_eligible,
        'context': context
    })
    
    return LoanEligibility(
        total_loan_eligibility=total_loan_eligibility,
        eligible_loan_amount=eligible_loan_amount,
        requested_amount=request.loan_amount,
        is_eligible=is_eligible,
        message=message
    )

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
    """Serve the loan agreement document"""
    file_path = os.path.join("data", "Format-Loan Agreement.doc")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Loan agreement document not found")
    return FileResponse(
        path=file_path,
        filename="Loan_Agreement.doc",
        media_type="application/msword"
    )
