/**
 * @module scripts/reports/census/_areas.data
 *
 * What each skill area and each guardrail family is about, in one line.
 *
 * The areas themselves are derived - they are the second segment of every
 * `rule-<area>-<topic>` directory name - so a new area appears in the document
 * the moment its first skill lands. Only the sentence is written here, because
 * no file in the repository holds it: a missing one leaves the cell empty
 * rather than inventing a description.
 *
 * Data file: exempt from the size cap.
 */

export const AREA_SUBJECT = {
  ai: "Building agents: prompting, context, evals, agent architecture",
  backend: "Services and APIs: Node frameworks, API design, backend security",
  compression: "Output compression: the rules that shorten prose without losing facts",
  data: "Databases and storage, from SQL dialects to IndexedDB",
  devops: "Pipelines, containers, observability, testing, versioning",
  frontend: "Frameworks and the code that runs in a browser",
  platform: "Where the code ships: web, desktop, mobile, library, agent",
  process: "How work is done: reviews, ADRs, changelogs, handoffs, simplicity",
  styleguide: "The rules code is written to, per language and concern",
  toolchain: "Build tools, linters, package manager, commit hooks",
  ui: "The design system and its components",
};

/**
 * When a guardrail family runs. The rules and their labels are read from the
 * definitions; only the sentence saying which check pulls the family in is
 * written here, and a family with no sentence still lists every rule.
 */
export const FAMILY_SCOPE = {
  a11y: "Any check on markup or a component",
  angular: "A check against a `rule-frontend-angular` skill",
  backend: "A check against a `rule-backend-*` skill",
  database: "A check against a `rule-data-*` skill",
  devops: "A check against a `rule-devops-*` skill",
  file_tree: "A check that is given a file tree rather than one file",
  "framework:astro": "A check whose framework is Astro",
  "framework:solid": "A check whose framework is Solid",
  "framework:vanilla": "A check with no framework named",
  "framework:vanilla-reactive": "A check on a reactive vanilla component",
  js: "Any JavaScript or TypeScript source",
  quality: "Every check: types, manifests, prose, comments, simplicity",
  react: "A check against a `rule-frontend-react` skill",
  scaffold: "Generated project scaffolding",
  shared: "Every check, whatever the skill",
  simplicity: "Every check: the rules that reject code nothing asked for",
  svelte: "A check against a `rule-frontend-svelte` skill",
  vanilla_reactive: "A reactive vanilla component, no framework",
  vue: "A check against a `rule-frontend-vue` skill",
};
