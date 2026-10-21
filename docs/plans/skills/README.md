# Per-skill implementation plans

Reverse alphabetical order, starting from `pix-ui-design-system` as requested.
One plan per skill at `docs/plans/skills/<area>/<skill>.md`.
The router `pix` is not a skill and has no plan.
Status: `pending`, `planned`, `implemented`.
Run order and the four real dependencies: [`DEPENDENCIES.md`](DEPENDENCIES.md).
Live ordering authority, stages, gates and per-plan progress:
[`skills-plan.md`](skills-plan.md).

Total: 81 skills in the catalog, each with a plan, plus one planned skill that
does not exist yet (`pix-platform-mobile`, number 85). Numbers 40, 49 and 54 are
retired: those skills were removed from the catalog and their plans are gone.
New rows append and existing numbers stay put, so the `#NN` references in the
plans keep pointing at the same skill.

| #   | Skill                           | Area       | Plan path                                                      | Status  |
| --- | ------------------------------- | ---------- | -------------------------------------------------------------- | ------- |
| 1   | `pix-ui-design-system`          | ui         | `docs/plans/skills/ui/pix-ui-design-system.md`                 | planned |
| 2   | `pix-ui`                        | ui         | `docs/plans/skills/ui/pix-ui.md`                               | planned |
| 3   | `pix-toolchain-vite`            | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-vite.md`            | planned |
| 4   | `pix-toolchain-turborepo`       | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-turborepo.md`       | planned |
| 5   | `pix-toolchain-rspack`          | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-rspack.md`          | planned |
| 6   | `pix-toolchain-pnpm`            | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-pnpm.md`            | planned |
| 7   | `pix-toolchain-parcel`          | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-parcel.md`          | planned |
| 8   | `pix-toolchain-husky`           | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-husky.md`           | planned |
| 9   | `pix-toolchain-eslint`          | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-eslint.md`          | planned |
| 10  | `pix-toolchain-biome`           | toolchain  | `docs/plans/skills/toolchain/pix-toolchain-biome.md`           | planned |
| 11  | `pix-toolchain`                 | toolchain  | `docs/plans/skills/toolchain/pix-toolchain.md`                 | planned |
| 12  | `pix-styleguide-typescript`     | styleguide | `docs/plans/skills/styleguide/pix-styleguide-typescript.md`    | planned |
| 13  | `pix-styleguide-naming`         | styleguide | `docs/plans/skills/styleguide/pix-styleguide-naming.md`        | planned |
| 14  | `pix-styleguide-markdown`       | styleguide | `docs/plans/skills/styleguide/pix-styleguide-markdown.md`      | planned |
| 15  | `pix-styleguide-json`           | styleguide | `docs/plans/skills/styleguide/pix-styleguide-json.md`          | planned |
| 16  | `pix-styleguide-javascript`     | styleguide | `docs/plans/skills/styleguide/pix-styleguide-javascript.md`    | planned |
| 17  | `pix-styleguide-i18n`           | styleguide | `docs/plans/skills/styleguide/pix-styleguide-i18n.md`          | planned |
| 18  | `pix-styleguide-html`           | styleguide | `docs/plans/skills/styleguide/pix-styleguide-html.md`          | planned |
| 19  | `pix-styleguide-git`            | styleguide | `docs/plans/skills/styleguide/pix-styleguide-git.md`           | planned |
| 20  | `pix-styleguide-file-tree`      | styleguide | `docs/plans/skills/styleguide/pix-styleguide-file-tree.md`     | planned |
| 21  | `pix-styleguide-css`            | styleguide | `docs/plans/skills/styleguide/pix-styleguide-css.md`           | planned |
| 22  | `pix-styleguide-configuration`  | styleguide | `docs/plans/skills/styleguide/pix-styleguide-configuration.md` | planned |
| 23  | `pix-styleguide-comments`       | styleguide | `docs/plans/skills/styleguide/pix-styleguide-comments.md`      | planned |
| 24  | `pix-styleguide-baseline`       | styleguide | `docs/plans/skills/styleguide/pix-styleguide-baseline.md`      | planned |
| 25  | `pix-styleguide-a11y`           | styleguide | `docs/plans/skills/styleguide/pix-styleguide-a11y.md`          | planned |
| 26  | `pix-styleguide`                | styleguide | `docs/plans/skills/styleguide/pix-styleguide.md`               | planned |
| 27  | `pix-process-tdd`               | process    | `docs/plans/skills/process/pix-process-tdd.md`                 | planned |
| 28  | `pix-process-readme`            | process    | `docs/plans/skills/process/pix-process-readme.md`              | planned |
| 29  | `pix-process-npm-release`       | process    | `docs/plans/skills/process/pix-process-npm-release.md`         | planned |
| 30  | `pix-process-code-review`       | process    | `docs/plans/skills/process/pix-process-code-review.md`         | planned |
| 31  | `pix-process-changelog`         | process    | `docs/plans/skills/process/pix-process-changelog.md`           | planned |
| 32  | `pix-process-bmad`              | process    | `docs/plans/skills/process/pix-process-bmad.md`                | planned |
| 33  | `pix-process-ai`                | process    | `docs/plans/skills/process/pix-process-ai.md`                  | planned |
| 34  | `pix-process-adr`               | process    | `docs/plans/skills/process/pix-process-adr.md`                 | planned |
| 35  | `pix-process`                   | process    | `docs/plans/skills/process/pix-process.md`                     | planned |
| 36  | `pix-platform-web`              | platform   | `docs/plans/skills/platform/pix-platform-web.md`               | planned |
| 37  | `pix-platform-library`          | platform   | `docs/plans/skills/platform/pix-platform-library.md`           | planned |
| 38  | `pix-platform-desktop`          | platform   | `docs/plans/skills/platform/pix-platform-desktop.md`           | planned |
| 39  | `pix-platform-auth`             | platform   | `docs/plans/skills/platform/pix-platform-auth.md`              | planned |
| 41  | `pix-platform`                  | platform   | `docs/plans/skills/platform/pix-platform.md`                   | planned |
| 42  | `pix-meta-remix`                | meta       | `docs/plans/skills/meta/pix-meta-remix.md`                     | planned |
| 43  | `pix-meta-nuxt`                 | meta       | `docs/plans/skills/meta/pix-meta-nuxt.md`                      | planned |
| 44  | `pix-meta-next`                 | meta       | `docs/plans/skills/meta/pix-meta-next.md`                      | planned |
| 45  | `pix-meta-astro`                | meta       | `docs/plans/skills/meta/pix-meta-astro.md`                     | planned |
| 46  | `pix-meta`                      | meta       | `docs/plans/skills/meta/pix-meta.md`                           | planned |
| 47  | `pix-frontend-workers`          | frontend   | `docs/plans/skills/frontend/pix-frontend-workers.md`           | planned |
| 48  | `pix-frontend-vue`              | frontend   | `docs/plans/skills/frontend/pix-frontend-vue.md`               | planned |
| 50  | `pix-frontend-template-engine`  | frontend   | `docs/plans/skills/frontend/pix-frontend-template-engine.md`   | planned |
| 51  | `pix-frontend-svelte`           | frontend   | `docs/plans/skills/frontend/pix-frontend-svelte.md`            | planned |
| 52  | `pix-frontend-solidjs`          | frontend   | `docs/plans/skills/frontend/pix-frontend-solidjs.md`           | planned |
| 53  | `pix-frontend-react`            | frontend   | `docs/plans/skills/frontend/pix-frontend-react.md`             | planned |
| 55  | `pix-frontend-angular`          | frontend   | `docs/plans/skills/frontend/pix-frontend-angular.md`           | planned |
| 56  | `pix-frontend`                  | frontend   | `docs/plans/skills/frontend/pix-frontend.md`                   | planned |
| 57  | `pix-devops-testing`            | devops     | `docs/plans/skills/devops/pix-devops-testing.md`               | planned |
| 58  | `pix-devops-observability`      | devops     | `docs/plans/skills/devops/pix-devops-observability.md`         | planned |
| 59  | `pix-devops-docker`             | devops     | `docs/plans/skills/devops/pix-devops-docker.md`                | planned |
| 60  | `pix-devops-deploy-preview`     | devops     | `docs/plans/skills/devops/pix-devops-deploy-preview.md`        | planned |
| 61  | `pix-devops`                    | devops     | `docs/plans/skills/devops/pix-devops.md`                       | planned |
| 62  | `pix-data-validation`           | data       | `docs/plans/skills/data/pix-data-validation.md`                | planned |
| 63  | `pix-data-sqlite`               | data       | `docs/plans/skills/data/pix-data-sqlite.md`                    | planned |
| 64  | `pix-data-sql`                  | data       | `docs/plans/skills/data/pix-data-sql.md`                       | planned |
| 65  | `pix-data-postgresql`           | data       | `docs/plans/skills/data/pix-data-postgresql.md`                | planned |
| 66  | `pix-data-mysql`                | data       | `docs/plans/skills/data/pix-data-mysql.md`                     | planned |
| 67  | `pix-data-mongodb`              | data       | `docs/plans/skills/data/pix-data-mongodb.md`                   | planned |
| 68  | `pix-data-indexed-db`           | data       | `docs/plans/skills/data/pix-data-indexed-db.md`                | planned |
| 69  | `pix-data-duckdb`               | data       | `docs/plans/skills/data/pix-data-duckdb.md`                    | planned |
| 70  | `pix-data`                      | data       | `docs/plans/skills/data/pix-data.md`                           | planned |
| 71  | `pix-backend-workers`           | backend    | `docs/plans/skills/backend/pix-backend-workers.md`             | planned |
| 72  | `pix-backend-security`          | backend    | `docs/plans/skills/backend/pix-backend-security.md`            | planned |
| 73  | `pix-backend-node`              | backend    | `docs/plans/skills/backend/pix-backend-node.md`                | planned |
| 74  | `pix-backend-nestjs`            | backend    | `docs/plans/skills/backend/pix-backend-nestjs.md`              | planned |
| 75  | `pix-backend-hono`              | backend    | `docs/plans/skills/backend/pix-backend-hono.md`                | planned |
| 76  | `pix-backend-graphql`           | backend    | `docs/plans/skills/backend/pix-backend-graphql.md`             | planned |
| 77  | `pix-backend-fastify`           | backend    | `docs/plans/skills/backend/pix-backend-fastify.md`             | planned |
| 78  | `pix-backend-express`           | backend    | `docs/plans/skills/backend/pix-backend-express.md`             | planned |
| 79  | `pix-backend`                   | backend    | `docs/plans/skills/backend/pix-backend.md`                     | planned |
| 80  | `pix-ai-prompting`              | ai         | `docs/plans/skills/ai/pix-ai-prompting.md`                     | planned |
| 81  | `pix-ai-evals`                  | ai         | `docs/plans/skills/ai/pix-ai-evals.md`                         | planned |
| 82  | `pix-ai-context-engineering`    | ai         | `docs/plans/skills/ai/pix-ai-context-engineering.md`           | planned |
| 83  | `pix-ai-agent-architecture`     | ai         | `docs/plans/skills/ai/pix-ai-agent-architecture.md`            | planned |
| 84  | `pix-ai`                        | ai         | `docs/plans/skills/ai/pix-ai.md`                               | planned |
| 85  | `pix-platform-mobile`           | platform   | `docs/plans/skills/platform/pix-platform-mobile.md`            | planned |
