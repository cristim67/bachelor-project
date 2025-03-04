from typing import List, Literal, Optional

from pydantic import UUID4, BaseModel, Field


class ProjectInfo(BaseModel):
    projectId: UUID4 = Field(..., description="Project ID")


class AgentOptions(BaseModel):
    streaming: bool = True


class ChatMessage(BaseModel):
    role: Literal["user", "agent"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = Field(None, description="List of previous messages in the conversation")
    agent: str = Field("backend_requirements", description="Agent to use for the chat")
    model: str = Field("gpt-4o", description="LLM model to use for the agent")
    options: Optional[AgentOptions] = Field(None, description="Optional agent options")
    project: Optional[ProjectInfo] = Field(None, description="Optional project information")
