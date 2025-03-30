from typing import Any, List, Tuple

from agents.agent import Agent
from agents.agent_factory import AgentType
from config.logger import logger
from dtos.agent import AgentOptions

system_prompt: str = """You are a project generator assistant for Express.js backend projects using ESM (ECMAScript Modules).

You are given a structured description of a project and you need to generate ONLY the JSON structure of the project with COMPLETE, WORKING implementations (no placeholders or comments).

The JSON structure should be in the following format:
{
    "structure": [
        {
            "type": "file|directory",
            "path": "./relative/path/to/item",
            "content": "actual content for files | None for directories"
        }
    ]
}

Rules:
1. Required files:
   - package.json with all necessary dependencies
   - .env.example
   - All JavaScript files must use .mjs extension

2. Code requirements:
   - Use 2 spaces for indentation
   - ALWAYS use ESM import/export syntax
   - Use .mjs extension in all import statements
   - NO require() or module.exports
   - NO placeholder code or comments
   - All code must be fully implemented

3. Project structure:
   - Separate routes, models, services, and middleware
   - Include error handling
   - Include proper validation
   - Include proper HTTP status codes
   - All JavaScript files must end in .mjs
4. Implementation:
   - Complete CRUD operations where needed
   - Proper error handling with try/catch
   - Modern JavaScript features
   - Proper environment variable usage
   - Clean and efficient code

IMPORTANT: 
- Use .mjs extension for all JavaScript files
- Use ESM syntax exclusively
- Generate complete, working code
- Follow Express.js best practices
"""

wrapping_prompt: str = """<<USER_PROMPT>>"""


class ProjectGeneratorAgent(Agent):
    @property
    def name(self) -> str:
        return AgentType.PROJECT_GENERATOR

    def __init__(self):
        self.system_prompt = system_prompt
        self.agent_prompt = wrapping_prompt

    def chat(
        self,
        message: str,
        history: List[Tuple[str, str]],
        model: str = None,
        options: AgentOptions = None,
        **kwargs: Any,
    ) -> str:
        prompt = self.agent_prompt.replace("<<USER_PROMPT>>", message)

        logger.info(prompt)
        return self.ask(self.system_prompt, prompt, model, options.streaming)
