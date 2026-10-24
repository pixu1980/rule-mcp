---
name: rule-platform-auth
description: >-
  Choose the right authentication strategy for a web app in 2026. Covers server-side sessions vs JWTs, OAuth 2.0/2.1 + OIDC, passkeys/WebAuthn, managed providers, CSRF/XSS hardening, token storage, revocation, and a decision matrix by app archetype.
tags:
  - "platform"
  - "auth"
  - "security"
frameworks: [auth, sessions, jwt, oauth, passkeys]
---

# rule-platform-auth - Authentication Strategy for Web Apps

This skill helps you choose the **right authentication strategy** for your app's shape - not the one a tutorial cargo-culted. It covers the decision framework, implementation patterns, and the production failure modes that backend logs miss.

---

## The Core Framing: Where State Lives vs How It Travels

**These are two orthogonal axes.** Conflating them is why teams adopt JWTs they don't need.

| Axis               | Question                        | Options                                      |
| ------------------ | ------------------------------- | -------------------------------------------- |
| **State location** | Where does auth state live?     | **Server** (sessions) or **Client** (tokens) |
| **Transport**      | How does the credential travel? | **Cookie** or **Authorization header**       |

- A **session** is stateful: server stores the record, client holds an opaque ID - the _hotel keycard_ model
- A **JWT** is stateless: claims are self-contained and signed - the _digital passport_ model
- You can deliver **either** over a cookie or the `Authorization` header. Cookies and headers are transport; sessions and tokens are architecture.

---

## Sessions vs JWTs: The Comparison

| Criterion              | Server-side sessions              | JWT / self-contained tokens                    |
| ---------------------- | --------------------------------- | ---------------------------------------------- |
| Where state lives      | Server (store)                    | Client (signed token)                          |
| Revocation             | **Immediate** - delete the record | **Hard** - short TTL + rotation, or deny-list  |
| Scaling                | Needs shared store (e.g. Redis)   | Stateless; no per-request lookup               |
| Credential size        | ~32-byte opaque ID                | Often 800+ bytes of claims per request         |
| Primary attack surface | **CSRF** (cookies auto-sent)      | **XSS** (token theft from JS-readable storage) |
| Best fit               | Server-rendered monolith          | API-first, SPA, mobile, microservices          |

> The size contrast in one line: a session cookie carries ~32 bytes and requires a lookup; a JWT carries claims inline (often 800+ bytes on every request) and skips the lookup. You're trading bandwidth and revocation latency for a store.

---

## Sessions: The Default for Server-Rendered Apps

For a server-rendered monolith, start with **server-side sessions** in a signed, `HttpOnly`, `Secure`, `SameSite` cookie.

### Why Sessions First

- Simplest correct option
- Instant revocation (delete the record)
- No auth state in JavaScript
- Logout = single server-side delete

### Implementation Pattern

```js
// Node.js + Express session pattern
const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { createClient } = require("redis");
const crypto = require("node:crypto");

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const app = express();

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    name: "sid", // Don't use default 'connect.sid'
    secret: process.env.SESSION_SECRET, // High-entropy, rotated
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS cannot read it → blunts XSS exfiltration
      secure: true, // HTTPS only
      sameSite: "lax", // Mitigates CSRF on top-level navigations
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

app.post("/login", async (req, res) => {
  // Verify password with Argon2 first (see below)
  const user = await verifyCredentials(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // Regenerate session ID on login to prevent session fixation
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Session error" });
    req.session.userId = user.id;
    res.json({ ok: true });
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});
```

### Session ID Rules

- Generate with `crypto.randomBytes(32)` - OWASP recommends at least 128 bits of entropy
- Never embed sensitive data in the session ID itself
- Rotate the ID on login (`req.session.regenerate()`) to prevent session fixation
- Set an absolute timeout + idle timeout

### Trade-offs

| Concern     | Mitigation                                                   |
| ----------- | ------------------------------------------------------------ |
| **Scaling** | Shared store (Redis) so any instance can resolve any session |
| **CSRF**    | `SameSite=Lax` + CSRF token with constant-time comparison    |
| **XSS**     | `HttpOnly` flag closes the JS read path                      |

### Password Hashing: Argon2

```js
const argon2 = require("argon2");

// Hash before storage
const hash = await argon2.hash(password, {
  type: argon2.argon2id, // Hybrid: resistant to both GPU and side-channel
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
});

// Verify
const valid = await argon2.verify(hash, password);
```

> OWASP Password Storage Cheat Sheet: Argon2id is the current first-choice algorithm.

---

## JWTs & Tokens: Stateless Scaling with a Revocation Cost

Reach for **raw JWTs** only when you have a **concrete stateless-scaling reason**:

- API serving multiple client types
- Microservices passing identity between themselves
- Cross-domain access where cookies are awkward

### The Hard Problem: Revocation

Because a JWT is self-contained, it stays valid until expiry **no matter what your server thinks**. Instant logout requires:

1. **Short-lived access tokens** (15 minutes) + refresh-token rotation, OR
2. A **server-side deny-list** checked on every request - which reintroduces the state JWTs were meant to eliminate

> **RFC 9700** (OAuth 2.0 Security BCP, January 2025) is the ratified anchor for refresh-token rotation and short access-token lifetimes.

### Implementation Pattern

```js
// jwt-utils.js
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const REFRESH_FAMILY_TTL = "30d";

function signAccessToken(userId, roles = []) {
  return jwt.sign({ sub: userId, roles, type: "access" }, process.env.JWT_PRIVATE_KEY, {
    algorithm: "RS256", // Never accept "none"; pin the algorithm
    expiresIn: ACCESS_TTL,
    issuer: "myapp",
    jwtid: crypto.randomUUID(), // Unique ID for potential deny-listing
  });
}

function signRefreshToken(userId, familyId) {
  // Rotation: each refresh creates a new token, invalidates the old one
  // Family: all tokens in the same family are invalidated on theft detection
  return jwt.sign({ sub: userId, type: "refresh", family: familyId }, process.env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: REFRESH_TTL,
    jwtid: crypto.randomUUID(),
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_PUBLIC_KEY, {
    algorithms: ["RS256"], // Pin the algorithm - critical
    issuer: "myapp",
  });
}

// Refresh with rotation + reuse detection
async function rotateRefreshToken(oldToken) {
  let decoded;
  try {
    decoded = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new Error("Invalid refresh token");
  }

  // Check if this token has already been used (reuse detection)
  const wasUsed = await redis.get(`used_refresh:${decoded.jti}`);
  if (wasUsed) {
    // Token reuse = potential theft - invalidate the entire family
    await redis.del(`refresh_family:${decoded.family}`);
    throw new Error("Token reuse detected - family invalidated");
  }

  // Mark this token as used
  await redis.setex(`used_refresh:${decoded.jti}`, 7 * 86400, "1");

  // Issue new pair
  const newAccess = signAccessToken(decoded.sub);
  const newRefresh = signRefreshToken(decoded.sub, decoded.family);

  // Store family reference (for family-wide invalidation if needed)
  await redis.sadd(`refresh_family:${decoded.family}`, decoded.jti);

  return { accessToken: newAccess, refreshToken: newRefresh };
}
```

### Token Storage: The Golden Rule

> 🔴 **Storing JWTs in `localStorage` is an anti-pattern.** Any XSS on your page can read and exfiltrate the token.

| Storage            | XSS-safe?                  | CSRF-safe?                          | Recommendation                          |
| ------------------ | -------------------------- | ----------------------------------- | --------------------------------------- |
| `localStorage`     | ❌ Any XSS reads it        | ✅ Not auto-sent                    | **Never for tokens**                    |
| `sessionStorage`   | ❌ Any XSS reads it        | ✅ Not auto-sent                    | **Never for tokens**                    |
| `HttpOnly` cookie  | ✅ JS can't read           | ❌ Auto-sent (need CSRF protection) | **✅ Recommended**                      |
| In-memory variable | ✅ Not accessible from DOM | ✅ Not auto-sent                    | ✅ For SPAs + silent refresh via cookie |

**The recommended pattern**: store tokens in `HttpOnly` cookies. For SPAs, keep the access token in a short-lived `HttpOnly` cookie and use a silent refresh endpoint. The JavaScript layer never touches the raw token.

```js
// Setting the access-token cookie from the server
res.cookie("access_token", accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/api", // Only sent to API routes
});
```

---

## OAuth 2.0/2.1 + OIDC: Delegated Identity

Use OAuth 2.0 + OpenID Connect when you need:

- "Sign in with Google/GitHub/Microsoft"
- Enterprise SSO (Okta, Azure AD)
- Delegated API access

### The Standard

- **OAuth 2.0**: RFC 6749 - delegated authorization (access tokens)
- **OpenID Connect**: Layers identity on top - tells you _who_ the user is (id_token)
- **OAuth 2.1**: IETF draft-15 (March 2026) - not yet RFC, but direction is settled:
  - PKCE **required** for all authorization code flows
  - Exact redirect-URI matching (no wildcards)
  - Implicit grant and password grant **removed**

> Treat OAuth 2.1 as the target profile. Major identity providers already enforce PKCE and exact URI matching.

### When OAuth is Overkill

For an MVP with **first-party login only** (no social sign-in, no SSO), OAuth adds machinery you won't use: authorization codes, PKCE, scopes, redirect URIs, JWKS key rotation. Start with sessions or a managed provider instead.

### Implementation Pattern (Authorization Code + PKCE)

```js
// server.js - OAuth 2.1-compliant flow
const crypto = require('node:crypto');

// Step 1: Generate PKCE code verifier + challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

// Step 2: Redirect user to authorization endpoint
app.get('/auth/google', (req, res) => {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  // Store verifier + state server-side (Redis or session)
  await redis.setex(`pkce:${state}`, 600, verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.BASE_URL}/auth/google/callback`,
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 3: Handle callback - exchange code for tokens
app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;

  // Verify state to prevent CSRF
  const verifier = await redis.getDel(`pkce:${state}`);
  if (!verifier) return res.status(400).send('Invalid state');

  // Exchange code + verifier for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.BASE_URL}/auth/google/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code_verifier: verifier,
    }),
  });

  const tokens = await tokenResponse.json();

  // Verify the id_token, create/update user, issue your own session/token
  const user = await upsertUserFromOIDC(tokens.id_token);
  // ... issue session or token as per your chosen strategy
});
```

---

## Passkeys & WebAuthn: Phishing-Resistant Authentication

Built on WebAuthn/FIDO2. A passkey is a public/private key pair - the private key stays in device secure hardware and signs a server challenge after local biometric/PIN check.

### Why Passkeys

- **Origin-bound** - cannot be phished (credential never leaves the device)
- **Replay-resistant** - each assertion includes a fresh server challenge
- **No shared secret** - server only stores the public key

### Current State (2026)

- **NCSC (April 2026)**: passkeys should be consumers' first choice across all digital services
- **Support**: Windows, ChromeOS, macOS, Android, iOS, major Linux distros, Chrome, Firefox, Edge, Safari
- **Enrollment UX is the bottleneck**: first-try web enrollment ~49-83% on iOS, only ~25-39% on Windows (vendor benchmark, not neutral statistic)

### Implementation Strategy

```
Passkeys are an opt-in upgrade, not the only door.
Always provide a password fallback.
Design account recovery before launch.
```

### Enrollment Flow

```js
// Server: generate registration challenge
const { generateRegistrationOptions, verifyRegistrationResponse } = require("@simplewebauthn/server");

app.get("/auth/passkey/register-options", async (req, res) => {
  const user = req.session.userId; // Must be already logged in (to bind passkey)

  const options = await generateRegistrationOptions({
    rpName: "MyApp",
    rpID: "myapp.com",
    userName: user.email,
    attestationType: "none", // Don't collect attestation for UX
    authenticatorSelection: {
      residentKey: "required", // Discoverable credential = passkey
      userVerification: "preferred",
    },
  });

  // Store challenge server-side
  req.session.passkeyChallenge = options.challenge;

  res.json(options);
});

// Server: verify registration
app.post("/auth/passkey/register-verify", async (req, res) => {
  const verification = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge: req.session.passkeyChallenge,
    expectedOrigin: "https://myapp.com",
    expectedRPID: "myapp.com",
  });

  if (verification.verified) {
    // Store the credential public key + credential ID
    await db.saveCredential({
      userId: req.session.userId,
      credentialId: verification.registrationInfo.credentialId,
      publicKey: verification.registrationInfo.credentialPublicKey,
      counter: verification.registrationInfo.counter,
    });
    req.session.passkeyChallenge = null; // Consume the challenge
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: "Verification failed" });
  }
});
```

### Authentication Flow

```js
// Server: generate authentication challenge
const { generateAuthenticationOptions, verifyAuthenticationResponse } = require("@simplewebauthn/server");

app.get("/auth/passkey/auth-options", async (req, res) => {
  const options = await generateAuthenticationOptions({
    rpID: "myapp.com",
    userVerification: "preferred",
  });

  req.session.passkeyAuthChallenge = options.challenge;
  res.json(options);
});

app.post("/auth/passkey/auth-verify", async (req, res) => {
  const credential = await db.getCredential(req.body.id);

  const verification = await verifyAuthenticationResponse({
    response: req.body,
    expectedChallenge: req.session.passkeyAuthChallenge,
    expectedOrigin: "https://myapp.com",
    expectedRPID: "myapp.com",
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey,
      counter: credential.counter,
    },
  });

  if (verification.verified) {
    // Update counter to prevent replay
    await db.updateCounter(credential.id, verification.authenticationInfo.newCounter);

    // Issue session / token
    req.session.userId = credential.userId;
    res.json({ ok: true });
  } else {
    res.status(400).json({ error: "Verification failed" });
  }
});
```

### Recovery Design (Must-Have)

- A lost device with no recovery path = locked-out user
- Offer **recovery codes** (one-time use, generated at passkey enrollment)
- Allow **multiple passkeys** per account (phone + laptop + security key)
- Always keep a fallback authentication method active

---

## Auth-as-a-Service: Managed Providers

If authentication **isn't your product**, the most defensible 2026 default is a managed provider.

| Provider          | Best for            | Key features                                          |
| ----------------- | ------------------- | ----------------------------------------------------- |
| **Auth0**         | Enterprise, B2B     | Universal login, organizations, many IdP integrations |
| **Clerk**         | React/Next.js SPAs  | Drop-in `<SignIn/>` components, beautiful default UI  |
| **Supabase Auth** | Supabase stack      | Row-Level Security integration, Postgres-backed       |
| **WorkOS**        | Enterprise SSO      | Admin portal, directory sync, SCIM provisioning       |
| **Stytch**        | Auth infrastructure | Headless SDK, passkeys-first, fraud prevention        |
| **Firebase Auth** | Google Cloud stack  | Free tier generous, tight GCP integration             |

### Decision: Build vs Buy

| Build                      | Buy (Managed Provider)           |
| -------------------------- | -------------------------------- |
| Full control               | Hardened implementation          |
| Zero per-MAU cost          | Someone else's on-call rotation  |
| You own the breach surface | Faster time-to-login             |
| Custom UX requirements     | Drop-in SDKs for common patterns |
| Auth IS your product       | Auth is table stakes             |

> For most greenfield apps, the managed route is the rational starting point - migrate off later if scale or cost demands.

---

## CSRF Protection

Cookies are sent **automatically** on cross-site requests. Combine defenses:

```js
// 1. SameSite cookie attribute (baseline)
cookie: {
  sameSite: "lax";
}

// 2. CSRF token with constant-time comparison
const crypto = require("node:crypto");

function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

function verifyCsrfToken(stored, received) {
  if (!stored || !received) return false;
  return crypto.timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(received, "hex"));
}

// 3. Custom request header requirement (for SPAs)
// Browsers don't allow cross-site requests to set custom headers
// Require X-Requested-With: XMLHttpRequest or similar
```

### Double-Submit Cookie Pattern (for SPAs)

```js
// Server sets a non-HttpOnly CSRF cookie
res.cookie("csrf_token", token, {
  secure: true,
  sameSite: "strict",
  httpOnly: false, // JS can read this one (but it's not the auth token)
});

// Client reads it and sends it back in a header
fetch("/api/data", {
  headers: { "X-CSRF-Token": readCookie("csrf_token") },
});
```

---

## Decision Matrix by App Archetype

| App archetype                            | Start with                                                        | Add when needed                          |
| ---------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| **Server-rendered monolith**             | Server-side sessions (HttpOnly cookie)                            | OIDC for social login; passkeys opt-in   |
| **SPA / mobile / API backend**           | Short-lived access tokens + refresh rotation, in HttpOnly cookies | OIDC for third-party identity            |
| **Needs social login or enterprise SSO** | OAuth 2.0 + OIDC (target 2.1 profile)                             | Sessions or tokens for your own surfaces |
| **Auth isn't your product**              | Managed provider (Auth0/Clerk/Supabase/WorkOS/Stytch)             | - it already bundles the rest            |
| **High-security / consumer-facing**      | Any base above + passkeys                                         | Recovery flow designed up front          |

### The Common Production Architecture (Hybrid)

```
┌─────────────────────────────────────────────────────────┐
│  Server-rendered web app  →  Server-side sessions       │
│  SPA / mobile             →  JWTs (HttpOnly cookies)    │
│  Social sign-in           →  OIDC layered on top        │
│  Phishing-resistant 2FA   →  Passkeys (opt-in)          │
└─────────────────────────────────────────────────────────┘
```

---

## UX Failure Modes (What Backend Logs Miss)

These only surface in the browser - session replay captures them, error logs don't.

| Failure mode                         | Cause                                                              | Detection                                        |
| ------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Silent token-expiry logout loops** | Refresh token expires mid-session, SPA bounces to login repeatedly | Each request returns valid 401 - logs look fine  |
| **Abandoned passkey enrollment**     | User cancels OS WebAuthn prompt                                    | Browser-side only; server never sees the attempt |
| **OAuth redirect dead-ends**         | Mismatched redirect URI or lost state parameter                    | Round-trip happens off your server               |
| **Browser-specific cookie failures** | SameSite/Secure issues on specific browser versions                | Reproduces only on that browser                  |

> Authentication is a **UX surface**, not just a protocol choice. Watch the real flow after launch.

---

## Guards & Best Practices

### Credential Storage

- ✅ Store tokens in `HttpOnly`, `Secure`, `SameSite` cookies
- ✅ Hash passwords with **Argon2id** - never bcrypt for new projects
- ✅ Regenerate session IDs on login (prevent session fixation)
- ❌ Never store JWTs in `localStorage` or `sessionStorage`
- ❌ Never embed sensitive data in session IDs

### JWT Hygiene

- ✅ Pin the algorithm: `algorithms: ['RS256']` - never accept `"none"`
- ✅ Short access-token TTL (15 minutes) + refresh rotation
- ✅ Include `jti` (unique ID) for potential deny-listing
- ✅ Detect refresh-token reuse -> invalidate entire family
- ❌ Never accept tokens without `exp` claim
- ❌ Never use symmetric keys (HS256) for access tokens in distributed systems

### OAuth / OIDC

- ✅ Authorization Code + PKCE for **all** clients
- ✅ Exact redirect-URI matching (no wildcards)
- ✅ Validate `state` parameter against stored value
- ❌ Never use Implicit grant or Resource Owner Password Credentials
- ❌ Never skip PKCE - even for confidential clients

### Passkeys

- ✅ Offer as opt-in upgrade, not the only door
- ✅ Allow multiple passkeys per account
- ✅ Design recovery flow before launch (recovery codes)
- ❌ Don't require passkeys without a fallback

### Sessions

- ✅ Shared store (Redis) for multi-instance deployments
- ✅ Absolute + idle timeouts
- ✅ CSRF token with constant-time comparison
- ❌ Don't use the default session cookie name

---

## Quick Reference

```
┌───────────────────────────────────────────────────────────────────────┐
│  rule-platform-auth - Authentication Strategy                     │
│                                                                       │
│  The two axes:                                                        │
│   State:  Sessions (server)  vs  JWTs (client)                        │
│   Transport:  Cookies  vs  Authorization header                       │
│                                                                       │
│  Decision by archetype:                                               │
│   Monolith     → Server-side sessions + HttpOnly cookies              │
│   SPA/API      → JWTs with refresh rotation, HttpOnly cookies         │
│   Social/SSO   → OAuth 2.1 + OIDC                                     │
│   Not-product  → Managed provider (Auth0/Clerk/Supabase)              │
│   High-sec     → Any base + passkeys (opt-in, with recovery)          │
│                                                                       │
│  Golden rules:                                                        │
│   ✅ Tokens in HttpOnly cookies - NEVER localStorage                  │
│   ✅ Argon2id for passwords                                           │
│   ✅ PKCE for all OAuth flows                                         │
│   ✅ Refresh-token rotation + reuse detection                         │
│   ✅ Design recovery before launch (passkeys)                         │
│                                                                       │
│  Anti-patterns:                                                       │
│   ❌ JWTs in localStorage                                             │
│   ❌ JWTs without a stateless-scaling reason                          │
│   ❌ OAuth for MVP with first-party login only                        │
│   ❌ Passkeys without a password fallback                             │
│   ❌ "none" algorithm in JWT verification                             │
└───────────────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule-mcp](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-backend-security](../rule-backend-security/SKILL.md) - Security skill
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [RFC 9700 - OAuth 2.0 Security BCP](https://datatracker.ietf.org/doc/rfc9700/)
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- [SimpleWebAuthn](https://simplewebauthn.dev/)
