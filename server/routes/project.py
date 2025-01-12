from fastapi import APIRouter, Header, HTTPException
from dtos.project import ProjectInput
from controllers.project_controller import ProjectController
router = APIRouter()

@router.post("/create")
async def create_project(project_input: ProjectInput, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No session token provided")

    session_token = authorization.split(' ')[1]
    
    project_input_dict = project_input.model_dump()
    
    project = await ProjectController.create_project(project_input_dict, session_token)
    return {"code": 200, "project": project}

@router.get("/get/{id}")
async def get_project(id: str, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No session token provided")
    
    session_token = authorization.split(' ')[1] 

    project = await ProjectController.get_project(id, session_token)
    return {"code": 200, "project": project}