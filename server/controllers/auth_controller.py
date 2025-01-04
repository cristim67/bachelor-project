from fastapi import HTTPException
from beanie import PydanticObjectId
from datetime import datetime, timedelta
from models.user import User
from dtos.user import UserInput, UserUpdate, UserLogin, UserLogout, GoogleLogin
from models.active_session import ActiveSession
from controllers.session_controller import SessionController
from utils.jwt_helper import create_access_token, hash_password, verify_password
from utils.validate_helper import is_valid_email, is_valid_password
from utils.otp_helper import generate_otp_code, is_otp_code_valid
from services.email_service import email_service
from config.otp_email_template import otp_email_template
from config.env_handler import GOOGLE_CLIENT_ID
from google.oauth2 import id_token
from google.auth.transport import requests
from typing import Tuple

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

        otp_code = generate_otp_code()
        email_service.send_email(user_input.email, "OTP Code", otp_email_template(otp_code), is_html=True)

        new_user = User(
            username=user_input.username,
            email=user_input.email,
            auth_provider="email&password",
            hashed_password=hash_password(user_input.password),
            otp_code=otp_code,
            otp_expiration=datetime.now() + timedelta(minutes=10)
        )

        created_user = await new_user.insert()
        session_token = create_access_token({"sub": str(created_user.id)})
        await SessionController.add_session(session_token, created_user.id)

        return created_user, session_token

    @staticmethod
    async def login(user_login: UserLogin):
        user = await User.find_one({"email": user_login.email})
        if not user or not verify_password(user_login.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid email or password")

        if not user.verified:
            raise HTTPException(status_code=401, detail="User not verified, please check your email for the OTP code")

        session_token = create_access_token({"sub": str(user.id)})
        await SessionController.add_session(session_token, user.id)

        return user, session_token

    @staticmethod
    async def logout(session_token: str):
        await ActiveSession.find_one({"session_token": session_token}).delete()

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

    @staticmethod
    async def verify_otp(otp_code: str):
        if not is_otp_code_valid(otp_code):
            raise HTTPException(status_code=400, detail="Invalid OTP code")

        user = await User.find_one({"otp_code": otp_code})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        if user.otp_expiration < datetime.now():
            raise HTTPException(status_code=400, detail="OTP code expired")
        if user.verified:
            raise HTTPException(status_code=400, detail="User already verified")

        user.verified = True
        user.otp_code = None
        user.otp_expiration = None
        user.updated_at = datetime.now()
        await user.save()

        return user

    @staticmethod
    async def google_login(credential: GoogleLogin) -> Tuple[User, str]:
        if not credential.credential:
            raise HTTPException(status_code=400, detail="Invalid credential")
        
        try:
            idinfo = id_token.verify_oauth2_token(
                credential.credential, 
                requests.Request(), 
                GOOGLE_CLIENT_ID
            )

            email = idinfo['email']
            
            user = await User.find_one({"email": email})
            
            if user and user.auth_provider != "google":
                raise HTTPException(
                    status_code=400, 
                    detail="An account with this email already exists. Please login with email and password."
                )
            
            if not user:
                user = User(
                    username=idinfo['name'],
                    email=email,
                    profile_picture=idinfo.get('picture'),
                    auth_provider="google",
                    verified=True
                )
                await user.insert()

            session_token = create_access_token({"sub": str(user.id)})
            await SessionController.add_session(session_token, user.id)
            
            return user, session_token

        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Google token")
