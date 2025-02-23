from config.logger import logger
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> ASGIApp:
        try:
            response = await call_next(request)
            return response
        except HTTPException as http_ex:
            logger.error(f"HTTPException: {http_ex}, {http_ex.status_code}, {http_ex.detail}")
            return JSONResponse(status_code=http_ex.status_code, content={"message": http_ex.detail})
        except Exception as ex:
            logger.error(f"Error: {str(ex)}")
            logger.error(f"Error type: {type(ex).__name__}")
            import traceback

            logger.error(f"Stack trace: {''.join(traceback.format_tb(ex.__traceback__))}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"message": "Internal server error"},
            )


def create_error_handler(app: FastAPI):
    app.add_middleware(ErrorHandlerMiddleware)
