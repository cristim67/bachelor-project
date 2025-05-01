from pydantic import BaseModel, Field


class ProjectData(BaseModel):
    project_id: str = Field(..., description="The id of the project")
    presigned_url: str = Field(..., description="The presigned URL of the project")
    project_name: str = Field(..., description="The name of the project")
    region: str = Field(..., description="The region of the project")