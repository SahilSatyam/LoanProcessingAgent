import random
import time
import asyncio
import requests
from typing import Tuple, Optional, Dict, Any
from ..config import settings
from ..utils.logger import log_ofac_check, log_error, get_logger
from ..exceptions import OFACCheckException, ConfigurationException

class OFACService:
    def __init__(self):
        self.logger = get_logger("ofac_service")
        self.api_url = settings.ofac_api_url
        self.api_key = settings.ofac_api_key
        self.timeout = settings.ofac_timeout
        self.simulation_delay = settings.ofac_simulation_delay
        
        # Enhanced sanctioned names list for simulation
        self.sanctioned_names = {
            'Stephanie Martin',
            'Sanctioned Person',
            'John Terrorist',
            'Jane Criminal',
            'Bad Actor',
            'Money Launderer'
        }
        
        # Cache for OFAC results to avoid repeated checks
        self.check_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = 3600  # 1 hour cache
    
    def _normalize_name(self, name: str) -> str:
        """Normalize name for consistent checking"""
        return name.strip().lower().replace('  ', ' ')
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid"""
        return time.time() - cache_entry["timestamp"] < self.cache_ttl
    
    def _get_cached_result(self, normalized_name: str) -> Optional[Tuple[bool, str]]:
        """Get cached OFAC result if available and valid"""
        if normalized_name in self.check_cache:
            cache_entry = self.check_cache[normalized_name]
            if self._is_cache_valid(cache_entry):
                self.logger.info(f"OFAC cache hit for: {normalized_name}")
                return cache_entry["result"], cache_entry["status"]
        return None
    
    def _cache_result(self, normalized_name: str, result: bool, status: str):
        """Cache OFAC check result"""
        self.check_cache[normalized_name] = {
            "result": result,
            "status": status,
            "timestamp": time.time()
        }
    
    def _clean_cache(self):
        """Remove expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self.check_cache.items()
            if current_time - entry["timestamp"] > self.cache_ttl
        ]
        for key in expired_keys:
            del self.check_cache[key]
    
    async def check_sanctions_async(self, user_name: str, user_id: Optional[str] = None) -> Tuple[bool, str]:
        """Async version of sanctions check"""
        return await asyncio.to_thread(self.check_sanctions, user_name, user_id)
    
    def check_sanctions(self, user_name: str, user_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Enhanced OFAC sanctions check with caching and better error handling
        Returns: (is_clear, status_message)
        """
        start_time = time.time()
        
        try:
            if not user_name or not user_name.strip():
                raise OFACCheckException(user_name, "Invalid or empty name provided")
            
            normalized_name = self._normalize_name(user_name)
            
            # Check cache first
            cached_result = self._get_cached_result(normalized_name)
            if cached_result:
                result, status = cached_result
                log_ofac_check(user_id or "unknown", user_name, result, status)
                return result, status
            
            # Clean expired cache entries periodically
            if len(self.check_cache) > 1000:
                self._clean_cache()
            
            # If real OFAC API is configured, use it
            if self.api_url and self.api_key:
                result, status = self._check_real_ofac_api(user_name)
            else:
                # Use simulation for demo
                result, status = self._simulate_ofac_check(user_name)
            
            # Cache the result
            self._cache_result(normalized_name, result, status)
            
            # Log the check
            log_ofac_check(user_id or "unknown", user_name, result, status)
            
            # Log performance
            check_time = time.time() - start_time
            self.logger.info(f"OFAC check completed in {check_time:.3f}s for: {user_name}")
            
            return result, status
            
        except Exception as e:
            log_error(e, {"user_name": user_name, "user_id": user_id}, user_id)
            
            # In case of error, default to requiring manual review for safety
            error_status = "OFAC check failed - manual review required"
            log_ofac_check(user_id or "unknown", user_name, False, error_status)
            return False, error_status
    
    def _check_real_ofac_api(self, user_name: str) -> Tuple[bool, str]:
        """Check against real OFAC API (when configured)"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "name": user_name,
                "type": "individual"
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse API response (this would depend on actual OFAC API format)
                if data.get("matches", []):
                    match_score = data.get("highest_score", 0)
                    if match_score > 0.8:  # High confidence match
                        return False, "High confidence match found on sanctions list"
                    elif match_score > 0.6:  # Medium confidence
                        return False, "Potential match found - manual review required"
                    else:
                        return True, "Low confidence matches - cleared"
                else:
                    return True, "No matches found - OFAC check passed"
            
            elif response.status_code == 429:
                self.logger.warning("OFAC API rate limit exceeded")
                return False, "OFAC check rate limited - manual review required"
            
            else:
                self.logger.error(f"OFAC API error: {response.status_code} - {response.text}")
                return False, "OFAC API error - manual review required"
                
        except requests.exceptions.Timeout:
            self.logger.error("OFAC API timeout")
            return False, "OFAC check timeout - manual review required"
        
        except requests.exceptions.RequestException as e:
            self.logger.error(f"OFAC API request failed: {e}")
            return False, "OFAC check failed - manual review required"
    
    def _simulate_ofac_check(self, user_name: str) -> Tuple[bool, str]:
        """
        Enhanced simulation of OFAC sanctions check
        Returns: (is_clear, status_message)
        """
        normalized_name = self._normalize_name(user_name)
        
        # Check against sanctioned names list
        for sanctioned_name in self.sanctioned_names:
            if normalized_name == self._normalize_name(sanctioned_name):
                return False, f"Exact match found on sanctions list: {sanctioned_name}"
        
        # Check for partial matches (fuzzy matching simulation)
        for sanctioned_name in self.sanctioned_names:
            sanctioned_normalized = self._normalize_name(sanctioned_name)
            # Simple fuzzy matching - check if names share significant words
            user_words = set(normalized_name.split())
            sanctioned_words = set(sanctioned_normalized.split())
            
            if len(user_words.intersection(sanctioned_words)) >= 2:
                return False, f"Potential partial match found: {sanctioned_name} - manual review required"
        
        # Simulate API delay
        time.sleep(self.simulation_delay)
        
        # Simulate occasional false positives for testing
        random_check = random.random()
        if random_check > 0.95:  # 5% chance of requiring manual review
            return False, "Random compliance check triggered - manual review required"
        elif random_check > 0.90:  # Additional 5% chance of potential match
            return False, "Potential match found in extended database - manual review required"
        
        return True, "OFAC sanctions check passed - no matches found"
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        current_time = time.time()
        valid_entries = sum(
            1 for entry in self.check_cache.values()
            if current_time - entry["timestamp"] < self.cache_ttl
        )
        
        return {
            "total_entries": len(self.check_cache),
            "valid_entries": valid_entries,
            "cache_hit_ratio": getattr(self, '_cache_hits', 0) / max(getattr(self, '_total_checks', 1), 1)
        }
    
    def clear_cache(self):
        """Clear all cached OFAC results"""
        self.check_cache.clear()
        self.logger.info("OFAC cache cleared")
