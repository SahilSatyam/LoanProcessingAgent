import pandas as pd
import os

class ExcelService:
    def __init__(self):
        self.users_file = "data/users.xlsx"
        self.loans_file = "data/loans.xlsx"
        self._initialize_files()
    
    def _initialize_files(self):
        # Create sample data if files don't exist
        if not os.path.exists("data"):
            os.makedirs("data")
        
        if not os.path.exists(self.users_file):
            users_data = {
                'user_id': ['USR001', 'USR002', 'USR003'],
                'name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
                'monthly_income': [8000, 12000, 6000],
                'monthly_expenses': [3000, 4000, 2500]
            }
            pd.DataFrame(users_data).to_excel(self.users_file, index=False)
        
        if not os.path.exists(self.loans_file):
            loans_data = {
                'user_id': ['USR001', 'USR002'],
                'existing_loan': [20000, 50000],
                'loan_type': ['personal', 'home']
            }
            pd.DataFrame(loans_data).to_excel(self.loans_file, index=False)
    
    def get_user_data(self, user_id: str):
        try:
            users_df = pd.read_excel(self.users_file)
            loans_df = pd.read_excel(self.loans_file)
            user_row = users_df[users_df['User Id'] == user_id]
            if user_row.empty:
                return None
            
            user_data = user_row.iloc[0].to_dict()
            
            # Get existing loan amount
            loan_row = loans_df[loans_df['User Id'] == user_id]
            user_data['Existing Loan'] = float(loan_row['Loan Amount'].iloc[0]) if not loan_row.empty else 0.0
            
            return user_data
        except Exception as e:
            print(f"Error reading Excel files: {e}")
            return None