# Loan Processing Backend

This is the backend for the AI Loan Agent, built with FastAPI. It provides API endpoints for the conversational loan application process, user data, eligibility, and AI-powered chat.

## Features
- FastAPI-based REST API
- AI-powered conversational assistant (Deepseek LLM integration)
- User data and eligibility calculation
- Session management (in-memory for demo)
- CORS enabled for frontend integration

## Getting Started

### Prerequisites
- Python 3.10+
- pip

### Installation
```bash
pip install -r requirements.txt
```

### Running the App
```bash
uvicorn app.api:app --reload
```
The API will be available at [http://localhost:8000](http://localhost:8000) by default.

## API Endpoints
- `POST /greet_user` — Start conversation, greet user
- `POST /fetch_user_data` — Fetch user data and perform OFAC check
- `POST /confirm_user_data` — Confirm user data
- `POST /ask_loan_amount` — Ask for desired loan amount
- `POST /calculate_eligibility` — Calculate loan eligibility
- `POST /final_confirmation` — Final approval/denial message
- `POST /chat` — Ongoing chat conversation (fully dynamic)

## Environment
- The backend expects the frontend to run at `http://localhost:5173` (CORS is enabled for this origin)
- LLM API key and other secrets should be configured in `app/services/llm_service.py`

## Project Structure
- `app/api.py` — Main FastAPI app and endpoints
- `app/services/` — Business logic, LLM, OFAC, Excel services
- `app/models.py` — Pydantic models for requests/responses

---

For any issues, please contact the project maintainer. 