from pydantic import BaseModel
from typing import Optional

class UserInput(BaseModel):
    username: str
    email: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    auth_provider: Optional[str] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserLogout(BaseModel):
    session_token: str

class GoogleLogin(BaseModel):
    credential: str