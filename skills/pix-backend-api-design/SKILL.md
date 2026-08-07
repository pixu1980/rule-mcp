---
name: rule-backend-api-design
description: >-
  Use when defining REST API endpoints, HTTP methods, versioning, or request/response contracts. Covers OpenAPI documentation, pagination, filtering, and sorting.
tags:
  - "backend"
  - "api"
  - "design"
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

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-backend](../rule-backend/SKILL.md) - Backend skill index
- [rule-backend-security](../rule-backend-security/SKILL.md) - Security hardening
