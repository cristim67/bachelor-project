from pydantic import BaseModel


class BaseAgentPromptInput(BaseModel):
    """Base class for all agent prompt inputs."""

    pass


class AgentPrompt(BaseModel):
    """Represents the system and client prompts for an agent."""

    system: str
    client: str
