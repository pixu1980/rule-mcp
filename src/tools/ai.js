/**
 * @module tools/ai
 *
 * rule routing tool — analyzes prompts and routes to the best rule skill.
 * Uses keyword scoring across skill sections with framework biasing.
 *
 * Extracted from core/skills.js to keep the skill management module lean.
 */

import { z } from "zod/v4";
import { readSkill, getSkillNames, registerTool } from "./router.js";
import { getSkillMetadata } from "../core/skills.js";
import { detectProject, getFrameworkSuggestion } from "../core/detector.js";

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
  if (skillName === "rule-styleguide" || skillName === "rule-architect") {
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
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string", description: "User's question" } },
      required: ["prompt"],
    },
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

      // Score each skill
      const skillRawScores = [];

      for (const skillName of skills) {
        const content = readSkill(skillName);
        if (!content) {
          continue;
        }

        const sections = extractSections(content);
        const meta = getSkillMetadata(skillName);
        const rawScore = scoreSkill(sections, meta, promptWords, skillName);

        let finalScore = rawScore;

        // Commit/push prompts deterministically route to the commits discipline skill.
        if (promptDomain === "git" && skillName === "rule-toolchain-commits") {
          finalScore = Math.max(rawScore * 2, 25);
        }

        if (detectedFramework && isApplyFrameworkBias) {
          if (skillName === detectedSkillName) {
            finalScore = Math.max(rawScore * 2, 20);
          } else if (
            [
              "rule-styleguide",
              "rule-frontend",
              "rule-platform-web",
              "rule-architect",
              "rule-ui-design-system",
              "rule-ai",
            ].includes(skillName)
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
        sections: extractTopSections(skill, promptWords),
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

      const result = {
        route: isUncertain ? "unknown" : primaryRoute.skill,
        confidence: Math.round(primaryRoute.relativeScore * 100) / 100,
        absoluteScore: Math.round(primaryRoute.absoluteScore * 100) / 100,
        uncertain: isUncertain,
        sections: primaryRoute.sections,
        next_tools: [...new Set(top.flatMap((t) => t.next_tools))],
        alternatives: top.slice(1).map((t) => ({
          route: t.skill,
          confidence: Math.round(t.relativeScore * 100) / 100,
          sections: t.sections.slice(0, 3),
        })),
        skills_available: allSkills,
        summary: isUncertain
          ? `No strong match for "${prompt}". Try rephrasing or use rule_tool_search for full-text search.`
          : top.length > 0
            ? `Top match: ${primaryRoute.skill} (${Math.round(primaryRoute.relativeScore * 100)}%). Relevant sections: ${primaryRoute.sections.join(", ")}. Try: ${[...new Set(top.flatMap((t) => t.next_tools))].join(", ")}.`
            : `No matching skill for "${prompt}". Try rule_tool_search for full-text search.`,
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
