# 074: The CLI entry point loads no command handler it has not been asked for

- **Date**: 2026-09-09
- **Status**: accepted
- **Tags**: cli, startup, performance, imports
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

stdio starts the server as a subprocess per client, so startup is paid on every connect rather than once per machine. pnpm report:startup measured a warm --help at 216 ms, of which 185 ms was the static import graph: the command registrars imported their handlers at module load, and the handlers pull the MCP server, both transports, the installer and 105 tool registrations. NODE_COMPILE_CACHE was expected to cut 35 percent of that and measured 2-6 percent.

## Decision

Keep the command and option declarations static, and load the handlers inside their actions. The declarations are what --help renders, so the generated help still cannot drift from what actually parses; the handler graph is what nothing but the chosen command needs. The entry also imports src/cli/_program.js directly instead of the cli barrel, which also exported the TUI and the uninstaller. The compiled code cache is enabled in bin/ before the application graph loads, which is why that load is a dynamic import: a static one is hoisted above the call.

## Consequences

Warm --help fell from 216 ms to 48 ms, and every command still dispatches. listTools() is memoized on a registry generation bumped by register, clear and retain, so the 105-schema conversion is paid once per process instead of once per tools/list. A wall-time assertion would be flaky, so src/cli/**tests**/_startup-graph.test.mjs asserts the property instead: the heavy graph must stay unreachable from the entry through static imports. Cost: a new command must remember to defer its handler, and the test is what enforces it.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
