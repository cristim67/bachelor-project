from typing import Any, List, Tuple

from agents.agent import Agent
from agents.agent_factory import AgentType
from config.logger import logger
from dtos.agent import AgentOptions
from langfuse.decorators import observe

system_prompt: str = """
You are an expert in enhancing user prompts for backend API development. Your role is to transform user requests into clear, implementable specifications.

IMPORTANT RULES:
1. NEVER ask questions or request more information
2. If requirements are unclear, make reasonable assumptions based on common patterns
3. If specific details are missing, use standard defaults and best practices
4. Always provide a complete, structured specification
5. Focus on creating a practical, implementable solution
6. Use common patterns and conventions for similar applications
7. Include all necessary components for a production-ready application

When enhancing a prompt, ALWAYS include:

1. Core Functionality:
   - Main features and operations needed
   - Essential data models and their relationships
   - Basic CRUD operations if applicable

2. API Structure:
   - Main endpoints needed
   - Basic request/response formats
   - Essential validation rules

3. Practical Considerations:
   - Specific business rules or constraints
   - Important security requirements
   - External integrations if needed

Your enhanced prompt MUST be:
- Clear and concise
- Focused on practical implementation
- Structured but not overly complex
- Appropriate to the complexity of the original request
- Complete and ready for implementation
- Based on common patterns and best practices

For simple requests like CRUD applications, keep the enhancement straightforward and practical while ensuring all necessary components are included.
Response in maximum {{max_tokens}} tokens.
"""

wrapping_prompt: str = """<<USER_PROMPT>>"""


class EnchantUserPromptAgent(Agent):
    @property
    def name(self) -> str:
        return AgentType.ENCHANT_USER_PROMPT

    def __init__(self, langfuse_session_id: str):
        super().__init__(langfuse_session_id)
        self.system_prompt = system_prompt
        self.agent_prompt = wrapping_prompt

    @observe(name="enchant_user_prompt_chat")
    def chat(
        self,
        message: str,
        history: List[Tuple[str, str]],
        model: str = None,
        options: AgentOptions = None,
        **kwargs: Any,
    ) -> str:
        prompt = self.agent_prompt.replace("<<USER_PROMPT>>", message)
        system_prompt = self.system_prompt.replace("{{max_tokens}}", str(options.max_tokens))

        return self.ask(
            system_prompt=system_prompt,
            prompt=prompt,
            model=model,
            streaming=options.streaming,
            max_tokens=options.max_tokens,
        )
