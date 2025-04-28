import io
import subprocess
import tempfile
import zipfile
from typing import Optional

import aiohttp
from dotenv import load_dotenv
from dtos.project import ProjectData
from fastapi import Depends, FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer

load_dotenv()

security = HTTPBearer()

app = FastAPI(
    title="Build Machine",
    description="Build Machine API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    contact={
        "name": "Build Machine",
        "url": "https://github.com/cristim67/bachelor-project",
        "email": "miloiuc4@gmail.com",
    },
)

@app.get("/health")
async def health():
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok"})

@app.post("/project-build")
async def project_build(request: ProjectData, token: str = Depends(security)):
    presigned_url = request.presigned_url
    genezio_token = request.genezio_token

    try:
        temp_dir = tempfile.mkdtemp()
        # download the project from the presigned url
        async with aiohttp.ClientSession() as session:
            async with session.get(presigned_url) as response:
                if response.status != 200:
                    raise Exception(f"Failed to download from S3: {response.status}")
                project_zip = await response.read()
    
        # unzip the project
        with zipfile.ZipFile(io.BytesIO(project_zip), "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        # genezio analyze 
        print("Running genezio analyze...")
        analyze_result = subprocess.run(["genezio", "analyze"], 
                                     capture_output=True, 
                                     text=True,
                                     cwd=temp_dir)
        print("Analyze output:", analyze_result.stdout)
        if analyze_result.stderr:
            print("Analyze errors:", analyze_result.stderr)

        # genezio login
        print("Running genezio login...")
        login_result = subprocess.run(["genezio", "login", genezio_token], 
                                    capture_output=True, 
                                    text=True,
                                    env={"CI": "true"})
        print("Login output:", login_result.stdout)
        if login_result.stderr:
            print("Login errors:", login_result.stderr)

        # after genezio analyze, we need to deploy the project
        print("Running genezio deploy...")
        deploy_result = subprocess.run(["genezio", "deploy"], 
                                     capture_output=True, 
                                     text=True,
                                     cwd=temp_dir)
        print("Deploy output:", deploy_result.stdout)
        if deploy_result.stderr:
            print("Deploy errors:", deploy_result.stderr)

    except Exception as e:
        print("Error during deployment:", str(e))
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"status": "error", "message": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)