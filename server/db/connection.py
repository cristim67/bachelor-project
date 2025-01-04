from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.user import User
from models.active_session import ActiveSession
from config.env_handler import MONGO_DB_DATABASE_URL

class DatabaseConnection:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_DB_DATABASE_URL)
        self.db = self.client['mongo-db']
        
    async def initialize(self):
        try:
            await init_beanie(database=self.db, document_models=[User, ActiveSession])
            print("Database connection initialized")
        except Exception as e:
            print(f"Error initializing database connection: {e}")
            raise e
        
    def get_db(self):
        return self.db
    
    async def close_db(self):
        await self.client.close()

db_connection = DatabaseConnection()