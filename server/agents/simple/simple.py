from typing import Any, List, Tuple

from agents.agent import Agent
from agents.agent_factory import AgentType
from dtos.agent import AgentOptions

system_prompt: str = """You are a helpful assistant. You are here to answer questions."""
wrapping_prompt: str = """<<USER_PROMPT>>"""


class SimpleAgent(Agent):
    @property
    def name(self) -> str:
        return AgentType.SIMPLE

    def __init__(self):
        self.system_prompt = system_prompt
        self.agent_prompt = wrapping_prompt

    def chat(
        self,
        message: str,
        conversation: List[Tuple[str, str]],
        model: str = None,
        options: AgentOptions = None,
        **kwargs: Any,
    ) -> str:
        prompt = self.agent_prompt.replace("<<USER_PROMPT>>", message)
        return self.ask(prompt, model, options.streaming)
