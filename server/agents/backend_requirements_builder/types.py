from pydantic import BaseModel


class BackendRequirementsAgentPromptInput(BaseModel):
    """Input for backend requirements agent."""

    message: str