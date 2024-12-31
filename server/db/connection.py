from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.user import User
from models.active_session import ActiveSession
from config.env_handler import MONGO_DB_DATABASE_URL

class DatabaseConnection:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_DB_DATABASE_URL)
        self.db = self.client['licenta']
        
    async def initialize(self):
        await init_beanie(database=self.db, document_models=[User, ActiveSession])

    def get_db(self):
        return self.db
    
    async def close_db(self):
        await self.client.close()

db_connection = DatabaseConnection()