from fastapi import APIRouter, Header
from dtos.user import (
    UserInput,
    UserUpdate,
    UserLogin,
    UserLogout,
    GoogleLogin,
    ForgotPassword,
)
from controllers.auth_controller import AuthController
from controllers.session_controller import SessionController
from config.env_handler import FRONTEND_URL

router = APIRouter()


@router.post("/register")
async def register_user(user_input: UserInput):
    user, session_token = await AuthController.register_user(user_input)
    return {"code": 200, "user": user, "session_token": session_token}


@router.post("/login")
async def login(user_login: UserLogin):
    user, session_token = await AuthController.login(user_login)
    return {"code": 200, "user": user, "session_token": session_token}


@router.post("/logout")
async def logout(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"code": 401, "message": "No session token provided"}
    session_token = authorization.split(" ")[1]
    await AuthController.logout(session_token)
    return {"code": 200}


@router.post("/user/update")
async def update_user(user_update: UserUpdate):
    user = await AuthController.update_user(user_update)
    return {"code": 200, "user": user}


@router.get("/user/verify-otp")
async def verify_otp(email: str, otp_code: str):
    await AuthController.verify_otp(email, otp_code)
    return {
        "code": 200,
        "message": f"OTP verified successfully, you can now login at {FRONTEND_URL}/auth/login",
    }


@router.post("/user/forgot-password")
async def forgot_password(forgot_password_data: ForgotPassword):
    await AuthController.forgot_password(forgot_password_data)
    return {"code": 200, "message": f"Check your email for the reset password link"}


@router.get("/user/verify-otp-forgot-password")
async def verify_otp_forgot_password(email: str, otp_code: str):
    password = await AuthController.verify_otp_forgot_password(email, otp_code)
    return {
        "code": 200,
        "message": f"OTP verified successfully, new password is: {password}",
    }


@router.get("/session/check")
async def check_session(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"code": 401, "session": False}

    session_token = authorization.split(" ")[1]
    session = await SessionController.check_session_expiration(session_token)
    return {"code": 200, "session": session}


@router.post("/google-login")
async def google_login(google_login: GoogleLogin):
    user, session_token = await AuthController.google_login(google_login)
    return {"code": 200, "user": user, "session_token": session_token}
