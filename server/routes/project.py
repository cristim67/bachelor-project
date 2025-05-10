from datetime import datetime
from typing import Optional

from config.logger import logger
from dtos.project import ProjectInput
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from repository.project import ProjectRepository
from repository.session import SessionRepository
from routes.utils import BearerToken

router = APIRouter()

security = BearerToken()


@router.post("/create")
async def create_project(project_input: ProjectInput, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        session_token = credentials.credentials
        project = await ProjectRepository.create_project(project_input, session_token)
        project_dict = jsonable_encoder(project)
        return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "project": project_dict})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/get/{id}")
async def get_project(id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        session_token = credentials.credentials
        project = await ProjectRepository().get_project(id, session_token)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return {"code": 200, "project": project}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/get-all")
async def get_all_projects(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        session_token = credentials.credentials
        session = await SessionRepository.get_session_by_token(session_token)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized"
            )
        projects = await ProjectRepository.get_all_projects(str(session.user_id))
        return {"code": 200, "projects": projects}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/delete/{id}")
async def delete_project(id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        session_token = credentials.credentials
        session = await SessionRepository.get_session_by_token(session_token)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized"
            )
        await ProjectRepository.delete_project(id, str(session.user_id))
        return {"code": 200, "message": "Project deleted successfully"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/check-s3/{id}")
async def check_project_s3(id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        session_token = credentials.credentials
        project = await ProjectRepository.get_project(id, session_token)

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        s3_info = {"s3_folder_name": project.s3_folder_name, "s3_presigned_url": project.s3_presigned_url}
        return JSONResponse(status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "s3_info": s3_info})
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


class UpdateProjectRequest(BaseModel):
    deployment_url: Optional[str] = None
    database_uri: Optional[str] = None


@router.put("/update/{id}/deployment-url")
async def update_project(id: str, request: UpdateProjectRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        project = await ProjectRepository.update_project_deployment_url(id, request.deployment_url, request.database_uri)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return {"code": 200, "project": project}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )