import random
import string
from datetime import datetime

from bson import ObjectId
from config.logger import logger
from dtos.project import ProjectInput
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from models.project import Project
from repository.session import SessionRepository
from services.s3_service import S3Service
from utils.name_generator import NameGenerator


class ProjectRepository:
    def __init__(self):
        self.s3_service = S3Service()

    @staticmethod
    async def create_project(project_input: ProjectInput, session_token: str):
        name_generator = NameGenerator()
        
        session = await SessionRepository.get_session(session_token)
        session_dict = jsonable_encoder(session)
        user_id = session_dict["user_id"]
        s3_folder_name = None
        deployment_url = None
        database_uri = None
        name = name_generator.generate_color_animal_name(separator='-')+''.join(random.choices("abcdefghijklmnopqrstuvwxyz", k=6))
        region = "eu-central-1"

        project = Project(
            idea=project_input.idea,
            user_id=user_id,
            is_public=project_input.is_public,
            s3_folder_name=s3_folder_name,
            deployment_url=deployment_url,
            database_uri=database_uri,
            name=name,
            region=region,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            deleted_at=None,
        )
        await project.insert()
        return project

    @staticmethod
    async def get_project(id: str, session_token: str):
        try:
            object_id = ObjectId(id)
            logger.info(f"Searching for project with ID: {object_id}")
            project = await Project.find_one({"_id": object_id})
            logger.info(f"Found project")

            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            session = await SessionRepository.get_session(session_token)
            if not session:
                raise HTTPException(status_code=401, detail="Invalid session")

            if str(session.user_id) != str(project.user_id):
                raise HTTPException(status_code=403, detail="You don't have access to this project")

            s3_service = S3Service()
            if project.s3_folder_name:
                project.s3_presigned_url = s3_service.get_file_url(f"{project.s3_folder_name}/project.zip")
                await project.save()

            logger.info(f"Project: {project}")
            return project
        except Exception as e:
            logger.error(f"Error finding project: {str(e)}")
            raise HTTPException(status_code=404, detail="Project not found")

    @staticmethod
    async def get_all_projects(user_id: str):
        try:
            projects = await Project.find({"user_id": user_id}).to_list()
            return projects
        except Exception as e:
            logger.error(f"Error getting all projects: {e}")
            return []

    @staticmethod
    async def delete_project(id: str, user_id: str):
        try:
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID is required")
            if not id:
                raise HTTPException(status_code=401, detail="Project ID is required")
            object_id = ObjectId(id)

            project = await Project.find_one({"_id": object_id, "user_id": user_id})
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            await project.delete()
            return {"message": "Project deleted successfully"}
        except Exception as e:
            logger.error(f"Error deleting project: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")

    @staticmethod
    async def update_project_deployment_url(id: str, deployment_url: str, database_uri: str, session_token: str):
        try:
            project = await Project.find_one({"_id": ObjectId(id)})
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")

            project.deployment_url = deployment_url
            project.database_uri = database_uri
            await project.save()
            return project
        except Exception as e:
            logger.error(f"Error updating project: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
        