import io
import json
import os
import re
import shutil
import traceback
import uuid
import zipfile

from agents.agent_factory import AgentFactory, AgentType
from config.logger import logger
from dtos.agent import AgentOptions, ChatRequest
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from repository.project import ProjectRepository
from routes.utils import BearerToken
from services.s3_service import (
    create_files_for_s3_json_content,
    download_from_s3,
    upload_zip_to_s3,
)

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

        langfuse_session_id = None

        if not request_data.langfuse_session_id:
            langfuse_session_id = str(uuid.uuid4())
        else:
            langfuse_session_id = request_data.langfuse_session_id

        logger.debug(f"Langfuse session id: {langfuse_session_id}")

        try:
            logger.debug(f"Getting agent: {request_data.agent}")
            agent = AgentFactory.get_agent(request_data.agent, langfuse_session_id)
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


@router.post("/backend-requirements")
async def backend_requirements(
    request_data: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        if not request_data.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty",
            )

        if not request_data.agent == AgentType.BACKEND_REQUIREMENTS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent must be BACKEND_REQUIREMENTS")

        if not request_data.project:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project is required")

        project_repository = ProjectRepository()
        project = await project_repository.get_project(
            id=request_data.project.projectId, session_token=credentials.credentials
        )

        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        langfuse_session_id = None

        if not request_data.langfuse_session_id:
            langfuse_session_id = str(uuid.uuid4())
        else:
            langfuse_session_id = request_data.langfuse_session_id

        requirements_agent = AgentFactory.get_agent(AgentType.BACKEND_REQUIREMENTS, langfuse_session_id)
        requirements_response = await requirements_agent.chat(
            message=request_data.message,
            history=request_data.history,
            model=request_data.model,
            options=AgentOptions(streaming=True),
            project=request_data.project,
            bearer_token=credentials.credentials,
            json_mode=False,
        )

        # Shared buffer to collect content
        content_buffer = []

        # Function to stream chunks to frontend and collect content
        async def stream_and_collect():
            try:
                async for chunk in requirements_response.body_iterator:
                    content_buffer.append(chunk)
                    yield chunk
            finally:
                # Ensure we have all the content before proceeding
                requirements_content = "".join(content_buffer)

                # Format messages as JSONL
                messages = [
                    {"role": "user", "content": request_data.message},
                    {"role": "assistant", "content": requirements_content},
                ]
                jsonl_content = "\n".join(json.dumps(msg) for msg in messages)

                # Create project folder structure
                project_folder = request_data.project.projectId
                project_structure = {
                    "structure": [{"type": "file", "path": "./history/conversation.jsonl", "content": jsonl_content}]
                }

                # Save requirements in the project folder
                project_path = await create_files_for_s3_json_content(project_structure, project_folder)
                project_url = await upload_zip_to_s3(project_path, project_folder)

                # Update project with the new URL and folder
                project.s3_presigned_url = project_url
                project.s3_folder_name = project_folder
                await project.save()

        # Create streaming response
        response = StreamingResponse(stream_and_collect(), media_type="text/plain")

        return response

    except Exception as e:
        logger.error(f"Error in backend requirements: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating requirements: {str(e)}"
        )


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

        project_repository = ProjectRepository()
        project = await project_repository.get_project(
            id=request_data.project.projectId, session_token=credentials.credentials
        )

        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        langfuse_session_id = None

        if not request_data.langfuse_session_id:
            langfuse_session_id = str(uuid.uuid4())
        generator_agent = AgentFactory.get_agent(AgentType.PROJECT_GENERATOR, langfuse_session_id)
        project_structure = await generator_agent.chat(
            message=request_data.message,
            history=[],
            model="gpt-3.5-turbo",
            options=AgentOptions(streaming=False),
            project=request_data.project,
            bearer_token=credentials.credentials,
            json_mode=True,
        )

        json_patterns = [
            r"```json\n(.*?)\n```",
            r"```\n(.*?)\n```",
            r"\{.*\}",
        ]

        json_content = None
        for pattern in json_patterns:
            json_match = re.search(pattern, project_structure, re.DOTALL)
            if json_match:
                try:
                    # Try to get the first group, if it exists
                    group_content = json_match.group(1) if len(json_match.groups()) > 0 else json_match.group(0)
                    json_content = json.loads(group_content)
                    break
                except json.JSONDecodeError:
                    continue

        if not json_content:
            logger.error(f"Project generator response: {project_structure}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not find valid JSON structure in the response. Please try again.",
            )

        try:
            project_folder = request_data.project.projectId
            # Create temporary directory for project files
            tmp_dir = f"/tmp/{project_folder}"
            os.makedirs(tmp_dir, exist_ok=True)

            # First, download existing files from S3 if they exist
            if project.s3_presigned_url:
                try:
                    response = await download_from_s3(project.s3_presigned_url)
                    with zipfile.ZipFile(io.BytesIO(response), "r") as zip_ref:
                        zip_ref.extractall(tmp_dir)
                except Exception as e:
                    logger.warning(f"Could not download existing files from S3: {str(e)}")

            # Create the project structure with all files
            project_structure = {"structure": []}

            # Add all files from the JSON structure
            if isinstance(json_content, dict) and "structure" in json_content:
                for item in json_content["structure"]:
                    if item["type"] == "file":
                        # Create directory structure if needed
                        file_path = os.path.join(tmp_dir, item["path"])
                        os.makedirs(os.path.dirname(file_path), exist_ok=True)

                        # Write file content
                        with open(file_path, "w") as f:
                            if isinstance(item["content"], dict):
                                f.write(json.dumps(item["content"], indent=2))
                            else:
                                f.write(str(item["content"]))

                        project_structure["structure"].append(
                            {
                                "type": "file",
                                "path": f"./{item['path']}",
                                "content": (
                                    json.dumps(item["content"], indent=2)
                                    if isinstance(item["content"], dict)
                                    else str(item["content"])
                                ),
                            }
                        )

            # Create ZIP file with only the new files
            zip_path = f"/tmp/code.zip"
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                # Only add files that were created from the JSON structure
                for item in project_structure["structure"]:
                    if item["type"] == "file":
                        file_path = os.path.join(tmp_dir, item["path"].lstrip("./"))
                        if os.path.exists(file_path):
                            arcname = item["path"].lstrip("./")
                            zipf.write(file_path, arcname)

            # Upload ZIP to S3
            project_url = await upload_zip_to_s3(zip_path, project_folder)

            # Clean up temporary files
            shutil.rmtree(tmp_dir)
            os.remove(zip_path)

            # Update project with the new URL and folder
            project.s3_presigned_url = project_url
            project.s3_folder_name = project_folder
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
