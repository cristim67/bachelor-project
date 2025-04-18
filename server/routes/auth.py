from config.env_handler import FRONTEND_URL
from dtos.user import ForgotPassword, GoogleLogin, UserInput, UserLogin, UserUpdate
from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from repository.auth import AuthRepository
from repository.session import SessionRepository
from routes.utils import BearerToken

router = APIRouter()

security = BearerToken()


@router.post("/register")
async def register_user(user_input: UserInput):
    user, session_token = await AuthRepository.register_user(user_input)

    user_dict = jsonable_encoder(user)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"code": status.HTTP_200_OK, "user": user_dict, "session_token": session_token},
    )


@router.post("/login")
async def login(user_login: UserLogin):
    user, session_token = await AuthRepository.login(user_login)

    user_dict = jsonable_encoder(user)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"code": status.HTTP_200_OK, "user": user_dict, "session_token": session_token},
    )


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    session_token = credentials.credentials
    await AuthRepository.logout(session_token)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK})


@router.post("/user/update")
async def update_user(user_update: UserUpdate):
    user = await AuthRepository.update_user(user_update)

    user_dict = jsonable_encoder(user)

    return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "user": user_dict})


@router.get("/user/verify-otp")
async def verify_otp(email: str, otp_code: str):
    await AuthRepository.verify_otp(email, otp_code)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "code": status.HTTP_200_OK,
            "message": f"OTP verified successfully, you can now login at {FRONTEND_URL}/auth/login",
        },
    )


@router.post("/user/forgot-password")
async def forgot_password(forgot_password_data: ForgotPassword):
    await AuthRepository.forgot_password(forgot_password_data)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"code": status.HTTP_200_OK, "message": f"Check your email for the reset password link"},
    )


@router.get("/user/verify-otp-forgot-password")
async def verify_otp_forgot_password(email: str, otp_code: str):
    password = await AuthRepository.verify_otp_forgot_password(email, otp_code)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "code": status.HTTP_200_OK,
            "message": f"OTP verified successfully, new password is: {password}",
        },
    )


@router.get("/session/check")
async def check_session(credentials: HTTPAuthorizationCredentials = Depends(security)):
    session = await SessionRepository.check_session_expiration(credentials.credentials)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"code": status.HTTP_200_OK, "session": session},
    )


@router.post("/google-login")
async def google_login(google_login: GoogleLogin):
    print(f"Google login: {google_login}")
    user, session_token = await AuthRepository.google_login(google_login)

    user_dict = jsonable_encoder(user)

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "code": status.HTTP_200_OK,
            "user": user_dict,
            "session_token": session_token,
        },
    )
