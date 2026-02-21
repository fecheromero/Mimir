"""
PR Review Agent - Generates code reviews using LLM.
"""
import os
import json
import re
from typing import Optional, Dict, List
from ..core.llm_factory import get_llm_for_test_generation


class PRReviewAgent:
    """Agent for generating PR reviews using LLM."""

    RULES_FILE_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "REVIEWER_RULES.md"
    )

    def __init__(self):
        """
        Initialize PR Review Agent.
        """
        self.llm_client = get_llm_for_test_generation()
        self.reviewer_rules = self._load_reviewer_rules()
        self.system_prompt = self._build_system_prompt()

    def _load_reviewer_rules(self) -> str:
        """Load reviewer rules from markdown file."""
        try:
            with open(self.RULES_FILE_PATH, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            # Return default rules if file doesn't exist
            return "# No custom rules defined yet.\nUse general code review best practices."

    def _build_system_prompt(self) -> str:
        """Build system prompt for PR review."""
        return f"""You are an expert code reviewer. Your task is to review pull requests and provide constructive feedback.

**Custom Review Guidelines:**

{self.reviewer_rules}

---

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

    def suggest_rule_improvements(
        self,
        pr_info: dict,
        review_text: str,
        diff: str
    ) -> Optional[Dict[str, str]]:
        """
        Ask LLM to suggest improvements to reviewer rules based on review experience.

        Args:
            pr_info: PR metadata
            review_text: The review that was just generated
            diff: The diff that was reviewed

        Returns:
            Dict with 'suggestion' (new rule text) and 'rationale' or None if no suggestions
        """
        system_prompt = """You are a code review expert helping to improve review guidelines.

Based on the PR you just reviewed, determine if there are any new patterns, issues, or best practices
that should be added to the review guidelines to make future reviews better.

Only suggest additions if:
1. You encountered something not covered by current guidelines
2. The addition would be valuable for future reviews
3. It's specific and actionable

If no improvements are needed, respond with: NO_SUGGESTIONS

If you have a suggestion, respond in this exact format:

SUGGESTION:
[The new guideline text in markdown format]

RATIONALE:
[Why this should be added - reference specific aspects from the PR you reviewed]
"""

        user_prompt = f"""Current reviewer guidelines:

{self.reviewer_rules}

---

I just reviewed this PR:

**Repository:** {pr_info.get('repo', 'N/A')}
**Title:** {pr_info.get('title', 'N/A')}
**Files changed:** {pr_info.get('changed_files', 0)}

My review covered these aspects:
{review_text[:1000]}...

Based on this experience, should we add anything to our reviewer guidelines?
"""

        messages = [
            {"role": "user", "content": user_prompt}
        ]

        response = self.llm_client.messages.create(
            model=self.llm_client.model,
            max_tokens=1024,
            system=system_prompt,
            messages=messages
        )

        response_text = response.content[0].text.strip()

        # Parse response
        if "NO_SUGGESTIONS" in response_text:
            return None

        # Extract suggestion and rationale
        if "SUGGESTION:" in response_text and "RATIONALE:" in response_text:
            parts = response_text.split("RATIONALE:")
            suggestion_part = parts[0].replace("SUGGESTION:", "").strip()
            rationale_part = parts[1].strip() if len(parts) > 1 else ""

            return {
                "suggestion": suggestion_part,
                "rationale": rationale_part
            }

        return None

    def generate_structured_review(
        self,
        pr_info: dict,
        diff: str,
        files: Optional[list] = None
    ) -> Dict:
        """
        Generate structured PR review with categorized improvements.

        Returns JSON with:
        - summary: Overall assessment
        - dummy_improvements: Safe, low-risk changes (typos, linter, unused code)
        - medium_improvements: Moderate complexity (refactoring, patterns)
        - experimental_improvements: High-risk/effort (architecture changes)
        """
        system_prompt = f"""You are an expert code reviewer analyzing pull requests.

**Custom Review Guidelines:**

{self.reviewer_rules}

---

**CRITICAL: Your response MUST be valid JSON only. No markdown, no explanations outside the JSON.**

Analyze the PR and categorize improvements into 3 levels:

1. **DUMMY IMPROVEMENTS** - Safe, trivial changes (auto-applicable):
   - Remove unused imports/variables
   - Fix typos in comments/strings
   - Fix linter warnings
   - Remove debug statements
   - Format/indentation fixes

   For each, provide:
   - Exact file path and line numbers
   - The EXACT current line content
   - The EXACT replacement (as diff format)
   - Confidence score (0.0-1.0, only >0.85 for dummy)

2. **MEDIUM IMPROVEMENTS** - Moderate complexity:
   - Extract duplicate code
   - Apply design patterns
   - Improve error handling
   - Add validation

3. **EXPERIMENTAL** - High risk/effort:
   - Architecture changes
   - Major refactoring
   - Technology migrations
   - Breaking changes

Response format (MUST be valid JSON):
```json
{{
  "summary": "Brief overall assessment",
  "dummy_improvements": [
    {{
      "id": "d1",
      "title": "Short title",
      "description": "What and why",
      "file_path": "src/app.js",
      "line_start": 5,
      "line_end": 5,
      "current_content": "import unused from 'lodash'",
      "replacement": "",
      "diff": "- import unused from 'lodash'\\n",
      "confidence": 0.95,
      "type": "remove_unused_import"
    }}
  ],
  "medium_improvements": [
    {{
      "id": "m1",
      "title": "Short title",
      "description": "Detailed explanation",
      "files": ["file1.js", "file2.js"],
      "confidence": 0.75,
      "impact": "medium",
      "rationale": "Why this matters"
    }}
  ],
  "experimental_improvements": [
    {{
      "id": "e1",
      "title": "Short title",
      "description": "Detailed explanation",
      "impact": "high",
      "risk": "medium",
      "effort": "high",
      "files_affected_count": 15
    }}
  ]
}}
```

**IMPORTANT:**
- Only include dummy improvements if you can provide EXACT line content and replacement
- Confidence >0.85 required for dummy category
- Be conservative: when in doubt, categorize as medium, not dummy
- Escape special characters in JSON strings
- Ensure all JSON is properly formatted"""

        # Build prompt
        user_prompt = self._build_user_prompt(pr_info, diff, files, None)
        user_prompt += "\n\nProvide your analysis as JSON following the format specified."

        messages = [{"role": "user", "content": user_prompt}]

        response = self.llm_client.messages.create(
            model=self.llm_client.model,
            max_tokens=8192,
            system=system_prompt,
            messages=messages
        )

        response_text = response.content[0].text.strip()

        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response_text

        try:
            structured_review = json.loads(json_str)

            # Validate structure
            if "dummy_improvements" not in structured_review:
                structured_review["dummy_improvements"] = []
            if "medium_improvements" not in structured_review:
                structured_review["medium_improvements"] = []
            if "experimental_improvements" not in structured_review:
                structured_review["experimental_improvements"] = []
            if "summary" not in structured_review:
                structured_review["summary"] = "Review completed"

            return structured_review

        except json.JSONDecodeError as e:
            # Fallback: return empty structure with error
            return {
                "summary": f"Error parsing review: {str(e)}",
                "dummy_improvements": [],
                "medium_improvements": [],
                "experimental_improvements": [],
                "parse_error": response_text[:500]
            }
