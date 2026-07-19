# API Security Rules

## Scope

These rules apply to backend services and monorepos with backend components. They cover external and internal APIs that must be secured by design to prevent unauthorized access, data leaks, and abuse.

## Authentication & authorization

### OAuth 2.0

- Use **OAuth 2.0 Authorization Code flow** for user-facing applications (frontend and mobile clients).
- Use **OAuth 2.0 Client Credentials flow** for service-to-service communication.
- Token scopes must be clearly defined and limited by access level.

### JWT (JSON Web Tokens)

JWTs must be:

- Signed (`HS256` or `RS256`) and optionally encrypted.
- Short-lived (typically < 15 minutes) with refresh tokens managed securely.

Validate on every request:

- Signature and issuer
- Expiration time (`exp`)
- Audience (`aud`) and subject (`sub`) claims

Never trust a token without full verification. Tokens must be validated at every service boundary.

### API keys

- Use API keys only for system-to-system access without user context, or for legacy integrations.
- API keys must:
  - Be scoped to specific APIs and rate limits.
  - Be rotatable and stored securely (e.g., secrets manager).
  - Never be embedded in frontend code or exposed to the browser.

## Rate limiting & abuse protection

### Rate limiting policies

- Enforce limits per IP, token, or client ID using API gateway or middleware (e.g., `express-rate-limit`, NGINX, Kong).
- Rate limits must differ by user type (e.g., free vs. paid) and API sensitivity (e.g., auth vs. public content).
- Include rate limit headers in all responses:

```
RateLimit-Limit: 1000
RateLimit-Remaining: 200
RateLimit-Reset: 60
```

### Throttling & blocking

- Use exponential backoff or temporary bans after limit breaches.
- Log repeated offenses for later analysis or blacklisting.

## Logging & monitoring

### Logging standards

Log every authenticated request including:

- HTTP method and endpoint
- Status code
- Response time
- Auth context (user ID, client ID)

Never log sensitive data (passwords, tokens, personal information). Use **structured JSON logging** for easier parsing and querying.

### Monitoring & alerts

- Integrate with centralized monitoring tools (e.g., Betterstack, Datadog, Prometheus + Grafana).
- Set up alerts on:
  - Authentication failures
  - Spikes in 4xx/5xx errors
  - Rate limit violations
  - Anomalous traffic patterns

## Best practices

- Apply **CORS restrictions** to limit cross-origin requests.
- Use **HTTPS-only** transport for all APIs (TLS 1.2 or higher).
- Sanitize inputs and validate schema for all request bodies.
- Follow the **least privilege principle** when assigning scopes or API permissions.
- Conduct regular API security scans.
- Include API security checks in automated CI/CD pipelines and manual code reviews.
