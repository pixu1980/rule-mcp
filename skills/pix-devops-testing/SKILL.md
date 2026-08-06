---
name: rule-devops-testing
description: >-
  Use when writing unit or integration tests with Vitest. Covers test configuration, mocking, endpoint testing, component testing, and debugging failures.
tags:
  - "devops"
  - "testing"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Testing

## Test strategy

Choose test layers by risk and feedback speed. Unit tests should cover the
majority of deterministic business behavior; integration tests should verify
contracts between components, services, and persistence; end-to-end tests
should protect a small set of critical user journeys. Coverage thresholds are
a minimum safety net, not evidence that tests exercise meaningful behavior.

- Test observable behavior and domain outcomes, not private implementation.
- Isolate tests and control time, randomness, network, and external services.
- Add a regression test for every production defect where practical.
- Use Playwright or an equivalent browser runner for critical E2E and
  accessibility journeys; keep those tests independent and deterministic.

## Step 1 — Configure Vitest

### Backend / AI Agent

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/types/**", "src/**/*.d.ts"],
      reporter: ["text", "lcov", "cobertura"],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
});
```

### Frontend

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    root: ".",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/types/**", "src/**/*.d.ts", "src/main.tsx"],
      reporter: ["text", "lcov", "cobertura"],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
});
```

Create `tests/setup.ts` for frontend:

```ts
import "@testing-library/jest-dom/vitest";
```

## Step 2 — Write unit tests

### Pattern: Arrange-Act-Assert

```ts
import { describe, expect, it } from "vitest";
import { calculateTotal } from "../../src/services/order-service.js";

describe("calculateTotal", () => {
  it("sums item prices with quantity", () => {
    // Arrange
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ];

    // Act
    const total = calculateTotal(items);

    // Assert
    expect(total).toBe(35);
  });

  it("returns 0 for empty items", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("throws on negative price", () => {
    const items = [{ price: -1, quantity: 1 }];
    expect(() => calculateTotal(items)).toThrow("Price must be non-negative");
  });
});
```

### Pattern: Mocking dependencies

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "../../src/services/user-service.js";
import type { UserRepository } from "../../src/repositories/user-repository.js";

describe("UserService", () => {
  let service: UserService;
  let mockRepo: UserRepository;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as UserRepository;
    service = new UserService(mockRepo);
  });

  it("returns user when found", async () => {
    const user = { id: "1", email: "test@rule-mcp.domain.example" };
    vi.mocked(mockRepo.findById).mockResolvedValue(user);

    const result = await service.getUser("1");

    expect(result).toEqual(user);
    expect(mockRepo.findById).toHaveBeenCalledWith("1");
  });
});
```

## Step 3 — Write integration tests

### Backend: Fastify inject

Test backend APIs.

### Frontend: Component testing

Example:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Counter } from "../../src/components/Counter.js";

describe("Counter", () => {
  it("increments count on click", async () => {
    const user = userEvent.setup();
    render(<Counter initial={0} />);

    await user.click(screen.getByRole("button", { name: /increment/i }));

    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
```

## Step 4 — Run tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

Or use `pnpm` alternatively.

## Edge cases

- **Debugging failing tests**: Run the specific failing test in isolation. Add `console.log` inside the test (allowed in test files by Biome config). Use `it.only()` to focus on one test.
- **Mock reset**: Check that mocks are reset between tests (`beforeEach` with fresh mocks). Stale mocks are the most common cause of flaky tests.
- **Async tests**: Ensure all promises are awaited. Unhandled rejections cause misleading failures.
- **Coverage thresholds**: This skill owns coverage enforcement. Thresholds are configured in `vitest.config.ts` and verified in CI.

## Coverage Gates

### Mandatory thresholds

| Metric     | Minimum |
| ---------- | ------- |
| Statements | 60%     |
| Branches   | 50%     |
| Functions  | 60%     |
| Lines      | 60%     |

These thresholds are non-negotiable. They must be enforced in two places:

1. **Locally** via `vitest.config.ts` — `pnpm test:coverage` (or `pnpm`) fails if below thresholds.
2. **In CI** via `.gitlab-ci.yml` — pipeline fails if coverage check fails.

### Step 1 — Configure local enforcement in vitest.config.ts

The `thresholds` key causes the process to exit with a non-zero code if any threshold is not met:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov', 'cobertura'],
  thresholds: {
    statements: 60,
    branches: 50,
    functions: 60,
    lines: 60,
  },
},
```

Developers run `pnpm test:coverage` (or `pnpm test:coverage`) before pushing. If it fails, they must add tests.

### Step 2 — Configure CI enforcement in .gitlab-ci.yml

Each test job in CI runs `pnpm test:coverage` (or `pnpm test:coverage`) (or the filtered equivalent for monorepos). Since Vitest exits non-zero on threshold failure, the CI job automatically fails.

### Step 3 — Configure coverage reporters

Always configure these three reporters:

- **`text`** — Console output for developers.
- **`lcov`** — For local HTML report viewing (`coverage/lcov-report/index.html`).
- **`cobertura`** — For GitLab merge request integration.

### Step 4 — Set include and exclude paths

### Include

- All source files: `src/**/*.ts` (or `src/**/*.{ts,tsx}` for frontend).

### Exclude

- Type definition files: `src/types/**`, `src/**/*.d.ts`
- Entry points that only bootstrap: `src/main.tsx`, `src/server.ts`
- Generated files

Configure in `vitest.config.ts`:

```ts
coverage: {
  include: ['src/**/*.ts'],
  exclude: ['src/types/**', 'src/**/*.d.ts', 'src/server.ts'],
}
```

### Step 5 — Verify the gate works

After setting up coverage, verify by temporarily raising a threshold and confirming the command fails. Revert the temporary change after verification.

## Edge cases

- **Coverage drops below thresholds**: Identify uncovered lines using `coverage/lcov-report/index.html`. Write targeted tests for uncovered branches and functions.
- **Do not lower thresholds**. Do not add `/* v8 ignore */` comments unless the code is genuinely untestable (e.g., platform-specific fallback).
- **Hard-to-test functions**: Refactor to be more testable — extract pure logic, inject dependencies.

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-devops](../rule-devops/SKILL.md) — DevOps skill index
- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) — Project configuration baseline
