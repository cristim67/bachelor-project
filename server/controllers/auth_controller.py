from fastapi import HTTPException
from beanie import PydanticObjectId
from models.user import User
from models.active_session import ActiveSession
from utils.jwt_helper import create_access_token, hash_password, verify_password
from utils.validate_helper import is_valid_email, is_valid_password

class AuthController:
    @staticmethod
    async def register_user(user_input):
        if not is_valid_email(user_input.email):
            raise HTTPException(status_code=400, detail="Invalid email")
        if not is_valid_password(user_input.password):
            raise HTTPException(status_code=400, detail="Invalid password")
        
        existing_user = await User.find_one({"email": user_input.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        new_user = User(
            username=user_input.username,
            email=user_input.email,
            auth_provider="email&password",
            hashed_password=hash_password(user_input.password)
        )
        await new_user.insert()

        session_token = create_access_token({"sub": str(new_user._id)})
        new_session = ActiveSession(user_id=new_user._id, session_token=session_token)
        await new_session.insert()

        return new_user, session_token

    @staticmethod
    async def login(email: str, password: str):
        user = await User.find_one({"email": email})
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid email or password")
        
        session_token = create_access_token({"sub": str(user._id)})
        new_session = ActiveSession(user_id=user._id, session_token=session_token)
        await new_session.insert()
        
        return user, session_token
    
    @staticmethod
    async def logout(session_token: str):
        await ActiveSession.find_one({"session_token": session_token}).delete()

    @staticmethod
    async def get_user(session_token: str):
        session = await ActiveSession.find_one({"session_token": session_token})
        if not session:
            raise HTTPException(status_code=400, detail="Invalid session token")
        return await User.find_one({"_id": PydanticObjectId(session.user_id)})

    @staticmethod
    async def get_user_by_id(user_id: str):
        user = await User.find_one({"_id": PydanticObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        return user