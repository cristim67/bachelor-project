from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime, timedelta
from config.env_handler import ACCESS_TOKEN_EXPIRE_MINUTES
class ActiveSession(Document):
    id: PydanticObjectId
    user_id: PydanticObjectId
    session_token: str
    expire_at: datetime = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    created_at: datetime = datetime.now()
