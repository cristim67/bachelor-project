from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class User(Document):
    username: str
    email: str
    auth_provider: str 
    hashed_password: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()