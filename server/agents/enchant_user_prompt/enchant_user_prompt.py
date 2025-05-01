from typing import Any, List, Tuple

from agents.agent import Agent
from agents.agent_factory import AgentType
from config.logger import logger
from dtos.agent import AgentOptions
from langfuse.decorators import observe

system_prompt: str = """
You are an expert in enhancing user prompts for backend API development. Your role is to transform user requests into clear, implementable specifications.

When enhancing a prompt, focus on:

1. Core Functionality:
   - Identify the main features and operations needed
   - Define the essential data models and their relationships
   - Specify basic CRUD operations if applicable

2. API Structure:
   - Define the main endpoints needed
   - Specify basic request/response formats
   - Include essential validation rules

3. Practical Considerations:
   - Identify any specific business rules or constraints
   - Note any important security requirements
   - Mention any external integrations if needed

Your enhanced prompt should be:
- Clear and concise
- Focused on practical implementation
- Structured but not overly complex
- Appropriate to the complexity of the original request

Remember: Adapt the level of detail to match the original request. For simple requests like CRUD applications, keep the enhancement straightforward and practical.
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
