from fastapi import APIRouter
from dtos.user import UserInput, UserUpdate, UserLogin, UserLogout
from controllers.auth_controller import AuthController

router = APIRouter()

@router.post('/register/')
async def register_user(user_input: UserInput):
    user, session_token = await AuthController.register_user(user_input)
    return {"code": 200, "user": user, "session_token": session_token}

@router.post('/login/')
async def login(user_login: UserLogin):
    user, session_token = await AuthController.login(user_login)
    return {"code": 200, "user": user, "session_token": session_token}

@router.post('/logout/')
async def logout(user_logout: UserLogout):
    await AuthController.logout(user_logout)
    return {"code": 200}

@router.post("/user/update/")
async def update_user(user_update: UserUpdate):
    user = await AuthController.update_user(user_update)
    return {"code": 200, "user": user}