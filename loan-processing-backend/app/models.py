from pydantic import BaseModel
from typing import Optional, List

class UserRequest(BaseModel):
    user_id: str
    name: Optional[str] = None

class LoanTypeRequest(BaseModel):
    user_id: str
    loan_type: str

class UserData(BaseModel):
    user_id: str
    name: str
    monthly_income: float
    monthly_expenses: float
    existing_loan: float
    ofac_check: bool
    ofac_status: str

class LoanAmountRequest(BaseModel):
    user_id: str
    loan_amount: float

class LoanEligibility(BaseModel):
    total_loan_eligibility: float
    eligible_loan_amount: float
    requested_amount: float
    is_eligible: bool
    message: str

class LLMResponse(BaseModel):
    message: str
    next_step: Optional[str] = None
