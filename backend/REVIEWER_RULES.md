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


## Additional Guidelines

## Architecture & Design Patterns

- Verify that new features follow existing project patterns and conventions
- Check for proper separation of concerns between services, API routes, and UI components
- Ensure configuration values (API keys, endpoints, tokens) are externalized and not hardcoded
- Look for proper abstraction layers when integrating third-party services
- Verify that new database/storage schemas include proper indexing for query patterns

## API & Integration Security

- Check that API routes include proper authentication and authorization
- Verify that third-party API credentials are validated before use
- Look for proper token/credential storage (environment variables, secure vaults)
- Verify that webhook endpoints validate the source of incoming requests
- Check that API responses don't leak sensitive information (tokens, internal paths, full error traces)

## Error Handling & User Experience

- Ensure user-facing error messages are informative but don't expose system details
- Verify that loading states and error states are handled in UI components
- Check that async operations have proper timeout handling
- Look for graceful degradation when external services fail
- Ensure that partial failures in multi-step processes are handled appropriately

## Data Validation & Type Safety

- Verify input validation at API boundaries (not just client-side)
- Check that data transformations preserve type safety
- Ensure external API responses are validated before use
- Look for proper handling of optional/nullable fields

---

**Note**: This file is continuously improved based on review experience. The AI may suggest additions to these rules after conducting reviews.
