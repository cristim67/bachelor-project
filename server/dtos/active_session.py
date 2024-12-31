from pydantic import BaseModel
from datetime import datetime, timedelta
from beanie import PydanticObjectId

class ActiveSession(BaseModel):
    user_id: PydanticObjectId
    session_token: str
    expire_at: datetime = datetime.now() + timedelta(minutes=15)
    created_at: datetime = datetime.now()