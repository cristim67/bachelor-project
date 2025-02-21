import json
import os
import uuid
from typing import Iterator

import dotenv
from openai import OpenAI

dotenv.load_dotenv()

SYSTEM_PROMPT = """You are a project generator assistant for backend Node.js projects.

You are given a description of a project and you need to generate ONLY the JSON structure of the project with COMPLETE, WORKING implementations (no placeholders or comments).

The JSON structure should be in the following format:

{
    "structure": [
        {
            "type": "file|directory",
            "path": "./relative/path/to/item",
            "content": "actual content for files|None for directories"
        }
    ]
}

Rules: 
1. Prefer using ESM style instead of CommonJS:
   - Use .mjs file extension
   - In package.json set "type": "module"
   - Use 'import/export' instead of 'require/module.exports'

2. Required files for every project:
   - package.json with all necessary dependencies
   - .env.example with all required environment variables
   - Complete implementation of all routes, controllers, and models

3. Code formatting:
   - Use 2 spaces for indentation
   - NO PLACEHOLDER CODE OR COMMENTS LIKE '/* Setup Express */'
   - ALL code must be fully implemented with actual working code
   - All routes must be properly connected and exported

4. Database configuration:
   - For PostgreSQL use: process.env.MY_POSTRESQL_DB_DATABASE_URL
   - For MongoDB use: process.env.MY_MONGO_DB_DATABASE_URL
   - Include complete database connection setup with actual code
   - Include proper error handling for database operations
   - For MongoDB, connect without options, just the connection string

5. Project structure requirements:
   - Separate routes, controllers, models, and middleware
   - Include error handling middleware
   - Include input validation for all routes
   - Include proper HTTP status codes and response formats

6. API Implementation:
   - Write complete, working code for all CRUD operations
   - NO PLACEHOLDER COMMENTS OR TODO ITEMS
   - Include proper request/response validation
   - Include proper error responses
   - Use async/await for asynchronous operations
   - Include proper try/catch blocks

IMPORTANT: DO NOT generate placeholder comments or partial implementations. Every file must contain complete, working code."""


def generate_project_json(prompt: str) -> Iterator[str]:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )

    return response.choices[0].message.content


def create_project_from_json(json_response: str | Iterator[str]) -> str:
    if not isinstance(json_response, str):
        json_response = "".join(json_response)

    try:
        json_response = json_response.strip()
        data = json.loads(json_response)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        print(f"Received JSON string: {json_response}")
        raise

    items = data.get("structure", []) if isinstance(data, dict) else [data]

    project_id = str(uuid.uuid4())
    path = "projects/" + project_id
    os.makedirs(path)

    for item in items:
        file_path = os.path.join(path, item["path"])
        content = item.get("content")

        if content is None:
            os.makedirs(file_path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            content = json.dumps(content, indent=2) if isinstance(content, (dict, list)) else content
            with open(file_path, "w") as f:
                f.write(content)
    return project_id


if __name__ == "__main__":
    json_response = generate_project_json(
        "Simple MONGO Crud App with create user, get user, update user, delete user in Express"
    )
    print(json_response)
    project_id = create_project_from_json(json_response)
    print(project_id)

    # run genezio analyze in "./projects/" + project_id
    os.chdir(f"./projects/{project_id}")
    os.system(f"genezio analyze")

    # REPLACE THE DATABASE NAME
    yaml_path = "genezio.yaml"
    if os.path.exists(yaml_path):
        with open(yaml_path, "r") as file:
            content = file.read()

        # Replace any random database name with "my-mongo-db" if type is mongo-atlas
        import re

        content = re.sub(
            r"(- name: .*?\n.*?type: mongo-atlas)",
            lambda m: m.group(0).replace(m.group(0).split("\n")[0], "- name: my-mongo-db"),
            content,
            flags=re.DOTALL,
        )

        with open(yaml_path, "w") as file:
            file.write(content)

    # run genezio deploy in "./projects/" + project_id
    os.system(f"genezio deploy")
