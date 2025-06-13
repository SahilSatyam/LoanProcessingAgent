import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

from functools import lru_cache

class Settings(BaseSettings):
    """Application configuration settings"""
    
    # API Configuration
    app_name: str = Field(default="AI Loan Processing API", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    reload: bool = Field(default=True, env="RELOAD")
    
    # CORS Configuration
    allowed_origins: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "localhost:3000",
            "localhost:5173"
        ],
        env="ALLOWED_ORIGINS"
    )
    
    # LLM Configuration
    deepseek_api_key: str = Field(default="sk-d932e3fdf99e443e9e16fac3c51d1a49", env="DEEPSEEK_API_KEY")
    deepseek_api_url: str = Field(
        default="https://api.deepseek.com/v1/chat/completions",
        env="DEEPSEEK_API_URL"
    )
    llm_max_retries: int = Field(default=3, env="LLM_MAX_RETRIES")
    llm_retry_delay: float = Field(default=1.0, env="LLM_RETRY_DELAY")
    llm_temperature: float = Field(default=0.7, env="LLM_TEMPERATURE")
    llm_max_tokens: int = Field(default=1000, env="LLM_MAX_TOKENS")
    
    # File Paths
    data_directory: str = Field(default="data", env="DATA_DIRECTORY")
    users_file: str = Field(default="data/users.xlsx", env="USERS_FILE")
    loans_file: str = Field(default="data/loans.xlsx", env="LOANS_FILE")
    loan_agreement_file: str = Field(
        default="data/Format-Loan Agreement.doc",
        env="LOAN_AGREEMENT_FILE"
    )
    
    # OFAC Configuration
    ofac_api_url: Optional[str] = Field(default=None, env="OFAC_API_URL")
    ofac_api_key: Optional[str] = Field(default=None, env="OFAC_API_KEY")
    ofac_timeout: float = Field(default=5.0, env="OFAC_TIMEOUT")
    ofac_simulation_delay: float = Field(default=0.5, env="OFAC_SIMULATION_DELAY")
    
    # Loan Calculation Parameters
    loan_multiplier: int = Field(default=5, env="LOAN_MULTIPLIER")
    loan_term_years: int = Field(default=12, env="LOAN_TERM_YEARS")
    
    # Security Configuration
    secret_key: str = Field(default="your-secret-key-here", env="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")  # seconds
    
    # Logging Configuration
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: str = Field(default="logs/app.log", env="LOG_FILE")
    log_max_size: int = Field(default=10485760, env="LOG_MAX_SIZE")  # 10MB
    log_backup_count: int = Field(default=5, env="LOG_BACKUP_COUNT")
    
    # Cache Configuration
    cache_ttl: int = Field(default=300, env="CACHE_TTL")  # 5 minutes
    cache_max_size: int = Field(default=1000, env="CACHE_MAX_SIZE")
    
    # Database Configuration (for future use)
    database_url: Optional[str] = Field(default=None, env="DATABASE_URL")
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings"""
    return Settings()

# Global settings instance
settings = get_settings()