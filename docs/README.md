# pix-galaxy-mcp documentation

This directory is intentionally consolidated into a small handbook. Historical files were merged into the numbered documents below with source markers and SHA-256 hashes so all content remains recoverable.

## Handbook

| File | Purpose |
|------|---------|
| [./01-product-architecture.md](./01-product-architecture.md) | Project mission, architecture, migration notes, and roadmap. This file consolidates the previous analysis/architecture/roadmap docs without dropping source content. |
| [./02-tools-operations.md](./02-tools-operations.md) | MCP tools, plugins, release process, setup, and troubleshooting. This file is the operator handbook. |
| [./03-engineering-guides.md](./03-engineering-guides.md) | Examples, benchmarks, agent instructions, and styleguide comparison notes for contributors. |
| [./04-roadmap-plans.md](./04-roadmap-plans.md) | Execution plans and refactor roadmap consolidated into one dependency-aware planning file. |

## Architecture decisions

- [ADR index](./adr/README.md)
- [Decision summary](./adr/DECISIONS.md)

## Reports

- [Mega review — claude-* compliance & pix router reliability](./reports/claude-compliance-mega-review.md) — full protocol-level audit of every tool/skill/resource/prompt, with reproducible evidence on whether the `pix` router and skill triggers are actually invoked by the model.

## Content preservation manifest

| Original source | Consolidated target | Lines | SHA-256 |
|-----------------|---------------------|-------|---------|
| `docs/ANALYSIS.md` | `docs/01-product-architecture.md` | 282 | `b75589534e7ca82579c14a1a3b749bf0c262a1da701ac9376d4b2d204425bc10` |
| `docs/ARCHITECTURE.md` | `docs/01-product-architecture.md` | 517 | `ff26dcc6d43deceb60d6c5ef1b1f2df1360140acc2a27906f9286e0cad6d47c5` |
| `docs/ROADMAP.md` | `docs/01-product-architecture.md` | 380 | `4d8bb2ac194f3520775d0a8dd66a998d7082021c71b1adbba5d992633f47ab86` |
| `docs/TOOLS.md` | `docs/02-tools-operations.md` | 666 | `c4d991959a0938b689972cd69ddae6462d0985743ae1dbd3dbe879623c3dc8d1` |
| `docs/PLUGINS.md` | `docs/02-tools-operations.md` | 114 | `d891cff9e5d94b939d4287c448a097c56676c17c469212b584110a121ca5c40d` |
| `docs/RELEASE.md` | `docs/02-tools-operations.md` | 174 | `41361dd081e193d34e3005eb81e27066d9096ccd174dabd5493346337d80bed9` |
| `docs/TROUBLESHOOTING.md` | `docs/02-tools-operations.md` | 160 | `666d843d4ba36d77182d0ee73863423c24b690a27c2cf3ce1eb37e0890c68d8b` |
| `docs/pix-galaxy-skills-mcp-setup.md` | `docs/02-tools-operations.md` | 250 | `4ed94562e3aed0fb1d0305ddeaf23d59b7470af515017e29676471526f7ecf63` |
| `docs/EXAMPLES.md` | `docs/03-engineering-guides.md` | 154 | `865f27e746c79f57df52732ac6743b84f98215992a6016704c7b33d196749920` |
| `docs/BENCHMARKS.md` | `docs/03-engineering-guides.md` | 62 | `f8ed63e49e8d26419ebb2dd9cfd2373c391c62b07a82f4c1acf74a80dde2f581` |
| `docs/agent-instructions.md` | `docs/03-engineering-guides.md` | 35 | `00eb6402344fc08184ba3c6254b6a7f5316847921299efcc134b7b57c3f3494a` |
| `docs/rules-vs-styleguides-comparison.md` | `docs/03-engineering-guides.md` | 209 | `b50f384f9cd10fa85dc3397e2997d448b98fc3bac1a0f5f0e4fcf8a33bee90f2` |
| `docs/plans/execution-plan.md` | `docs/04-roadmap-plans.md` | 44 | `4d75abac2a4bda7c62b99dc6e9b00eba5c8c8e559e8960374a3b6de3e786d00b` |
| `docs/plans/refactor-roadmap.md` | `docs/04-roadmap-plans.md` | 260 | `57940d22e47b5a763fc9d275d86380ddb5910f781411053b2858f2eebd99e3d9` |

## Maintenance rules

- Add new long-form docs to one of the numbered handbook files unless a separate file is justified.
- Keep ADRs in `docs/adr/` because they are immutable decision records.
- Preserve source markers when moving content between handbook files.
