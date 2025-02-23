from agents.agent_factory import AgentFactory, AgentType
from agents.simple.simple import SimpleAgent
from config.logger import logger


async def register_agents():
    """Register all available agents with the factory"""
    logger.info("Registering agents...")

    agents = [
        (AgentType.SIMPLE, SimpleAgent),
    ]

    for agent_type, agent_class in agents:
        try:
            AgentFactory.register_agent(agent_type, agent_class)
            logger.info(f"Registered agent: {agent_type.value}")
        except Exception as e:
            logger.error(f"Failed to register agent {agent_type.value}: {str(e)}")

    logger.info(f"Available agents: {AgentFactory.list_available_agents()}")
