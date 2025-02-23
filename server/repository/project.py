from datetime import datetime

import boto3
from config.env_handler import (
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET_NAME,
    AWS_REGION,
    AWS_SECRET_ACCESS_KEY,
)
from dtos.project import ProjectInput
from models.project import Project
from repository.session import SessionRepository


class ProjectRepository:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )
        self.bucket_name = AWS_BUCKET_NAME

    # TODO: Create project | LLM
    # TODO: Zip the project and upload to S3
    @staticmethod
    async def create_project(project_input: ProjectInput, session_token: str):
        session_controller = SessionRepository()
        await session_controller.check_session_expiration(session_token)

        session = await session_controller.get_session(session_token)
        user_id = session.user_id

        project = Project(
            idea=project_input["idea"],
            stack=project_input["stack"],
            user_id=str(user_id),
            is_public=project_input["is_public"],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            deleted_at=None,
        )
        await project.insert()
        return project

    async def get_project(self, id: str):
        return await Project.find_one(Project.id == id)
