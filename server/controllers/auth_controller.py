from fastapi import HTTPException
from beanie import PydanticObjectId
from datetime import datetime, timedelta
from models.user import User
from dtos.user import (
    UserInput,
    UserUpdate,
    UserLogin,
    UserLogout,
    GoogleLogin,
    ForgotPassword,
)
from models.active_session import ActiveSession
from controllers.session_controller import SessionController
from utils.jwt_helper import (
    create_access_token,
    hash_password,
    verify_password,
    generate_random_password,
)
from utils.validate_helper import is_valid_email, is_valid_password
from utils.otp_helper import generate_otp_code, is_otp_code_valid
from services.email_service import email_service
from config.otp_email_template import (
    otp_email_template,
    otp_forgot_password_email_template,
    otp_notification_email_template,
)
from config.env_handler import GOOGLE_CLIENT_ID, OTP_EXPIRATION_MINUTES
from google.oauth2 import id_token
from google.auth.transport import requests
from typing import Tuple
from db.connection import db_connection


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
        email_service.send_email(
            user_input.email,
            "OTP Code",
            otp_email_template(otp_code, user_input.email),
            is_html=True,
        )

        new_user = User(
            username=user_input.username,
            email=user_input.email,
            auth_provider="email&password",
            hashed_password=hash_password(user_input.password),
            otp_code=otp_code,
            otp_expiration=datetime.now() + timedelta(minutes=OTP_EXPIRATION_MINUTES),
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
            otp_code = generate_otp_code()
            await User.update_one(
                {"_id": user.id},
                {
                    "$set": {
                        "otp_code": otp_code,
                        "otp_expiration": datetime.now()
                        + timedelta(minutes=OTP_EXPIRATION_MINUTES),
                    }
                },
            )
            email_service.send_email(
                user.email,
                "OTP Code",
                otp_email_template(otp_code, user.email),
                is_html=True,
            )
            raise HTTPException(
                status_code=401,
                detail="User not verified, please check your email for the OTP code",
            )

        session_token = create_access_token({"sub": str(user.id)})
        await SessionController.add_session(session_token, user.id)

        return user, session_token

    @staticmethod
    async def logout(session_token: str):
        await ActiveSession.find_one({"session_token": session_token}).delete()

    @staticmethod
    async def update_user(id: str, properties: UserUpdate):
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
    async def verify_otp(email: str, otp_code: str):
        if not is_otp_code_valid(otp_code):
            raise HTTPException(status_code=400, detail="Invalid OTP code")

        user = await User.find_one({"otp_code": otp_code})
        if not user:
            raise HTTPException(status_code=400, detail="User already verified")
        if user.email != email:
            raise HTTPException(
                status_code=400, detail="OTP code does not match the email"
            )
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
    async def forgot_password(forgot_password: ForgotPassword):
        user = await User.find_one({"email": forgot_password.email})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        if user.auth_provider != "email&password":
            raise HTTPException(
                status_code=400, detail="User is not registered with email and password"
            )

        otp_code = generate_otp_code()
        email_service.send_email(
            user.email,
            "OTP Code",
            otp_forgot_password_email_template(otp_code, user.email),
            is_html=True,
        )

        user.otp_code = otp_code
        user.otp_expiration = datetime.now() + timedelta(minutes=OTP_EXPIRATION_MINUTES)
        await user.save()

        return user

    @staticmethod
    async def verify_otp_forgot_password(email: str, otp_code: str):
        if not is_otp_code_valid(otp_code):
            raise HTTPException(status_code=400, detail="Invalid OTP code")

        user = await User.find_one({"otp_code": otp_code})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        if user.email != email:
            raise HTTPException(
                status_code=400, detail="OTP code does not match the email"
            )
        if user.auth_provider != "email&password":
            raise HTTPException(
                status_code=400, detail="User is not registered with email and password"
            )
        if user.otp_expiration < datetime.now():
            raise HTTPException(status_code=400, detail="OTP code expired")

        new_password = generate_random_password()
        user.hashed_password = hash_password(new_password)
        user.otp_code = None
        user.otp_expiration = None
        user.verified = True
        user.updated_at = datetime.now()
        await user.save()

        email_service.send_email(
            user.email,
            "New Password",
            otp_notification_email_template(new_password, user.email),
            is_html=True,
        )

        return new_password

    @staticmethod
    async def google_login(credential: GoogleLogin) -> Tuple[User, str]:
        await db_connection.initialize()

        if not credential.credential:
            raise HTTPException(status_code=400, detail="Invalid credential")

        try:
            idinfo = id_token.verify_oauth2_token(
                credential.credential, requests.Request(), GOOGLE_CLIENT_ID
            )

            email = idinfo["email"]

            user = await User.find_one({"email": email})

            if user and user.auth_provider != "google":
                raise HTTPException(
                    status_code=400,
                    detail="An account with this email already exists. Please login with email and password.",
                )

            if not user:
                user = User(
                    username=idinfo["name"],
                    email=email,
                    profile_picture=idinfo.get("picture"),
                    auth_provider="google",
                    verified=True,
                )
                await user.insert()

            session_token = create_access_token({"sub": str(user.id)})
            await SessionController.add_session(session_token, user.id)

            return user, session_token

        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Google token")
