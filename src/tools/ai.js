/**
 * @module tools/ai
 *
 * rule routing tool - analyzes prompts and routes to the best rule skill.
 * Uses keyword scoring across skill sections with framework biasing.
 *
 * Extracted from core/skills.js to keep the skill management module lean.
 */

import { z } from "zod/v4";
import { readSkill, getSkillNames, registerTool } from "./router/index.js";
import { getSkillMetadata, listTools } from "./router/index.js";
import { detectProject, getFrameworkSuggestion } from "../core/detector.js";
import { detectRole } from "../core/review-roles.js";
import { loadRoleOverlays } from "../core/review-roles-overlays.js";
import { FLEX_FIRST } from "../core/directive.js";

// ─── Schema ───────────────────────────────────────────────────────

const GalaxySchema = z.object({
  prompt: z.string().describe("User's question about frontend development"),
  framework: z
    .string()
    .optional()
    .describe("Optional framework hint (react, vue, svelte, angular, etc.) to bias routing"),
  path: z.string().optional().describe("Optional project path for auto-detecting framework"),
});

// ─── Section extraction ───────────────────────────────────────────

/**
 * Extract `## Section` headings from SKILL.md content.
 * Strips YAML frontmatter so metadata keywords don't pollute scoring.
 */
function extractSections(content) {
  let body = content;
  const fmMatch = body.match(/^---\s*\n[\s\S]*?\n---\s*\n/);

  if (fmMatch) {
    body = body.slice(fmMatch[0].length);
  }

  const lines = body.split("\n");
  const sections = [];
  let currentHeading = "Overview";
  let currentContent = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = h2Match ? null : line.match(/^###\s+(.+)/);

    if (h2Match) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n") });
      }

      currentHeading = h2Match[1].trim();
      currentContent = [];
    } else if (h3Match) {
      // Treat ### as a separate section for better granularity
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n") });
      }

      currentHeading = h3Match[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n") });
  }

  return sections;
}

// ─── Stopwords ────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "component",
  "components",
  "pattern",
  "patterns",
  "file",
  "files",
  "code",
  "name",
  "names",
  "rule",
  "rules",
  "use",
  "uses",
  "using",
  "data",
  "style",
  "styles",
  "element",
  "elements",
  "attribute",
  "attributes",
  "selector",
  "selectors",
  "principle",
  "principles",
  "convention",
  "conventions",
  "example",
  "examples",
  "folder",
  "folders",
  "directory",
  "directories",
  "structure",
  "type",
  "types",
  "value",
  "values",
  "property",
  "properties",
  "key",
  "keys",
  "how",
  "can",
  "way",
  "ways",
  "need",
  "want",
  "make",
  "work",
  "works",
  "like",
  "just",
  "also",
  "well",
  "get",
  "set",
  "let",
  "one",
  "first",
  "best",
  "practice",
  "practices",
  "guide",
  "basic",
  "basics",
  "simple",
  "learn",
  "following",
  "common",
  "always",
  "never",
  "often",
  "using",
  "based",
  "called",
  "known",
  "every",
  "many",
  "some",
]);

// ─── Scoring ──────────────────────────────────────────────────────

/**
 * Multilingual alias map. Maps non-English domain keywords → English.
 */
const MULTILINGUAL_ALIASES = {
  sicuro: "secure",
  sicurezza: "security",
  proteggere: "protect",
  abusi: "abuse",
  richieste: "requests",
  limitazione: "rate limiting",
  backend: "backend",
  database: "database",
  api: "api",
  server: "server",
  docker: "docker",
  test: "test",
  testing: "testing",
  frontend: "frontend",
  componente: "component",
  pulsante: "button",
  react: "react",
  vue: "vue",
  sécurité: "security",
  protéger: "protect",
  abus: "abuse",
  requêtes: "request",
  limitation: "rate limiting",
  seguridad: "security",
  proteger: "protect",
  abusos: "abuse",
  solicitudes: "request",
  limitación: "rate limiting",
  sicherheit: "security",
  schützen: "protect",
  anfragen: "request",
  datenbank: "database",
};

/** Expand prompt with matching multilingual aliases. */
function expandPrompt(prompt) {
  const lower = prompt.toLowerCase();
  const aliases = [];

  for (const [native, en] of Object.entries(MULTILINGUAL_ALIASES)) {
    if (lower.includes(native)) {
      aliases.push(en);
    }
  }

  return aliases.length > 0 ? prompt + " " + aliases.join(" ") : prompt;
}

function scoreSectionWord(section, word, skillBase, descText) {
  const contentText = (section.content || "").toLowerCase();
  const headingText = (section.heading || "").toLowerCase();

  const nameBonus = word === skillBase ? 3 : 0;
  const descBonus = descText.includes(word) ? 2 : 0;
  const weight = 1 + nameBonus + descBonus;

  const wordPattern = new RegExp(
    String.raw`\b` + word.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`) + String.raw`\b`,
    "i",
  );

  if (wordPattern.test(headingText)) {
    return weight * 3;
  }

  if (wordPattern.test(contentText)) {
    return weight;
  }

  return 0;
}

function scoreSkill(sections, meta, promptWords, skillName) {
  const descText = (meta.description || "").toLowerCase();
  const tagText = (meta.tags || []).join(" ").toLowerCase();
  const skillBase = skillName.replace("rule-", "");

  let rawScore = 0;

  for (const word of promptWords) {
    if (STOPWORDS.has(word)) {
      continue;
    }

    let wordScore = 0;

    for (const section of sections) {
      const w = scoreSectionWord(section, word, skillBase, descText);

      if (w > wordScore) {
        wordScore = w;
      }
    }

    if (wordScore === 0 && (descText.includes(word) || tagText.includes(word))) {
      wordScore = Math.max(1, 0.5 * (1 + (descText.includes(skillBase) ? 2 : 0)));
    }

    rawScore += wordScore;
  }

  return rawScore;
}

// ─── Section display ──────────────────────────────────────────────

/** Suffixes that make a word a different form of the same word. */
const INFLECTIONS = new Set(["s", "es", "ed", "ing", "ion", "ions", "er", "ers", "al"]);

/** How much the prompt names this skill (three tiers, same/stem/prefix). */
function nameAffinity(skillName, promptWords) {
  const parts = skillName
    .replace(/^rule(?:-|$)/, "")
    .split("-")
    .filter((part) => part.length > 2);
  const sameWord = (long, short) => INFLECTIONS.has(long.slice(short.length));
  let score = 0;

  for (const word of promptWords) {
    if (word.length < 3 || STOPWORDS.has(word)) {
      continue;
    }

    for (const part of parts) {
      if (part === word) {
        score += 12;
      } else if (part.startsWith(word) && sameWord(part, word)) {
        score += 12;
      } else if (word.startsWith(part) && sameWord(word, part)) {
        score += 12;
      } else if (part.startsWith(word) || word.startsWith(part)) {
        score += 6;
      }
    }
  }

  return score;
}

/** How much the prompt names one of the skill's tags. */
function tagAffinity(meta, promptWords) {
  const tags = new Set((meta?.tags ?? []).map((tag) => String(tag).toLowerCase()));

  if (tags.size === 0) {
    return 0;
  }

  let score = 0;

  for (const word of promptWords) {
    if (word.length < 3 || STOPWORDS.has(word)) {
      continue;
    }

    if (tags.has(word)) {
      score += 3;
    }
  }

  return score;
}

const REDUCTION_SIGNALS = [
  "over engineering",
  "over-engineering",
  "over engineered",
  "over-engineered",
  "overengineer",
  "unnecessary complexity",
  "reduce complexity",
  "simplify",
  "simpler",
  "smaller footprint",
  "can we avoid",
  "do we need",
  "is it required",
  "not in our scope",
  "out of scope",
  "too much",
  "too many",
  "too hard",
  "keep it minimal",
  "remove",
  "redundant",
  "yagni",
  "should i extract",
  "should i abstract",
  "should i split",
  "worth extracting",
  "into a helper",
  "separate module",
  "own abstraction",
  "premature",
];

/** @param {string} promptLower @returns {string|null} */
function reductionSignal(promptLower) {
  return REDUCTION_SIGNALS.find((signal) => promptLower.includes(signal)) ?? null;
}

function extractTopSections(skillName, promptWords) {
  const content = readSkill(skillName);

  if (!content) {
    return [];
  }

  const sections = extractSections(content);
  const meta = getSkillMetadata(skillName);
  const skillBase = skillName.replace("rule-", "");
  const descText = (meta.description || "").toLowerCase();

  const scored = sections
    .map((s) => {
      let score = 0;

      for (const word of promptWords) {
        if (STOPWORDS.has(word)) {
          continue;
        }

        score += scoreSectionWord(s, word, skillBase, descText);
      }

      return { heading: s.heading, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.heading);

  if (scored.length === 0) {
    const hasMeta = promptWords.some(
      (w) => !STOPWORDS.has(w) && (descText.includes(w) || (meta.tags || []).join(" ").toLowerCase().includes(w)),
    );

    if (hasMeta) {
      return ["(matches skill description)"];
    }
  }

  return scored;
}

// ─── Next tools mapping ───────────────────────────────────────────

function skillNextTools(skillName) {
  const suggestions = [];
  const base = skillName.replace(/^rule-/, "").replaceAll("-", "_");
  suggestions.push(`rule_tool_${base}`);

  if (skillName === "rule-styleguide") {
    suggestions.push("rule_tool_scaffold");
  }

  suggestions.push("rule_tool_check", "rule_tool_search");

  if (skillName !== "rule-frontend-vanilla-reactive") {
    suggestions.push("rule_tool_component");
  }

  return suggestions;
}

// ─── Tool registration ────────────────────────────────────────────

/**
 * Register the rule routing tool.
 * Routes a user prompt to the correct rule skill based on keyword scoring.
 * Returns structured JSON with route, confidence, sections, next_tools.
 */
export function registerAiTool() {
  registerTool({
    name: "pix_tool",
    description: "Route a prompt to the correct rule skill. Returns structured routing with relevant sections.",
    zodSchema: GalaxySchema,
    handler: async (arguments_) => {
      const allSkills = getSkillNames();
      const skills = allSkills.filter((skillName) => skillName !== "rule");
      const prompt = expandPrompt((arguments_.prompt || "").trim());

      if (!prompt) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                route: "none",
                confidence: 0,
                sections: [],
                next_tools: ["rule_tool_search"],
                skills_available: allSkills,
              }),
            },
          ],
        };
      }

      const promptLower = prompt.toLowerCase();
      const promptWords = [...new Set(promptLower.split(/[^a-z0-9]+/).filter((w) => w.length > 1))];

      // ── Domain classification (before framework bias) ──
      const AI_KEYWORDS = ["agent", "agents", "llm", "assistant", "autonomous", "registry", "provider"];
      const BACKEND_KEYWORDS = [
        "api",
        "backend",
        "server",
        "endpoint",
        "rest",
        "graphql",
        "express",
        "fastify",
        "nestjs",
        "hono",
        "rate",
        "limiting",
        "helmet",
        "cors",
        "auth",
        "jwt",
        "middleware",
      ];
      // Git/commit signals: strong, unambiguous triggers for commit/push discipline.
      const hasCommitSignal = /(^|[^a-z])commit/.test(promptLower);
      const hasConventionalSignal = promptLower.includes("conventional");
      const hasPushSignal = /(^|[^a-z])push/.test(promptLower) && /(^|[^a-z])git/.test(promptLower);
      const DATA_KEYWORDS = [
        "database",
        "sql",
        "query",
        "table",
        "postgresql",
        "mysql",
        "mongodb",
        "schema",
        "migration",
        "index",
        "transaction",
        "orm",
        "prisma",
        "drizzle",
      ];
      const DEVOPS_KEYWORDS = [
        "docker",
        "ci",
        "cd",
        "pipeline",
        "deploy",
        "container",
        "kubernetes",
        "gitlab",
        "github",
        "actions",
      ];
      const FRONTEND_KEYWORDS = [
        "react",
        "vue",
        "svelte",
        "angular",
        "component",
        "button",
        "modal",
        "css",
        "style",
        "ui",
        "layout",
        "responsive",
      ];

      const promptDomain = (() => {
        const g = (hasCommitSignal ? 1 : 0) + (hasConventionalSignal ? 1 : 0) + (hasPushSignal ? 1 : 0);
        const a = AI_KEYWORDS.filter((k) => promptLower.includes(k)).length;
        const b = BACKEND_KEYWORDS.filter((k) => promptLower.includes(k)).length;
        const d = DATA_KEYWORDS.filter((k) => promptLower.includes(k)).length;
        const o = DEVOPS_KEYWORDS.filter((k) => promptLower.includes(k)).length;
        const f = FRONTEND_KEYWORDS.filter((k) => promptLower.includes(k)).length;
        // Commit signals must outweigh other domains (e.g. "add a commit button" stays frontend).
        if (g >= 2 || g > f + b + d) {
          return "git";
        }

        if (a >= 2 || a > b + f + d) {
          return "ai";
        }

        if (b >= 2 || b > f + d) {
          return "backend";
        }

        if (d >= 2 || d > b + f) {
          return "data";
        }

        if (o >= 2) {
          return "devops";
        }

        return null; // unknown, use full scoring
      })();

      // Detect framework from args
      let detectedFramework = arguments_.framework;

      if (!detectedFramework && arguments_.path) {
        try {
          const profile = detectProject(arguments_.path);
          detectedFramework = profile.framework;
        } catch {
          /* ignore */
        }
      }

      const detectedSkillName = detectedFramework ? getFrameworkSuggestion(detectedFramework).skillName : null;

      // Determine if detected skill belongs to a different domain than the prompt
      const detectedDomain = detectedSkillName?.startsWith("rule-ai")
        ? "ai"
        : detectedSkillName?.startsWith("rule-frontend")
          ? "frontend"
          : detectedSkillName?.startsWith("rule-backend")
            ? "backend"
            : detectedSkillName?.startsWith("rule-data")
              ? "data"
              : detectedSkillName?.startsWith("rule-devops")
                ? "devops"
                : null;

      // Only apply framework bias when domains match (or prompt domain is unknown)
      const isApplyFrameworkBias = !promptDomain || promptDomain === detectedDomain;

      // BM25 scoring runs on the same index the search tool uses: the previous
      // scorer had no IDF and no length normalization, so common words and
      // big files dominated routing.
      const { buildIndex, isIndexReady, searchSkills } = await import("../core/bm25/index.js");

      if (!isIndexReady()) {
        buildIndex();
      }

      const ranked = new Map(searchSkills(prompt).map((hit) => [hit.skill, hit]));
      const isReduction = Boolean(reductionSignal(promptLower));
      const skillRawScores = [];

      for (const skillName of skills) {
        const content = readSkill(skillName);

        if (!content) {
          continue;
        }

        const meta = getSkillMetadata(skillName);
        const hit = ranked.get(skillName);
        // Naming the skill is the strongest signal a prompt can carry, and BM25
        // cannot see it: the name is metadata, not section text.
        const rawScore = (hit?.score ?? 0) + nameAffinity(skillName, promptWords) + tagAffinity(meta, promptWords);

        let finalScore = rawScore;

        // Commit/push prompts deterministically route to the commits discipline skill.
        if (promptDomain === "git" && skillName === "rule-toolchain-commits") {
          finalScore = Math.max(rawScore * 2, 25);
        }

        // A scope challenge routes to the simplicity skill; on a plain build
        // request it stays an alternative (finalScore halved).
        if (skillName === "rule-process-simplicity") {
          finalScore = isReduction ? Math.max(rawScore * 2, 30) : rawScore * 0.5;
        }

        if (detectedFramework && isApplyFrameworkBias) {
          if (skillName === detectedSkillName) {
            finalScore = Math.max(rawScore * 2, 20);
          } else if (
            ["rule-styleguide", "rule-frontend", "rule-platform-web", "rule-ui-design-system", "rule-ai"].includes(skillName)
          ) {
            finalScore *= 1.15;
          } else {
            finalScore *= 0.85;
          }
        }

        if (finalScore <= 0) {
          continue;
        }

        skillRawScores.push({ skill: skillName, rawScore: finalScore, meta });
      }

      // Normalize and sort
      const maxRaw = Math.max(...skillRawScores.map((s) => s.rawScore), 0);
      const skillScores = skillRawScores.map(({ skill, rawScore }) => ({
        skill,
        relativeScore: maxRaw > 0 ? Math.min(1, rawScore / maxRaw) : 0,
        absoluteScore: rawScore,
        sections: ranked.get(skill)?.sections ?? extractTopSections(skill, promptWords),
        next_tools: skillNextTools(skill),
      }));

      skillScores.sort((a, b) => b.relativeScore - a.relativeScore);

      const top = skillScores.slice(0, 6);
      const primaryRoute = top[0] ?? {
        skill: "none",
        relativeScore: 0,
        absoluteScore: 0,
        sections: [],
        next_tools: ["rule_tool_search"],
      };

      // If absolute score is below threshold, mark as uncertain
      const ABSOLUTE_THRESHOLD = 5;
      const isUncertain = primaryRoute.absoluteScore < ABSOLUTE_THRESHOLD;

      const SCOPE_CONTRACT = {
        rule: "Build exactly what the request states. Anything beyond it is proposed in prose, never written into the codebase.",
        declare_first: ["files_to_change", "out_of_scope"],
        forbidden_without_explicit_request: [
          "new tables, columns, or indexes",
          "audit, history, or soft-delete structures",
          "config flags, feature toggles, or env vars",
          "interfaces, base classes, or layers with a single caller",
          "caching, retries, queues, or background jobs",
          "new packages, services, or endpoints",
        ],
        when_in_doubt: "Ship the smaller version and list what you deliberately left out.",
      };

      const STRUCTURAL_KEYWORDS = [
        "migration",
        "schema",
        "data model",
        "table",
        "column",
        "database",
        "architecture",
        "architectural",
      ];

      /** A structural change in the prompt asks for the ADR, unprompted. */
      function docsFollowup(promptLower) {
        if (reductionSignal(promptLower)) {
          return null;
        }

        const signal = STRUCTURAL_KEYWORDS.find((keyword) => promptLower.includes(keyword));

        if (!signal) {
          return null;
        }

        return {
          tool: "rule_tool_process_adr",
          signal,
          why: "The request changes something structural; the decision is worth an ADR.",
        };
      }

      const STYLING_CONTRACT = {
        layout: FLEX_FIRST,
        grid_only_for: [
          "named template areas (grid-template-areas)",
          "subgrid",
          "explicit item placement or deliberate overlap (grid-area, grid-column, grid-row)",
          "auto-fit / auto-fill tracks (repeat(auto-fit, minmax(...)))",
        ],
        otherwise: "display: flex with gap; flex-wrap: wrap plus flex: 1 1 <basis> for a wrapping set.",
        when_grid_is_right: "Say which of the four it is in a `/* grid: why */` comment above the rule.",
      };

      /** Routes that end in stylesheets, and therefore carry the layout contract. */
      const STYLING_ROUTES = /^rule-(?:frontend|ui|platform-(?:web|desktop|expo))|^rule-styleguide-(?:css|html|a11y)$/;

      const followup = docsFollowup(promptLower);
      // Only advertise tools this process actually registered.
      const registered = new Set(listTools().map((tool) => tool.name));
      const nextTools = [
        ...new Set([...top.flatMap((t) => t.next_tools), ...(followup ? [followup.tool] : [])]),
      ].filter((tool) => {
        return registered.has(tool);
      });

      // A persona request asks for a role's lenses and its three documents, not
      // for a skill on its own. The scorer cannot see that, so the role is
      // detected from the registry and the answer says which tool serves it.
      const persona = detectRole(prompt, loadRoleOverlays().roles);

      const result = {
        route: isUncertain ? "unknown" : primaryRoute.skill,
        confidence: Math.round(primaryRoute.relativeScore * 100) / 100,
        absoluteScore: Math.round(primaryRoute.absoluteScore * 100) / 100,
        uncertain: isUncertain,
        sections: primaryRoute.sections,
        next_tools: persona ? ["rule_tool_plan", ...nextTools.filter((name) => name !== "rule_tool_plan")] : nextTools,
        ...(persona && {
          persona: {
            role: persona.id,
            title: persona.role,
            tool: "rule_tool_plan",
            how: `Call rule_tool_plan with role "${persona.id}", then rule_tool_plan_docs with the findings.`,
          },
        }),
        scope_contract: SCOPE_CONTRACT,
        ...(!isUncertain && STYLING_ROUTES.test(primaryRoute.skill) && { styling_contract: STYLING_CONTRACT }),
        ...(followup && { docs_followup: followup }),
        alternatives: top.slice(1).map((t) => ({
          route: t.skill,
          confidence: Math.round(t.relativeScore * 100) / 100,
          sections: t.sections.slice(0, 3),
        })),
        skills_available: allSkills,
        summary: isUncertain
          ? `No strong match for "${prompt}". Try rephrasing or use rule_tool_search for full-text search.`
          : top.length > 0
            ? `Top match: ${primaryRoute.skill} (${Math.round(primaryRoute.relativeScore * 100)}%). Relevant sections: ${primaryRoute.sections.join(", ")}. ` +
              `Try: ${nextTools.join(", ")}. Build only what was asked; propose anything extra instead of writing it.` +
              (followup ? ` Structural change: generate the ADR with ${followup.tool} without being asked.` : "")
            : `No matching skill for "${prompt}". Try rule_tool_search for full-text search.`,
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
