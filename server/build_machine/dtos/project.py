from pydantic import BaseModel, Field


class ProjectData(BaseModel):
    genezio_token: str = Field(..., description="The genezio token")
    presigned_url: str = Field(..., description="The presigned URL of the project")