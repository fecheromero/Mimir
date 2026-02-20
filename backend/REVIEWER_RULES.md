# PR Review Guidelines

This file contains the guidelines and rules for reviewing Pull Requests. The AI reviewer will use these rules as context when analyzing PRs.

## Code Quality

- Check for clear, descriptive variable and function names
- Ensure proper error handling and edge case coverage
- Look for potential performance issues or inefficiencies
- Verify that code follows DRY (Don't Repeat Yourself) principles

## Testing

- Verify that tests are included for new features
- Check that edge cases are covered by tests
- Ensure test names clearly describe what they test

## Security

- Look for potential security vulnerabilities (SQL injection, XSS, etc.)
- Check for proper input validation and sanitization
- Verify that sensitive data is not exposed or logged

## Documentation

- Ensure complex logic has explanatory comments
- Check that public APIs are documented
- Verify that README is updated if necessary

## Best Practices

- Check for proper use of async/await patterns
- Verify that dependencies are necessary and up to date
- Look for proper logging and error messages
- Ensure code is maintainable and follows project conventions

## Review Tone

- Be constructive and helpful
- Provide specific suggestions for improvement
- Acknowledge good practices when present
- Focus on significant issues, not nitpicks

---

**Note**: This file is continuously improved based on review experience. The AI may suggest additions to these rules after conducting reviews.
