from dtos.project import ProjectInput
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from repository.project import ProjectRepository
from routes.utils import GenezioBearer

router = APIRouter()

security = GenezioBearer()


@router.post("/create")
async def create_project(project_input: ProjectInput, credentials: HTTPAuthorizationCredentials = Depends(security)):
    session_token = credentials.credentials

    project_input_dict = project_input.model_dump()

    project = await ProjectRepository.create_project(project_input_dict, session_token)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "project": project})


@router.get("/get/{id}")
async def get_project(id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    session_token = credentials.credentials

    project = await ProjectRepository.get_project(id, session_token)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "project": project})
