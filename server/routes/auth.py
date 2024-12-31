from fastapi import APIRouter, HTTPException
from datetime import datetime
from dtos.user import UserInput, UserUpdate
from dtos.active_session import ActiveSession
from beanie import PydanticObjectId
from models.user import User
from models.active_session import ActiveSession
from utils.jwt_helper import decode_access_token, create_access_token, hash_password, verify_password
from utils.validate_helper import is_valid_email, is_valid_password

router = APIRouter()

@router.post('/register/')
async def register_user(user: UserInput):
    if not is_valid_email(user.email):
        raise HTTPException(status_code=400, detail="Invalid email")
    if not is_valid_password(user.password):
        raise HTTPException(status_code=400, detail="Invalid password")
    
    existing_user = await User.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    new_user = User(
        id=PydanticObjectId(),
        username=user.username,
        email=user.email,
        auth_provider="email&password",
        hashed_password=hash_password(user.password)
    )
    await new_user.insert()

    session_token = create_access_token({"sub": str(new_user.id)})
    new_session = ActiveSession(id=PydanticObjectId(), user_id=new_user.id, session_token=session_token)
    await new_session.insert()

    return {"code": 200, "user": new_user, "session_token": session_token}

@router.post('/login/')
async def login(email: str, password: str):
    user = await User.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    session_token = create_access_token({"sub": str(user.id)})
    new_session = ActiveSession(user_id=user.id, session_token=session_token)
    await new_session.insert()
    
    return {"code": 200, "user": user, "session_token": session_token}

@router.get('/user/')
async def get_user_info(user_id: str):
    user = await User.find_one({"_id": PydanticObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    return {"code": 200, "user": user}

@router.post('/logout/')
async def logout(user_id: str):
    await ActiveSession.find_one({"user_id": PydanticObjectId(user_id)}).delete()
    return {"code": 200, "message": "User logged out successfully"}

@router.get('/check-session/')
async def check_session(session_token: str):
    session = await ActiveSession.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=400, detail="Invalid session token")
    return {"code": 200, "session": session}
