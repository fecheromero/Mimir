from app.models.job_status import JobStatus


class StatusEvaluator:
    """Evaluates test execution results and determines status"""

    @staticmethod
    def evaluate_execution(
        actions: list[dict],
        errors: list,
        hit_step_limit: bool = False
    ) -> tuple[str, str]:
        """
        Evaluate execution and return (status, status_text)

        Args:
            actions: List of executed actions
            errors: List of errors encountered
            hit_step_limit: Whether the execution hit max steps limit

        Returns:
            Tuple of (status: str, status_text: str)
        """
        if hit_step_limit:
            return JobStatus.UNSUCCESSFUL.value, "Unsuccessful - Step Limit Reached"

        # Check agent's own determination
        agent_success = StatusEvaluator._extract_agent_success(actions)

        if agent_success is not None:
            if agent_success:
                return JobStatus.PASSED.value, "Passed"
            else:
                return JobStatus.UNSUCCESSFUL.value, "Unsuccessful"

        # Fallback: check errors
        has_errors = len(errors) > 0
        has_few_actions = len(actions) < 2

        if has_errors or has_few_actions:
            return JobStatus.UNSUCCESSFUL.value, "Unsuccessful"

        return JobStatus.PASSED.value, "Passed"

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
