from models.active_session import ActiveSession
from datetime import datetime

class SessionController:
    @staticmethod
    async def get_session(session_token: str):
        session = await ActiveSession.find_one({"session_token": session_token})
        return session
    
    @staticmethod
    async def get_session_by_user_id(user_id: str):
        session = await ActiveSession.find_one({"user_id": user_id})
        return session
    
    @staticmethod
    async def add_session(session_token: str, user_id: str):
        new_session = ActiveSession(session_token=session_token, user_id=user_id)
        response = await new_session.insert()

        return response
    
    @staticmethod
    async def delete_session(session_token: str):
        await ActiveSession.find_one({"session_token": session_token}).delete()

    @staticmethod
    async def delete_session_by_user_id(user_id: str):
        await ActiveSession.find_one({"user_id": user_id}).delete()

    @staticmethod
    async def delete_all_sessions_by_user_id(user_id: str):
        await ActiveSession.find({"user_id": user_id}).delete()

    @staticmethod
    async def delete_all_sessions():
        await ActiveSession.delete_many({})

    @staticmethod
    async def check_session_expiration(session_token: str):
        session = await ActiveSession.find_one({"session_token": session_token})
        if not session:
            return False
        if session.expiration_time < datetime.now():
            await session.delete()
            return False
        return True
    
    @staticmethod
    async def check_session_expiration_by_user_id(user_id: str):
        session = await ActiveSession.find_one({"user_id": user_id})
        if not session:
            return False
        if session.expiration_time < datetime.now():
            await session.delete()
            return False
        return True