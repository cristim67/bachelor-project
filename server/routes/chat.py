import json
import re
import traceback
import uuid

from agents.agent_factory import AgentFactory, AgentType
from config.logger import logger
from dtos.agent import AgentOptions, ChatRequest
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from repository.project import ProjectRepository
from routes.utils import BearerToken
from services.s3_service import create_files_for_s3_json_content, upload_zip_to_s3

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


@router.post("/project-generator")
async def project_generator(
    request_data: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        if not request_data.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty",
            )

        if not request_data.agent == AgentType.PROJECT_GENERATOR:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent must be PROJECT_GENERATOR")

        if not request_data.project:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project is required")

        project = await ProjectRepository.get_project(
            ProjectRepository, id=request_data.project.projectId, session_token=credentials.credentials
        )

        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        s3_folder_name = str(uuid.uuid4())

        # Step 1: Get structured requirements from BackendRequirementsAgent
        requirements_agent = AgentFactory.get_agent(AgentType.BACKEND_REQUIREMENTS)
        requirements = await requirements_agent.chat(
            message=request_data.message,
            history=request_data.history,
            model=request_data.model,
            options=AgentOptions(streaming=False),
            project=request_data.project,
            bearer_token=credentials.credentials,
        )

        # Step 2: Generate code using ProjectGeneratorAgent
        generator_agent = AgentFactory.get_agent(AgentType.PROJECT_GENERATOR)
        project_structure = await generator_agent.chat(
            message=requirements,
            history=[],
            model=request_data.model,
            options=AgentOptions(streaming=False),
            project=request_data.project,
            bearer_token=credentials.credentials,
        )

        # Extract JSON from the response string
        # Try multiple patterns to find JSON content
        json_patterns = [
            r"```json\n(.*?)\n```",  # Standard markdown code block
            r"```\n(.*?)\n```",  # Generic code block
            r"\{.*\}",  # Raw JSON object
        ]

        json_content = None
        for pattern in json_patterns:
            json_match = re.search(pattern, project_structure, re.DOTALL)
            if json_match:
                try:
                    # Try to parse the matched content
                    json_content = json.loads(json_match.group(1))
                    break
                except json.JSONDecodeError:
                    continue

        if not json_content:
            # Log the actual response for debugging
            logger.error(f"Project generator response: {project_structure}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not find valid JSON structure in the response. Please try again.",
            )

        try:
            zip_path = await create_files_for_s3_json_content(json_content, s3_folder_name)
            presigned_url = await upload_zip_to_s3(zip_path, s3_folder_name)

            project.s3_presigned_url = presigned_url
            project.s3_folder_name = s3_folder_name
            await project.save()

            project_dict = jsonable_encoder(project)
            return JSONResponse(
                status_code=status.HTTP_200_OK, content={"code": status.HTTP_200_OK, "project": project_dict}
            )
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Invalid JSON in response: {str(e)}"
            )

    except Exception as e:
        logger.error(f"Error in project generator: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating project: {str(e)}"
        )
