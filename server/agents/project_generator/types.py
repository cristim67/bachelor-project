from pydantic import BaseModel


class ProjectGeneratorAgentPromptInput(BaseModel):
    """Input for project generator agent."""

    message: str