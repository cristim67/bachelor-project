from datetime import datetime

from dtos.project import ProjectInput
from models.project import Project
from services.s3_service import S3Service


class ProjectRepository:
    def __init__(self):
        self.s3_service = S3Service()

    # TODO: Create project | LLM
    # TODO: Zip the project and upload to S3
    @staticmethod
    async def create_project(project_input: ProjectInput):
        project = Project(
            idea=project_input["idea"],
            stack=project_input["stack"],
            user_id=project_input["user_id"],
            is_public=project_input["is_public"],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            deleted_at=None,
        )
        await project.insert()
        return project

    async def get_project(self, id: str):
        return await Project.find_one(Project.id == id)
