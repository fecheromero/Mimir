"""
PR Review Agent - Generates code reviews using LLM.
"""
from typing import Optional
from ..core.llm_factory import get_llm_for_test_generation


class PRReviewAgent:
    """Agent for generating PR reviews using LLM."""

    def __init__(self, model: Optional[str] = None):
        """
        Initialize PR Review Agent.

        Args:
            model: Optional model name override
        """
        self.llm_client = get_llm_for_test_generation(model_override=model)
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        """Build system prompt for PR review."""
        return """You are an expert code reviewer. Your task is to review pull requests and provide constructive feedback.

**Review Guidelines:**

1. **Code Quality:**
   - Check for code clarity, readability, and maintainability
   - Identify complex logic that needs simplification
   - Look for proper error handling
   - Check for consistent naming conventions

2. **Best Practices:**
   - Verify adherence to language-specific best practices
   - Check for proper use of design patterns
   - Identify potential security vulnerabilities
   - Look for performance issues

3. **Testing:**
   - Check if tests are included for new functionality
   - Verify test coverage for edge cases
   - Look for proper error case handling

4. **Documentation:**
   - Check if complex logic is documented
   - Verify API changes are documented
   - Look for clear commit messages

5. **Architecture:**
   - Check if changes align with existing architecture
   - Identify potential coupling issues
   - Look for separation of concerns

**Output Format:**

Provide your review in markdown format with the following sections:

## Summary
Brief overview of the PR and overall assessment.

## Positive Aspects
What's good about this PR (be specific).

## Issues Found
List issues by severity:
- 🔴 **Critical**: Must be fixed before merge
- 🟡 **Important**: Should be addressed
- 🔵 **Suggestion**: Nice to have

For each issue:
- File and line reference
- Clear description of the problem
- Suggested solution

## Questions
Any clarifications needed from the author.

## Recommendation
Final verdict: Approve / Request Changes / Needs Discussion

---

Be constructive, specific, and actionable. Focus on teaching, not just pointing out issues."""

    def generate_review(
        self,
        pr_info: dict,
        diff: str,
        files: Optional[list] = None,
        additional_context: Optional[str] = None
    ) -> str:
        """
        Generate PR review using LLM.

        Args:
            pr_info: PR metadata (title, description, author, etc.)
            diff: Full PR diff
            files: Optional list of changed files with metadata
            additional_context: Optional additional context (e.g., previous reviews, guidelines)

        Returns:
            Review as markdown string
        """
        # Build user prompt with PR context
        user_prompt = self._build_user_prompt(pr_info, diff, files, additional_context)

        # Call LLM
        messages = [
            {"role": "user", "content": user_prompt}
        ]

        response = self.llm_client.messages.create(
            model=self.llm_client.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=messages
        )

        # Extract review text
        review_text = response.content[0].text

        return review_text

    def _build_user_prompt(
        self,
        pr_info: dict,
        diff: str,
        files: Optional[list],
        additional_context: Optional[str]
    ) -> str:
        """Build user prompt with PR information."""
        prompt_parts = [
            "# Pull Request Review Request\n",
            f"**Repository:** {pr_info.get('repo', 'N/A')}",
            f"**PR Number:** #{pr_info.get('number', 'N/A')}",
            f"**Title:** {pr_info.get('title', 'N/A')}",
            f"**Author:** {pr_info.get('author', 'N/A')}",
            f"**Branch:** {pr_info.get('head_branch', 'N/A')} → {pr_info.get('base_branch', 'N/A')}",
            f"\n**Description:**\n{pr_info.get('body', 'No description provided.')}\n",
        ]

        # Add file summary if available
        if files:
            prompt_parts.append("\n## Changed Files Summary")
            prompt_parts.append(f"**Total files changed:** {len(files)}")
            total_additions = sum(f.get("additions", 0) for f in files)
            total_deletions = sum(f.get("deletions", 0) for f in files)
            prompt_parts.append(f"**Lines:** +{total_additions} -{total_deletions}\n")

            prompt_parts.append("**Files:**")
            for file in files[:20]:  # Limit to first 20 files
                status = file.get("status", "modified")
                prompt_parts.append(
                    f"- `{file['filename']}` ({status}): "
                    f"+{file.get('additions', 0)} -{file.get('deletions', 0)}"
                )

            if len(files) > 20:
                prompt_parts.append(f"... and {len(files) - 20} more files")

        # Add additional context if provided
        if additional_context:
            prompt_parts.append(f"\n## Additional Context\n{additional_context}\n")

        # Add diff
        prompt_parts.append("\n## Diff\n")
        prompt_parts.append("```diff")

        # Truncate diff if too large (keep under ~100k tokens)
        max_diff_chars = 300000  # Approximately 75k tokens
        if len(diff) > max_diff_chars:
            prompt_parts.append(diff[:max_diff_chars])
            prompt_parts.append(
                f"\n... (diff truncated, showing first {max_diff_chars} characters)"
            )
        else:
            prompt_parts.append(diff)

        prompt_parts.append("```")

        prompt_parts.append("\n---\n")
        prompt_parts.append("Please review this pull request following the guidelines provided.")

        return "\n".join(prompt_parts)
