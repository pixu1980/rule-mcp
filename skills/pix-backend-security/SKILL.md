---
name: rule-backend-security
description: >-
  Use when securing a backend or reviewing authentication. Covers environment variables, Docker images, dependency audits, security headers, rate limiting, CORS, secrets, input validation, and the authentication lifecycle: JWT verification, session revocation, logout, password reset, remembered devices, step-up auth, and CSRF.
tags:
  - "backend"
  - "security"
  - "authentication"
  - "jwt"
  - "session"
  - "logout"
  - "password-reset"
  - "mfa"
  - "csrf"
  - "cookies"
  - "rate-limiting"
  - "step-up"
frameworks: [node, api]
metadata:
  author: rule-engineering
  version: "1.0"
---

# Security Basics

## Secure the surface, in order

Work through the following checklist top to bottom; each item closes one hole that the next ones would otherwise build on.

### 1 · Environment files and variables

Rules for `.env` handling:

- Never commit `.env` files. The repository tracks only `.env.example`, with every variable present and a placeholder value.
- `.gitignore` must exclude `.env` and `.env.*`, while keeping the `.env.example` exception.

Placeholder template:

```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
JWT_SECRET=replace-with-a-secure-random-string
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# External APIs
API_KEY=replace-with-your-api-key
```

Validate everything at boot, before the server accepts a request. A missing or
malformed variable is a startup error, never a runtime surprise:

```ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

The schema lives in `src/initEnv.ts`. From then on, read the exported `env`
object everywhere instead of touching `process.env` directly.

### 2 · Container hardening

- Production images run as a non-root user (UID 1001).
- `.env` files never enter an image; variables arrive through the runtime.
- Multi-stage builds keep dev dependencies and source out of the final image.
- The production stage sets `NODE_ENV=production` and installs with
  `--frozen-lockfile` so the lockfile stays authoritative.

Full Dockerfile patterns live in the **docker** skill
([rule-devops-docker](../rule-devops-docker/SKILL.md)).

### 3 · Dependency hygiene

- Run `pnpm audit` on a cadence and always before a release.
- Packages with known critical vulnerabilities do not ship.
- Declare ranges with caret (`^`) restrictions, never bare wildcards.
- Vet new dependencies against the project ruleset before adding them.

### 4 · HTTP security headers

`helmet` (or `@fastify/helmet`) must be registered early, with the policy you
actually intend - the defaults alone are better than nothing but not a
statement of intent:

```ts
import helmet from "helmet";

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
});
```

### 5 · Rate limiting

Protect the API with a per-client limit that a normal user never hits:

```ts
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
```

Use `express-rate-limit` or `@fastify/rate-limit`; the decision later in this
skill covers how to key limits so a distributed attack cannot bypass them with
many source addresses.

### 6 · CORS

Never default to open. Enumerate the origins the client actually uses:

```ts
import cors from "cors";

await app.register(cors, {
  origin: env.ALLOWED_ORIGINS.split(","),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
});
```

### 7 · Pipeline secrets

- Secrets live in CI/CD variables with masking applied; the pipeline file never
  contains them inline.
- Reference them as variables (`${DEPLOY_TOKEN}`, `${DATABASE_URL}`).
- Mark sensitive variables protected and masked so jobs and logs cannot leak
  them.
- When rotating, update staging and production together to avoid a deploy that
  fails mid-transition.

### 8 · Input validation

Every external input - bodies, query strings, headers - passes through a schema
before it reaches logic. Client-side validation informs, it does not secure:

```ts
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "user"]),
});

app.post("/users", async (request, reply) => {
  const result = createUserSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Validation failed", details: result.error.flatten() });
  }
  // proceed with result.data
});
```

Structured error responses are the contract; internal error details never reach
the client.

## Where each item applies

- **Frontend-only repos**: skip items 4-6 (headers, rate limiting, CORS). Keep
  environment validation and container hardening.
- **Agent repos**: when the agent calls external APIs, keys are validated env
  vars; request/response payloads that carry secrets are never logged.
- **Rotating secrets**: flip staging and production in the same window so a
  deploy never sees half a rotation.

---

## Authentication, JWT and session assumptions attackers want you to make

Authentication fails when an application proves identity once and keeps trusting
that proof after the conditions around it have changed. Every assumption below
sounds reasonable while you are writing the login form.

### A correct password proves the right person is present

It proves someone knows a secret associated with the account. Passwords are
reused, phished, captured by malware and recovered from old breaches, so an
attacker submits exactly what the backend expects without touching your code.
Weigh the attempt, not only the comparison: known-compromised credential,
failure history, whether the behavior matches the account. MFA raises the bar,
but a code delivered over a weak recovery channel or a push prompt with no
number matching can be worn down by repetition.

### Rate limiting one IP address stops credential attacks

Attackers distribute across cloud hosts, proxies, mobile networks and botnets,
each source under your threshold. Meanwhile an office or carrier NAT puts
hundreds of legitimate users behind one address, so a strict IP limit blocks
them and not the attack. Decide on several dimensions - account, device, network,
failure history - and make sure the limit cannot be used to lock someone else out
on purpose. Keep responses uniform: distinct messages for "no such account" and
"wrong password" hand over a list of valid accounts, and so can timing.

### A JWT is trustworthy because it decoded: verify, do not just parse

Header and payload are encoded, not encrypted. Parsing is not verification.
Verify the signature with the algorithm and key **you** chose - never the one the
token header announces - then check issuer, audience, expiry and not-before.

A validly signed token still goes stale: it can carry an admin role that was
revoked, or belong to a suspended account. Short lifetimes narrow the window;
they do not replace a revocation strategy where fast withdrawal matters.

### Logout ends the session everywhere

Clearing a cookie changes the interface. The server may still accept the token,
and a copy taken from another device, an extension or a log file never saw your
logout. Decide explicitly what logout means: this browser, this device, or the
account. Rotate refresh tokens so a replayed old one is detectable, keep
server-side session records if users need to see and revoke their devices.

### A password change invalidates stolen sessions

Password verification and session verification are separate operations, so the
attacker keeps working under the session they already hold. Users change
passwords precisely when they suspect compromise, which makes this the worst
moment to leave old sessions alive.

Revoke on credential change, and on MFA being enabled, disabled or replaced. A
credential version compared during validation gives you this cheaply: bump it
and every older session stops matching.

### Password reset is safer than login

A successful reset is complete account takeover, which makes recovery one of the
most valuable targets in the system, usually with fewer signals and more
authority than the login it bypasses.

Reset tokens: unpredictable, single-use, time-limited, stored hashed like a
password, bound to one account and one operation. An email-verification token
must not work for a reset. Return a neutral response whether or not the account
exists. Reset links leak through history, referrers, analytics and screenshots,
so load nothing third-party on that page and invalidate the token as early as
the flow allows.

### Remembering a device is a convenience

It is a long-lived credential. Random, scoped, revocable, server-side where it
matters, with a real expiry. A remembered device may skip one step for routine
access and must not skip verification before changing recovery details, creating
API keys or moving money. A password reset should drop every remembered device.

### An authenticated session is strong enough for every action

Viewing a dashboard and changing the recovery email are not the same risk, and a
session from three weeks ago proves neither. Step up - password, fresh MFA,
hardware credential - for password changes, recovery updates, payments,
privilege changes, secret creation and deletion. Scope the step-up to the
operation and to a short window; one for billing does not authorize security
changes for the rest of the day. Selectively: reauthenticating every click
teaches people to work around it.

### HttpOnly cookies are secure because scripts cannot read them

`HttpOnly` stops `document.cookie`. It does not stop the browser attaching the
cookie to a request another site triggered, and the attacker never needs to read
it. Set `SameSite` deliberately, `Secure` always, scope domain and path tightly,
and add CSRF tokens or origin validation where the request pattern needs them.
XSS also survives `HttpOnly`: code running in your origin can send authenticated
requests without ever seeing the token.

### A successful login means the account is safe

The credential worked. That is all it says. A login from a new country minutes
after activity elsewhere, a dormant account waking up, a recovery email change
followed immediately by a password and MFA change - each is a successful
authentication and a reason to look closer.

## Choosing a credential: OAuth 2.0 flows, and where an API key is still right

The flow follows from who is present, and there are only two answers worth
using.

| Caller                               | Flow                         | Why                                                                                          |
| ------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| A user, in a browser or a mobile app | Authorization Code with PKCE | The code is exchanged server-side, and PKCE binds the exchange to the client that started it |
| One service calling another, no user | Client Credentials           | There is nobody to redirect, and no consent to collect                                       |

PKCE is not optional on a public client any more, and it costs nothing on a
confidential one, so apply it everywhere. The implicit and password grants are
retired: implicit returns the token through the URL, and the password grant asks
the client to handle the credential the whole protocol exists to keep it away
from. If either appears in a design, the design predates the answer.

Scopes are the part teams skip and then cannot retrofit. Define them narrowly at
the same time as the endpoint (`orders:read`, not `api`), and issue the smallest
set the caller needs. A scope added later is a permission every existing token
already had.

**An API key is a different thing and still has a use.** It identifies a system,
not a person, carries no consent and expresses no delegation, so it fits
machine-to-machine calls with no user context and legacy integrations that
cannot do a token exchange. It is only safe under four conditions:

- Scoped to specific endpoints, with its own rate limit
- Rotatable without downtime, which means supporting two live keys during the overlap
- Stored in a secrets manager, never in a repository and never in an image layer
- Never shipped to a browser or a mobile binary, where it is public by definition

A key in frontend code is a published secret. The workaround is not obfuscation;
it is a backend endpoint that holds the key and enforces what the caller may ask
for.

## Log the authentication surface, and alert on the shape of an attack

Logging is a security control here, not an operations one: it is what turns a
breach into something you can bound. Every authenticated request records the
method and route, the status, the duration, and the auth context - user or
client id, and the token or key id, never its value.

Write it as structured JSON, one object per line, with the fields named the same
way across services. Interpolated log strings are unqueryable at exactly the
moment somebody needs to query them, which is during the incident.

**What must never reach a log:** passwords, tokens, keys, session cookies,
recovery codes, full card numbers, and personal data that has no reason to be
there. Redact at the logger, in one place, rather than trusting every call site;
the leak is always the call site nobody reviewed. Full request and response
bodies are the usual way secrets end up in a log aggregator with a longer
retention than the database.

Alerts belong on rates and shapes rather than on single events, because a single
failed login is noise and a thousand across distinct accounts is credential
stuffing:

- Authentication failures per account, and across accounts, over a short window
- A rise in 401 and 403, which usually means a client broke or a token leaked
- 5xx rate and latency on the auth endpoints specifically
- Rate limit violations, especially concentrated on one token or key
- Traffic from a new region for an established account, and privilege changes

Alert on what a person would act on tonight. Everything else is a dashboard, and
a page nobody can act on trains the team to ignore the one they can.

## The API security contract, applied node-by-node

These rules cover every backend service and every repo that hosts backend
components: external and internal APIs alike are secured by design, because the
cost of retrofitting shows up exactly where nobody budgets for it.

### Authentication and authorization

- User-facing clients (web and mobile) authenticate with the **OAuth 2.0
  authorization code flow**; machine-to-machine calls use the **client
  credentials flow**. No other grant is accepted.
- Token scopes are defined per access level and kept as narrow as the endpoint
  set allows. Least privilege is the default, not the goal.

### JWTs

- Signed with `HS256` or `RS256`, optionally encrypted, and short-lived (well
  under 15 minutes) backed by securely handled refresh tokens.
- Every request validates signature and issuer, checks `exp`, and verifies
  `aud` and `sub` claims. A token is parsed and full-verified at every service
  boundary before it is trusted.

### API keys

- Keys appear only in system-to-system contexts with no user context, or in
  legacy integrations that cannot exchange tokens.
- A key is scoped to specific endpoints with its own rate limit, rotatable
  without downtime, stored in a secrets manager, and never shipped to a browser
  or mobile binary.

### Rate limiting and abuse protection

- Limits are keyed per IP, token, or client id in gateway or middleware
  (`express-rate-limit`, NGINX, Kong) and vary by user tier and by endpoint
  sensitivity (auth endpoints are stricter than public content).
- Responses include the standard headers:

```
RateLimit-Limit: 1000
RateLimit-Remaining: 200
RateLimit-Reset: 60
```

- After repeated breaches: exponential backoff or a temporary ban, with the
  offenses logged for later analysis or blacklisting.

### Logging and monitoring

- Every authenticated request logs method, endpoint, status, response time and
  the auth context (user id or client id).
- Sensitive data - passwords, tokens, personal information - never reaches a
  log. Structured JSON output keeps incident queries possible.
- Centralized monitoring surfaces the signals that matter: authentication
  failures, 4xx/5xx spikes, rate-limit violations, anomalous traffic.

### Best practices, baseline

- CORS is restricted, transport is HTTPS-only (TLS 1.2 or newer).
- Inputs are sanitized and schemas validated for every body.
- Scopes and permissions follow least privilege; security scans run regularly;
  API security checks are part of the CI/CD pipeline and of code review.

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
