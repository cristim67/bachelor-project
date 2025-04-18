import uuid
from abc import ABC, abstractmethod
from typing import Any, List, Tuple

from agents.utils import LLMClient, LLMProvider, ModelConfig
from config.env_handler import LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY
from config.logger import logger
from dtos.agent import AgentOptions
from fastapi.responses import StreamingResponse
from langfuse import Langfuse
from langfuse.decorators import langfuse_context, observe
from openai import OpenAI


class Agent(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """
        Returns the name of the agent.
        """
        pass

    llm_client = LLMClient()

    def __init__(self, langfuse_session_id: str):
        self.langfuse_session_id = langfuse_session_id

    @abstractmethod
    def chat(
        self,
        message: str,
        history: List[Tuple[str, str]],
        model: str = None,
        options: AgentOptions = None,
        json_mode: bool = False,
        **kwargs: Any,
    ) -> str:
        """
        Wraps the user prompt and enriches the user prompt with agent data.
        """
        pass

    @observe(name="agent_ask")
    async def ask(
        self,
        system_prompt: str,
        prompt: str,
        model: str = None,
        streaming: bool = False,
        json_mode: bool = False,
    ):
        if model is None:
            model = ModelConfig.DEFAULT_MODELS[LLMProvider.OPENAI]

        langfuse_context.update_current_trace(
            name=f"Agent - {self.name}",
            metadata={
                "model": model,
                "streaming": streaming,
            },
            session_id=self.langfuse_session_id,
        )

        if streaming:
            return await self._stream(system_prompt, prompt, model, json_mode)
        return self._shoot(system_prompt, prompt, model, json_mode)

    async def _stream(self, system_prompt: str, prompt: str, model: str, json_mode: bool):
        provider = ModelConfig.get_model_provider(model)
        client = self.llm_client.get_client(provider, streaming=True)

        try:

            async def event_generator():
                logger.info(
                    f"Attempting to ask: {prompt}",
                )

                if provider == LLMProvider.OPENAI:
                    openai_client: OpenAI = client
                    async with openai_client.beta.chat.completions.stream(
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        model=model,
                        **({"response_format": {"type": "json_object"}} if json_mode else {}),
                    ) as stream:
                        async for event in stream:
                            if event.type == "content.delta":
                                yield event.delta

                elif provider == LLMProvider.ANTHROPIC:
                    anthropic_client = client
                    message = await anthropic_client.messages.create(
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        model=model,
                        max_tokens=2048,
                        stream=True,
                    )
                    async for event in message:
                        if event.type == "content_block_delta":
                            yield event.delta.text
                else:
                    raise ValueError(f"Unknown model provider: {provider}")

            return StreamingResponse(
                event_generator(),
                media_type="text/plain",
            )

        except Exception as e:
            error_message = f"{str(e.__class__.__name__)}: {str(e)}"
            logger.error(f"Agent Response Error: {error_message}")
            raise Exception(f"An error occurred while processing your request: {error_message}")

    def _shoot(self, system_prompt: str, prompt: str, model: str, json_mode: bool):
        provider = ModelConfig.get_model_provider(model)
        client = self.llm_client.get_client(provider, streaming=False)

        try:
            logger.info(
                f"Attempting to ask: {prompt}",
            )

            if provider == LLMProvider.OPENAI:
                openai_client: OpenAI = client
                response = openai_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    model=model,
                    **({"response_format": {"type": "json_object"}} if json_mode else {}),
                )
                return response.choices[0].message.content
            elif provider == LLMProvider.ANTHROPIC:
                anthropic_client = client
                response = anthropic_client.messages.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    model=model,
                    max_tokens=2048,
                )
                return response.content[0].text
            else:
                raise ValueError(f"Unknown model provider: {provider}")

        except Exception as e:
            error_message = f"{str(e.__class__.__name__)}: {str(e)}"
            logger.error(f"Agent Response Error: {error_message}")
            raise Exception(f"An error occurred while processing your request: {error_message}")
