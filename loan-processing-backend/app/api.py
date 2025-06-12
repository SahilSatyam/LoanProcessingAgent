from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from .models import *
from .services.excel_service import ExcelService
from .services.ofac_service import OFACService
from .services.llm_service import LLMService

app = FastAPI(title="AI Loan Processing API")

# Configure CORS [[1]][[2]]
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
    
    context = {'name': user_data.get('Name', 'valued customer')}
    prompt = f"Greet the user {context['name']} and ask what type of loan they're interested in"
    
    message = llm_service.generate_response(prompt, context)
    
    # Store session
    user_sessions[request.user_id] = {'step': 'loan_type_selection'}
    
    return LLMResponse(message=message, next_step="select_loan_type")

@app.post("/fetch_user_data", response_model=UserData)
async def fetch_user_data(request: LoanTypeRequest):
    """Fetch user data and perform OFAC check"""
    user_data = excel_service.get_user_data(request.user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Perform OFAC check
    ofac_clear, ofac_status = ofac_service.check_sanctions(user_data['Name'])
    print(ofac_clear, ofac_status)
    
    # Update session
    user_sessions[request.user_id] = {
        'step': 'data_confirmation',
        'loan_type': request.loan_type,
        'user_data': user_data
    }
    
    return UserData(
        user_id=request.user_id,
        name=user_data['Name'],
        monthly_income=float(user_data['Monthly Income']),
        monthly_expenses=float(user_data['Monthly Expenses']),
        existing_loan=float(user_data.get('Existing Loan', 0)),
        ofac_check=ofac_clear,
        ofac_status=ofac_status
    )

@app.post("/confirm_user_data", response_model=LLMResponse)
async def confirm_user_data(request: UserRequest):
    """Confirm user data and proceed to loan amount"""
    if request.user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Session not found")
    
    prompt = "Ask user to confirm their data and explain next step is to enter loan amount"
    message = llm_service.generate_response(prompt)
    
    user_sessions[request.user_id]['step'] = 'loan_amount_input'
    
    return LLMResponse(message=message, next_step="enter_loan_amount")

@app.post("/ask_loan_amount", response_model=LLMResponse)
async def ask_loan_amount(request: UserRequest):
    """Ask for desired loan amount"""
    prompt = "Ask the user to enter their desired loan amount"
    message = llm_service.generate_response(prompt)
    
    return LLMResponse(message=message, next_step="calculate_eligibility")

@app.post("/calculate_eligibility", response_model=LoanEligibility)
async def calculate_eligibility(request: LoanAmountRequest):
    """Calculate loan eligibility based on formula"""
    if request.user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Session not found")
    
    user_data = user_sessions[request.user_id]['user_data']
    
    # Calculate eligibility using provided formula
    monthly_income = user_data['Monthly Income']
    monthly_expenses = user_data['Monthly Expenses']
    existing_loan = user_data.get('Existing Loan', 0)
    
    total_loan_eligibility = ((monthly_income - monthly_expenses) * 12) * 5
    eligible_loan_amount = total_loan_eligibility - existing_loan
    
    is_eligible = request.loan_amount <= eligible_loan_amount and eligible_loan_amount > 0
    
    message = "Eligible" if is_eligible else "Not Eligible"
    
    # Update session
    user_sessions[request.user_id]['loan_amount'] = request.loan_amount
    user_sessions[request.user_id]['eligibility'] = is_eligible
    
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
    is_eligible = session.get('eligibility', False)
    loan_amount = session.get('loan_amount', 0)
    
    context = {'amount': loan_amount}
    
    if is_eligible:
        prompt = "Generate an approval message for the loan application"
        message = llm_service.generate_response("loan approved", context)
    else:
        prompt = "Generate a denial message for the loan application"
        message = llm_service.generate_response("loan denied", context)
    
    # Clear session
    del user_sessions[request.user_id]
    
    return LLMResponse(message=message, next_step="complete")

@app.post("/chat")
async def chat(user_id: str = Body(...), message: str = Body(...)):
    """Handle ongoing chat conversation with the assistant"""
    # Optionally, you can use user_sessions to maintain context if needed
    # For now, just generate a response using the LLMService
    reply = llm_service.generate_response(message)
    return {"message": reply}
