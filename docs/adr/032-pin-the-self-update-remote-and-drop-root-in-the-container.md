# 032: Pin the self-update remote and drop root in the container

- **Date**: 2026-08-04
- **Status**: accepted
- **Tags**: architecture
- **Author**: rule-architect

## Context

Security audit 2026-08-04 findings 06 and 07. (06) The forced self-update runs on every tool invocation: git fetch, git merge --ff-only @{u}, skill hot-reload, and a scheduled process.exit(0) so a supervisor restarts into the new code. It verified nothing about the source — no remote allowlist, no signature check. Anyone able to write one line into .git/config (a dependency postinstall, a shared machine, a .git baked into an image) obtained code execution in the MCP server at the next tool call with no user interaction; upstream repository compromise had the same effect on every install at once. git merge additionally runs repository-provided hooks when core.hooksPath points inside the tree, as it does in this repo. (07) docker-compose.yml published the port as "37999:37999", which binds the host's 0.0.0.0 and turned the container's deliberate RULE_MCP_HOST=0.0.0.0 into LAN exposure with a bearer token as the only barrier and no lockout on failed auth; the image ran as root on a mutable base tag with dependency install scripts enabled.

## Decision

Verify the update source before any network or merge operation. normalizeRemoteUrl() reduces a remote to host+path (scheme, credentials, port, .git suffix and trailing slash removed) so the scp-style SSH remote this repo actually uses compares equal to the HTTPS URL server.json declares. resolveAllowedRemotes() trusts the repository declared in the shipped server.json, replaced entirely by RULE_MCP_UPDATE_REMOTE (comma-separated) for forks and test sandboxes; there is deliberately no trust-on-first-use fallback, which would trust whoever edited .git/config first. A remote that does not match yields reason "remote-not-allowed" with a loud banner and no fetch. RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1 additionally requires git verify-commit on the upstream commit; it is opt-in because most repositories do not sign and failing closed by default would silently stop every update. Applied updates now write remote and commit range to stderr. For the container: docker-compose publishes 127.0.0.1:37999:37999, the Dockerfile adds USER node before CMD, installs with --ignore-scripts, and sets RULE_MCP_DOCKER=1 so detectInstallType() refuses git self-update inside an image.

## Consequences

Forks and any clone whose remote is not the declared repository stop auto-updating until RULE_MCP_UPDATE_REMOTE is set — a deliberate fail-closed change, surfaced through a banner and rule_tool_update rather than silence. The remote check precedes the dirty-tree check, so a repointed remote is reported even when the tree is dirty; sandboxed tests had to declare their own upstream, and test/self-update.test.mjs plus test/self-update-throttle.test.mjs were updated accordingly. Auto-apply remains forced: pinning the remote closes the local .git/config vector, while upstream compromise is only mitigated by enabling signature verification — making auto-apply opt-in would change a documented product promise and is left as an open decision. The base image is still referenced by tag: no digest was resolvable in the environment that made this change and inventing one would be worse than none. Covered by test/self-update-remote-pin.test.mjs and test/docker-hardening.test.mjs.
