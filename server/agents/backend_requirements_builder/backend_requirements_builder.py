from typing import Any, List, Optional, Tuple

from agents.agent import Agent
from agents.agent_factory import AgentType
from agents.backend_requirements_builder.types import (
    BackendRequirementsAgentPromptInput,
)
from config.logger import logger
from dtos.agent import AgentOptions
from langfuse.decorators import observe
from prompts.get_prompt import AgentType, get_prompt


class BackendRequirementsAgent(Agent):
    @property
    def name(self) -> str:
        return AgentType.BACKEND_REQUIREMENTS

    def __init__(self, langfuse_session_id: str):
        super().__init__(langfuse_session_id)
        self.system_prompt = ""
        self.agent_prompt = ""

    @observe(name="backend_requirements_builder_chat")
    def chat(
        self,
        message: str,
        history: List[Tuple[str, str]],
        model: str = None,
        options: AgentOptions = None,
        **kwargs: Any,
    ) -> str:
        prompt = get_prompt(AgentType.BACKEND_REQUIREMENTS, BackendRequirementsAgentPromptInput(message=message))
        self.system_prompt = prompt.system
        self.agent_prompt = prompt.client

        return self.ask(
            system_prompt=self.system_prompt,
            prompt=self.agent_prompt,
            model=model,
            streaming=options.streaming,
            json_mode=False,
        )
