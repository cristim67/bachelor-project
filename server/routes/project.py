from datetime import datetime

from dtos.project import ProjectInput
from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from repository.project import ProjectRepository
from routes.utils import BearerToken

router = APIRouter()

security = BearerToken()


@router.post("/create")
async def create_project(project_input: ProjectInput, credentials: HTTPAuthorizationCredentials = Depends(security)):
    session_token = credentials.credentials

    project = await ProjectRepository.create_project(project_input, session_token)
    project_dict = jsonable_encoder(project)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "project": project_dict})


@router.get("/get/{id}")
async def get_project(id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    session_token = credentials.credentials

    project = await ProjectRepository.get_project(id, session_token)
    project_dict = jsonable_encoder(project)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "project": project_dict})
