# 031: Interview servers enforce same-origin and own their process lifecycle

- **Date**: 2026-08-04
- **Status**: accepted
- **Tags**: architecture
- **Author**: rule-mcp-architect

## Context

Security audit 2026-08-04 found the two architect interview servers (skills/rule-mcp-architect/assets/context-server.mjs and skills/rule-mcp-architect-web/server.mjs) bind loopback and deliberately send no CORS headers, which stops a hostile page from READING their responses but not from SENDING requests: a cross-origin POST with Content-Type text/plain is a CORS simple request, so no preflight is issued and POST /api/generate runs - writing files into the user's project and, with force:true, overwriting root files. Neither server validated Origin, Sec-Fetch-Site, or Host, leaving CSRF and DNS rebinding open. Separately, src/tools/architect.js spawned the context server, resolved its promise on the first URL line or after a 5s timeout, and never killed the child: every mode=interview call left another HTTP server listening with write access to a project directory, outliving the MCP server, while stdout listeners kept growing a string nobody read. The result was also cached, because rule-mcp-architect was absent from the tool-cache denylist, so a replay handed the user a dead ephemeral port and skipped the spawn entirely.

## Decision

Add skills/rule-mcp-architect/http-guard.mjs - a shared, pure checkLocalRequest()/denyForeignRequest() pair - and apply it to every /api/* request on both servers: Sec-Fetch-Site must be same-origin or none, Origin (when present) must be a loopback origin on the served port, Host must be a loopback authority on the served port. Browser-set headers cannot be forged by page script, so this closes CSRF and DNS rebinding without touching the wizard UI or its duplicated interview.js copies. In src/tools/architect.js, track every child in a registry keyed by target directory: a second call for the same target reuses the running server instead of spawning another, listeners are detached once the URL is found, captured output is capped at 64 KB, each server is killed after a 30-minute lifetime, and exit/SIGINT/SIGTERM stop all of them. spawn uses process.execPath instead of a PATH lookup for "node". rule-mcp-architect joins the tool-cache denylist.

## Consequences

Non-browser clients (curl, tests) still reach the API because they send neither Origin nor Sec-Fetch-Site - anything already executing code on the loopback interface is outside this threat model. A page served from another local port is treated as foreign, which is correct but means an interview UI must be served by the interview server itself. Reuse changes observable behaviour: a second mode=interview call for the same directory returns the existing URL instead of a new one. Interview servers now die with the MCP server rather than lingering, so a user who wants one to outlive the session must start it from the CLI. Covered by test/architect-server-csrf.test.mjs and test/architect-interview-lifecycle.test.mjs.
