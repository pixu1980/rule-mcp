# Orbit Contacts

## Golden rules
- Use React + Electron with the rule-mcp standards.
- Keep CSS external, classless, token-driven, and scoped by semantic elements or `data-part` attributes.
- Keep Electron secure: `contextIsolation: true`, `nodeIntegration: false`, and a minimal `contextBridge` preload.
- Use semantic HTML, keyboard-visible focus, accessible labels, stable keys, and Playwright + axe coverage.
- Use pnpm for package operations.

## Workflow
1. Write or update a behavioral test.
2. Run the test and confirm the expected failure.
3. Implement the smallest change.
4. Run `pnpm test`, `pnpm build`, and the relevant rule-mcp guardrail check.
5. Verify the Electron renderer manually.
