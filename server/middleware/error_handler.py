from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp
from starlette.exceptions import HTTPException


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> ASGIApp:
        try:
            response = await call_next(request)
            return response
        except HTTPException as http_ex:
            print(f"HTTPException: {http_ex}, {http_ex.status_code}, {http_ex.detail}")
            return JSONResponse(
                status_code=http_ex.status_code,
                content={'message': http_ex.detail}
            )
        except Exception as ex:
            print(f"Error: {str(ex)}")
            print(f"Error type: {type(ex).__name__}")
            import traceback
            print(f"Stack trace: {''.join(traceback.format_tb(ex.__traceback__))}")
            return JSONResponse(
                status_code=500,
                content={'message': 'Internal server error'}
            )

def create_error_handler(app: FastAPI):
    app.add_middleware(ErrorHandlerMiddleware)
