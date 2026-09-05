---
name: rule-backend-api-design
description: >-
  Use when defining REST API endpoints, HTTP methods, versioning, or request/response contracts. Covers OpenAPI documentation, pagination, filtering, and sorting.
tags:
  - "backend"
  - "api"
  - "design"
  - "rest"
  - "pagination"
  - "errors"
  - "status-codes"
  - "idempotency"
  - "versioning"
  - "filters"
  - "openapi"
frameworks: [node, api]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Backend API Design

## Prerequisites

Before applying this skill, load the rule **`api-security`** to ensure API authentication, authorization, and security hardening are properly implemented.

## Step 1 - Define resource model

- Use resource-oriented paths with plural nouns (for example: `/users`, `/orders/{id}`).
- Use kebab-case for multi-word resources.
- Keep nesting shallow (max 3 levels).
- Do **not** expose raw database structures - design APIs around real user interactions and flows (e.g., sign-up, complete a purchase, view dashboard).
- APIs must be intuitive for frontend and mobile developers, with clear relationships and logical workflows.

## Step 2 - Map operations to HTTP verbs

| Method          | Purpose                        |
| --------------- | ------------------------------ |
| `GET`           | Retrieve one or more resources |
| `POST`          | Create new data                |
| `PUT` / `PATCH` | Update existing data           |
| `DELETE`        | Remove data                    |

## Step 3 - Apply versioning and transport policy

- Version APIs in URI paths (for example: `/v1/users`).
- Use HTTPS only.
- Maintain backward compatibility across versions.
- Deprecated versions must follow a clear deprecation policy and be communicated to clients before removal.

## Step 4 - Define request/query conventions

- JSON request/response only. Client must include header: `Content-Type: application/json`.
- Use query params for filtering: `/posts?tags=javascript`.
- Use `sort` param with `field:order` syntax: `/posts?sort=author:asc,datepublished:desc`.
- Date filters must use **ISO 8601 UTC** format: `YYYY-MM-DDTHH:mm:ssZ` (example: `/posts?from=2024-01-01T12:30:00Z`).
- Pagination with `offset` and `limit`. Backend must apply default values if not provided.
- Include `Accept-Language` header for translated responses: `Accept-Language: en-US` or `it-IT`.

## Step 5 - Define response and error contracts

### HTTP status codes

| Code                        | Meaning                                |
| --------------------------- | -------------------------------------- |
| `200 OK`                    | Successful response                    |
| `201 Created`               | Resource successfully created          |
| `204 No Content`            | Operation successful, no response body |
| `400 Bad Request`           | Invalid data or validation error       |
| `401 Unauthorized`          | Missing or invalid authentication      |
| `402 Payment Required`      | Unpaid or missing payment info         |
| `403 Forbidden`             | Authenticated but unauthorized         |
| `404 Not Found`             | Resource does not exist                |
| `500 Internal Server Error` | Unhandled backend issue                |

### Pagination responses

- Return results as an array in the response body.
- Include the `X-Total-Count` header with the total number of results.

### Error responses

Use this consistent structure:

```json
{
  "statusCode": 400,
  "correlation-id": "abc123def456",
  "errors": [
    {
      "code": 101,
      "message": "EMAIL_ALREADY_REGISTERED"
    }
  ]
}
```

- Always return specific error codes and localized message keys.
- Use the `Accept-Language` header to serve translated error messages when needed.
- Avoid generic `500` responses unless the error is truly unexpected.

## Step 6 - Document with OpenAPI

- Maintain OpenAPI v3 spec for every endpoint.
- Include request/response schemas, examples, and status codes.
- Update docs in the same change as API updates.

## Idempotency: the same request twice, the same outcome once

The table above says to accept an `Idempotency-Key` on anything that costs money
or sends mail. This is what accepting it means, because the header alone changes
nothing.

**Assume every write will arrive twice.** A client retries on a timeout without
knowing whether the first attempt landed, a proxy replays, a user double-clicks,
a queue redelivers after a worker died between doing the work and acknowledging
it. At-least-once is what the network gives you; exactly-once is something the
server constructs.

The mechanism, in order:

1. **The client generates the key**, one per logical operation, and reuses it on
   every retry of that operation. A key the server generates cannot help, since
   the retry would get a new one.
2. **The server records the key before doing the work**, in the same transaction
   as the work where possible, or in a table with a unique constraint on the key.
   The constraint is what makes the second attempt lose a race rather than
   duplicate the effect.
3. **A repeat returns the first response**, status and body, rather than
   reprocessing. That is the contract: same key, same outcome, however many
   times it arrives.
4. **A key is scoped and expires.** Scope it to the caller and the operation, so
   two clients cannot collide, and give it a documented lifetime long enough to
   outlive any retry policy pointed at you.

Two cases worth stating explicitly:

- **A key reused with a different body is a client bug, not a duplicate.** Reject
  it with a conflict rather than silently returning the earlier answer, or a
  mistake becomes a silently dropped write.
- **An in-flight repeat is not a duplicate yet.** If the first attempt has not
  finished, the honest answer is that it is in progress, not a fabricated success.

Idempotency is cheaper than distributed transactions and covers most of what
people reach for them to solve. Where a workflow spans services and a later step
can fail, the compensating action, undoing what earlier steps did, belongs in
the design from the start rather than being added after the first partial
failure.

## Checklist

- [ ] Resource-based, plural noun paths (no raw DB structures exposed)
- [ ] API designed around user flows, intuitive for frontend/mobile devs
- [ ] HTTPS only
- [ ] Versioned endpoints (URI-based) with deprecation policy
- [ ] JSON-only requests and responses with `Content-Type: application/json`
- [ ] Pagination with `offset`/`limit` and `X-Total-Count` header
- [ ] Filtering via query params
- [ ] Sorting with `field:order` syntax
- [ ] ISO-8601 UTC date filters
- [ ] `Accept-Language` header supported for localization
- [ ] Structured error responses with correlation-id and specific codes
- [ ] OpenAPI v3 documentation updated

## API Client Pattern (from rule-backend)

```javascript
// src/lib/api-client.js
const BASE_URL = process.env.API_BASE_URL;

export async function apiFetch(path, options = {}) {
  const res = await fetch(${BASE_URL}${path}, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}

// Usage: apiFetch("/users/42")
```

## OpenAPI Spec Integration

```yaml
# api/openapi.yaml
openapi: "3.1.0"
info:
  title: My API
  version: "1.0.0"
servers:
  - url: https://api.example.com/v1
```

Link the OpenAPI spec for type generation and documentation.
API-first design: define the contract before implementation.
---

## What frustrates API consumers: response shape, errors, status codes, pagination, idempotency

The steps above produce a correct API. These are the ten things that make a
correct API unpleasant, and they share one root: it was designed for the
server's convenience rather than the client's experience.

| Mistake                                       | What the client experiences                         | Fix                                                           |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| Every endpoint invents its own response shape | Custom parsing per endpoint, no shared client code  | One envelope, everywhere, including errors                    |
| Errors written for nobody (`{"error": true}`) | Cannot tell the user anything, cannot branch on it  | Stable machine `code`, human `message`, the offending `field` |
| Status codes that lie (200 on failure)        | Retry logic, monitoring and caches all mislead      | The code states what happened; the body explains              |
| Pagination as an afterthought                 | Results jump, duplicate or vanish while paging      | Cursor pagination for feeds, and say whether more exists      |
| Filters and sorting different per endpoint    | Every screen relearns the query language            | One convention: same parameter names, same operators          |
| Confusing auth failures                       | Hours lost to "is my token wrong or my permission?" | 401 means authenticate, 403 means not allowed, and say which  |
| Breaking changes shipped quietly              | Clients break in production with no warning         | Additive by default; a rename is a new version                |
| Documentation with only the happy path        | Every error is discovered in production             | Document failures, limits, and what retry is safe             |
| No idempotency                                | A double-click charges twice                        | `Idempotency-Key` on anything that costs money or sends mail  |
| No operational context                        | Support cannot correlate a report with a log line   | Request id in every response, echoed in logs                  |

### Before shipping an endpoint

- Does it use the same response and error envelope as its neighbors?
- Does the status code match what actually happened, on every path?
- Is the list paginated, and does the client learn whether more exists?
- Do filters and sorting use the project convention, not this endpoint's?
- Does a permission failure say whether to re-authenticate or give up?
- Is this additive for existing clients, or does it need a version?
- Are the failure modes documented, not only the success case?
- If it charges, sends or creates, is a repeat call safe?
- Does the response carry a request id support can search for?

Predictable beats elegant. An API is good when a developer can trust the shape,
the errors, the status codes and the next release.

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-backend](../rule-backend/SKILL.md) - Backend skill index
- [rule-backend-security](../rule-backend-security/SKILL.md) - Security hardening
