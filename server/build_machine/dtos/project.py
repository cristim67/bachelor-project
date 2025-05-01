from pydantic import BaseModel, Field


class ProjectData(BaseModel):
    presigned_url: str = Field(..., description="The presigned URL of the project")