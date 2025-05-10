from pydantic import BaseModel


class EnchantUserPromptAgentPromptInput(BaseModel):
    """Input for enchant user prompt agent."""

    message: str
    max_tokens: int = 4096