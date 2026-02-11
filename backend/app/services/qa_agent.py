from browser_use.llm import ChatAnthropic
from browser_use import Agent, BrowserConfig, BrowserSession, Browser, Controller
from browser_use.agent.views import ActionResult
from browser_use.browser.context import BrowserContext
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
        # Build precondition for login if credentials are provided
        sensitive_data = {}
        if self.email and self.password:
            sensitive_data = {
                'user_email': self.email,
                'user_password': self.password
            }
            precondition = f"""
                Go to {self.base_url} and sign in with user_email and user_password if they exist.
            """
        else:
            precondition = f"""
                Go to {self.base_url}.
            """

        test_case_with_precondition = f"{precondition}\n{test_case}"

        # Browser configuration
        config = BrowserConfig(
            headless=headless,
            disable_security=True,
        )
        browser = Browser(config=config)
        browser_session = BrowserSession(
            headless=headless,
            viewport={'width': 964, 'height': 647},
        )
        controller = Controller()

        # Custom clipboard actions
        @controller.registry.action('Copy text to clipboard')
        def copy_to_clipboard(text: str):
            pyperclip.copy(text)
            return ActionResult(extracted_content=text)

        @controller.registry.action('Paste text from clipboard')
        async def paste_from_clipboard(browser: BrowserContext):
            text = pyperclip.paste()
            page = await browser.get_current_page()
            await page.keyboard.type(text)
            return ActionResult(extracted_content=text)

        # Create and run agent
        agent = Agent(
            browser=browser,
            task=test_case_with_precondition,
            llm=self.llm,
            browser_session=browser_session,
            sensitive_data=sensitive_data,
            controller=controller,
        )

        result = await agent.run()
        return result
