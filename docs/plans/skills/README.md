# Per-skill implementation plans

Reverse alphabetical order, starting from `rule-ui-design-system` as requested.
One plan per skill at `docs/plans/skills/<area>/<skill>.md`.
The router `rule` is not a skill and has no plan.
Status: `pending`, `planned`, `implemented`.
Run order and the four real dependencies: [`DEPENDENCIES.md`](DEPENDENCIES.md).

Total: 81 skills in the catalog, and 83 plan rows: number 85 is the planned
`rule-platform-mobile` skill, which does not exist yet. Numbers 40, 49 and 54 are
retired: those skills were removed from the catalog and their plans are gone.
New rows append and existing numbers stay put, so the `#NN` references in the
plans keep pointing at the same skill.

| #   | Skill                           | Area       | Plan path                                                      | Status  |
| --- | ------------------------------- | ---------- | -------------------------------------------------------------- | ------- |
| 1   | `rule-ui-design-system`          | ui         | `docs/plans/skills/ui/rule-ui-design-system.md`                 | planned |
| 2   | `rule-ui`                        | ui         | `docs/plans/skills/ui/rule-ui.md`                               | planned |
| 3   | `rule-toolchain-vite`            | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-vite.md`            | planned |
| 4   | `rule-toolchain-turborepo`       | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-turborepo.md`       | planned |
| 5   | `rule-toolchain-rspack`          | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-rspack.md`          | planned |
| 6   | `rule-toolchain-pnpm`            | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-pnpm.md`            | planned |
| 7   | `rule-toolchain-parcel`          | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-parcel.md`          | planned |
| 8   | `rule-toolchain-husky`           | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-husky.md`           | planned |
| 9   | `rule-toolchain-eslint`          | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-eslint.md`          | planned |
| 10  | `rule-toolchain-biome`           | toolchain  | `docs/plans/skills/toolchain/rule-toolchain-biome.md`           | planned |
| 11  | `rule-toolchain`                 | toolchain  | `docs/plans/skills/toolchain/rule-toolchain.md`                 | planned |
| 12  | `rule-styleguide-typescript`     | styleguide | `docs/plans/skills/styleguide/rule-styleguide-typescript.md`    | planned |
| 13  | `rule-styleguide-naming`         | styleguide | `docs/plans/skills/styleguide/rule-styleguide-naming.md`        | planned |
| 14  | `rule-styleguide-markdown`       | styleguide | `docs/plans/skills/styleguide/rule-styleguide-markdown.md`      | planned |
| 15  | `rule-styleguide-json`           | styleguide | `docs/plans/skills/styleguide/rule-styleguide-json.md`          | planned |
| 16  | `rule-styleguide-javascript`     | styleguide | `docs/plans/skills/styleguide/rule-styleguide-javascript.md`    | planned |
| 17  | `rule-styleguide-i18n`           | styleguide | `docs/plans/skills/styleguide/rule-styleguide-i18n.md`          | planned |
| 18  | `rule-styleguide-html`           | styleguide | `docs/plans/skills/styleguide/rule-styleguide-html.md`          | planned |
| 19  | `rule-styleguide-git`            | styleguide | `docs/plans/skills/styleguide/rule-styleguide-git.md`           | planned |
| 20  | `rule-styleguide-file-tree`      | styleguide | `docs/plans/skills/styleguide/rule-styleguide-file-tree.md`     | planned |
| 21  | `rule-styleguide-css`            | styleguide | `docs/plans/skills/styleguide/rule-styleguide-css.md`           | planned |
| 22  | `rule-styleguide-configuration`  | styleguide | `docs/plans/skills/styleguide/rule-styleguide-configuration.md` | planned |
| 23  | `rule-styleguide-comments`       | styleguide | `docs/plans/skills/styleguide/rule-styleguide-comments.md`      | planned |
| 24  | `rule-styleguide-baseline`       | styleguide | `docs/plans/skills/styleguide/rule-styleguide-baseline.md`      | planned |
| 25  | `rule-styleguide-a11y`           | styleguide | `docs/plans/skills/styleguide/rule-styleguide-a11y.md`          | planned |
| 26  | `rule-styleguide`                | styleguide | `docs/plans/skills/styleguide/rule-styleguide.md`               | planned |
| 27  | `rule-process-tdd`               | process    | `docs/plans/skills/process/rule-process-tdd.md`                 | planned |
| 28  | `rule-process-readme`            | process    | `docs/plans/skills/process/rule-process-readme.md`              | planned |
| 29  | `rule-process-npm-release`       | process    | `docs/plans/skills/process/rule-process-npm-release.md`         | planned |
| 30  | `rule-process-code-review`       | process    | `docs/plans/skills/process/rule-process-code-review.md`         | planned |
| 31  | `rule-process-changelog`         | process    | `docs/plans/skills/process/rule-process-changelog.md`           | planned |
| 32  | `rule-process-bmad`              | process    | `docs/plans/skills/process/rule-process-bmad.md`                | planned |
| 33  | `rule-process-ai`                | process    | `docs/plans/skills/process/rule-process-ai.md`                  | planned |
| 34  | `rule-process-adr`               | process    | `docs/plans/skills/process/rule-process-adr.md`                 | planned |
| 35  | `rule-process`                   | process    | `docs/plans/skills/process/rule-process.md`                     | planned |
| 36  | `rule-platform-web`              | platform   | `docs/plans/skills/platform/rule-platform-web.md`               | planned |
| 37  | `rule-platform-library`          | platform   | `docs/plans/skills/platform/rule-platform-library.md`           | planned |
| 38  | `rule-platform-desktop`          | platform   | `docs/plans/skills/platform/rule-platform-desktop.md`           | planned |
| 39  | `rule-platform-auth`             | platform   | `docs/plans/skills/platform/rule-platform-auth.md`              | planned |
| 41  | `rule-platform`                  | platform   | `docs/plans/skills/platform/rule-platform.md`                   | planned |
| 42  | `rule-meta-remix`                | meta       | `docs/plans/skills/meta/rule-meta-remix.md`                     | planned |
| 43  | `rule-meta-nuxt`                 | meta       | `docs/plans/skills/meta/rule-meta-nuxt.md`                      | planned |
| 44  | `rule-meta-next`                 | meta       | `docs/plans/skills/meta/rule-meta-next.md`                      | planned |
| 45  | `rule-meta-astro`                | meta       | `docs/plans/skills/meta/rule-meta-astro.md`                     | planned |
| 46  | `rule-meta`                      | meta       | `docs/plans/skills/meta/rule-meta.md`                           | planned |
| 47  | `rule-frontend-workers`          | frontend   | `docs/plans/skills/frontend/rule-frontend-workers.md`           | planned |
| 48  | `rule-frontend-vue`              | frontend   | `docs/plans/skills/frontend/rule-frontend-vue.md`               | planned |
| 50  | `rule-frontend-template-engine`  | frontend   | `docs/plans/skills/frontend/rule-frontend-template-engine.md`   | planned |
| 51  | `rule-frontend-svelte`           | frontend   | `docs/plans/skills/frontend/rule-frontend-svelte.md`            | planned |
| 52  | `rule-frontend-solidjs`          | frontend   | `docs/plans/skills/frontend/rule-frontend-solidjs.md`           | planned |
| 53  | `rule-frontend-react`            | frontend   | `docs/plans/skills/frontend/rule-frontend-react.md`             | planned |
| 55  | `rule-frontend-angular`          | frontend   | `docs/plans/skills/frontend/rule-frontend-angular.md`           | planned |
| 56  | `rule-frontend`                  | frontend   | `docs/plans/skills/frontend/rule-frontend.md`                   | planned |
| 57  | `rule-devops-testing`            | devops     | `docs/plans/skills/devops/rule-devops-testing.md`               | planned |
| 58  | `rule-devops-observability`      | devops     | `docs/plans/skills/devops/rule-devops-observability.md`         | planned |
| 59  | `rule-devops-docker`             | devops     | `docs/plans/skills/devops/rule-devops-docker.md`                | planned |
| 60  | `rule-devops-deploy-preview`     | devops     | `docs/plans/skills/devops/rule-devops-deploy-preview.md`        | planned |
| 61  | `rule-devops`                    | devops     | `docs/plans/skills/devops/rule-devops.md`                       | planned |
| 62  | `rule-data-validation`           | data       | `docs/plans/skills/data/rule-data-validation.md`                | planned |
| 63  | `rule-data-sqlite`               | data       | `docs/plans/skills/data/rule-data-sqlite.md`                    | planned |
| 64  | `rule-data-sql`                  | data       | `docs/plans/skills/data/rule-data-sql.md`                       | planned |
| 65  | `rule-data-postgresql`           | data       | `docs/plans/skills/data/rule-data-postgresql.md`                | planned |
| 66  | `rule-data-mysql`                | data       | `docs/plans/skills/data/rule-data-mysql.md`                     | planned |
| 67  | `rule-data-mongodb`              | data       | `docs/plans/skills/data/rule-data-mongodb.md`                   | planned |
| 68  | `rule-data-indexed-db`           | data       | `docs/plans/skills/data/rule-data-indexed-db.md`                | planned |
| 69  | `rule-data-duckdb`               | data       | `docs/plans/skills/data/rule-data-duckdb.md`                    | planned |
| 70  | `rule-data`                      | data       | `docs/plans/skills/data/rule-data.md`                           | planned |
| 71  | `rule-backend-workers`           | backend    | `docs/plans/skills/backend/rule-backend-workers.md`             | planned |
| 72  | `rule-backend-security`          | backend    | `docs/plans/skills/backend/rule-backend-security.md`            | planned |
| 73  | `rule-backend-node`              | backend    | `docs/plans/skills/backend/rule-backend-node.md`                | planned |
| 74  | `rule-backend-nestjs`            | backend    | `docs/plans/skills/backend/rule-backend-nestjs.md`              | planned |
| 75  | `rule-backend-hono`              | backend    | `docs/plans/skills/backend/rule-backend-hono.md`                | planned |
| 76  | `rule-backend-graphql`           | backend    | `docs/plans/skills/backend/rule-backend-graphql.md`             | planned |
| 77  | `rule-backend-fastify`           | backend    | `docs/plans/skills/backend/rule-backend-fastify.md`             | planned |
| 78  | `rule-backend-express`           | backend    | `docs/plans/skills/backend/rule-backend-express.md`             | planned |
| 79  | `rule-backend`                   | backend    | `docs/plans/skills/backend/rule-backend.md`                     | planned |
| 80  | `rule-ai-prompting`              | ai         | `docs/plans/skills/ai/rule-ai-prompting.md`                     | pending |
| 81  | `rule-ai-evals`                  | ai         | `docs/plans/skills/ai/rule-ai-evals.md`                         | pending |
| 82  | `rule-ai-context-engineering`    | ai         | `docs/plans/skills/ai/rule-ai-context-engineering.md`           | pending |
| 83  | `rule-ai-agent-architecture`     | ai         | `docs/plans/skills/ai/rule-ai-agent-architecture.md`            | pending |
| 84  | `rule-ai`                        | ai         | `docs/plans/skills/ai/rule-ai.md`                               | pending |
| 85  | `rule-platform-mobile`           | platform   | `docs/plans/skills/platform/rule-platform-mobile.md`            | planned |
