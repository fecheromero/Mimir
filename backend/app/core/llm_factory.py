"""
LLM Factory - Switch between Anthropic and OpenAI
"""
import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_llm_for_test_generation():
    """
    Get LLM instance for test case generation (sync).
    Returns an Anthropic client or OpenAI client.
    """
    logger.info(f"Initializing LLM client for provider: {settings.llm_provider}")

    try:
        if settings.llm_provider == "openai":
            logger.info("Creating OpenAI client...")
            from openai import OpenAI

            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY is not set")

            logger.info(f"OpenAI API key present: {settings.openai_api_key[:10]}...")

            client = OpenAIWrapper(
                api_key=settings.openai_api_key,
                model=settings.openai_model
            )
            logger.info("OpenAI client created successfully")
            return client

        else:  # anthropic
            logger.info("Creating Anthropic client...")
            from anthropic import Anthropic

            if not settings.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY is not set")

            logger.info(f"Anthropic API key present: {settings.anthropic_api_key[:10]}...")

            client = Anthropic(api_key=settings.anthropic_api_key)
            logger.info("Anthropic client created successfully")
            return client

    except Exception as e:
        logger.error(f"Failed to create LLM client: {str(e)}", exc_info=True)
        raise


def get_llm_for_browser_use():
    """
    Get LLM instance for browser automation.
    Uses browser_use's built-in LLM wrappers.
    """
    if settings.llm_provider == "openai":
        from browser_use import ChatOpenAI

        return ChatOpenAI(
            model=settings.openai_model,
            temperature=0,
        )
    else:  # anthropic
        from browser_use import ChatAnthropic

        return ChatAnthropic(
            model=settings.qa_agent_model,
        )


class OpenAIWrapper:
    """
    Wrapper to make OpenAI client compatible with Anthropic interface.
    """
    def __init__(self, api_key: str, model: str):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.messages = self._MessagesAPI(self)

    def messages_create(self, model: str, max_tokens: int, system: str, messages: list):
        """
        Mimic Anthropic's messages.create() interface.
        """
        # Convert messages format for OpenAI
        openai_messages = []
        if system:
            openai_messages.append({
                "role": "system",
                "content": system
            })

        for msg in messages:
            openai_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # Call OpenAI
        response = self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            max_tokens=max_tokens,
        )

        # Return in Anthropic-like format
        class ContentBlock:
            def __init__(self, text):
                self.text = text

        class Response:
            def __init__(self, content):
                self.content = [ContentBlock(content)]

        return Response(response.choices[0].message.content)

    class _MessagesAPI:
        def __init__(self, wrapper):
            self.wrapper = wrapper

        def create(self, **kwargs):
            return self.wrapper.messages_create(**kwargs)
