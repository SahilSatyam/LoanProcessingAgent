import random

class OFACService:
    def check_sanctions(self, user_name: str) -> tuple[bool, str]:
        """
        Simulated OFAC sanctions check
        Returns: (is_clear, status_message)
        """
        # Simulate OFAC check with random result for demo
        # In production, this would call actual OFAC API
        
        # List of sanctioned names for simulation
        sanctioned_names = ['Stephanie Martin', 'Sanctioned Person']
        
        if user_name in sanctioned_names:
            return False, "User found on sanctions list"
        
        # Simulate API delay
        import time
        time.sleep(0.5)
        
        # 95% chance of passing OFAC check
        if random.random() > 0.95:
            return False, "Potential match found - manual review required"
        
        return True, "OFAC check passed"
