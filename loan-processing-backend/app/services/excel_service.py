import pandas as pd
import os
from typing import Optional, Dict, Any, List
from ..config import settings
from ..utils.logger import get_logger, log_error
from ..exceptions import ExcelServiceException, FileNotFoundException, ValidationException

class ExcelService:
    def __init__(self):
        self.logger = get_logger("excel_service")
        self.users_file = settings.users_file
        self.loans_file = settings.loans_file
        self.data_directory = settings.data_directory
        self._initialize_files()
    
    def _initialize_files(self):
        """Initialize Excel files with sample data if they don't exist"""
        try:
            # Create data directory if it doesn't exist
            if not os.path.exists(self.data_directory):
                os.makedirs(self.data_directory)
                self.logger.info(f"Created data directory: {self.data_directory}")
            
            # Initialize users file
            if not os.path.exists(self.users_file):
                users_data = {
                    'User Id': ['USR001', 'USR002', 'USR003', 'USR004', 'USR005'],
                    'Name': ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'],
                    'Monthly Income': [8000, 12000, 6000, 15000, 9500],
                    'Monthly Expenses': [3000, 4000, 2500, 5000, 3500],
                    'Email': ['john@example.com', 'jane@example.com', 'bob@example.com', 'alice@example.com', 'charlie@example.com'],
                    'Phone': ['+1234567890', '+1234567891', '+1234567892', '+1234567893', '+1234567894'],
                    'Address': ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm St', '654 Maple Dr'],
                    'Employment Status': ['Employed', 'Employed', 'Self-Employed', 'Employed', 'Employed'],
                    'Credit Score': [750, 680, 720, 800, 690]
                }
                df = pd.DataFrame(users_data)
                df.to_excel(self.users_file, index=False)
                self.logger.info(f"Created users file: {self.users_file}")
            
            # Initialize loans file
            if not os.path.exists(self.loans_file):
                loans_data = {
                    'User Id': ['USR001', 'USR002', 'USR004'],
                    'Loan Amount': [20000, 50000, 75000],
                    'Loan Type': ['personal', 'home', 'auto'],
                    'Interest Rate': [5.5, 3.2, 4.8],
                    'Term Months': [60, 360, 72],
                    'Status': ['Active', 'Active', 'Active'],
                    'Start Date': ['2023-01-15', '2022-06-01', '2023-03-10']
                }
                df = pd.DataFrame(loans_data)
                df.to_excel(self.loans_file, index=False)
                self.logger.info(f"Created loans file: {self.loans_file}")
                
        except Exception as e:
            self.logger.error(f"Failed to initialize files: {e}")
            raise ExcelServiceException(f"Failed to initialize Excel files: {e}")
    
    def _validate_user_data(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean user data"""
        required_fields = ['User Id', 'Name', 'Monthly Income', 'Monthly Expenses']
        
        for field in required_fields:
            if field not in user_data or pd.isna(user_data[field]):
                raise ValidationException(field, user_data.get(field), f"Required field '{field}' is missing or null")
        
        # Validate numeric fields
        numeric_fields = ['Monthly Income', 'Monthly Expenses']
        for field in numeric_fields:
            try:
                user_data[field] = float(user_data[field])
                if user_data[field] < 0:
                    raise ValidationException(field, user_data[field], "Value cannot be negative")
            except (ValueError, TypeError):
                raise ValidationException(field, user_data[field], "Must be a valid number")
        
        # Validate name
        if not isinstance(user_data['Name'], str) or len(user_data['Name'].strip()) < 2:
            raise ValidationException('Name', user_data['Name'], "Name must be at least 2 characters long")
        
        return user_data
    
    def get_user_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data with enhanced error handling and validation"""
        try:
            if not user_id or not user_id.strip():
                raise ValidationException('user_id', user_id, "User ID cannot be empty")
            
            # Check if files exist
            if not os.path.exists(self.users_file):
                raise FileNotFoundException(self.users_file)
            
            if not os.path.exists(self.loans_file):
                raise FileNotFoundException(self.loans_file)
            
            # Read Excel files
            users_df = pd.read_excel(self.users_file)
            loans_df = pd.read_excel(self.loans_file)
            
            # Find user
            user_row = users_df[users_df['User Id'] == user_id]
            if user_row.empty:
                self.logger.warning(f"User not found: {user_id}")
                return None
            
            user_data = user_row.iloc[0].to_dict()
            
            # Validate user data
            user_data = self._validate_user_data(user_data)
            
            # Get existing loan amount
            loan_row = loans_df[loans_df['User Id'] == user_id]
            if not loan_row.empty:
                total_loan_amount = loan_row['Loan Amount'].sum()
                user_data['Existing Loan'] = float(total_loan_amount)
                
                # Add loan details
                user_data['Loan Details'] = loan_row.to_dict('records')
            else:
                user_data['Existing Loan'] = 0.0
                user_data['Loan Details'] = []
            
            self.logger.info(f"Successfully retrieved user data for: {user_id}")
            return user_data
            
        except (ValidationException, FileNotFoundException):
            # Re-raise validation and file not found exceptions
            raise
        except Exception as e:
            error_msg = f"Error reading user data for {user_id}: {e}"
            self.logger.error(error_msg)
            log_error(e, {"user_id": user_id, "operation": "get_user_data"})
            raise ExcelServiceException(error_msg)
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users data"""
        try:
            if not os.path.exists(self.users_file):
                raise FileNotFoundException(self.users_file)
            
            users_df = pd.read_excel(self.users_file)
            return users_df.to_dict('records')
            
        except Exception as e:
            error_msg = f"Error reading all users data: {e}"
            self.logger.error(error_msg)
            log_error(e, {"operation": "get_all_users"})
            raise ExcelServiceException(error_msg)
    
    def add_user(self, user_data: Dict[str, Any]) -> bool:
        """Add a new user to the Excel file"""
        try:
            # Validate user data
            user_data = self._validate_user_data(user_data)
            
            # Check if user already exists
            existing_user = self.get_user_data(user_data['User Id'])
            if existing_user:
                raise ValidationException('User Id', user_data['User Id'], "User already exists")
            
            # Read existing data
            users_df = pd.read_excel(self.users_file)
            
            # Add new user
            new_user_df = pd.DataFrame([user_data])
            updated_df = pd.concat([users_df, new_user_df], ignore_index=True)
            
            # Save to file
            updated_df.to_excel(self.users_file, index=False)
            
            self.logger.info(f"Successfully added user: {user_data['User Id']}")
            return True
            
        except Exception as e:
            error_msg = f"Error adding user {user_data.get('User Id', 'unknown')}: {e}"
            self.logger.error(error_msg)
            log_error(e, {"user_data": user_data, "operation": "add_user"})
            raise ExcelServiceException(error_msg)
    
    def update_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Update existing user data"""
        try:
            # Validate user data
            user_data['User Id'] = user_id  # Ensure user_id is set
            user_data = self._validate_user_data(user_data)
            
            # Read existing data
            users_df = pd.read_excel(self.users_file)
            
            # Find user index
            user_index = users_df[users_df['User Id'] == user_id].index
            if user_index.empty:
                raise ValidationException('User Id', user_id, "User not found")
            
            # Update user data
            for key, value in user_data.items():
                users_df.loc[user_index[0], key] = value
            
            # Save to file
            users_df.to_excel(self.users_file, index=False)
            
            self.logger.info(f"Successfully updated user: {user_id}")
            return True
            
        except Exception as e:
            error_msg = f"Error updating user {user_id}: {e}"
            self.logger.error(error_msg)
            log_error(e, {"user_id": user_id, "user_data": user_data, "operation": "update_user"})
            raise ExcelServiceException(error_msg)
    
    def get_file_stats(self) -> Dict[str, Any]:
        """Get statistics about the Excel files"""
        try:
            stats = {
                "users_file_exists": os.path.exists(self.users_file),
                "loans_file_exists": os.path.exists(self.loans_file),
                "users_count": 0,
                "loans_count": 0
            }
            
            if stats["users_file_exists"]:
                users_df = pd.read_excel(self.users_file)
                stats["users_count"] = len(users_df)
                stats["users_file_size"] = os.path.getsize(self.users_file)
            
            if stats["loans_file_exists"]:
                loans_df = pd.read_excel(self.loans_file)
                stats["loans_count"] = len(loans_df)
                stats["loans_file_size"] = os.path.getsize(self.loans_file)
            
            return stats
            
        except Exception as e:
            error_msg = f"Error getting file stats: {e}"
            self.logger.error(error_msg)
            log_error(e, {"operation": "get_file_stats"})
            raise ExcelServiceException(error_msg)