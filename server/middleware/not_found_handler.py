from typing import Callable

from fastapi import FastAPI, HTTPException
from fastapi.requests import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse

RequestResponseEndpoint = Callable[[Request], Response]


class NotFoundHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        try:
            response = await call_next(request)
            if response.status_code == 404:
                return RedirectResponse(url="/docs")
            return response
        except HTTPException as e:
            if e.status_code == 404:
                return RedirectResponse(url="/docs")
            raise e


def create_not_found_handler(app: FastAPI):
    app.add_middleware(NotFoundHandlerMiddleware)
