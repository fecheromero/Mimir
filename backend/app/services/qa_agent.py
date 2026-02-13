from browser_use import Agent, Browser, Controller, ActionResult
import pyperclip
from app.core.config import get_settings
from app.core.llm_factory import get_llm_for_browser_use

settings = get_settings()


class CloudResultAdapter:
    """Adapter to make cloud API results compatible with local result interface."""

    def __init__(self, cloud_result):
        self.cloud_result = cloud_result
        self._final_result = None
        self._actions = []
        self._errors = []

        # Parse cloud result - cloud API returns steps as a list
        # Each step has: number, memory, evaluation_previous_goal, next_goal, url, screenshot_url, actions
        import json

        steps = None
        if hasattr(cloud_result, 'steps'):
            steps = cloud_result.steps
        elif isinstance(cloud_result, dict) and 'steps' in cloud_result:
            steps = cloud_result['steps']
        elif isinstance(cloud_result, list):
            # Sometimes the result IS the steps list
            steps = cloud_result

        if steps and isinstance(steps, list):
            # Convert steps to actions format compatible with local execution
            for step in steps:
                # Handle both dict and object formats
                step_actions = None
                if isinstance(step, dict):
                    step_actions = step.get('actions', [])
                elif hasattr(step, 'actions'):
                    step_actions = step.actions

                # Each step can have multiple actions
                if step_actions and isinstance(step_actions, list):
                    for action_str in step_actions:
                        try:
                            # Actions come as JSON strings, parse them
                            if isinstance(action_str, str):
                                action_dict = json.loads(action_str)
                                self._actions.append(action_dict)
                            else:
                                self._actions.append(action_str)
                        except json.JSONDecodeError:
                            # If parsing fails, store as string
                            self._actions.append(action_str)

        # Extract final result from the "done" action if available
        if self._actions:
            last_action = self._actions[-1]
            if isinstance(last_action, dict) and 'done' in last_action:
                done_data = last_action['done']
                if isinstance(done_data, dict) and 'text' in done_data:
                    self._final_result = done_data['text']

        # Extract errors if provided
        if hasattr(cloud_result, 'errors'):
            self._errors = cloud_result.errors

    def final_result(self):
        """Return final result text."""
        return self._final_result or "Test completed via Browser Use Cloud"

    def model_actions(self):
        """Return list of actions executed."""
        return self._actions

    def errors(self):
        """Return list of errors."""
        return self._errors


class QaAgent:
    """Execute automated browser tests using browser_use (local or cloud)."""

    def __init__(
        self,
        base_url: str = None,
        email: str = None,
        password: str = None,
        browser_mode: str = "new",
        cdp_url: str = None
    ):
        self.base_url = base_url
        self.email = email
        self.password = password
        self.browser_mode = browser_mode
        self.cdp_url = cdp_url

        # Only initialize local LLM if using local execution
        if settings.browser_execution_mode == "local":
            self.llm = get_llm_for_browser_use()
        else:
            self.llm = None

    async def run_agent(self, test_case: str, headless: bool = False):
        """
        Execute a test case using browser automation.

        Args:
            test_case: Test case steps to execute
            headless: Whether to run browser in headless mode (local only)

        Returns:
            Test execution results
        """
        if settings.browser_execution_mode == "cloud":
            return await self._run_cloud_agent(test_case)
        else:
            return await self._run_local_agent(test_case, headless)

    async def _run_cloud_agent(self, test_case: str):
        """
        Execute test using browser-use cloud API.
        """
        from browser_use_sdk import AsyncBrowserUse

        # Build task with credentials if provided
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

        # Initialize cloud client
        client = AsyncBrowserUse(api_key=settings.browser_use_api_key)

        # Determine LLM model to use
        if settings.llm_provider == "openai":
            llm_model = settings.openai_model
        else:
            llm_model = settings.qa_agent_model

        # Create and execute task
        task = await client.tasks.create_task(
            task=task_with_context,
            llm=llm_model
        )

        # Wait for completion and get result
        result = await task.complete()

        # Wrap result in adapter to make it compatible with local result interface
        return CloudResultAdapter(result)

    async def _run_local_agent(self, test_case: str, headless: bool = False):
        """
        Execute test using local browser-use with Playwright.
        """
        # Build task with credentials if provided
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

        # Create browser instance (browser-use 0.11.9)
        browser_kwargs = {
            "headless": headless,
            "disable_security": True,
        }

        # Connect to existing browser if mode is "existing" and CDP URL is provided
        if self.browser_mode == "existing" and self.cdp_url:
            browser_kwargs["cdp_url"] = self.cdp_url

        browser = Browser(**browser_kwargs)

        # Create controller for custom actions
        controller = Controller()

        # Custom clipboard actions
        @controller.action('Copy text to clipboard')
        def copy_to_clipboard(text: str):
            pyperclip.copy(text)
            return ActionResult(extracted_content=f"Copied to clipboard: {text}")

        @controller.action('Paste text from clipboard')
        def paste_from_clipboard():
            text = pyperclip.paste()
            return ActionResult(extracted_content=f"Pasted from clipboard: {text}")

        # Create and run agent (browser-use 0.11.9)
        agent = Agent(
            task=task_with_context,
            llm=self.llm,
            browser=browser,
            controller=controller,
            use_vision=True,  # Enable vision for better element detection
            max_steps=30,  # Maximum 30 steps to prevent infinite loops
            max_failures=3,  # Maximum 3 retries per failed step
        )

        result = await agent.run()
        return result
