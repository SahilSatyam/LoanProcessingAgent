from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import asyncio
from typing import Dict, Optional
from collections import defaultdict, deque
from .config import settings
from .utils.logger import log_api_request, log_api_response, log_security_event, get_logger
from .exceptions import RateLimitException

logger = get_logger("middleware")

class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware to track request timing"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        request.state.start_time = start_time
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log API requests and responses"""
    
    async def dispatch(self, request: Request, call_next):
        # Extract user_id from request if available
        user_id = "unknown"
        if request.method == "POST":
            try:
                # Try to get user_id from request body
                body = await request.body()
                if body:
                    import json
                    try:
                        data = json.loads(body)
                        user_id = data.get("user_id", "unknown")
                    except:
                        pass
                # Reset body for downstream processing
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
            except:
                pass
        
        # Log request
        log_api_request(str(request.url.path), user_id, request.method)
        
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log response
        log_api_response(
            str(request.url.path), 
            user_id, 
            response.status_code, 
            process_time
        )
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.requests: Dict[str, deque] = defaultdict(deque)
        self.cleanup_interval = 60  # seconds
        self.last_cleanup = time.time()
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Try to get user_id from request, fallback to IP
        client_id = request.client.host if request.client else "unknown"
        
        # Try to extract user_id from request body for better tracking
        if hasattr(request.state, 'user_id'):
            client_id = request.state.user_id
        
        return client_id
    
    def _cleanup_old_requests(self):
        """Remove old request timestamps"""
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            cutoff_time = current_time - settings.rate_limit_window
            
            for client_id in list(self.requests.keys()):
                client_requests = self.requests[client_id]
                while client_requests and client_requests[0] < cutoff_time:
                    client_requests.popleft()
                
                # Remove empty deques
                if not client_requests:
                    del self.requests[client_id]
            
            self.last_cleanup = current_time
    
    def _is_rate_limited(self, client_id: str) -> bool:
        """Check if client is rate limited"""
        current_time = time.time()
        cutoff_time = current_time - settings.rate_limit_window
        
        # Clean old requests for this client
        client_requests = self.requests[client_id]
        while client_requests and client_requests[0] < cutoff_time:
            client_requests.popleft()
        
        # Check if limit exceeded
        if len(client_requests) >= settings.rate_limit_requests:
            return True
        
        # Add current request
        client_requests.append(current_time)
        return False
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/", "/health", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Periodic cleanup
        self._cleanup_old_requests()
        
        client_id = self._get_client_id(request)
        
        if self._is_rate_limited(client_id):
            log_security_event(
                "RATE_LIMIT_EXCEEDED",
                client_id,
                {
                    "endpoint": str(request.url.path),
                    "method": request.method,
                    "limit": settings.rate_limit_requests,
                    "window": settings.rate_limit_window
                }
            )
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Rate limit exceeded. Maximum {settings.rate_limit_requests} requests per {settings.rate_limit_window} seconds.",
                    "details": {
                        "limit": settings.rate_limit_requests,
                        "window": settings.rate_limit_window,
                        "retry_after": settings.rate_limit_window
                    }
                },
                headers={"Retry-After": str(settings.rate_limit_window)}
            )
        
        return await call_next(request)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle uncaught exceptions"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            logger.error(f"Uncaught exception in middleware: {exc}", exc_info=True)
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": True,
                    "error_code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                    "details": {}
                }
            )

class CacheControlMiddleware(BaseHTTPMiddleware):
    """Middleware to add cache control headers"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add cache control headers based on endpoint
        if request.url.path.startswith("/static/"):
            # Cache static files for 1 hour
            response.headers["Cache-Control"] = "public, max-age=3600"
        elif request.url.path in ["/docs", "/openapi.json"]:
            # Cache API docs for 5 minutes
            response.headers["Cache-Control"] = "public, max-age=300"
        else:
            # No cache for API endpoints
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response

class HealthCheckMiddleware(BaseHTTPMiddleware):
    """Middleware to handle health checks"""
    
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/health":
            return JSONResponse(
                content={
                    "status": "healthy",
                    "timestamp": time.time(),
                    "version": settings.app_version,
                    "environment": "development" if settings.debug else "production"
                }
            )
        
        return await call_next(request)

class MonitoringMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Track API performance metrics
        duration = time.time() - request.state.start_time
        log_performance_metric(
            f"api.{request.url.path.replace('/', '.')}",
            duration * 1000  # Convert to ms
        )
        
        return response