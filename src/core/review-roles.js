/**
 * @module core/review-roles
 *
 * The expert review personas: who can be asked to audit this project, what
 * they know, and what they look at (personas plan, phase A.1).
 *
 * A persona is data, not a prompt. One registry entry fills one template, and
 * every surface - the MCP prompt, the agent command, the skill, the tool -
 * is generated from that entry, so a role gains a lens in one place and
 * every entry point says the same thing.
 *
 * `status` is the lifecycle: `active` roles are generated onto every surface,
 * `proposed` ones wait in the catalog until someone asks for them, and
 * `deprecated` ones disappear from the surfaces but keep their entry and
 * their documents - deleting an id would make an old audit unattributable.
 */

/** Roles as shipped. Overlays (user, project) replace entries by id. */
export const EMBEDDED_ROLES = [
  {
    id: "architect",
    role: "Software Architect",
    yearsOfExperience: 30,
    skills: [
      "architecture and modularity",
      "API and module boundaries",
      "coupling and cohesion",
      "ADR discipline",
      "evolutionary design",
    ],
    evidenceSkills: ["rule-styleguide-patterns", "rule-process-adr", "rule-backend-api-design"],
    lenses: [
      "module boundaries that earn their existence",
      "one owner per decision, recorded in an ADR",
      "coupling that a change has to fight",
      "abstractions with a single caller",
      "the seam a future requirement will need",
    ],
    aliases: ["architetto software", "software architect", "architetto"],
    status: "active",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "security",
    role: "Security Engineer",
    yearsOfExperience: 25,
    skills: ["application security", "supply chain security", "MCP and agent security", "threat modeling"],
    evidenceSkills: ["rule-backend-security", "rule-devops-docker"],
    lenses: [
      "authentication and authorization on every transport",
      "input validation, size caps and ReDoS",
      "secrets handling and where they land on disk",
      "supply chain: lockfile, lifecycle scripts, provenance",
      "the trust boundary between repo content and agent instructions",
    ],
    aliases: ["security engineer", "ingegnere della sicurezza", "esperto di sicurezza"],
    status: "active",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "privacy",
    role: "Privacy and Compliance Engineer",
    yearsOfExperience: 20,
    skills: ["GDPR", "EU AI Act", "data minimization", "retention and erasure", "telemetry ethics"],
    evidenceSkills: ["rule-backend-security", "rule-process-documentation"],
    lenses: [
      "what is recorded, where it lands, and for how long",
      "the kill switch for every channel, and whether it works",
      "erasure that actually removes the data",
      "what leaves the machine, and what a shared artifact carries",
      "personal data hiding in prompts and paths",
    ],
    aliases: ["privacy engineer", "compliance engineer", "esperto di privacy", "esperto di compliance"],
    status: "active",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "a11y",
    role: "Accessibility Expert",
    yearsOfExperience: 20,
    skills: ["WCAG 2.2 AA", "assistive technologies", "a11y test automation", "inclusive UX"],
    evidenceSkills: ["rule-styleguide-a11y", "rule-devops-testing"],
    lenses: [
      "keyboard path through every interaction",
      "name, role and value for every control",
      "focus visibility and focus order",
      "content that only color or only motion conveys",
      "automated axe coverage and what it cannot see",
    ],
    aliases: ["accessibility expert", "esperto di accessibilita", "esperto di accessibilità", "accessibility engineer"],
    status: "active",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "ai-engineer",
    role: "AI Engineer",
    yearsOfExperience: 15,
    skills: ["agent architectures", "evals", "prompt and context engineering", "token economics", "LLM security"],
    evidenceSkills: ["rule-ai-agent-architecture", "rule-ai-evals", "rule-ai-context-engineering"],
    lenses: [
      "what the tool surface costs on every turn",
      "claims about savings that nothing measures",
      "eval coverage for the behavior that matters",
      "prompt injection through content the agent reads",
      "the difference between measured and declared",
    ],
    aliases: ["ai engineer", "ingegnere ai"],
    status: "active",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "performance",
    role: "Performance Engineer",
    yearsOfExperience: 20,
    skills: [
      "Node event loop and worker threads",
      "caching",
      "bundle and startup cost",
      "measurement-first optimization",
    ],
    evidenceSkills: ["rule-backend-workers", "rule-frontend-workers", "rule-toolchain-vite"],
    lenses: [
      "work that blocks the only thread",
      "the measurement before the optimization",
      "caches: hit rate, invalidation, and what they hide",
      "startup cost paid on every invocation",
      "algorithms that are quadratic on real input",
    ],
    aliases: ["performance engineer", "esperto di performance"],
    status: "active",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "docs-engineer",
    role: "Senior Documentation Engineer",
    yearsOfExperience: 25,
    skills: [
      "documentation architecture",
      "ADR lifecycle",
      "JSDoc and type annotations",
      "comment hygiene",
      "commit-driven doc maintenance",
      "plain-language editing",
    ],
    evidenceSkills: [
      "rule-process-documentation",
      "rule-styleguide-markdown",
      "rule-styleguide-readme",
      "rule-process-adr",
      "rule-styleguide-javascript",
    ],
    lenses: [
      "what the project says about itself, against what it does",
      "ADRs that a later decision reversed and nobody marked",
      "comments that narrate history instead of stating a constraint",
      "JSDoc that lies about its parameters",
      "documentation that repeats itself instead of pointing",
      "lean, elegant, understandable - never verbose or redundant",
    ],
    aliases: ["documentation engineer", "technical writer", "esperto di documentazione"],
    status: "active",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "devops-sre",
    role: "DevOps and Site Reliability Engineer",
    yearsOfExperience: 25,
    skills: ["CI/CD", "containerization", "observability", "release engineering", "incident response"],
    evidenceSkills: ["rule-devops-docker", "rule-devops-gitlab-ci", "rule-devops-observability"],
    lenses: [
      "what breaks in production and how it is noticed",
      "the pipeline as a gate, not a suggestion",
      "container privileges and blast radius",
      "rollback that has been rehearsed",
    ],
    status: "proposed",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "qa-testing",
    role: "QA and Test Engineer",
    yearsOfExperience: 25,
    skills: ["TDD", "coverage strategy", "flakiness hunting", "the test pyramid", "a11y test suites"],
    evidenceSkills: ["rule-devops-testing", "rule-styleguide-validation"],
    lenses: [
      "the assertion that would have caught the last bug",
      "flaky tests and the race behind them",
      "coverage of behavior, not of lines",
      "tests that pass for the wrong reason",
    ],
    status: "proposed",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "data-engineer",
    role: "Data Engineer",
    yearsOfExperience: 25,
    skills: ["schema design", "migrations", "SQL performance", "local-first storage"],
    evidenceSkills: ["rule-data-sql", "rule-data-postgresql", "rule-data-sqlite"],
    lenses: [
      "a schema that answers the questions actually asked",
      "migrations that can run twice",
      "queries that scan when they could seek",
      "data that outlives the code that wrote it",
    ],
    status: "proposed",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "design-system-lead",
    role: "Design System Lead",
    yearsOfExperience: 20,
    skills: ["zero-class CSS", "design tokens", "semantic HTML", "component API design"],
    evidenceSkills: ["rule-ui-design-system", "rule-styleguide-css", "rule-styleguide-html"],
    lenses: [
      "tokens as the single source of a value",
      "semantics before styling",
      "a component API that survives its second consumer",
      "flex first, grid where it earns itself",
    ],
    status: "proposed",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "dx-toolchain",
    role: "Developer Experience and Toolchain Engineer",
    yearsOfExperience: 15,
    skills: ["pnpm", "bundlers", "lint and format pipelines", "monorepo ergonomics"],
    evidenceSkills: ["rule-toolchain-pnpm", "rule-toolchain-vite", "rule-toolchain-eslint"],
    lenses: [
      "the time between an edit and its feedback",
      "one way to do each thing, wired into the tooling",
      "a fresh clone that works on the first command",
      "config that explains itself",
    ],
    status: "proposed",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "simplicity-staff-eng",
    role: "Staff Engineer for Simplicity",
    yearsOfExperience: 30,
    skills: ["scope discipline", "YAGNI", "deletion as a feature", "complexity budgets"],
    evidenceSkills: ["rule-process-simplicity", "rule-styleguide-patterns"],
    lenses: [
      "what could be deleted without anyone noticing",
      "the flag with one caller and two behaviors",
      "abstraction added for a second case that never came",
      "the shortest version of this that still works",
    ],
    status: "proposed",
    version: 1,
    deprecatedBy: null,
  },
  {
    id: "oss-compliance",
    role: "Open Source Compliance Officer",
    yearsOfExperience: 20,
    skills: ["licensing", "attribution", "provenance", "third-party policy"],
    evidenceSkills: ["rule-process-documentation", "rule-toolchain-pnpm"],
    lenses: [
      "every dependency's license, and whether it is compatible",
      "attribution that ships with the artifact",
      "provenance from source to published package",
      "code copied in without a trail",
    ],
    status: "proposed",
    version: 1,
    deprecatedBy: null,
  },
];

/** Every field a role must have, and what counts as valid. */
const REQUIRED_STRING_FIELDS = ["id", "role"];
const VALID_STATUS = new Set(["active", "proposed", "deprecated"]);

/**
 * Validate one role entry. Returns the problems found, empty when valid -
 * an overlay file is reported and skipped, never fatal, so the caller needs
 * the reasons rather than an exception.
 *
 * @param {object} role
 * @returns {string[]} problems, empty when the role is valid
 */
export function validateRole(role) {
  const problems = [];

  if (!role || typeof role !== "object") {
    return ["not an object"];
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof role[field] !== "string" || role[field].trim() === "") {
      problems.push(`${field} must be a non-empty string`);
    }
  }

  if (typeof role.id === "string" && !/^[a-z][a-z0-9-]*$/.test(role.id)) {
    problems.push("id must be kebab-case");
  }

  if (!Number.isInteger(role.yearsOfExperience) || role.yearsOfExperience <= 0) {
    problems.push("yearsOfExperience must be a positive integer");
  }

  if (!Array.isArray(role.skills) || role.skills.length === 0) {
    problems.push("skills must be a non-empty array");
  }

  if (role.evidenceSkills !== undefined && !Array.isArray(role.evidenceSkills)) {
    problems.push("evidenceSkills must be an array when present");
  }

  if (role.lenses !== undefined && !Array.isArray(role.lenses)) {
    problems.push("lenses must be an array when present");
  }

  if (role.aliases !== undefined && !Array.isArray(role.aliases)) {
    problems.push("aliases must be an array when present");
  }

  if (!VALID_STATUS.has(role.status)) {
    problems.push(`status must be one of ${[...VALID_STATUS].join(", ")}`);
  }

  if (!Number.isInteger(role.version) || role.version <= 0) {
    problems.push("version must be a positive integer");
  }

  if (role.status === "deprecated" && !role.deprecatedBy) {
    problems.push("a deprecated role must name the role that replaces it in deprecatedBy");
  }

  return problems;
}

/**
 * Every role, embedded plus overlays, merged by id.
 *
 * @param {Array<object>} [overlays] - higher-precedence entries, lowest first
 * @returns {object[]} roles in catalog order, overlays replacing by id
 */
export function allRoles(overlays = []) {
  const byId = new Map(EMBEDDED_ROLES.map((role) => [role.id, role]));

  for (const role of overlays) {
    byId.set(role.id, role);
  }

  return [...byId.values()];
}

/**
 * The roles every generated surface carries.
 *
 * @param {Array<object>} [overlays]
 * @returns {object[]} roles with status "active"
 */
export function activeRoles(overlays = []) {
  return allRoles(overlays).filter((role) => role.status === "active");
}

/**
 * One role by id, whatever its status - a deprecated role still owns its
 * documents, so looking it up has to keep working.
 *
 * @param {string} id
 * @param {Array<object>} [overlays]
 * @returns {object|undefined}
 */
export function roleById(id, overlays = []) {
  return allRoles(overlays).find((role) => role.id === id);
}

/**
 * Frames that turn a subject into a persona request, English and Italian.
 *
 * "security headers" is work; "act as a security engineer" is a request for a
 * role's lenses and its three documents. The frame is what separates them, so a
 * bare role id never triggers on its own.
 */
const PERSONA_FRAMES = [
  "act as",
  "acting as",
  "as a",
  "as an",
  "in the role of",
  "you are a",
  "you are an",
  "agisci come",
  "comportati come",
  "nel ruolo di",
  "fai da",
  "come un",
  "come una",
];

/** Every name a role answers to: its id, its title, and the aliases it declares. */
function roleNames(role) {
  return [role.id, role.id.replaceAll("-", " "), role.role, ...(role.aliases ?? [])]
    .filter(Boolean)
    .map((name) => String(name).toLowerCase());
}

/**
 * Which review persona a prompt is asking for, if any (personas D.3).
 *
 * Two ways to qualify. A multi-word name - "security engineer", "architetto
 * software" - is specific enough on its own: nobody writes it about a subject.
 * A single word - "security", "privacy" - is a subject as often as a role, so it
 * counts only inside a persona frame.
 *
 * @param {string} prompt
 * @param {Array<object>} [overlays] - higher-precedence roles, lowest first
 * @returns {object|undefined} the role, or undefined when the prompt is ordinary work
 */
export function detectRole(prompt, overlays = []) {
  const text = String(prompt ?? "").toLowerCase();

  if (text.trim() === "") {
    return;
  }

  const framed = PERSONA_FRAMES.some((frame) => text.includes(frame));

  for (const role of activeRoles(overlays)) {
    for (const name of roleNames(role)) {
      if (!text.includes(name)) {
        continue;
      }

      if (name.includes(" ") || framed) {
        return role;
      }
    }
  }
}
