# Per-skill implementation plans

Reverse alphabetical order, starting from `rule-mcp-ui-design-system` as requested.
One plan per skill at `docs/plans/skills/<area>/<skill>.md`.
The router `rule-mcp` is not a skill and has no plan.
Status: `pending`, `planned`, `implemented`.
Run order and the four real dependencies: [`DEPENDENCIES.md`](DEPENDENCIES.md).
Live ordering authority, stages, gates and per-plan progress:
[`skills-plan.md`](skills-plan.md).

Total: 81 skills in the catalog, each with a plan, plus three planned skills that
do not exist yet: `rule-mcp-platform-mobile` (85), `rule-mcp-toolchain-electron` (86) and
`rule-mcp-toolchain-tauri` (87). Numbers 40, 49 and 54 are
retired: those skills were removed from the catalog and their plans are gone.
New rows append and existing numbers stay put, so the `#NN` references in the
plans keep pointing at the same skill.

| #   | Skill                               | Area       | Plan path                                                           | Status  |
| --- | ----------------------------------- | ---------- | ------------------------------------------------------------------- | ------- |
| 1   | `rule-mcp-ui-design-system`         | ui         | `docs/plans/skills/ui/rule-mcp-ui-design-system.md`                 | planned |
| 2   | `rule-mcp-ui`                       | ui         | `docs/plans/skills/ui/rule-mcp-ui.md`                               | planned |
| 3   | `rule-mcp-toolchain-vite`           | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-vite.md`            | planned |
| 4   | `rule-mcp-toolchain-turborepo`      | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-turborepo.md`       | planned |
| 5   | `rule-mcp-toolchain-rspack`         | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-rspack.md`          | planned |
| 6   | `rule-mcp-toolchain-pnpm`           | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-pnpm.md`            | planned |
| 7   | `rule-mcp-toolchain-parcel`         | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-parcel.md`          | planned |
| 8   | `rule-mcp-toolchain-husky`          | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-husky.md`           | planned |
| 9   | `rule-mcp-toolchain-eslint`         | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-eslint.md`          | planned |
| 10  | `rule-mcp-toolchain-biome`          | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-biome.md`           | planned |
| 11  | `rule-mcp-toolchain`                | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain.md`                 | planned |
| 12  | `rule-mcp-styleguide-typescript`    | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-typescript.md`    | planned |
| 13  | `rule-mcp-styleguide-naming`        | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-naming.md`        | planned |
| 14  | `rule-mcp-styleguide-markdown`      | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-markdown.md`      | planned |
| 15  | `rule-mcp-styleguide-json`          | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-json.md`          | planned |
| 16  | `rule-mcp-styleguide-javascript`    | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-javascript.md`    | planned |
| 17  | `rule-mcp-styleguide-i18n`          | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-i18n.md`          | planned |
| 18  | `rule-mcp-styleguide-html`          | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-html.md`          | planned |
| 19  | `rule-mcp-styleguide-git`           | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-git.md`           | planned |
| 20  | `rule-mcp-styleguide-file-tree`     | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-file-tree.md`     | planned |
| 21  | `rule-mcp-styleguide-css`           | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-css.md`           | planned |
| 22  | `rule-mcp-styleguide-configuration` | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-configuration.md` | planned |
| 23  | `rule-mcp-styleguide-comments`      | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-comments.md`      | planned |
| 24  | `rule-mcp-styleguide-baseline`      | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-baseline.md`      | planned |
| 25  | `rule-mcp-styleguide-a11y`          | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide-a11y.md`          | planned |
| 26  | `rule-mcp-styleguide`               | styleguide | `docs/plans/skills/styleguide/rule-mcp-styleguide.md`               | planned |
| 27  | `rule-mcp-process-tdd`              | process    | `docs/plans/skills/process/rule-mcp-process-tdd.md`                 | planned |
| 28  | `rule-mcp-process-readme`           | process    | `docs/plans/skills/process/rule-mcp-process-readme.md`              | planned |
| 29  | `rule-mcp-process-npm-release`      | process    | `docs/plans/skills/process/rule-mcp-process-npm-release.md`         | planned |
| 30  | `rule-mcp-process-code-review`      | process    | `docs/plans/skills/process/rule-mcp-process-code-review.md`         | planned |
| 31  | `rule-mcp-process-changelog`        | process    | `docs/plans/skills/process/rule-mcp-process-changelog.md`           | planned |
| 32  | `rule-mcp-process-bmad`             | process    | `docs/plans/skills/process/rule-mcp-process-bmad.md`                | planned |
| 33  | `rule-mcp-process-ai`               | process    | `docs/plans/skills/process/rule-mcp-process-ai.md`                  | planned |
| 34  | `rule-mcp-process-adr`              | process    | `docs/plans/skills/process/rule-mcp-process-adr.md`                 | planned |
| 35  | `rule-mcp-process`                  | process    | `docs/plans/skills/process/rule-mcp-process.md`                     | planned |
| 36  | `rule-mcp-platform-web`             | platform   | `docs/plans/skills/platform/rule-mcp-platform-web.md`               | planned |
| 37  | `rule-mcp-platform-library`         | platform   | `docs/plans/skills/platform/rule-mcp-platform-library.md`           | planned |
| 38  | `rule-mcp-platform-desktop`         | platform   | `docs/plans/skills/platform/rule-mcp-platform-desktop.md`           | planned |
| 39  | `rule-mcp-platform-auth`            | platform   | `docs/plans/skills/platform/rule-mcp-platform-auth.md`              | planned |
| 41  | `rule-mcp-platform`                 | platform   | `docs/plans/skills/platform/rule-mcp-platform.md`                   | planned |
| 42  | `rule-mcp-meta-remix`               | meta       | `docs/plans/skills/meta/rule-mcp-meta-remix.md`                     | planned |
| 43  | `rule-mcp-meta-nuxt`                | meta       | `docs/plans/skills/meta/rule-mcp-meta-nuxt.md`                      | planned |
| 44  | `rule-mcp-meta-next`                | meta       | `docs/plans/skills/meta/rule-mcp-meta-next.md`                      | planned |
| 45  | `rule-mcp-meta-astro`               | meta       | `docs/plans/skills/meta/rule-mcp-meta-astro.md`                     | planned |
| 46  | `rule-mcp-meta`                     | meta       | `docs/plans/skills/meta/rule-mcp-meta.md`                           | planned |
| 47  | `rule-mcp-frontend-workers`         | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend-workers.md`           | planned |
| 48  | `rule-mcp-frontend-vue`             | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend-vue.md`               | planned |
| 50  | `rule-mcp-frontend-template-engine` | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend-template-engine.md`   | planned |
| 51  | `rule-mcp-frontend-svelte`          | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend-svelte.md`            | planned |
| 52  | `rule-mcp-frontend-solidjs`         | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend-solidjs.md`           | planned |
| 53  | `rule-mcp-frontend-react`           | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend-react.md`             | planned |
| 55  | `rule-mcp-frontend-angular`         | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend-angular.md`           | planned |
| 56  | `rule-mcp-frontend`                 | frontend   | `docs/plans/skills/frontend/rule-mcp-frontend.md`                   | planned |
| 57  | `rule-mcp-devops-testing`           | devops     | `docs/plans/skills/devops/rule-mcp-devops-testing.md`               | planned |
| 58  | `rule-mcp-devops-observability`     | devops     | `docs/plans/skills/devops/rule-mcp-devops-observability.md`         | planned |
| 59  | `rule-mcp-devops-docker`            | devops     | `docs/plans/skills/devops/rule-mcp-devops-docker.md`                | planned |
| 60  | `rule-mcp-devops-deploy-preview`    | devops     | `docs/plans/skills/devops/rule-mcp-devops-deploy-preview.md`        | planned |
| 61  | `rule-mcp-devops`                   | devops     | `docs/plans/skills/devops/rule-mcp-devops.md`                       | planned |
| 62  | `rule-mcp-data-validation`          | data       | `docs/plans/skills/data/rule-mcp-data-validation.md`                | planned |
| 63  | `rule-mcp-data-sqlite`              | data       | `docs/plans/skills/data/rule-mcp-data-sqlite.md`                    | planned |
| 64  | `rule-mcp-data-sql`                 | data       | `docs/plans/skills/data/rule-mcp-data-sql.md`                       | planned |
| 65  | `rule-mcp-data-postgresql`          | data       | `docs/plans/skills/data/rule-mcp-data-postgresql.md`                | planned |
| 66  | `rule-mcp-data-mysql`               | data       | `docs/plans/skills/data/rule-mcp-data-mysql.md`                     | planned |
| 67  | `rule-mcp-data-mongodb`             | data       | `docs/plans/skills/data/rule-mcp-data-mongodb.md`                   | planned |
| 68  | `rule-mcp-data-indexed-db`          | data       | `docs/plans/skills/data/rule-mcp-data-indexed-db.md`                | planned |
| 69  | `rule-mcp-data-duckdb`              | data       | `docs/plans/skills/data/rule-mcp-data-duckdb.md`                    | planned |
| 70  | `rule-mcp-data`                     | data       | `docs/plans/skills/data/rule-mcp-data.md`                           | planned |
| 71  | `rule-mcp-backend-workers`          | backend    | `docs/plans/skills/backend/rule-mcp-backend-workers.md`             | planned |
| 72  | `rule-mcp-backend-security`         | backend    | `docs/plans/skills/backend/rule-mcp-backend-security.md`            | planned |
| 73  | `rule-mcp-backend-node`             | backend    | `docs/plans/skills/backend/rule-mcp-backend-node.md`                | planned |
| 74  | `rule-mcp-backend-nestjs`           | backend    | `docs/plans/skills/backend/rule-mcp-backend-nestjs.md`              | planned |
| 75  | `rule-mcp-backend-hono`             | backend    | `docs/plans/skills/backend/rule-mcp-backend-hono.md`                | planned |
| 76  | `rule-mcp-backend-graphql`          | backend    | `docs/plans/skills/backend/rule-mcp-backend-graphql.md`             | planned |
| 77  | `rule-mcp-backend-fastify`          | backend    | `docs/plans/skills/backend/rule-mcp-backend-fastify.md`             | planned |
| 78  | `rule-mcp-backend-express`          | backend    | `docs/plans/skills/backend/rule-mcp-backend-express.md`             | planned |
| 79  | `rule-mcp-backend`                  | backend    | `docs/plans/skills/backend/rule-mcp-backend.md`                     | planned |
| 80  | `rule-mcp-ai-prompting`             | ai         | `docs/plans/skills/ai/rule-mcp-ai-prompting.md`                     | planned |
| 81  | `rule-mcp-ai-evals`                 | ai         | `docs/plans/skills/ai/rule-mcp-ai-evals.md`                         | planned |
| 82  | `rule-mcp-ai-context-engineering`   | ai         | `docs/plans/skills/ai/rule-mcp-ai-context-engineering.md`           | planned |
| 83  | `rule-mcp-ai-agent-architecture`    | ai         | `docs/plans/skills/ai/rule-mcp-ai-agent-architecture.md`            | planned |
| 84  | `rule-mcp-ai`                       | ai         | `docs/plans/skills/ai/rule-mcp-ai.md`                               | planned |
| 85  | `rule-mcp-platform-mobile`          | platform   | `docs/plans/skills/platform/rule-mcp-platform-mobile.md`            | planned |
| 86  | `rule-mcp-toolchain-electron`       | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-electron.md`        | planned |
| 87  | `rule-mcp-toolchain-tauri`          | toolchain  | `docs/plans/skills/toolchain/rule-mcp-toolchain-tauri.md`           | planned |
