import glob
import io
import os
import re
import shutil
import subprocess
import tempfile
import time
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

def cleanup_tmp():
    """Clean up /tmp directory."""
    try:
        genezio_tmp = "/tmp/genezio-*"
        for dir_path in glob.glob(genezio_tmp):
            try:
                shutil.rmtree(dir_path)
                print(f"Cleaned up genezio temp dir: {dir_path}")
            except Exception as e:
                print(f"Error cleaning up {dir_path}: {str(e)}")

        app_tmp = "/tmp/tmp*"
        for dir_path in glob.glob(app_tmp):
            try:
                shutil.rmtree(dir_path)
                print(f"Cleaned up app temp dir: {dir_path}")
            except Exception as e:
                print(f"Error cleaning up {dir_path}: {str(e)}")
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")

@app.post("/project-build")
async def project_build(request: ProjectData, credentials: HTTPBearer = Depends(security)):
    presigned_url = request.presigned_url
    project_name = request.project_name
    region = request.region
    project_id = request.project_id
    database_name = request.database_name
    
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            cleanup_tmp()
            
            temp_dir = tempfile.mkdtemp() + str(uuid.uuid4())
            async with aiohttp.ClientSession() as session:
                async with session.get(presigned_url) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to download from S3: {response.status}")
                    project_zip = await response.read()
        
            with zipfile.ZipFile(io.BytesIO(project_zip), "r") as zip_ref:
                zip_ref.extractall(temp_dir)

            code_zip_path = os.path.join(temp_dir, "code", "code.zip")
            with zipfile.ZipFile(code_zip_path, "r") as code_zip_ref:
                code_zip_ref.extractall(os.path.join(temp_dir, "code"))

            print("Project directory tree after unzip:")
            tree_result = subprocess.run(["tree", temp_dir, "-L", "2"], capture_output=True, text=True, env={"CI": "true", **os.environ})
            print(tree_result.stdout)
            if tree_result.stderr:
                print("Tree errors:", tree_result.stderr)
        
            code_dir = os.path.join(temp_dir, "code")
            print(f"Checking code directory at: {code_dir}")
            if not os.path.exists(code_dir):
                raise Exception(f"Code directory not found at {code_dir}")
            
            print(f"Code directory contents:")
            for item in os.listdir(code_dir):
                print(f"- {item}")

            print(f"Running genezio analyze in directory: {code_dir}")
            print(f"Project name: {project_name}")
            print(f"Region: {region}")
            
            if not project_name or not isinstance(project_name, str):
                raise Exception(f"Invalid project name: {project_name}")
            if not region or not isinstance(region, str):
                raise Exception(f"Invalid region: {region}")
            
            try:
                print("Running genezio analyze command with:")
                print(f"Command: genezio analyze --name {project_name} --region {region}")
                print(f"Working directory: {code_dir}")
                print(f"Environment variables: CI=true, GENEZIO_TOKEN=***, GENEZIO_NO_TELEMETRY=1, HOME=/tmp")
                
                analyze_result = subprocess.run(["genezio", "analyze", "--name", project_name, "--region", region], 
                                             capture_output=True, 
                                             text=True,
                                             cwd=code_dir,
                                             env={"CI": "true",
                                                  "GENEZIO_TOKEN": token,
                                                  "GENEZIO_NO_TELEMETRY": "1",
                                                  "HOME":"/tmp",
                                                  **os.environ})
                print("Analyze output:", analyze_result.stdout)

                if analyze_result.stderr:
                    print("Analyze errors:", analyze_result.stderr)
                    if "error" in analyze_result.stderr.lower():
                        raise Exception(f"Genezio analyze failed: {analyze_result.stderr}")
            except Exception as e:
                print(f"Error during genezio analyze: {str(e)}")
                raise

            yaml_path = os.path.join(code_dir, "genezio.yaml")
            print(f"Checking for genezio.yaml at: {yaml_path}")
            if not os.path.exists(yaml_path):
                raise Exception(f"genezio.yaml not found at {yaml_path}")

            print(f"Reading genezio.yaml from: {yaml_path}")
            with open(yaml_path, "r") as f:
                yaml_content = f.read()
                print("\nOriginal YAML content:")
                print(yaml_content)
                
                print(f"\nUsing database name from request: {database_name}")
                
                db_name_matches = re.finditer(r'(services:\s+databases:\s+- name:\s*)[^\n]+', yaml_content)
                print("\nDatabase name matches:")
                for match in db_name_matches:
                    print(f"Found: '{match.group(0)}'")
                
                yaml_content = re.sub(
                    r'(services:\s+databases:\s+- name:\s*)[^\n]+',
                    r'\1' + database_name,
                    yaml_content
                )
                
                uri_matches = re.finditer(r'(\${{services\.databases\.)[^\.]+(\.uri}})', yaml_content)
                print("\nURI reference matches:")
                for match in uri_matches:
                    print(f"Found: '{match.group(0)}'")
                
                yaml_content = re.sub(
                    r'(\${{services\.databases\.)[^\.]+(\.uri}})',
                    r'\1' + database_name + r'\2',
                    yaml_content
                )
                
                print("\nModified YAML content:")
                print(yaml_content)

                with open(yaml_path, "w") as f:
                    f.write(yaml_content)

            print("Cat genezio.yaml file:")
            with open(yaml_path, "r") as f:
                print(f.read())

            print("Running genezio deploy...")
            while retry_count < max_retries:
                deploy_result = subprocess.run(["genezio", "deploy", "--logLevel", "debug"], 
                                             capture_output=True, 
                                             text=True,
                                             cwd= code_dir,
                                             env={"CI": "true",
                                                  "GENEZIO_TOKEN": token,
                                                  "GENEZIO_NO_TELEMETRY": "1",
                                                  "HOME":"/tmp",
                                                  **os.environ})
                print("Deploy output:", deploy_result.stdout)
                if deploy_result.stderr:
                    print("Deploy errors:", deploy_result.stderr)
                
                if "ENOSPC" in deploy_result.stdout or "ENOSPC" in deploy_result.stderr:
                    if retry_count < max_retries - 1:
                        print("No space left on device. Cleaning /tmp and retrying...")
                        cleanup_tmp()
                        retry_count += 1
                        time.sleep(2) 
                        continue
                    else:
                        raise Exception("No space left on device after multiple retries")
                
                break

            unique_id = uuid.uuid4()
            env_file_path = os.path.join("/tmp", f".env.{unique_id}")
            print("Running genezio getenv...")
            print(f"Command will write to: {env_file_path}")
            getenv_result = subprocess.run(["genezio", "getenv", 
                                          "--projectName", project_name,
                                          "--output", f".env.{unique_id}",
                                          "--format", "env"],
                                         capture_output=True, 
                                         text=True,
                                         cwd="/tmp",
                                         env={"CI": "true",
                                              "GENEZIO_TOKEN": token,
                                              "GENEZIO_NO_TELEMETRY": "1",
                                              "HOME": "/tmp",
                                              **os.environ})
            print("Getenv return code:", getenv_result.returncode)
            print("Getenv stdout:", getenv_result.stdout)
            if getenv_result.stderr:
                print("Getenv stderr:", getenv_result.stderr)
            
            if os.path.exists(env_file_path):
                print(f"Environment file was created at: {env_file_path}")
                with open(env_file_path, 'r') as f:
                    print("File contents:", f.read())
            else:
                print(f"Environment file was NOT created at: {env_file_path}")

            deploy_url_match = re.search(r'https://[a-zA-Z0-9-]+\.eu-central-1\.cloud\.genez\.io', deploy_result.stdout)
            deploy_url_match_dev = re.search(r'https://[a-zA-Z0-9-]+\.dev-fkt\.cloud\.genez\.io', deploy_result.stdout)
            deploy_url = deploy_url_match.group(0) if deploy_url_match else deploy_url_match_dev.group(0) if deploy_url_match_dev else None

            # Extract genezio project ID from the deploy output
            genezio_project_id_match = re.search(r'https://app\.genez\.io/project/([a-f0-9-]+)/', deploy_result.stdout)
            genezio_project_id = genezio_project_id_match.group(1) if genezio_project_id_match else None

            db_uri = None
            if os.path.exists(env_file_path):
                try:
                    with open(env_file_path, 'r') as f:
                        content = f.read()
                        db_uri_match = re.search(r'(mongodb\+srv://[^\s]+|postgresql://[^\s]+)', content)
                        if db_uri_match:
                            db_uri = db_uri_match.group(1)
                except Exception as e:
                    print(f"Error reading environment file: {str(e)}")

            if not deploy_url:
                raise Exception("Failed to extract deployment URL from output")

            print("Deploy URL:", deploy_url)
            print("DB URI:", db_uri)
            print("Genezio Project ID:", genezio_project_id)
            async with aiohttp.ClientSession() as session:
                data = {"deployment_url": deploy_url}
                if db_uri:
                    data["database_uri"] = db_uri
                if genezio_project_id:
                    data["genezio_project_id"] = genezio_project_id

                async with session.put(f"{os.getenv('CORE_API_URL') or 'http://0.0.0.0:8080'}/v1/project/update/{project_id}/deployment-url", 
                                    json=data,
                                    headers={"Authorization": f"Bearer {credentials.credentials}"}) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to update project in the database: {response.status}")

            return JSONResponse(
                status_code=status.HTTP_200_OK, 
                content={
                    "status": "success",
                    "deployment_url": deploy_url,
                    "database_uri": db_uri,
                }
            )

        except Exception as e:
            error_str = str(e)
            print(f"Error during deployment (attempt {retry_count + 1}/{max_retries}): {error_str}")
            
            if "ENOSPC" in error_str and retry_count < max_retries - 1:
                print("No space left on device. Cleaning /tmp and retrying...")
                cleanup_tmp()
                retry_count += 1
                time.sleep(2) 
                continue
            else:
                return JSONResponse(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                    content={"status": "error", "message": error_str}
                )
        finally:
            cleanup_tmp()

if __name__ == "__main__":
    import uvicorn

    cleanup_tmp()
    uvicorn.run(app, host="0.0.0.0", port=8081)