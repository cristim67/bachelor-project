from datetime import datetime, timedelta

from beanie import PydanticObjectId
from config.env_handler import ACCESS_TOKEN_EXPIRE_MINUTES
from pydantic import BaseModel


class ActiveSession(BaseModel):
    user_id: PydanticObjectId
    session_token: str
    expire_at: datetime = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    created_at: datetime = datetime.now()
