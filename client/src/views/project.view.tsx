import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/auth_context";
import { useNavigate } from "react-router-dom";
import sdk from "@stackblitz/sdk";
import { useEffect, useRef } from "react";

interface FileStructure {
  type: "file" | "directory";
  path: string;
  content: string | null;
}

interface ProjectStructure {
  structure: FileStructure[];
}

const test_data: ProjectStructure = {
  structure: [
    {
      type: "directory",
      path: "./crud_app/app/models",
      content: null,
    },
    {
      type: "file",
      path: "./crud_app/app/models/user.py",
      content:
        "from pydantic import BaseModel, EmailStr\nfrom typing import Optional\nfrom datetime import datetime\n\nclass User(BaseModel):\n    id: Optional[str]\n    username: str\n    email: EmailStr\n    created_at: Optional[datetime]\n    updated_at: Optional[datetime]",
    },
    {
      type: "directory",
      path: "./crud_app/app/routers",
      content: null,
    },
    {
      type: "file",
      path: "./crud_app/app/routers/users.py",
      content:
        'from fastapi import APIRouter, HTTPException, status\nfrom typing import List\nfrom ..models.user import User\nfrom ..db.connection import get_database\nfrom bson import ObjectId\nfrom motor.motor_asyncio import AsyncIOMotorClient\nfrom fastapi.encoders import jsonable_encoder\n\nrouter = APIRouter()\n\ndb_client: Optional[AsyncIOMotorClient] = None\n\ndef get_users_collection():\n    return db_client["user_db"]["users"]\n\n@router.on_event("startup")\nasync def initialize_database():\n    global db_client\n    db_client = await get_database()\n\n@router.get("/users", response_model=List[User])\nasync def get_users():\n    users = []\n    users_cursor = get_users_collection().find({})\n    async for user in users_cursor:\n        user["id"] = str(user["_id"])\n        users.append(User(**user))\n    return users\n\n@router.get("/users/{user_id}", response_model=User)\nasync def get_user(user_id: str):\n    if not ObjectId.is_valid(user_id):\n        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID")\n    user = await get_users_collection().find_one({"_id": ObjectId(user_id)})\n    if user is None:\n        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")\n    user["id"] = str(user["_id"])\n    return User(**user)\n\n@router.post("/users", response_model=User, status_code=status.HTTP_201_CREATED)\nasync def create_user(user: User):\n    user_data = jsonable_encoder(user)\n    result = await get_users_collection().insert_one(user_data)\n    created_user = await get_users_collection().find_one({"_id": result.inserted_id})\n    created_user["id"] = str(created_user["_id"])\n    return User(**created_user)\n\n@router.put("/users/{user_id}", response_model=User)\nasync def update_user(user_id: str, user: User):\n    if not ObjectId.is_valid(user_id):\n        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID")\n    user_data = {k: v for k, v in user.dict().items() if v is not None}\n    update_result = await get_users_collection().update_one({"_id": ObjectId(user_id)}, {"$set": user_data})\n    if update_result.modified_count == 0:\n        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")\n    updated_user = await get_users_collection().find_one({"_id": ObjectId(user_id)})\n    updated_user["id"] = str(updated_user["_id"])\n    return User(**updated_user)\n\n@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)\nasync def delete_user(user_id: str):\n    if not ObjectId.is_valid(user_id):\n        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID")\n    delete_result = await get_users_collection().delete_one({"_id": ObjectId(user_id)})\n    if delete_result.deleted_count == 0:\n        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")\n',
    },
    {
      type: "directory",
      path: "./crud_app/app/db",
      content: null,
    },
    {
      type: "file",
      path: "./crud_app/app/db/connection.py",
      content:
        'import motor.motor_asyncio\nimport os\n\nasync def get_database() -> motor.motor_asyncio.AsyncIOMotorClient:\n    database_url = os.getenv("MONGODB_DATABASE_URL")\n    client = motor.motor_asyncio.AsyncIOMotorClient(database_url)\n    return client',
    },
    {
      type: "file",
      path: "./crud_app/app/main.py",
      content:
        "from fastapi import FastAPI\nfrom .routers import users\n\napp = FastAPI()\n\napp.include_router(users.router)",
    },
    {
      type: "file",
      path: "./crud_app/app/config.py",
      content:
        'from dotenv import load_dotenv\nimport os\n\nload_dotenv()\nPOSTGRES_DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL")\nMONGODB_DATABASE_URL = os.getenv("MONGODB_DATABASE_URL")',
    },
    {
      type: "file",
      path: "./crud_app/.env.example",
      content:
        "MONGODB_DATABASE_URL=mongodb://username:password@localhost:27017/user_db",
    },
    {
      type: "file",
      path: "./crud_app/requirements.txt",
      content:
        "fastapi==0.95.0\nuvicorn==0.22.0\npydantic==1.10.7\nmotor==3.3.0\npython-dotenv==1.0.0\nbson==0.5.10",
    },
  ],
};

export const Project = () => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const editorRef = useRef<HTMLDivElement>(null);

  const convertToStackblitzFiles = (
    structure: FileStructure[],
  ): Record<string, string> => {
    const files: Record<string, string> = {};
    structure.forEach((item) => {
      if (item.type === "file") {
        files[item.path.replace("./", "")] = item.content || "";
      }
    });
    return files;
  };

  useEffect(() => {
    if (editorRef.current) {
      try {
        sdk.embedProject(
          editorRef.current,
          {
            files: convertToStackblitzFiles(test_data.structure),
            title: "Python Project",
            description: "Python FastAPI Project Viewer",
            template: "node",
            settings: {
              compile: {
                trigger: "auto",
              },
            },
          },
          {
            height: "100%",
            showSidebar: true,
            view: "editor",
            theme: "dark",
            hideNavigation: true,
          },
        );
      } catch (error) {
        console.error("Failed to embed Stackblitz project:", error);
      }
    }
  }, []);

  if (!isLoggedIn) {
    navigate("/auth/login");
  }

  return (
    <div className="flex min-h-screen pt-16">
      <div className="w-1/2 p-4">
        <div className="p-4 rounded-lg shadow">
          <p>Project ID: {id}</p>
        </div>
      </div>
      <div
        ref={editorRef}
        className="w-1/2 h-[calc(100vh-64px)] border-l border-gray-200 overflow-hidden bg-[#1e1e1e]"
      />
    </div>
  );
};
