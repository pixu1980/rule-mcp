# Spec 09: Security & Compliance

## Goal

Document security requirements, threat model, and compliance considerations.

## Content Security Policy

**[CSP_POLICY]**

## Authentication

**[AUTH_MECHANISM]**

## Input Validation

**[DATA_VALIDATION]**

## Dependency Security

**[DEPENDENCY_SCANNING]**

## HTTP Security Headers

**[SECURITY_HEADERS]**

## Data Portability

**[DATA_EXPORT]**

## Security Checklist

- [ ] CSP configured and tested
- [ ] All user input validated at domain boundary
- [ ] Dependencies scanned for vulnerabilities (CI gate)
- [ ] Security headers set on all responses
- [ ] No secrets in source code (use env vars or config files)
- [ ] Data export/import mechanism available to users
- [ ] Telemetry/analytics opt-in, never on by default

## Stack-Specific Concerns

For **[STACK_NAME]** (**[STACK_VERSION]**), additional considerations:

- **XSS prevention**: [Stack-specific guidance - e.g., React escapes by default in JSX, but dangerouslySetInnerHTML must be audited]
- **Dependency audit**: Run **[STACK_PKG_MANAGER]** audit in CI pipeline
- **Build-time secrets**: Never bundle secrets; use server-side injection or runtime config

## Incident Response

1. Identify: Monitor error tracking for unusual patterns
2. Contain: Roll back to last known-good deployment
3. Analyze: Root cause analysis
4. Fix: Deploy patch with tests
5. Verify: Confirm fix in production

## References

- References Spec 05 (Architecture) for data storage and IPC security
- References Spec 06 (Quality) for robustness requirements
- References Spec 08 (Deployment) for security headers and CSP deployment
