import io
import os
import subprocess
import tempfile
import uuid
import zipfile

import aiohttp
from dotenv import load_dotenv
from dtos.project import ProjectData
from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer

load_dotenv()

token = os.getenv("GENEZIO_TOKEN")

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok"})

@app.get("/genezio-login")
async def genezio_login():
    print("Running genezio login...")
    result = subprocess.run(["genezio", "login", token], capture_output=True, text=True, env={"CI": "true", **os.environ})
    if result.stderr:
        print("Login errors:", result.stderr)
    result = subprocess.run(["genezio", "account"], capture_output=True, text=True, env={"CI": "true", **os.environ})
    if result.stderr:
        print("Account errors:", result.stderr)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok", "result": result.stdout})

@app.post("/project-build")
async def project_build(request: ProjectData, credentials: HTTPBearer = Depends(security)):
    presigned_url = request.presigned_url
    print("Presigned URL:", presigned_url)
    try:
        temp_dir = tempfile.mkdtemp() + str(uuid.uuid4())
        # download the project from the presigned url
        async with aiohttp.ClientSession() as session:
            async with session.get(presigned_url) as response:
                if response.status != 200:
                    raise Exception(f"Failed to download from S3: {response.status}")
                project_zip = await response.read()
    
        # unzip the project
        with zipfile.ZipFile(io.BytesIO(project_zip), "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        # unzip the code.zip file
        code_zip_path = os.path.join(temp_dir, "code", "code.zip")
        with zipfile.ZipFile(code_zip_path, "r") as code_zip_ref:
            code_zip_ref.extractall(os.path.join(temp_dir, "code"))

        # print the project directory tree
        print("Project directory tree after unzip:")
        tree_result = subprocess.run(["tree", temp_dir, "-L", "2"], capture_output=True, text=True, env={"CI": "true", **os.environ})
        print(tree_result.stdout)
        if tree_result.stderr:
            print("Tree errors:", tree_result.stderr)
        
        # genezio analyze 
        print("Running genezio analyze...")
        analyze_result = subprocess.run(["genezio", "analyze"], 
                                     capture_output=True, 
                                     text=True,
                                     cwd= os.path.join(temp_dir, "code"),
                                     env={"CI": "true", **os.environ})
        print("Analyze output:", analyze_result.stdout)

        print("Cat genezio.yaml file:")
        with open(os.path.join(temp_dir, "code", "genezio.yaml"), "r") as f:
            print(f.read())
        if analyze_result.stderr:
            print("Analyze errors:", analyze_result.stderr)

        # genezio login
        print("Running genezio login...")
        login_result = subprocess.run(
            ["genezio", "login", token],
            capture_output=True,
            text=True,
            env={"CI": "true", **os.environ}
        )
        print("Login output:", login_result.stdout)
        if login_result.stderr:
            print("Login errors:", login_result.stderr)

        # after genezio analyze, we need to deploy the project
        print("Running genezio deploy...")
        deploy_result = subprocess.run(["genezio", "deploy"], 
                                     capture_output=True, 
                                     text=True,
                                     cwd= os.path.join(temp_dir, "code"),
                                     env={"CI": "true", **os.environ})
        print("Deploy output:", deploy_result.stdout)
        if deploy_result.stderr:
            print("Deploy errors:", deploy_result.stderr)

    except Exception as e:
        print("Error during deployment:", str(e))
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"status": "error", "message": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)