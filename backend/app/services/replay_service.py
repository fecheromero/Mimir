from playwright.async_api import async_playwright
import ast
from app.core.config import get_settings
from app.core.llm_factory import get_llm_for_test_generation
from app.models.job_status import JobStatus

settings = get_settings()


class ReplayService:
    """Replay actions from a previous test execution (local mode only)."""

    def __init__(self, base_url: str = None, email: str = None, password: str = None, browser_mode: str = "new", cdp_url: str = None):
        # Validate that we're in local mode
        if settings.browser_execution_mode != "local":
            raise ValueError(
                "Replay functionality is only available in local execution mode. "
                f"Current mode: {settings.browser_execution_mode}"
            )

        self.llm = get_llm_for_test_generation()
        self.base_url = base_url
        self.email = email
        self.password = password
        self.browser_mode = browser_mode
        self.cdp_url = cdp_url

    async def replay_actions(
        self,
        actions,
        test_case_text=None,
        test_expectations=None,
        expected_outcome=None,
        headless=False
    ):
        """
        Replay actions and evaluate the result.

        Args:
            actions: List of actions to replay (or steps containing actions)
            test_case_text: Original test instructions (for context)
            test_expectations: Expected success criteria
            expected_outcome: What the test should achieve

        Returns:
            Dict with status, summary, and evaluation
        """
        # Check if we received cloud API steps format instead of actions
        # Steps have: number, memory, actions (list of JSON strings)
        import json

        extracted_actions = []
        test_context = None  # To store the test goal/memory from steps
        if actions and isinstance(actions, list) and len(actions) > 0:
            first_item = actions[0]
            # Detect cloud API steps format
            if isinstance(first_item, dict) and 'actions' in first_item and 'number' in first_item:
                print(f"Detected cloud API steps format, extracting actions...")

                # Extract test context from the last step's "done" action or memory
                for step in actions:
                    if isinstance(step, dict):
                        # Try to get test context from memory or next_goal
                        if 'memory' in step and step.get('number') == 1:
                            test_context = step['memory']

                        # Extract actions
                        if 'actions' in step:
                            step_actions = step['actions']
                            if isinstance(step_actions, list):
                                for action_str in step_actions:
                                    try:
                                        if isinstance(action_str, str):
                                            action_dict = json.loads(action_str)
                                            extracted_actions.append(action_dict)

                                            # Extract test context from "done" action if available
                                            if 'done' in action_dict and isinstance(action_dict['done'], dict):
                                                if 'text' in action_dict['done']:
                                                    test_context = action_dict['done']['text']
                                        else:
                                            extracted_actions.append(action_str)
                                    except json.JSONDecodeError as e:
                                        print(f"Warning: Could not parse action from step: {e}")

                actions = extracted_actions
                print(f"Extracted {len(actions)} actions from steps")
                if test_context:
                    print(f"Test context: {test_context[:100]}...")
                    self.test_context = test_context
                else:
                    self.test_context = None
            else:
                self.test_context = None
        else:
            self.test_context = None

        async with async_playwright() as p:
            # Connect to existing browser if mode is "existing" and CDP URL is provided
            if self.browser_mode == "existing" and self.cdp_url:
                browser = await p.chromium.connect_over_cdp(self.cdp_url)
                # Use the first available context and page when connecting to existing browser
                context = browser.contexts[0] if browser.contexts else await browser.new_context(
                    viewport={'width': 1280, 'height': 720}
                )
                page = context.pages[0] if context.pages else await context.new_page()
            else:
                browser = await p.chromium.launch(headless=headless)
                context = await browser.new_context(
                    viewport={'width': 1280, 'height': 720}
                )
                page = await context.new_page()

            executed_actions = []
            errors = []

            try:
                for action in actions:
                    try:
                        # Parse action if it's a string
                        if isinstance(action, str):
                            try:
                                import json
                                # Try JSON first (most common from cloud API)
                                action = json.loads(action)
                            except json.JSONDecodeError:
                                # Cloud API actions may contain DOMInteractedElement objects
                                # We need to clean these before parsing
                                try:
                                    # Remove DOMInteractedElement objects which can't be parsed
                                    # Pattern: 'interacted_element': DOMInteractedElement(...)}
                                    import re
                                    cleaned_action = action

                                    # Replace DOMInteractedElement(...) with a simplified dict
                                    if 'DOMInteractedElement' in cleaned_action:
                                        # Try to extract x_path if available
                                        xpath_match = re.search(r"x_path='([^']+)'", cleaned_action)

                                        if xpath_match:
                                            xpath = xpath_match.group(1)
                                            # Find the DOMInteractedElement and replace it
                                            # Need to handle nested parentheses properly
                                            start = cleaned_action.find('DOMInteractedElement(')
                                            if start != -1:
                                                # Count parentheses to find matching close paren
                                                paren_count = 0
                                                i = start + len('DOMInteractedElement')
                                                for i in range(start + len('DOMInteractedElement'), len(cleaned_action)):
                                                    if cleaned_action[i] == '(':
                                                        paren_count += 1
                                                    elif cleaned_action[i] == ')':
                                                        paren_count -= 1
                                                        if paren_count == 0:
                                                            # Found matching close paren
                                                            dom_element = cleaned_action[start:i+1]
                                                            cleaned_action = cleaned_action.replace(
                                                                dom_element,
                                                                f"{{'x_path': '{xpath}'}}"
                                                            )
                                                            break
                                        else:
                                            # Just remove the DOMInteractedElement entirely
                                            # Find and remove the entire element
                                            start = cleaned_action.find('DOMInteractedElement(')
                                            if start != -1:
                                                paren_count = 0
                                                for i in range(start + len('DOMInteractedElement'), len(cleaned_action)):
                                                    if cleaned_action[i] == '(':
                                                        paren_count += 1
                                                    elif cleaned_action[i] == ')':
                                                        paren_count -= 1
                                                        if paren_count == 0:
                                                            dom_element = cleaned_action[start:i+1]
                                                            cleaned_action = cleaned_action.replace(dom_element, 'None')
                                                            break

                                    # Now try ast.literal_eval on cleaned string
                                    action = ast.literal_eval(cleaned_action)
                                except (SyntaxError, ValueError) as parse_err:
                                    # Skip actions that can't be parsed even after cleaning
                                    error_msg = f"Skipping unparseable action: {str(parse_err)[:100]}"
                                    errors.append(error_msg)
                                    print(f"Warning: {error_msg}")
                                    continue

                        # Skip if action is not a dict
                        if not isinstance(action, dict):
                            error_msg = f"Skipping non-dict action: {type(action)}"
                            errors.append(error_msg)
                            print(f"Warning: {error_msg}")
                            continue

                        # Execute the action
                        await self._execute_action(page, action)
                        executed_actions.append(action)

                    except Exception as e:
                        error_msg = f"Failed to execute action: {str(e)}"
                        errors.append(error_msg)
                        print(f"Error: {error_msg}")

                # Get final page state for evaluation
                final_html = await page.content()
                final_url = page.url

                # Ask LLM to evaluate if the test passed
                evaluation = await self._evaluate_result(
                    executed_actions,
                    errors,
                    final_html,
                    final_url,
                    test_case_text=test_case_text,
                    test_expectations=test_expectations,
                    expected_outcome=expected_outcome
                )

                # Determine status based on LLM evaluation
                evaluation_lower = evaluation.lower()
                llm_says_fail = any(keyword in evaluation_lower for keyword in [
                    'fail', 'failed', 'failure', 'assessment: fail', 'status: fail'
                ])
                llm_says_pass = any(keyword in evaluation_lower for keyword in [
                    'pass', 'passed', 'success', 'assessment: pass', 'status: pass'
                ])

                # Priority: LLM evaluation > technical errors > default
                if llm_says_fail or errors:
                    status = JobStatus.UNSUCCESSFUL.value
                    if errors:
                        summary = f"Executed {len(executed_actions)} actions with {len(errors)} errors. LLM evaluation: {'FAIL' if llm_says_fail else 'N/A'}"
                    else:
                        summary = f"Executed {len(executed_actions)} actions but test unsuccessful based on LLM evaluation"
                elif llm_says_pass:
                    status = JobStatus.PASSED.value
                    summary = f"Successfully executed all {len(executed_actions)} actions. LLM evaluation: PASS"
                else:
                    # Default: passed if no errors
                    status = JobStatus.PASSED.value if not errors else JobStatus.UNSUCCESSFUL.value
                    summary = f"Executed {len(executed_actions)} actions"

                return {
                    "status": status,
                    "summary": summary,
                    "evaluation": evaluation,
                    "errors": errors,
                    "executed_actions": len(executed_actions)
                }

            finally:
                await browser.close()

    async def _find_in_frames(self, page, selector):
        """Try to find element in all frames if not found in main page."""
        # First try main page
        try:
            main_locator = page.locator(selector)
            count = await main_locator.count()
            if count > 0:
                return main_locator
        except:
            pass

        # If not found, try each frame
        for frame in page.frames:
            try:
                frame_locator = frame.locator(selector)
                count = await frame_locator.count()
                if count > 0:
                    print(f"Found element in iframe: {frame.url[:100]}...")
                    return frame_locator
            except:
                continue

        return None

    def _get_smart_locator(self, page, elem_info):
        """
        Get a smart locator using multiple strategies in order of reliability.
        Also searches in iframes if element is not in main page.

        Priority:
        1. ID (most stable)
        2. data-testid (designed for testing)
        3. name attribute (good for forms)
        4. Accessible name + role (ARIA)
        5. Placeholder (for inputs)
        6. Text + role
        7. XPath (last resort)
        """
        if not isinstance(elem_info, dict):
            return None

        # For elements that might be in iframes (inputs, buttons, etc.)
        # we'll return an async-ready locator that can search frames
        # This is a bit of a hack since we can't make _get_smart_locator async
        # We'll return a special marker that tells the caller to search frames

        # Strategy 1: ID
        if 'id' in elem_info and elem_info['id']:
            return {'selector': f"#{elem_info['id']}", 'search_frames': True}

        # Strategy 2: data-testid
        if 'testid' in elem_info and elem_info['testid']:
            return {'selector': f"[data-testid='{elem_info['testid']}']", 'search_frames': True}

        # Strategy 3: name attribute
        if 'name' in elem_info and elem_info['name']:
            node_name = elem_info.get('node_name', '').lower()
            if node_name in ['input', 'select', 'textarea']:
                return {'selector': f"{node_name}[name='{elem_info['name']}']", 'search_frames': True}

        # Strategy 4: Accessible name (ax_name) with role
        if 'ax_name' in elem_info and elem_info['ax_name']:
            node_name = elem_info.get('node_name', '').lower()
            if node_name == 'button':
                return page.get_by_role('button', name=elem_info['ax_name'])
            elif node_name == 'link' or node_name == 'a':
                return page.get_by_role('link', name=elem_info['ax_name'])
            elif node_name == 'input':
                return {'selector': f"input[aria-label*='{elem_info['ax_name']}']", 'search_frames': True}

        # Strategy 5: aria-label
        if 'aria_label' in elem_info and elem_info['aria_label']:
            return {'selector': f"[aria-label='{elem_info['aria_label']}']", 'search_frames': True}

        # Strategy 6: Placeholder
        if 'placeholder' in elem_info and elem_info['placeholder']:
            return {'selector': f"[placeholder='{elem_info['placeholder']}']", 'search_frames': True}

        # Strategy 7: href for links
        if 'href' in elem_info and elem_info['href']:
            return page.locator(f"a[href='{elem_info['href']}']")

        # Strategy 8: XPath (fallback)
        if 'x_path' in elem_info and elem_info['x_path']:
            return {'selector': f"xpath={elem_info['x_path']}", 'search_frames': True}

        return None

    async def _execute_action(self, page, action):
        """Execute a single action on the page."""
        # Navigate
        if 'navigate' in action:
            url = action['navigate']['url']
            await page.goto(url)
            await page.wait_for_load_state('networkidle')

        # Click
        elif 'click' in action:
            # Use the interacted_element if available
            if action.get('interacted_element'):
                elem_info = action['interacted_element']
                locator_result = self._get_smart_locator(page, elem_info)

                # Handle frame-aware locators
                if isinstance(locator_result, dict) and locator_result.get('search_frames'):
                    locator = await self._find_in_frames(page, locator_result['selector'])
                else:
                    locator = locator_result

                if locator:
                    # Check if this is a navigation click (link with href)
                    is_navigation = False
                    if elem_info.get('node_name', '').upper() in ['A', 'LINK'] and elem_info.get('href'):
                        is_navigation = True
                        print(f"Clicking link to navigate: {elem_info.get('href')}")

                    # Log which strategy was used
                    if 'id' in elem_info:
                        print(f"Clicking element by ID: {elem_info['id']}")
                    elif 'ax_name' in elem_info:
                        print(f"Clicking element by accessible name: {elem_info['ax_name']}")
                    elif 'x_path' in elem_info:
                        print(f"Clicking element by xpath (fallback)")

                    # Wait for element to be visible before clicking
                    try:
                        print(f"Waiting for element to be clickable...")
                        await locator.wait_for(state='visible', timeout=15000)
                        await locator.scroll_into_view_if_needed(timeout=5000)
                        await locator.click(timeout=30000)

                        # If this was a navigation, wait for the page to load
                        if is_navigation:
                            print(f"Waiting for navigation to complete...")
                            await page.wait_for_load_state('networkidle', timeout=15000)
                            # Small additional wait for JS frameworks to render
                            await page.wait_for_timeout(5000)
                        else:
                            # For non-navigation clicks, give time for dynamic content
                            # Buttons often trigger modals, forms, or other dynamic UI
                            print(f"Waiting for dynamic content after click...")
                            await page.wait_for_timeout(5000)
                    except Exception as e:
                        print(f"Error clicking element: {str(e)}")
                        print(f"Current URL: {page.url}")
                        # Take screenshot for debugging
                        try:
                            screenshot_path = f"/tmp/replay_error_click_{action.get('click', {}).get('index', 'unknown')}.png"
                            await page.screenshot(path=screenshot_path)
                            print(f"Screenshot saved to: {screenshot_path}")
                        except:
                            pass
                        raise
                else:
                    print(f"Warning: Could not create locator for click action")
            else:
                print(f"Warning: No element info for click action, skipping")

        # Input
        elif 'input' in action:
            text = action['input']['text']
            clear = action['input'].get('clear', False)

            if action.get('interacted_element'):
                elem_info = action['interacted_element']
                locator_result = self._get_smart_locator(page, elem_info)

                # Handle frame-aware locators
                if isinstance(locator_result, dict) and locator_result.get('search_frames'):
                    locator = await self._find_in_frames(page, locator_result['selector'])
                else:
                    locator = locator_result

                if locator:
                    # Log which strategy was used
                    if 'id' in elem_info:
                        print(f"Filling input by ID: {elem_info['id']}")
                    elif 'name' in elem_info:
                        print(f"Filling input by name: {elem_info['name']}")
                    elif 'ax_name' in elem_info:
                        print(f"Filling input by accessible name: {elem_info['ax_name']}")

                    # Wait for element to be visible and enabled before interacting
                    try:
                        print(f"Waiting for input to be visible and ready...")
                        await locator.wait_for(state='visible', timeout=15000)

                        # Scroll element into view if needed
                        await locator.scroll_into_view_if_needed(timeout=5000)

                        if clear:
                            await locator.clear(timeout=20000)
                        await locator.fill(text, timeout=20000)

                        # Small wait after input for autocomplete/validation
                        await page.wait_for_timeout(200)
                    except Exception as e:
                        print(f"Error interacting with input: {str(e)}")
                        # Log current page state for debugging
                        print(f"Current URL: {page.url}")
                        print(f"Page title: {await page.title()}")
                        # Take screenshot for debugging
                        try:
                            screenshot_path = f"/tmp/replay_error_input_{elem_info.get('id', elem_info.get('name', 'unknown'))}.png"
                            await page.screenshot(path=screenshot_path)
                            print(f"Screenshot saved to: {screenshot_path}")

                            # Check for iframes
                            frames = page.frames
                            print(f"Found {len(frames)} frames on page:")
                            for i, frame in enumerate(frames):
                                try:
                                    frame_url = frame.url
                                    print(f"  Frame {i}: {frame_url}")
                                    # Check inputs in this frame
                                    frame_inputs = await frame.locator('input').all()
                                    if frame_inputs:
                                        print(f"    Found {len(frame_inputs)} inputs in this frame")
                                        for j, inp in enumerate(frame_inputs[:3]):
                                            inp_id = await inp.get_attribute('id')
                                            inp_name = await inp.get_attribute('name')
                                            print(f"      Input {j}: id={inp_id}, name={inp_name}")
                                except Exception as fe:
                                    print(f"    Error inspecting frame: {fe}")

                            # Also log all visible inputs on the main page
                            inputs = await page.locator('input').all()
                            print(f"Found {len(inputs)} input elements on main page")
                            for i, inp in enumerate(inputs[:5]):  # Log first 5
                                try:
                                    inp_id = await inp.get_attribute('id')
                                    inp_name = await inp.get_attribute('name')
                                    inp_type = await inp.get_attribute('type')
                                    print(f"  Input {i}: id={inp_id}, name={inp_name}, type={inp_type}")
                                except:
                                    pass
                        except Exception as debug_error:
                            print(f"Could not capture debug info: {debug_error}")
                        raise
                else:
                    print(f"Warning: Could not create locator for input action")

        # Wait
        elif 'wait' in action:
            seconds = action['wait']['seconds']
            await page.wait_for_timeout(seconds * 1000)

    async def _evaluate_result(
        self,
        executed_actions,
        errors,
        final_html,
        final_url,
        test_case_text=None,
        test_expectations=None,
        expected_outcome=None
    ):
        """Use LLM to evaluate if the test passed, with success criteria if available."""
        # Extract key information from actions
        action_summary = "\n".join([
            f"- {list(action.keys())[0]}: {list(action.values())[0]}"
            for action in executed_actions[:10]  # Limit to first 10
        ])

        # Build test expectations section
        expectations_section = ""
        if test_case_text:
            expectations_section += f"""
## Test Case Instructions:
{test_case_text[:1000]}

"""

        if expected_outcome:
            outcome_preview = expected_outcome[:500] + "..." if len(expected_outcome) > 500 else expected_outcome
            expectations_section += f"""
## Expected Outcome:
{outcome_preview}

"""

        if test_expectations:
            expected_success = test_expectations.get('expected_success', 'Unknown')
            expectations_section += f"""
## Success Criteria:
- Original test expected to: {'PASS' if expected_success else 'FAIL'}

"""

        # Include test context from steps if available
        if hasattr(self, 'test_context') and self.test_context and not expected_outcome:
            context_preview = self.test_context[:500] + "..." if len(self.test_context) > 500 else self.test_context
            expectations_section += f"""
## Test Context (from steps):
{context_preview}

"""

        prompt = f"""You are evaluating a test replay execution.

{expectations_section}## Actions Executed:
{action_summary}

## Final State:
- URL: {final_url}
- Errors: {len(errors)}
{chr(10).join(f"  - {e}" for e in errors[:5]) if errors else "  None"}

## Evaluation Task:
Based on the test instructions, expected outcome, actions executed, and final state, determine if this test PASSED or FAILED.

**Important:**
- If test instructions/expected outcome are provided, verify the test achieved its goal
- If the original test expected to PASS, check if all success criteria were met
- Consider both technical execution (no errors) AND functional correctness (achieved the goal)

Provide your evaluation (2-4 sentences):
1. Did the test achieve its stated goal/expected outcome?
2. Any issues or concerns observed?
3. Clear verdict: **PASS** or **FAIL**"""

        # Call LLM (use standard messages.create() API)
        response = self.llm.messages.create(
            model=settings.test_case_agent_model if hasattr(settings, 'test_case_agent_model') else "claude-3-7-sonnet-20250219",
            max_tokens=500,
            system="You are a QA test evaluator. Provide concise, factual assessments.",
            messages=[{"role": "user", "content": prompt}]
        )

        return response.content[0].text
