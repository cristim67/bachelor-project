from config.logger import logger
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from repository.session import SessionRepository


class BearerToken(HTTPBearer):
    async def __call__(self, request: Request):
        authorization = request.headers.get("Authorization", "").strip()
        if not authorization or not authorization.startswith("Bearer "):
            logger.warning("Invalid or missing Authorization header", ip=request.client.host)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing Authorization header",
            )

        token = authorization.split(" ")[1]

        try:
            await SessionRepository.check_session_expiration(token)
            return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        except Exception as e:
            logger.warning(
                "Invalid authorization token",
                ip=request.client.host,
                status_code=e.response.status_code,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token",
            )
