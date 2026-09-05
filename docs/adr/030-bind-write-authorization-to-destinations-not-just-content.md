# 030: Bind write authorization to destinations, not just content

- **Date**: 2026-08-04
- **Status**: accepted
- **Tags**: architecture
- **Author**: rule-mcp-architect

## Context

Security audit 2026-08-04 (findings retired; the decisions are recorded here and in ADRs 031-044) found that rule_tool_apply, the only tool that writes files, anchored its path-traversal check to the caller-supplied `path` argument. A call with path:"/" made every destination "inside the project", so the guard could not fail. Containment was pure path.resolve string math, so a symlinked directory inside a real project escaped it. Separately, the rule_tool_gateway receipt hashed only concatenated file contents joined with an in-band "\n---FILE---\n" separator: it never covered file paths (a receipt earned for benign code authorised writing that code to .git/hooks/pre-commit) and the separator made [{a:"X\n---FILE---\nY"}] collide with [{a:"X"},{b:"Y"}]. Guardrails validated WHAT was written and nothing about WHERE.

## Decision

Split write authorization into a validated root, a validated destination, and a path-bound receipt. resolveProjectRoot() refuses the filesystem root, the home directory, and system directories (temp dirs stay allowed for scaffolding). resolveWriteTarget() refuses absolute paths, .. traversal, NUL bytes, destinations that grant code execution or hold credentials (.git, .ssh, .gnupg, .agents, .claude, node_modules, shell rc files, key files), and escapes proven by realpath on the deepest existing ancestor rather than by string comparison. rule_tool_gateway accepts an optional `files` array and issues a receipt over canonicalFilesDigest(files) - a length-prefixed digest of the ordered (path, content) tuples. Receipts record their binding ("files" or legacy "content") and the two are not interchangeable: validateReceipt refuses a path-bound token, and a content-only receipt can only authorise a single-file write.

## Consequences

Multi-file writes now require passing `files` to rule_tool_gateway; a bare `code` string cannot describe more than one destination and is limited to the legacy single-file flow. Writes into .git/, .ssh/, .claude/, .agents/ and shell rc files are refused regardless of guardrail outcome, so any workflow that legitimately needs them must use a different mechanism. An arbitrary project root remains writable by design - that is what the tool is for - so the residual risk is scoped to project trees the caller already names. Digest changes invalidate in-flight receipts, which is harmless given the 5-minute TTL and in-memory store. Covered by test/apply-containment.test.mjs and test/gateway-receipt-paths.test.mjs.
