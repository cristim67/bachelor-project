import json
import re
import traceback

from agents.agent_factory import AgentFactory, AgentType
from config.logger import logger
from dtos.agent import AgentOptions, ChatRequest
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from routes.utils import BearerToken

router = APIRouter()

security = BearerToken()


test_data = {
    "structure": [
        {"type": "directory", "path": "./crud_app", "content": None},
        {"type": "directory", "path": "./crud_app/app", "content": None},
        {"type": "directory", "path": "./crud_app/app/models", "content": None},
        {
            "type": "file",
            "path": "./crud_app/app/models/user.py",
            "content": "from pydantic import BaseModel, Field, EmailStr\nfrom bson import ObjectId\nfrom typing import Optional\n\nclass UserModel(BaseModel):\n    id: Optional[ObjectId] = Field(alias='_id')\n    name: str\n    email: EmailStr\n    password: str\n\nclass UpdateUserModel(BaseModel):\n    name: Optional[str]\n    email: Optional[EmailStr]\n    password: Optional[str]\n\n    class Config:\n        arbitrary_types_allowed = True\n        json_encoders = {\n            ObjectId: str\n        }",
        },
        {"type": "directory", "path": "./crud_app/app/routes", "content": None},
        {
            "type": "file",
            "path": "./crud_app/app/routes/user.py",
            "content": 'from fastapi import APIRouter, HTTPException, status, Depends\nfrom typing import List\nfrom bson import ObjectId\n\nfrom ..models.user import UserModel, UpdateUserModel\nfrom ..services.user_service import UserService\n\nrouter = APIRouter()\n\n@router.post("/users", response_model=UserModel, status_code=status.HTTP_201_CREATED)\nasync def create_user(user: UserModel, user_service: UserService = Depends()):\n    return await user_service.create_user(user)\n\n@router.get("/users", response_model=List[UserModel])\nasync def get_users(skip: int = 0, limit: int = 10, user_service: UserService = Depends()):\n    return await user_service.get_users(skip, limit)\n\n@router.get("/users/{user_id}", response_model=UserModel)\nasync def get_user(user_id: str, user_service: UserService = Depends()):\n    if not ObjectId.is_valid(user_id):\n        raise HTTPException(status_code=400, detail=\'Invalid user ID\')\n    return await user_service.get_user(user_id)\n\n@router.put("/users/{user_id}", response_model=UserModel)\nasync def update_user(user_id: str, user: UpdateUserModel, user_service: UserService = Depends()):\n    if not ObjectId.is_valid(user_id):\n        raise HTTPException(status_code=400, detail=\'Invalid user ID\')\n    return await user_service.update_user(user_id, user)\n\n@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)\nasync def delete_user(user_id: str, user_service: UserService = Depends()):\n    if not ObjectId.is_valid(user_id):\n        raise HTTPException(status_code=400, detail=\'Invalid user ID\')\n    await user_service.delete_user(user_id)',
        },
        {"type": "directory", "path": "./crud_app/app/services", "content": None},
        {
            "type": "file",
            "path": "./crud_app/app/services/user_service.py",
            "content": "from motor.motor_asyncio import AsyncIOMotorClient\nfrom bson import ObjectId\nfrom fastapi import HTTPException, status\n\nfrom ..models.user import UserModel, UpdateUserModel\nfrom ..db.database import get_database\n\nclass UserService:\n    def __init__(self, db=None):\n        self.db = db or get_database()\n        self.collection = self.db.get_collection('users')\n\n    async def create_user(self, user: UserModel):\n        user_dict = user.dict(by_alias=True)\n        result = await self.collection.insert_one(user_dict)\n        user.id = result.inserted_id\n        return user\n\n    async def get_users(self, skip: int = 0, limit: int = 10):\n        cursor = self.collection.find().skip(skip).limit(limit)\n        users = []\n        async for doc in cursor:\n            users.append(UserModel(**doc))\n        return users\n\n    async def get_user(self, user_id: str):\n        user = await self.collection.find_one({'_id': ObjectId(user_id)})\n        if user:\n            return UserModel(**user)\n        raise HTTPException(status_code=404, detail=\"User not found\")\n\n    async def update_user(self, user_id: str, user: UpdateUserModel):\n        update_data = {k: v for k, v in user.dict().items() if v is not None}\n        updated_user = await self.collection.find_one_and_update(\n            {'_id': ObjectId(user_id)},\n            {'$set': update_data},\n            return_document=True\n        )\n        if updated_user:\n            return UserModel(**updated_user)\n        raise HTTPException(status_code=404, detail=\"User not found\")\n\n    async def delete_user(self, user_id: str):\n        result = await self.collection.delete_one({'_id': ObjectId(user_id)})\n        if result.deleted_count == 0:\n            raise HTTPException(status_code=404, detail=\"User not found\")",
        },
        {"type": "directory", "path": "./crud_app/app/db", "content": None},
        {
            "type": "file",
            "path": "./crud_app/app/db/database.py",
            "content": 'import os\nfrom motor.motor_asyncio import AsyncIOMotorClient\n\nMONGODB_DATABASE_URL = os.getenv("MONGODB_DATABASE_URL")\n\nclient = AsyncIOMotorClient(MONGODB_DATABASE_URL)\ndb = client.get_default_database()\n\ndef get_database():\n    return db',
        },
        {
            "type": "file",
            "path": "./crud_app/app/main.py",
            "content": 'from fastapi import FastAPI\nfrom .routes.user import router as user_router\n\napp = FastAPI()\n\napp.include_router(user_router)\n\n@app.get("/")\nasync def root():\n    return {"message": "Welcome to the User Management API"}',
        },
        {
            "type": "file",
            "path": "./crud_app/.env.example",
            "content": "MONGODB_DATABASE_URL=mongodb://localhost:27017/your_database",
        },
        {
            "type": "file",
            "path": "./crud_app/requirements.txt",
            "content": "fastapi==0.95.0\nuvicorn==0.17.6\nmotor==3.1.1\npydantic==1.10.5\npython-dotenv==0.21.0",
        },
    ]
}


@router.post("/")
async def chat(
    request_data: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        if not request_data.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty",
            )

        if not request_data.agent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent cannot be empty")

        try:
            logger.debug(f"Getting agent: {request_data.agent}")
            agent = AgentFactory.get_agent(request_data.agent)
            logger.debug(f"Factory agent retrieved: {agent.name}")
        except ValueError as e:
            available_agents = AgentFactory.list_available_agents()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid agent: {str(e)}. Available agents: {available_agents}",
            )

        response = await agent.chat(
            message=request_data.message,
            history=request_data.history,
            model=request_data.model,
            options=request_data.options,
            project=request_data.project,
            bearer_token=credentials.credentials,
        )
        return response

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.post("/project-generator")
async def project_generator(
    request_data: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        if not request_data.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty",
            )

        if not request_data.agent == AgentType.PROJECT_GENERATOR:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent must be PROJECT_GENERATOR")

        # Step 1: Get structured requirements from BackendRequirementsAgent
        requirements_agent = AgentFactory.get_agent(AgentType.BACKEND_REQUIREMENTS)
        requirements = await requirements_agent.chat(
            message=request_data.message,
            history=request_data.history,
            model=request_data.model,
            options=AgentOptions(streaming=False),
            project=request_data.project,
            bearer_token=credentials.credentials,
        )

        # Step 2: Generate code using ProjectGeneratorAgent
        generator_agent = AgentFactory.get_agent(AgentType.PROJECT_GENERATOR)
        project_structure = await generator_agent.chat(
            message=requirements,
            history=[],
            model=request_data.model,
            options=AgentOptions(streaming=False),
            project=request_data.project,
            bearer_token=credentials.credentials,
        )

        # Extract JSON from the response string
        # Find content between ```json and ``` markers
        json_match = re.search(r"```json\n(.*?)\n```", project_structure, re.DOTALL)
        if not json_match:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not find JSON structure in the response",
            )

        # Parse the JSON string to ensure it's valid
        try:
            json_content = json.loads(json_match.group(1))
            return json_content
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid JSON in response: {str(e)}"
            )

    except Exception as e:
        logger.error(f"Error in project generator: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating project: {str(e)}"
        )
