from enum import Enum
from typing import Dict, Type

from agents.backend_requirements_builder.types import (
    BackendRequirementsAgentPromptInput,
)
from agents.enchant_user_prompt.types import EnchantUserPromptAgentPromptInput
from agents.project_generator.types import ProjectGeneratorAgentPromptInput
from config.logger import logger
from langfuse import Langfuse
from prompts.prompt_types import AgentPrompt, BaseAgentPromptInput


class AgentType(Enum):
    """Enum representing different types of agents."""

    BACKEND_REQUIREMENTS = "backend_requirements"
    PROJECT_GENERATOR = "project_generator"
    ENCHANT_USER_PROMPT = "enchant_user_prompt"


class PromptFactory:
    """Factory for creating agent prompts."""

    def __init__(self):
        self.langfuse = Langfuse()
        self._input_mapping: Dict[AgentType, Type[BaseAgentPromptInput]] = {
            AgentType.BACKEND_REQUIREMENTS: BackendRequirementsAgentPromptInput,
            AgentType.PROJECT_GENERATOR: ProjectGeneratorAgentPromptInput,
            AgentType.ENCHANT_USER_PROMPT: EnchantUserPromptAgentPromptInput,
        }

    def _validate_input(
        self, agent_type: AgentType, input_args: BaseAgentPromptInput
    ) -> None:
        """Validate input type matches the expected type for the agent."""
        expected_type = self._input_mapping.get(agent_type)
        if not expected_type:
            raise ValueError(
                f"No input type mapping found for agent type: {agent_type.value}"
            )
        if not isinstance(input_args, expected_type):
            raise ValueError(
                f"Invalid input type for agent {agent_type.value}. "
                f"Expected {expected_type.__name__}, got {type(input_args).__name__}"
            )

    def create_prompt(
        self, agent_type: AgentType, input_args: BaseAgentPromptInput
    ) -> AgentPrompt:
        """
        Create a prompt for the specified agent type with the given input arguments.

        Args:
            agent_type: The type of agent to create the prompt for
            input_args: The input arguments for the prompt

        Returns:
            AgentPrompt: The created prompt with system and client messages

        Raises:
            ValueError: If the agent type is not supported or input type is invalid
        """
        logger.info(f"Creating prompt for agent type: {agent_type.value}")

        self._validate_input(agent_type, input_args)

        try:
            prompt = self.langfuse.get_prompt(agent_type.value, type="chat")
            compiled_prompt = prompt.compile(**input_args.model_dump())

            agent_prompt = AgentPrompt(
                system=next(
                    (
                        prompt["content"]
                        for prompt in compiled_prompt
                        if prompt["role"] == "system"
                    ),
                    "",
                ),
                client=next(
                    (
                        prompt["content"]
                        for prompt in compiled_prompt
                        if prompt["role"] == "user"
                    ),
                    "",
                ),
            )

            logger.info(f"Created prompt for {agent_type.value}")
            return agent_prompt

        except Exception as e:
            logger.error(f"Error creating prompt for {agent_type.value}: {str(e)}")
            raise


prompt_factory = PromptFactory()


def get_prompt(agent_type: AgentType, input_args: BaseAgentPromptInput) -> AgentPrompt:
    return prompt_factory.create_prompt(agent_type, input_args)