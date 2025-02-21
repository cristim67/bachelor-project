from beanie import init_beanie
from config.env_handler import BACHELOR_PROJECT_DATABASE_URL
from models.active_session import ActiveSession
from models.project import Project
from models.user import User
from motor.motor_asyncio import AsyncIOMotorClient


class DatabaseConnection:
    def __init__(self):
        self.client = AsyncIOMotorClient(BACHELOR_PROJECT_DATABASE_URL)
        self.db = self.client["bachelor-project"]

    async def initialize(self):
        try:
            await init_beanie(database=self.db, document_models=[User, ActiveSession, Project])
            print("Database connection initialized")
        except Exception as e:
            print(f"Error initializing database connection: {e}")
            raise e

    def get_db(self):
        return self.db

    async def close_db(self):
        await self.client.close()


db_connection = DatabaseConnection()
