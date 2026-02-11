from browser_use import Agent, Browser, Controller
from langchain_anthropic import ChatAnthropic
import pyperclip
from app.core.config import get_settings

settings = get_settings()


class QaAgent:
    """Execute automated browser tests using browser_use."""

    def __init__(
        self,
        model: str = None,
        base_url: str = None,
        email: str = None,
        password: str = None
    ):
        self.llm = ChatAnthropic(model=model or settings.qa_agent_model)
        self.base_url = base_url
        self.email = email
        self.password = password

    async def run_agent(self, test_case: str, headless: bool = False):
        """
        Execute a test case using browser automation.

        Args:
            test_case: Test case steps to execute
            headless: Whether to run browser in headless mode

        Returns:
            Test execution results
        """
        # Build task with credentials embedded if provided
        if self.email and self.password:
            task_with_context = f"""
Go to {self.base_url} and sign in with the following credentials:
- Email: {self.email}
- Password: {self.password}

Then execute the following test case:
{test_case}
"""
        else:
            task_with_context = f"""
Go to {self.base_url}

Then execute the following test case:
{test_case}
"""

        # Create browser instance
        browser = Browser(
            config={
                "headless": headless,
                "disable_security": True,
            }
        )

        # Create controller for custom actions
        controller = Controller()

        # Custom clipboard actions
        @controller.action('Copy text to clipboard')
        def copy_to_clipboard(text: str):
            pyperclip.copy(text)
            return f"Copied to clipboard: {text}"

        @controller.action('Paste text from clipboard')
        async def paste_from_clipboard():
            text = pyperclip.paste()
            return f"Pasted from clipboard: {text}"

        # Create and run agent
        agent = Agent(
            task=task_with_context,
            llm=self.llm,
            browser=browser,
            controller=controller,
        )

        result = await agent.run()
        return result
