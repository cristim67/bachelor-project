from agents.agent_factory import AgentFactory
from config.logger import logger
from dtos.agent import ChatRequest
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from routes.utils import BearerToken

router = APIRouter()

security = BearerToken()


@router.post("/")
async def chat(
    request_data: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        if not request_data.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty",
            )

        if not request_data.agent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent cannot be empty")

        try:
            logger.debug(f"Getting agent: {request_data.agent}")
            agent = AgentFactory.get_agent(request_data.agent)
            logger.debug(f"Factory agent retrieved: {agent.name}")
        except ValueError as e:
            available_agents = AgentFactory.list_available_agents()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid agent: {str(e)}. Available agents: {available_agents}",
            )

        response = await agent.chat(
            message=request_data.message,
            history=request_data.history,
            model=request_data.model,
            options=request_data.options,
            project=request_data.project,
            bearer_token=credentials.credentials,
        )
        return response

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")
