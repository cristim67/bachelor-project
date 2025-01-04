from beanie import Document
from datetime import datetime
from typing import Optional

class User(Document):
    username: str
    email: str
    auth_provider: str 
    hashed_password: Optional[str] = None
    otp_code: Optional[str] = None
    otp_expiration: Optional[datetime] = None
    verified: bool = False
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    profile_picture: Optional[str] = None