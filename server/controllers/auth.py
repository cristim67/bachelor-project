from passlib.context import CryptContext
from models import User, ActiveSession
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException
from utils import SECRET_KEY, ALGORITHM, pwd_context

async def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

async def get_password_hash(password: str):
    return pwd_context.hash(password)

async def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)