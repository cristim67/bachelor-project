from enum import Enum
from typing import Dict, Type

from agents.agent import Agent


class AgentType(str, Enum):
    BACKEND_REQUIREMENTS = "backend_requirements"
    PROJECT_GENERATOR = "project_generator"
    # TODO: Add other agent types


class AgentFactory:
    _instance = None
    _agents: Dict[AgentType, Type[Agent]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentFactory, cls).__new__(cls)
        return cls._instance

    @classmethod
    def register_agent(cls, agent_type: AgentType, agent_class: Type[Agent]):
        """Register a new agent type with its corresponding class"""
        cls._agents[agent_type] = agent_class

    @classmethod
    def get_agent(cls, agent_type: str, langfuse_session_id: str) -> Agent:
        """Get an instance of the specified agent type"""
        try:
            agent_enum = AgentType(agent_type.lower())
            if agent_enum not in cls._agents:
                raise ValueError(f"Agent type {agent_type} not registered")
            return cls._agents[agent_enum](langfuse_session_id)
        except ValueError as e:
            raise ValueError(f"Invalid agent type: {agent_type}. Available types: {[t.value for t in AgentType]}")

    @classmethod
    def list_available_agents(cls) -> list[str]:
        """List all registered agent types"""
        return [agent_type.value for agent_type in cls._agents.keys()]
