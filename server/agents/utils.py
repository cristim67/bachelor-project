import os
from enum import Enum

import google.generativeai as genai
import openai
from anthropic import Anthropic, AsyncAnthropic
from config.env_handler import (
    ANTHROPIC_API_KEY,
    GOOGLE_API_KEY,
    LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY,
    OPENAI_API_KEY,
)
from langfuse import Langfuse


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


class LLMClient:
    def __init__(self):
        self.openai = openai.OpenAI(
            api_key=OPENAI_API_KEY,
        )
        self.openai_async = openai.AsyncOpenAI(
            api_key=OPENAI_API_KEY,
        )
        self.anthropic = Anthropic(
            api_key=ANTHROPIC_API_KEY,
        )
        self.anthropic_async = AsyncAnthropic(
            api_key=ANTHROPIC_API_KEY,
        )
        self.gemini = genai.configure(api_key=GOOGLE_API_KEY)
        self.langfuse_client = Langfuse(
            public_key=LANGFUSE_PUBLIC_KEY,
            secret_key=LANGFUSE_SECRET_KEY,
        )

    def get_client(self, provider: LLMProvider, streaming: bool = False):
        clients = {
            LLMProvider.OPENAI: self.openai_async if streaming else self.openai,
            LLMProvider.ANTHROPIC: (self.anthropic_async if streaming else self.anthropic),
            LLMProvider.GEMINI: self.gemini,
        }
        return clients[provider]


class ModelConfig:
    DEFAULT_MODELS = {
        LLMProvider.OPENAI: "gpt-4o-mini",
        LLMProvider.ANTHROPIC: "claude-3-opus-latest",
        LLMProvider.GEMINI: "gemini-2.0-flash",
    }

    @staticmethod
    def get_model_provider(model_name: str) -> LLMProvider:
        if model_name.startswith("gpt"):
            return LLMProvider.OPENAI
        elif model_name.startswith("claude"):
            return LLMProvider.ANTHROPIC
        elif model_name.startswith("gemini"):
            return LLMProvider.GEMINI
        else:
            raise ValueError(f"Unknown model provider for model: {model_name}")
