from pydantic import BaseModel
from typing import Optional

class UserInput(BaseModel):
    username: str
    email: str
    auth_provider: str
    password: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    auth_provider: Optional[str] = None
    password: Optional[str] = None