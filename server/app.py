from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional
from utils import generate_project_json, create_project_from_json

app = FastAPI()

@app.get("/")
async def query_llm(question: Optional[str] = "Simple CRUD APP in Fastify"):
    async def generate():
        for chunk in generate_project_json(question):
            yield f"{chunk}"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

@app.get("/create")
async def create_project(question: Optional[str] = "Hello world in Express"):
    try:    
        json_response = await generate_project_json(question)
        project_id = create_project_from_json(json_response)
        return JSONResponse(content={"status": "success", "project_id": project_id})
        
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)})


@app.get("/project/{project_id}")
async def get_project(project_id: str):
    return JSONResponse(content={"status": "success", "project_id": project_id})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)