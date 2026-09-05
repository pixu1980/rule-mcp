# Tools and operations

## Quick reference

| Tool                     | Answers                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `rule`                | Which skill does this prompt belong to                         |
| `pix_<area>_<skill>` | What does that skill say, in full or for one query             |
| `pix_gateway`        | Route, evidence, guardrail verdict and a write receipt at once |
| `pix_apply`          | Write these files, given a receipt that authorizes them        |
| `pix_check`          | Does this code pass the guardrails                             |
| `pix_search`         | Which sections anywhere mention this                           |
| `pix_component`      | Give me a component of this kind for this framework            |
| `pix_scaffold`       | Give me the config file or project skeleton                    |
| `pix_a11y_report`    | A WCAG-EM conformance report with EARL results                 |
| `pix_detect`         | What framework is this project                                 |
| `pix_fix`            | Does this file tree follow the conventions                     |
| `pix_compress`       | Compress this text without losing the technical content        |
| `pix_stats`          | What did the cache and the compressors actually save           |
| `pix_usage`          | Declare the model usage this server cannot read itself         |
| `pix_process_handon` | What the last handoff claimed, and which claims still hold     |
| `pix_plan`           | Audit, review and plan this project as a named expert role     |
| `pix_plan_docs`      | Keep that role's audit/review/plan documents in sync           |
| `pix_update`         | Update this server from its pinned remote                      |

Every call passes through validation on the way in and on the way out. An
invalid result is an error, never a warning.

## Routing

```
rule prompt="build an accessible dialog with a close button"
```

| Parameter   | Effect                                           |
| ----------- | ------------------------------------------------ |
| `prompt`    | The request, in the words a person would use     |
| `framework` | Forces the domain when the prompt is ambiguous   |
| `path`      | A project root, so the framework can be detected |

Returns the route, its confidence, the sections that matched, ranked
alternatives and the tools worth calling next. When nothing scores well it
returns `unknown` rather than guessing, because a confident wrong route costs
more than an admission.

## Skill tools

One per skill, named from the skill: `rule-frontend-react` becomes
`pix_frontend_react`.

| Mode       | Returns                                              |
| ---------- | ---------------------------------------------------- |
| `full`     | The whole skill                                      |
| `tldr`     | Only the sections that match `query`, ranked by BM25 |
| `search`   | Matching sections with their surrounding context     |
| `check`    | Guardrail results for `code` against that skill      |
| `scaffold` | The skill's scaffold output, where it has one        |

`mode=tldr` with a query is the one to reach for. It returns the sections that
answer the question instead of the file that contains them.

## The gateway and writes

```
pix_gateway prompt="..." files=[{path, content}] framework="react"
```

One call routes, loads the routed skill's evidence, runs the guardrails over
every file separately so a failure names the file it came from, and issues a
receipt when all of them pass.

```
pix_apply files=[{path, content}] receipt="<token>" path="/project"
```

`pix_apply` refuses to write without a receipt, and the receipt is bound to
the exact ordered paths and contents that were checked. Writing different
content, or the same content elsewhere, is refused. Receipts expire after five
minutes. `dryRun` reports what would be written and writes nothing.

## Validation

```
pix_check skill="rule-styleguide-css" code="..." fileName="card.css"
```

| Parameter             | Effect                                             |
| --------------------- | -------------------------------------------------- |
| `skill`               | Which skill's rules apply                          |
| `code`, `fileName`    | What to check, and under what name                 |
| `framework`           | Selects framework-specific rules                   |
| `isComponent`         | Applies the component conventions                  |
| `allowedDependencies` | The only imports the code may use                  |
| `mode`                | `check` for the verdict, `guardrails` for the list |

27 rules are shared by every skill and each area adds its own. `fileName`
matters: several rules key off the extension and the naming convention.

## Generators

`pix_component` returns a component for a kind and a framework, in vanilla,
React, Vue, Svelte, Angular, Solid or Astro. `pix_scaffold` returns a config
file by name or a project skeleton. Both are deterministic: the same request
returns the same bytes, with no model involved.

## Reports

`pix_a11y_report` produces a WCAG-EM conformance report with EARL results
in JSON-LD, from criteria vendored into this repository. It accounts for every
criterion in scope and reports the untested ones rather than omitting them, so
a report can never overstate conformance.

`pix_stats` reports what compression measurably saved, what the cache
replayed and the recomputation a hit avoided, and reads an exported `.flight`
when given one. A replayed result is not a saving - the model reads every token
of it - so the cache is reported apart from the measured total (ADR 079), as is
the routing estimate, which models a read that did not happen.

`pix_usage` is how an agent whose transcript this server cannot read reports
its own token and cost figures. A transcript always wins over a declaration.

`pix_process_handon` reads the newest handoff in `docs/handoff/` and reports
which of its claims still hold: the branch, the commit range, the files it named,
the ADRs it referenced, and the work it left open. It verifies rather than
summarizes (ADR 052) and never re-runs a command the handoff claimed - a path git
never tracked is reported as unverifiable rather than as deleted.

## Review personas

`pix_plan` runs one of the registry's expert roles - security, privacy,
a11y, architect and the rest - over this project. It returns the filled role
template: what to audit, which skills carry the evidence, and the contract for
what the run has to produce. `roles` come from the embedded registry, and a
project or user overlay can replace one by id.

One run owns three documents with stable per-role paths, so a re-run updates in
place instead of littering:

| Document                 | Lifecycle                                                                   |
| ------------------------ | --------------------------------------------------------------------------- |
| `docs/audits/<role>.md`  | Overwritten - evidence only, a snapshot of now                              |
| `docs/reviews/<role>.md` | Merged - new findings appended, closed ones flipped to resolved then pruned |
| `docs/plans/<role>.md`   | Re-derived from the open findings, deleted when none are open               |

`pix_plan_docs` does that bookkeeping. Give it the role and the findings the
run reported; it writes the skeletons and the headers, merges the findings
against what the last run recorded, flips anything no longer reported to
resolved, removes what was already resolved, and deletes the plan when nothing
is open. It writes no content: the evidence, the wording of the findings and
what each step takes are the agent's to fill in.

`node test/docs-scan.mjs` gates the result: every document has to say when it
was written and for which role, a review has to link the audit it was distilled
from, a plan has to link its review, and every step has to name a finding that
review still has open. A plan that outlived its findings fails the gate. Files
in `docs/plans/` with no matching audit or review are ordinary plans and are
left alone.

The catalog itself is managed from the command line:

```sh
rule-mcp roles list                    # every role, with the layer it came from
rule-mcp roles show security           # one role in full; --json for automation
rule-mcp roles new perf-hawk --role "Performance Hawk" --skills "profiling,caching"
rule-mcp roles deprecate architect --by security
```

`new` and `deprecate` write into the user layer through the same validator the
loader uses, so an invalid role is refused rather than left on disk. The
embedded catalog is never edited: deprecating a built-in role writes the user's
own copy of it, which is what the precedence rules are for.

Roles come from two places only: the catalog this server ships, and your own
layer under `~/.rule-mcp/config/roles/`. A project layer existed and is
gone (ADR 082) - it read personas out of a checkout, which made a role
repository content and needed a trust gate to be safe. Nothing this server reads
now comes from a project, so neither the layer nor the gate has a subject.

## MCP resources and prompts

Every skill is also a resource at `rule://skill/<name>`, for clients that
prefer reading over calling. The server registers prompts for the same work,
which agents surface as slash commands.

## Command line

```
rule-mcp <command> [options]
```

| Command          | Does                                                              |
| ---------------- | ----------------------------------------------------------------- |
| `serve`          | Start the server on stdio, Streamable HTTP or SSE                 |
| `daemon`         | Install, start, stop or inspect a background service              |
| `install`        | Write the MCP config and command files for an agent               |
| `uninstall`      | Remove them                                                       |
| `config`         | Print the config snippet without writing it                       |
| `tools`          | List the registered tools, or call one directly                   |
| `doctor`         | Check the installation and report what is wrong                   |
| `skills`         | Install, list or reload skills                                    |
| `adr`            | Create an ADR and regenerate the index                            |
| `handoff`        | Write a session handoff                                           |
| `handon`         | Verify the newest handoff against the repository now              |
| `cache`          | Inspect, verify, export, prime or clear the result cache          |
| `init`           | Prepare a project: its directory under the install, and tokensave |
| `stats`          | Report what was saved, from the local telemetry                   |
| `telemetry`      | Export one `.flight`, read one back, or prune the log             |
| `fix`            | Lint or repair a file tree                                        |
| `agent-commands` | Write the clean `/rule-*` command set                          |
| `a11y-update`    | Refresh the vendored WCAG criteria from the W3C                   |
| `completions`    | Print a shell completion script                                   |
| `update`         | Update this server from its pinned remote                         |

`--help` after any command prints its own options.

## Installing into an agent

```
rule-mcp install --agent claude
```

Supported: Claude, Codex, Cursor, Copilot, Gemini, Cline, Roo, Zed, OpenCode,
Antigravity, Kilo, Kimi, Vibe, VS Code and Pi. `--agent all` fills every
directory that already exists rather than creating new ones.

The MCP configuration is merged into whatever is already there, never replaced,
and the previous file is copied to `<file>.bak` first. Command files that
already exist are left alone unless `--force` is passed.

`--mode` selects `stdio` (default), `daemon` or `docker`. `--dry-run` prints
what would happen. `--json` prints the result for a script to read.

## Running as a daemon

```
rule-mcp serve --transport http --port 37999
rule-mcp daemon start
```

The HTTP transports require a bearer token, generated once per machine and
stored with owner-only permissions. Pass `--ssl-cert` and `--ssl-key` together
for TLS. `daemon install` registers a service with launchd or systemd.

`daemon start` returns: the daemon writes its log through an inherited
descriptor rather than a pipe the starter has to read, so nothing is left
behind holding it open. `daemon stop` sends SIGTERM, waits three seconds, then
SIGKILL, and removes the pid file only once the process is gone - a daemon that
ignored the signal used to keep the port and lose its pid at the same time. It
reports which of the two happened.

A running daemon exits on SIGTERM or SIGINT after closing its sessions, so
`launchctl kill`, `systemctl --user stop` and Ctrl-C all leave nothing
behind.

## Releasing

Releases run from CI on a tag. The pipeline lints, checks formatting, runs the
suite on Linux, macOS and Windows against Node 20 and 22, embeds the skills and
publishes.

`pnpm run ci` is the same suite locally and starts with lint, so an obvious
problem fails in seconds rather than after the tests.

## Troubleshooting

**The agent does not see the tools.** Run `rule-mcp doctor`. It reports
the resolved paths, whether the config was written where the agent reads it,
and whether the entrypoint exists.

**A tool answers with something stale.** The result cache keys on the skill
digests, so an edited skill invalidates what depended on it. `cache verify`
recomputes every entry and reports what no longer reproduces; `cache clear`
empties the local cache and never touches the committed catalog.

**A guardrail fails on code that looks right.** Run the same check on an
untouched file first. Some rules still report on this repository's own source,
so the honest bar is a comparison against that baseline rather than a clean run.

**The daemon refuses a request.** It requires the bearer token. `doctor` prints
where the token lives, and the config snippet from `config --mode daemon`
carries it.

**Skills changed on disk and the server did not notice.** `skills reload`
re-reads them and re-registers the tools.
