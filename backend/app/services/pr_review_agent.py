"""
PR Review Agent - Generates code reviews using LLM.
"""
import os
import json
import re
import time
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

    def _call_llm_with_retry(self, **kwargs):
        """
        Call LLM with exponential backoff retry for rate limits.

        Args:
            **kwargs: Arguments to pass to llm_client.messages.create()

        Returns:
            Response from LLM

        Raises:
            Exception: If all retries fail
        """
        max_retries = 3
        base_delay = 2  # Start with 2 second delay

        for attempt in range(max_retries):
            try:
                return self.llm_client.messages.create(**kwargs)
            except Exception as e:
                error_str = str(e)

                # Check if it's a rate limit error (429)
                if "rate_limit_error" in error_str or "429" in error_str:
                    if attempt < max_retries - 1:
                        # Exponential backoff: 2s, 4s, 8s
                        delay = base_delay * (2 ** attempt)
                        print(f"Rate limit hit. Retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries})")
                        time.sleep(delay)
                        continue
                    else:
                        # Last attempt failed
                        raise Exception(f"Rate limit exceeded after {max_retries} retries. Please try again later or reduce PR size.")
                else:
                    # Not a rate limit error, raise immediately
                    raise

        # Should never reach here, but just in case
        raise Exception("Max retries exceeded")

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

        # Call LLM with prompt caching
        messages = [
            {"role": "user", "content": user_prompt}
        ]

        # Use prompt caching for system prompt to reduce token usage
        # System prompt is marked as cache_control to be cached across requests
        response = self._call_llm_with_retry(
            model=self.llm_client.model,
            max_tokens=4096,
            system=[
                {
                    "type": "text",
                    "text": self.system_prompt,
                    "cache_control": {"type": "ephemeral"}
                }
            ],
            messages=messages
        )

        # Extract review text
        review_text = response.content[0].text

        return review_text

    def _filter_diff(self, diff: str) -> str:
        """
        Filter diff to remove large generated files that add noise.

        Skips files like:
        - package-lock.json, yarn.lock, pnpm-lock.yaml
        - compiled/minified files (.min.js, .min.css)
        - vendor directories
        - build artifacts
        """
        # Files to completely exclude from diff
        excluded_patterns = [
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            'composer.lock',
            'Gemfile.lock',
            'Pipfile.lock',
            'poetry.lock',
            '.min.js',
            '.min.css',
            'dist/',
            'build/',
            'vendor/',
            'node_modules/',
            '.bundle.js',
            '.bundle.css'
        ]

        # Split diff by files (starts with "diff --git")
        file_diffs = re.split(r'(diff --git .*?\n)', diff)
        filtered_parts = []

        current_file = None
        for i, part in enumerate(file_diffs):
            if part.startswith('diff --git'):
                current_file = part
                filtered_parts.append(part)
            elif current_file:
                # Check if this file should be excluded
                should_exclude = any(pattern in current_file for pattern in excluded_patterns)

                if should_exclude:
                    # Add a note that this file was skipped
                    filtered_parts.append(f"... (large generated file skipped)\n")
                else:
                    filtered_parts.append(part)
                current_file = None

        return ''.join(filtered_parts)

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

        # Filter and truncate diff to avoid rate limits
        # Reduce to 120k characters (~30k tokens) to stay under 30k/min limit
        filtered_diff = self._filter_diff(diff)
        max_diff_chars = 120000  # Approximately 30k tokens

        if len(filtered_diff) > max_diff_chars:
            prompt_parts.append(filtered_diff[:max_diff_chars])
            prompt_parts.append(
                f"\n... (diff truncated, showing first {max_diff_chars} characters of {len(diff)} total)"
            )
        else:
            prompt_parts.append(filtered_diff)

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

Analyze the PR and categorize improvements into 4 levels:

1. **DANGER ZONE** - Critical issues that WILL break the application:

   **HIGHEST PRIORITY - Check these FIRST:**

   **Build/Compilation Failures:**
   - **Syntax errors**: Invalid code that won't compile/parse (missing quotes, invalid syntax like `l;asd'`, typos in keywords)
   - **Compilation errors**: Type errors, undefined variables, missing imports that prevent build from completing
   - **Build configuration errors**: Missing dependencies, broken import paths, incorrect package.json/requirements.txt
   - **Code that prevents frontend from starting**: Crashes during React component initialization, module loading failures
   - **Code that prevents backend from starting**: Application crashes at startup, module import errors, invalid config

   **Runtime Crashes & Exceptions:**
   - **Unhandled exceptions**: Null pointer dereferences, division by zero, array out of bounds, KeyError, AttributeError
   - **Missing null/undefined checks**: Accessing properties on null/undefined objects
   - **Broken alternative flows**: Unhandled error paths, missing exception handlers, uncaught promise rejections

   **Frontend-Specific Issues:**
   - **Infinite loops/re-renders**: useEffect without dependencies, setState in render, infinite async loops
   - **UI flicker/blink**: Rapid state changes, missing loading states, race conditions in data fetching
   - **Component crashes**: Missing prop validation, incorrect prop types, accessing undefined state

   **Data Contract Violations (Frontend ↔ Backend):**
   - **Model parsing failures**: Backend returns different field names than frontend expects (e.g., `user_id` vs `userId`)
   - **Type mismatches**: Backend sends string but frontend expects number, missing required fields
   - **Breaking schema changes**: Renamed/removed fields without backward compatibility, changed data structures
   - **Parse errors**: fromJson/toJson methods fail due to missing fields, incorrect types, or null values

   **API Error Handling:**
   - **Unhandled backend errors**: API throws 500/400 but frontend doesn't handle error response
   - **Missing error boundaries**: Frontend crashes instead of showing error UI when API fails
   - **Uncaught async errors**: Promise rejections without .catch() or try/catch

   **Missing Critical Data:**
   - **User data not validated**: Missing user.id, user.email checks before accessing
   - **Context data not checked**: Accessing context values that might be null/undefined
   - **Third-party integration failures**: Missing error handling for GitHub API, LLM API, database failures
   - **Configuration missing**: Required env variables (API keys, URLs) not validated at startup

   **Breaking API Changes:**
   - **Removed/renamed endpoints**: Frontend calls API that no longer exists
   - **Changed function signatures**: Removed required parameters, changed return types
   - **Removed/renamed functions**: Breaking changes without backward compatibility

   **Security Vulnerabilities:**
   - **SQL injection, XSS, CSRF**: Unvalidated user input in queries or rendered HTML
   - **Exposed secrets**: API keys, passwords in code or logs
   - **Auth bypasses**: Missing authentication checks, broken authorization logic

   **Examples of DANGER ZONE issues:**
   - `l;asd'` → Syntax error - Python/JS won't parse, application won't start
   - `undefined_variable = 5` → NameError at runtime when code executes
   - `const data = apiResponse.user.name` without checking if user exists → TypeError: Cannot read property 'name' of undefined
   - `useEffect(() => setCount(count + 1), [])` → Infinite re-render loop, browser freezes
   - Backend returns `{{user_name: "John"}}` but frontend expects `{{userName: "John"}}` → Parse error, User.fromJson() fails
   - API returns 500 error but frontend has no try/catch → Unhandled promise rejection, blank screen
   - `return user.password` → Exposing sensitive data in API response
   - Missing `if (!user?.id)` check → Crash when user is null

   For each danger zone issue, provide:
   - Severity level (critical, high)
   - Exact file path and line numbers
   - Description of the issue
   - What will break and when (e.g., "Frontend won't compile", "Application crashes at startup", "API call fails with unhandled error", "Infinite loop freezes browser")
   - How to reproduce the issue (e.g., "Load page", "Click button", "Call API endpoint")
   - Suggested fix with code example

2. **DUMMY IMPROVEMENTS** - Safe, trivial changes (auto-applicable):

   **ONLY include changes that are:**
   - Remove unused imports/variables
   - Fix typos in comments/strings (NOT in code)
   - Fix linter/formatting warnings (whitespace, quotes)
   - Remove debug print/console.log statements
   - Format/indentation fixes

   **DO NOT include in dummy:**
   - Syntax errors (→ DANGER ZONE)
   - Logic errors (→ MEDIUM or DANGER ZONE)
   - Removing code that is actually used
   - Changing variable names in code

   For each, provide:
   - Exact file path and line numbers
   - The EXACT current line content
   - The EXACT replacement (as diff format)
   - Confidence score (0.0-1.0, only >0.85 for dummy)

3. **MEDIUM IMPROVEMENTS** - Moderate complexity:
   - Extract duplicate code
   - Apply design patterns
   - Improve error handling
   - Add validation

4. **EXPERIMENTAL** - High risk/effort:
   - Architecture changes
   - Major refactoring
   - Technology migrations
   - Breaking changes

Response format (MUST be valid JSON):
```json
{{
  "summary": "Brief overall assessment",
  "danger_zone": [
    {{
      "id": "dz1",
      "title": "Short title",
      "description": "What will break and why",
      "severity": "critical",
      "file_path": "src/app.js",
      "line_start": 10,
      "line_end": 15,
      "what_breaks": "Specific functionality that will fail",
      "reproduction_steps": "How to trigger the issue",
      "suggested_fix": "Code or approach to fix",
      "impact": "critical"
    }}
  ],
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
- **ALWAYS check for DANGER ZONE issues FIRST before categorizing anything else**
- Syntax errors, compilation errors, and runtime crashes = DANGER ZONE (never dummy/medium)
- Invalid code like `l;asd'` or `undefined_var` = DANGER ZONE critical severity
- Only flag as danger zone if the issue will actually break the application
- Dummy improvements = only safe cosmetic changes (unused imports, typos in comments, formatting)
- Confidence >0.85 required for dummy category
- When in doubt between dummy and medium, choose medium
- When in doubt between medium and danger, choose danger if it could break
- CRITICAL: Properly escape JSON strings:
  - Use \\n for newlines (not literal newlines)
  - Escape double quotes as \\"
  - Escape backslashes as \\\\
  - No literal newlines or tabs in string values
- Ensure all JSON is properly formatted and parseable"""

        # Build prompt
        user_prompt = self._build_user_prompt(pr_info, diff, files, None)
        user_prompt += """

Provide your analysis as valid JSON following the format specified above.

CRITICAL JSON FORMATTING RULES:
1. All string values must have properly escaped special characters
2. Use \\n for newlines (never literal line breaks in strings)
3. Use \\" for quotes inside strings
4. Use \\\\ for backslashes
5. Keep descriptions concise to avoid formatting issues
6. Test that your JSON is valid before responding

Return ONLY the JSON object, wrapped in ```json markdown code block."""

        messages = [{"role": "user", "content": user_prompt}]

        # Use prompt caching for system prompt and retry on rate limits
        response = self._call_llm_with_retry(
            model=self.llm_client.model,
            max_tokens=8192,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"}
                }
            ],
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
            if "danger_zone" not in structured_review:
                structured_review["danger_zone"] = []
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
            # Log the full error for debugging
            print(f"JSON Parse Error: {str(e)}")
            print(f"Failed JSON (first 1000 chars): {json_str[:1000]}")
            print(f"Full response (first 2000 chars): {response_text[:2000]}")

            # Fallback: return empty structure with error
            return {
                "summary": f"Error parsing review JSON: {str(e)}. The LLM response may contain improperly escaped strings. Please try generating the review again.",
                "danger_zone": [],
                "dummy_improvements": [],
                "medium_improvements": [],
                "experimental_improvements": [],
                "parse_error": response_text[:1000]
            }
