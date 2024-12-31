from fastapi import HTTPException
from beanie import PydanticObjectId
from datetime import datetime
from models.user import User
from dtos.user import UserInput, UserUpdate, UserLogin, UserLogout
from models.active_session import ActiveSession
from utils.jwt_helper import create_access_token, hash_password, verify_password
from utils.validate_helper import is_valid_email, is_valid_password

class AuthController:
    @staticmethod
    async def register_user(user_input: UserInput):
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
    async def login(user_login: UserLogin):
        user = await User.find_one({"email": user_login.email})
        if not user or not verify_password(user_login.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid email or password")
        
        session_token = create_access_token({"sub": str(user._id)})
        new_session = ActiveSession(user_id=user._id, session_token=session_token)
        await new_session.insert()
        
        return user, session_token
    
    @staticmethod
    async def logout(user_logout: UserLogout):
        await ActiveSession.find_one({"session_token": user_logout.session_token}).delete()

    @staticmethod
    async def update_user(id:str, properties: UserUpdate):
        user = await User.find_one({"_id": PydanticObjectId(id)})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        if properties.username:
            user.username = properties.username
        if properties.email:
            user.email = properties.email
        if properties.auth_provider:
            user.auth_provider = properties.auth_provider
        if properties.password:
            user.hashed_password = hash_password(properties.password)
        
        user.updated_at = datetime.now()
        await user.save()
        return user