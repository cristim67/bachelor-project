from fastapi import APIRouter
from dtos.user import UserInput
from beanie import PydanticObjectId
from controllers.auth_controller import AuthController

router = APIRouter()

@router.post('/register/')
async def register_user(user: UserInput):
    user, session_token = await AuthController.register_user(user)
    return {"code": 200, "user": user, "session_token": session_token}

@router.post('/login/')
async def login(email: str, password: str):
    user, session_token = await AuthController.login(email, password)
    return {"code": 200, "user": user, "session_token": session_token}

@router.post('/logout/')
async def logout(session_token: str):
    await AuthController.logout(session_token)
    return {"code": 200}

@router.get('/user/')
async def get_user(session_token: str):
    user = await AuthController.get_user(session_token)
    return {"code": 200, "user": user}

@router.get('/user/{user_id}')
async def get_user_by_id(user_id: str):
    user = await AuthController.get_user_by_id(user_id)
    return {"code": 200, "user": user}