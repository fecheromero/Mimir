from app.models.job_status import JobStatus
import re


class StatusEvaluator:
    """Evaluates test execution results and determines status"""

    @staticmethod
    def evaluate_execution(
        actions: list[dict],
        errors: list,
        hit_step_limit: bool = False,
        final_report: str = None
    ) -> tuple[str, str]:
        """
        Evaluate execution and return (status, status_text)

        Args:
            actions: List of executed actions
            errors: List of errors encountered
            hit_step_limit: Whether the execution hit max steps limit
            final_report: Final report text from agent (optional)

        Returns:
            Tuple of (status: str, status_text: str)
        """
        if hit_step_limit:
            return JobStatus.UNSUCCESSFUL.value, "Unsuccessful - Step Limit Reached"

        # Strategy 1: Check report text for explicit PASSED/UNSUCCESSFUL keywords
        if final_report:
            report_status = StatusEvaluator._extract_status_from_report(final_report)
            if report_status is not None:
                return report_status

        # Strategy 2: Check agent's structured success field
        agent_success = StatusEvaluator._extract_agent_success(actions)
        if agent_success is not None:
            if agent_success:
                return JobStatus.PASSED.value, "Passed"
            else:
                return JobStatus.UNSUCCESSFUL.value, "Unsuccessful"

        # Strategy 3: Fallback heuristics
        has_errors = len(errors) > 0
        has_few_actions = len(actions) < 2

        if has_errors or has_few_actions:
            return JobStatus.UNSUCCESSFUL.value, "Unsuccessful - Unable to determine status from agent output"

        return JobStatus.PASSED.value, "Passed - Completed without errors"

    @staticmethod
    def _extract_status_from_report(report_text: str) -> tuple[str, str] | None:
        """
        Extract status from report text by looking for PASSED/UNSUCCESSFUL keywords.

        The agent is instructed to begin reports with these keywords, but we use
        flexible pattern matching in case the format varies slightly.

        Returns:
            Tuple of (status, status_text) if keywords found, None otherwise
        """
        if not report_text:
            return None

        # Normalize text: first 500 chars, case-insensitive
        report_start = report_text[:500].upper()

        # Pattern matching for common variations
        passed_patterns = [
            r'\bPASSED\b',
            r'\bPASS\b',
            r'\bSUCCESS\b',
            r'\bSUCCESSFUL\b',
        ]

        unsuccessful_patterns = [
            r'\bUNSUCCESSFUL\b',
            r'\bFAILED\b',
            r'\bFAIL\b',
        ]

        # Check for failure keywords first (more specific)
        for pattern in unsuccessful_patterns:
            if re.search(pattern, report_start):
                return JobStatus.UNSUCCESSFUL.value, "Unsuccessful - Agent reported failure"

        # Then check for success keywords
        for pattern in passed_patterns:
            if re.search(pattern, report_start):
                return JobStatus.PASSED.value, "Passed - Agent reported success"

        return None

    @staticmethod
    def _extract_agent_success(actions: list[dict]) -> bool | None:
        """Extract success determination from agent's done action"""
        for action in actions:
            if isinstance(action, dict) and 'done' in action:
                done_data = action['done']
                if isinstance(done_data, dict):
                    return done_data.get('success', None)
            elif isinstance(action, str) and ("'done':" in action or '"done":' in action):
                # Try to extract success from string representation
                try:
                    import ast
                    parsed = ast.literal_eval(action)
                    if 'done' in parsed:
                        return parsed['done'].get('success', None)
                except:
                    pass
        return None
