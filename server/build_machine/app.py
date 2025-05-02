import io
import os
import re
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
    project_name = request.project_name
    region = request.region
    project_id = request.project_id
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
        analyze_result = subprocess.run(["genezio", "analyze", "--name", project_name, "--region", region], 
                                     capture_output=True, 
                                     text=True,
                                     cwd= os.path.join(temp_dir, "code"),
                                     env={"CI": "true",
                                          "GENEZIO_TOKEN": token,
                                          "GENEZIO_NO_TELEMETRY": "1",
                                          "HOME":"/tmp",
                                          **os.environ})
        print("Analyze output:", analyze_result.stdout)

        if analyze_result.stderr:
            print("Analyze errors:", analyze_result.stderr)

        with open(os.path.join(temp_dir, "code", "genezio.yaml"), "r") as f:
            yaml_content = f.read()
            env_var_match = re.search(r'(\w+)_URI:', yaml_content)
            if env_var_match:
                new_db_name = env_var_match.group(1).lower().replace('_', '-')
                yaml_content = re.sub(
                    r'(services:\s+databases:\s+- name: )[^\n]+',
                    r'\1' + new_db_name + '-db',
                    yaml_content
                )
                yaml_content = re.sub(
                    r'(\${{services\.databases\.)[^\.]+(\.(uri)}})',
                    r'\1' + new_db_name + '-db' + r'\2',
                    yaml_content
                )

                with open(os.path.join(temp_dir, "code", "genezio.yaml"), "w") as f:
                    f.write(yaml_content)

        print("Cat genezio.yaml file:")
        with open(os.path.join(temp_dir, "code", "genezio.yaml"), "r") as f:
            print(f.read())

        # after genezio analyze, we need to deploy the project
        print("Running genezio deploy...")
        deploy_result = subprocess.run(["genezio", "deploy", "--logLevel", "debug"], 
                                     capture_output=True, 
                                     text=True,
                                     cwd= os.path.join(temp_dir, "code"),
                                     env={"CI": "true",
                                          "GENEZIO_TOKEN": token,
                                          "GENEZIO_NO_TELEMETRY": "1",
                                          "HOME":"/tmp",
                                          **os.environ})
        print("Deploy output:", deploy_result.stdout)
        if deploy_result.stderr:
            print("Deploy errors:", deploy_result.stderr)

        # Extract deployment URL
        deploy_url_match = re.search(r'https://[a-zA-Z0-9-]+\.eu-central-1\.cloud\.genez\.io', deploy_result.stdout)
        deploy_url = deploy_url_match.group(0) if deploy_url_match else None

        # Extract database URI
        db_uri_match = re.search(r'"value":"(mongodb\+srv://[^"]+)"', deploy_result.stdout)
        db_uri = db_uri_match.group(1) if db_uri_match else None


        if not deploy_url:
            raise Exception("Failed to extract deployment URL from output")

        # Update the project in the database
        async with aiohttp.ClientSession() as session:
            async with session.put(f"{os.getenv('CORE_API_URL')}/v1/project/update/{project_id}/deployment-url", params={"deployment_url": deploy_url, "database_uri": db_uri}, headers={"Authorization": f"Bearer {credentials.credentials}"}) as response:
                if response.status != 200:
                    raise Exception(f"Failed to update project in the database: {response.status}")

        return JSONResponse(
            status_code=status.HTTP_200_OK, 
            content={
                "status": "success",
                "deployment_url": deploy_url,
                "database_uri": db_uri
            }
        )

    except Exception as e:
        print("Error during deployment:", str(e))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            content={"status": "error", "message": str(e)}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)