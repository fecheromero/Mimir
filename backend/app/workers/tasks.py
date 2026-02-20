import uuid
from datetime import datetime
import asyncio
import redis
import logging
import io
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.services.test_case_agent import TestCaseAgent
from app.services.qa_agent import QaAgent
from app.services.storage_service import StorageService

settings = get_settings()
redis_client = redis.from_url(settings.redis_url)


def update_job_status(job_id: str, status: str, progress: int = None, current_step: str = None):
    """Update job status in Redis."""
    redis_client.hset(f"jobs:{job_id}", "status", status)
    if progress is not None:
        redis_client.hset(f"jobs:{job_id}", "progress", progress)
    if current_step:
        redis_client.hset(f"jobs:{job_id}", "current_step", current_step)
    # Set TTL of 24 hours
    redis_client.expire(f"jobs:{job_id}", settings.job_retention_hours * 3600)


@celery_app.task(bind=True)
def generate_test_cases_task(self, job_id: str, ticket_id: str, description: str):
    """
    Celery task to generate test cases from ticket description.

    Args:
        job_id: Unique job identifier
        ticket_id: Ticket identifier
        description: Ticket description
    """
    logger = logging.getLogger(__name__)
    logger.info(f"[Job {job_id}] Starting test case generation task")

    try:
        update_job_status(job_id, "processing", 10, "Initializing test case generation")
        logger.info(f"[Job {job_id}] Status updated to processing")

        # Create agent and generate test cases
        logger.info(f"[Job {job_id}] Creating TestCaseAgent")
        agent = TestCaseAgent()
        logger.info(f"[Job {job_id}] TestCaseAgent created successfully")

        update_job_status(job_id, "processing", 30, "Generating test cases with AI")
        logger.info(f"[Job {job_id}] Calling LLM to generate test cases")

        test_case_text = agent.generate_test_case(ticket_id, description)
        logger.info(f"[Job {job_id}] Test cases generated successfully (length: {len(test_case_text)} chars)")

        update_job_status(job_id, "processing", 70, "Formatting test cases")

        # Structure the test cases
        test_cases = {
            "version": "1.0",
            "created_at": datetime.utcnow().isoformat(),
            "ticket_id": ticket_id,
            "test_case_text": test_case_text,
        }

        # Save to storage
        logger.info(f"[Job {job_id}] Saving test cases to storage")
        storage = StorageService()
        storage.save_test_cases(job_id, test_cases)
        logger.info(f"[Job {job_id}] Test cases saved successfully")

        update_job_status(job_id, "completed", 100, "Test cases generated successfully")
        logger.info(f"[Job {job_id}] Task completed successfully")

        return {
            "job_id": job_id,
            "status": "completed",
            "test_cases": test_cases
        }

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        logger.error(f"[Job {job_id}] Task failed: {error_msg}", exc_info=True)
        update_job_status(job_id, "failed", 0, error_msg)
        raise


class LogCapture:
    """Capture logs from browser-use agent."""
    def __init__(self):
        self.logs = []
        self.string_buffer = io.StringIO()
        self.handler = logging.StreamHandler(self.string_buffer)
        self.handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(levelname)s [%(name)s] %(message)s')
        self.handler.setFormatter(formatter)

    def start(self):
        """Start capturing logs."""
        # Capture browser-use logs
        logger = logging.getLogger('browser_use')
        logger.addHandler(self.handler)
        logger.setLevel(logging.INFO)

    def stop(self):
        """Stop capturing logs."""
        logger = logging.getLogger('browser_use')
        logger.removeHandler(self.handler)

    def get_logs(self):
        """Get captured logs."""
        self.string_buffer.seek(0)
        return self.string_buffer.read()


def _filter_actions_for_replay(actions):
    """
    Filter actions to create a repeatable test.
    Removes 'done' action and keeps only actual interactions.
    """
    replay_actions = []

    for action in actions:
        # Handle string representations
        if isinstance(action, str):
            # Skip done actions
            if "'done':" in action or '"done":' in action:
                continue
            replay_actions.append(action)
        # Handle dict representations
        elif isinstance(action, dict):
            # Skip done actions
            if 'done' in action:
                continue
            replay_actions.append(action)
        else:
            replay_actions.append(action)

    return replay_actions


async def _run_with_timeout(agent, test_case_text, headless=False, log_capture=None):
    """Run agent with 10 minute timeout (safety net - max_steps is primary limit)."""
    # Only capture logs in local mode
    if log_capture and settings.browser_execution_mode == "local":
        log_capture.start()

    try:
        return await asyncio.wait_for(
            agent.run_agent(test_case_text, headless=headless),
            timeout=600  # 10 minutes (safety net only, max_steps=30 is the main limit)
        )
    finally:
        if log_capture and settings.browser_execution_mode == "local":
            log_capture.stop()


@celery_app.task(bind=True)
def execute_test_cases_task(
    self,
    job_id: str,
    test_case_text: str,
    url: str,
    user_email: str = None,
    user_password: str = None,
    browser_mode: str = "new",
    headless: bool = False,
    cdp_url: str = None
):
    """
    Celery task to execute test cases using browser automation.

    Args:
        job_id: Unique job identifier
        test_case_text: Test case steps to execute
        url: Base URL to test
        user_email: Optional user email for login
        user_password: Optional user password for login
    """
    try:
        update_job_status(job_id, "processing", 10, "Initializing browser automation")

        # Create QA agent
        agent = QaAgent(
            base_url=url,
            email=user_email,
            password=user_password,
            browser_mode=browser_mode,
            cdp_url=cdp_url
        )

        update_job_status(job_id, "processing", 30, "Starting test execution")

        # Run tests with 10 minute timeout, capturing logs (local mode only)
        log_capture = LogCapture() if settings.browser_execution_mode == "local" else None
        result = None
        timed_out = False
        try:
            result = asyncio.run(_run_with_timeout(agent, test_case_text, headless, log_capture))
        except asyncio.TimeoutError:
            timed_out = True
            update_job_status(job_id, "processing", 80, "Test timed out, generating partial report")

        # If timeout occurred, try to get partial results (if available)
        if timed_out and result is None:
            update_job_status(job_id, "failed", 100, "Test execution timed out after 10 minutes")

            # Get captured logs (only available in local mode)
            captured_logs = log_capture.get_logs() if log_capture else "No logs available (cloud execution mode)"

            # Extract step information from logs
            step_lines = [line for line in captured_logs.split('\n') if '📍 Step' in line or '▶️' in line or '👍 Eval:' in line or '❔ Eval:' in line or '⚠️ Eval:' in line]
            step_summary = '\n'.join(step_lines[-20:]) if step_lines else "No step information captured."

            # Generate timeout report with partial information
            timeout_report = f"""# Test Execution Report

Test executed at: {datetime.utcnow().isoformat()}

URL: {url}

**Status: FAILED - Timeout**

## Error

The test execution exceeded the maximum allowed time of 10 minutes and was terminated.

This usually indicates:
- The application is extremely slow or unresponsive
- The AI agent encountered an unexpected state and couldn't recover
- There's an issue with the browser or network connectivity

**Note:** Tests are normally limited to 30 steps which should complete well within 10 minutes. This timeout suggests an exceptional situation occurred.

Please verify:
- The application URL is accessible and responsive
- The test case steps are appropriate for the application
- There are no network or browser issues

## Partial Execution Summary (Last Steps Before Timeout)

```
{step_summary}
```

## Detailed Logs (Last 2000 characters)

```
{captured_logs[-2000:] if len(captured_logs) > 2000 else captured_logs}
```

*Note: Execution was cancelled due to timeout. The agent may have been stuck repeating actions or waiting for elements that never appeared.*
"""

            results = {
                "version": "1.0",
                "executed_at": datetime.utcnow().isoformat(),
                "url": url,
                "final_result": timeout_report,
                "actions": [],
                "errors": ["Test execution timed out after 10 minutes"],
                "status": "failed"
            }

            storage = StorageService()
            storage.save_results(job_id, results)
            storage.save_report(job_id, timeout_report)

            return {
                "job_id": job_id,
                "status": "failed",
                "results": results
            }

        update_job_status(job_id, "processing", 80, "Generating test report")

        # Extract results
        final_result = result.final_result() if hasattr(result, 'final_result') else None
        raw_actions = result.model_actions() if hasattr(result, 'model_actions') else []
        raw_errors = result.errors() if hasattr(result, 'errors') else []

        # Convert actions to JSON-serializable format
        def make_json_serializable(obj):
            """Recursively convert Pydantic models and other objects to JSON-serializable format."""
            if obj is None:
                return None
            elif hasattr(obj, 'model_dump'):
                # Pydantic v2
                return make_json_serializable(obj.model_dump())
            elif hasattr(obj, 'dict'):
                # Pydantic v1
                return make_json_serializable(obj.dict())
            elif isinstance(obj, dict):
                return {k: make_json_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [make_json_serializable(item) for item in obj]
            elif isinstance(obj, (str, int, float, bool)):
                return obj
            else:
                # For objects we can't serialize, extract useful locator info
                # This handles DOMInteractedElement and similar complex objects
                if hasattr(obj, 'x_path') or hasattr(obj, 'attributes'):
                    # Extract multiple locator strategies for robustness
                    locator_info = {}

                    # Extract attributes (id, name, class, aria-label, etc.)
                    if hasattr(obj, 'attributes') and obj.attributes:
                        attrs = obj.attributes if isinstance(obj.attributes, dict) else {}
                        if 'id' in attrs:
                            locator_info['id'] = attrs['id']
                        if 'name' in attrs:
                            locator_info['name'] = attrs['name']
                        if 'data-testid' in attrs:
                            locator_info['testid'] = attrs['data-testid']
                        if 'placeholder' in attrs:
                            locator_info['placeholder'] = attrs['placeholder']
                        if 'aria-label' in attrs:
                            locator_info['aria_label'] = attrs['aria-label']
                        if 'class' in attrs:
                            locator_info['class'] = attrs['class']
                        if 'href' in attrs:
                            locator_info['href'] = attrs['href']

                    # Extract accessible name (most reliable)
                    if hasattr(obj, 'ax_name') and obj.ax_name:
                        locator_info['ax_name'] = obj.ax_name

                    # Extract node name (BUTTON, INPUT, etc.)
                    if hasattr(obj, 'node_name') and obj.node_name:
                        locator_info['node_name'] = obj.node_name

                    # Keep xpath as fallback
                    if hasattr(obj, 'x_path') and obj.x_path:
                        locator_info['x_path'] = obj.x_path

                    return locator_info if locator_info else None
                elif hasattr(obj, '__dict__'):
                    try:
                        return make_json_serializable(obj.__dict__)
                    except:
                        return None
                else:
                    return None

        actions = []
        for action in raw_actions:
            try:
                serialized = make_json_serializable(action)
                actions.append(serialized)
            except Exception as e:
                # If all else fails, skip this action
                print(f"Warning: Could not serialize action: {e}")
                continue

        # Create filtered actions for replay (without done action, only interactions)
        replay_actions = _filter_actions_for_replay(actions)

        # Convert errors to JSON-serializable format
        errors = []
        for error in raw_errors:
            try:
                if hasattr(error, 'model_dump'):
                    errors.append(error.model_dump())
                elif hasattr(error, 'dict'):
                    errors.append(error.dict())
                else:
                    errors.append(str(error))
            except Exception:
                errors.append(str(error))

        # Check if the agent actually succeeded or hit limits
        has_errors = len(errors) > 0
        has_few_actions = len(actions) < 2
        hit_step_limit = len(actions) >= 30  # Hit the max_steps limit

        # Check the agent's own success determination from the 'done' action
        agent_success = None
        for action in actions:
            # Check if this is a done action
            if isinstance(action, dict) and 'done' in action:
                agent_success = action['done'].get('success', None)
            elif isinstance(action, str) and ("'done':" in action or '"done":' in action):
                # Try to extract success from string representation
                try:
                    import ast
                    parsed = ast.literal_eval(action)
                    if 'done' in parsed:
                        agent_success = parsed['done'].get('success', None)
                except:
                    pass

        # Determine status based on agent's judgment first, then fallbacks
        if hit_step_limit:
            status = "failed"
            status_text = "Failed - Step Limit Reached"
        elif agent_success is not None:
            # Use the agent's own determination
            if agent_success:
                status = "completed"
                status_text = "Completed"
            else:
                status = "failed"
                status_text = "Failed"
        elif has_errors or has_few_actions:
            status = "failed"
            status_text = "Failed"
        else:
            status = "completed"
            status_text = "Completed"

        # Generate report text
        if final_result:
            # If hit step limit, prepend warning to existing report
            if hit_step_limit:
                report_text = f"""# Test Execution Report

**Status: FAILED - Step Limit Reached**

⚠️ **The test execution reached the maximum limit of 30 steps and was terminated.**

This usually indicates:
- The test case is too complex or has too many steps
- The AI agent is stuck in a loop trying to complete a task
- The application interface is not responding as expected

The test was stopped to prevent excessive resource usage. Below is the partial report generated before termination.

---

{final_result}
"""
            else:
                report_text = final_result
        else:
            if hit_step_limit:
                summary_text = "⚠️ The test execution reached the maximum limit of 30 steps and was terminated. The AI agent may have been stuck in a loop or the test case was too complex."
            else:
                summary_text = "⚠️ The test execution encountered errors or completed with very few actions. This might indicate that the LLM was unable to properly interact with the page." if status == "failed" else "✅ Test completed successfully."

            errors_text = ""
            if errors:
                errors_list = "\n".join([f"- {e}" for e in errors[:5]])
                errors_text = f"\n\n## Errors\n{errors_list}"

            report_text = f"""# Test Execution Report

Test executed at: {datetime.utcnow().isoformat()}

URL: {url}

**Status: {status_text}**

Actions performed: {len(actions)}
Errors encountered: {len(errors)}

## Summary
{summary_text}{errors_text}
"""

        # Extract test expectations from the done action for replay validation
        test_expectations = None
        expected_outcome = None
        for action in actions:
            if isinstance(action, dict) and 'done' in action:
                done_data = action['done']
                if isinstance(done_data, dict):
                    # Extract the test description/expectations from done action
                    if 'text' in done_data:
                        expected_outcome = done_data['text']
                    # Store success criteria
                    if 'success' in done_data:
                        test_expectations = {
                            'expected_success': done_data['success'],
                            'outcome_description': expected_outcome
                        }

        # Structure the results
        results = {
            "version": "1.0",
            "executed_at": datetime.utcnow().isoformat(),
            "url": url,
            "test_case_text": test_case_text,  # Original test instructions
            "test_expectations": test_expectations,  # Extracted success criteria
            "expected_outcome": expected_outcome,  # What the test was trying to achieve
            "final_result": report_text,
            "actions": actions,
            "replay_actions": replay_actions,  # Filtered actions for test replay
            "errors": errors,
            "status": status
        }

        # Save to storage
        storage = StorageService()
        storage.save_results(job_id, results)
        storage.save_report(job_id, report_text)

        # Update final job status based on result
        if hit_step_limit:
            update_job_status(job_id, "failed", 100, "Test failed: reached maximum 30 steps")
        elif status == "failed":
            update_job_status(job_id, "failed", 100, "Test execution failed")
        else:
            update_job_status(job_id, "completed", 100, "Test execution completed")

        return {
            "job_id": job_id,
            "status": status,
            "results": results
        }

    except Exception as e:
        update_job_status(job_id, "failed", 0, f"Error: {str(e)}")
        raise


@celery_app.task(bind=True)
def replay_actions_task(
    self,
    job_id: str,
    actions: list,
    url: str,
    user_email: str = None,
    user_password: str = None,
    test_case_text: str = None,
    test_expectations: dict = None,
    expected_outcome: str = None,
    browser_mode: str = "new",
    headless: bool = False,
    cdp_url: str = None
):
    """
    Celery task to replay actions without LLM and evaluate result.

    Args:
        job_id: Unique job identifier
        actions: List of actions to replay
        url: Base URL to test
        user_email: Optional user email for login
        user_password: Optional user password for login
        test_case_text: Original test case instructions (for context)
        test_expectations: Expected success criteria
        expected_outcome: What the test should achieve
    """
    try:
        update_job_status(job_id, "processing", 10, "Initializing replay")

        # Import here to avoid circular dependency
        from app.services.replay_service import ReplayService

        replay_service = ReplayService(
            base_url=url,
            email=user_email,
            password=user_password,
            browser_mode=browser_mode,
            cdp_url=cdp_url
        )

        update_job_status(job_id, "processing", 30, "Replaying actions")

        # Run replay with expectations for better evaluation
        result = asyncio.run(replay_service.replay_actions(
            actions,
            test_case_text=test_case_text,
            test_expectations=test_expectations,
            expected_outcome=expected_outcome,
            headless=headless
        ))

        update_job_status(job_id, "processing", 80, "Generating replay report")

        # Generate report
        report_text = f"""# Test Replay Report

Test replayed at: {datetime.utcnow().isoformat()}

URL: {url}

**Status: {result['status'].upper()}**

## Summary

{result['summary']}

## Actions Executed

Total actions: {len(actions)}

## Evaluation

{result['evaluation']}
"""

        # Structure the results
        results = {
            "version": "1.0",
            "executed_at": datetime.utcnow().isoformat(),
            "url": url,
            "final_result": report_text,
            "actions": actions,
            "replay_actions": actions,  # Same as input for replay
            "errors": result.get('errors', []),
            "status": result['status']
        }

        # Save to storage
        storage = StorageService()
        storage.save_results(job_id, results)
        storage.save_report(job_id, report_text)

        update_job_status(job_id, result['status'], 100, f"Replay {result['status']}")

        return {
            "job_id": job_id,
            "status": result['status'],
            "results": results
        }

    except Exception as e:
        update_job_status(job_id, "failed", 0, f"Error: {str(e)}")
        raise


@celery_app.task(bind=True)
def review_pr_task(self, review_id: str, pr_id: str, github_token: str = None):
    """
    Celery task to generate PR review using LLM.

    Args:
        review_id: Unique review identifier
        pr_id: PR identifier (owner/repo/number)
        github_token: Optional GitHub token for API access
    """
    logger = logging.getLogger(__name__)
    logger.info(f"[Review {review_id}] Starting PR review task for PR {pr_id}")

    try:
        # Update review status
        redis_client.hset(
            f"pr_review:{review_id}",
            mapping={
                "status": "processing",
                "progress": 10
            }
        )
        redis_client.expire(f"pr_review:{review_id}", settings.job_retention_hours * 3600)

        # Get PR info from Redis
        pr_data = redis_client.hgetall(f"pr:{pr_id}")
        if not pr_data:
            raise Exception(f"PR {pr_id} not found in Redis")

        pr_info = {k.decode(): v.decode() for k, v in pr_data.items()}
        logger.info(f"[Review {review_id}] Found PR: {pr_info.get('title', 'N/A')}")

        # Parse PR URL
        from app.services.github_service import GitHubService
        github_service = GitHubService(github_token=github_token)
        owner, repo, pr_number = github_service.parse_pr_url(pr_info["url"])

        redis_client.hset(f"pr_review:{review_id}", "progress", 20)

        # Fetch PR diff and files
        logger.info(f"[Review {review_id}] Fetching PR diff and files")
        diff = github_service.get_pr_diff(owner, repo, pr_number)
        files = github_service.get_pr_files(owner, repo, pr_number)
        logger.info(f"[Review {review_id}] Fetched {len(files)} files")

        redis_client.hset(f"pr_review:{review_id}", "progress", 40)

        # Generate review using LLM
        logger.info(f"[Review {review_id}] Generating review with LLM")
        from app.services.pr_review_agent import PRReviewAgent
        review_agent = PRReviewAgent()
        review_text = review_agent.generate_review(
            pr_info=pr_info,
            diff=diff,
            files=files
        )
        logger.info(f"[Review {review_id}] Review generated (length: {len(review_text)} chars)")

        redis_client.hset(f"pr_review:{review_id}", "progress", 80)

        # Save review to storage
        logger.info(f"[Review {review_id}] Saving review to storage")
        storage = StorageService()
        review_data = {
            "review_id": review_id,
            "pr_id": pr_id,
            "pr_url": pr_info["url"],
            "created_at": datetime.utcnow().isoformat(),
            "review_text": review_text,
            "status": "completed"
        }
        storage.save_pr_review(pr_id, review_id, review_data)

        # Add review to PR's review list in Redis
        redis_client.rpush(f"pr:{pr_id}:reviews", review_id)

        # Update review status
        redis_client.hset(
            f"pr_review:{review_id}",
            mapping={
                "status": "completed",
                "progress": 100,
                "review_text_preview": review_text[:500]
            }
        )
        redis_client.expire(f"pr_review:{review_id}", settings.job_retention_hours * 3600)

        logger.info(f"[Review {review_id}] Task completed successfully")

        return {
            "review_id": review_id,
            "pr_id": pr_id,
            "status": "completed"
        }

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        logger.error(f"[Review {review_id}] Task failed: {error_msg}", exc_info=True)

        redis_client.hset(
            f"pr_review:{review_id}",
            mapping={
                "status": "failed",
                "error": error_msg,
                "progress": 0
            }
        )
        raise


@celery_app.task
def cleanup_old_jobs():
    """Periodic task to cleanup old job files."""
    storage = StorageService()
    deleted_count = storage.cleanup_old_jobs()

    # Also cleanup old Redis keys
    pattern = "jobs:*"
    cursor = 0
    deleted_keys = 0

    while True:
        cursor, keys = redis_client.scan(cursor, match=pattern, count=100)
        for key in keys:
            # Check if TTL exists, if not set it
            ttl = redis_client.ttl(key)
            if ttl == -1:  # No expiration set
                redis_client.expire(key, settings.job_retention_hours * 3600)
            deleted_keys += 1

        if cursor == 0:
            break

    return {
        "deleted_files": deleted_count,
        "processed_keys": deleted_keys
    }
