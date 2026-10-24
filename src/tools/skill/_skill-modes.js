/** @module tools/skill/skill-modes - the per-skill tool's mode handlers */

import { checkCodeGuarded } from "../../core/guardrails/index.js";
import { extractScaffoldSection, extractSingleScaffoldFile } from "../../core/scaffold/_parser.js";

/** mode=scaffold (rule-mcp-styleguide only): the scaffold section, or one file of it. */
export function scaffoldMode(content, arguments_) {
  const scaffoldSection = extractScaffoldSection(content);

  if (arguments_.file) {
    return extractSingleScaffoldFile(scaffoldSection, arguments_.file);
  }

  return { content: [{ type: "text", text: "# Project Scaffolding\n\n" + scaffoldSection }] };
}

/** mode=check: run the guardrails over the given code and render the report. */
export async function checkMode(skillName, arguments_) {
  if (!arguments_.code) {
    return {
      isError: true,
      content: [{ type: "text", text: "mode=check requires a `code` argument with the code to validate." }],
    };
  }

  const result = await checkCodeGuarded(skillName, arguments_.code, {
    fileName: arguments_.fileName,
    isComponent: arguments_.isComponent,
    framework: arguments_.framework,
    mode: arguments_.mode,
    allowedDependencies: arguments_.allowedDependencies,
  });
  const lines = [
    "# Guardrail check: " + skillName,
    "",
    "**" + result.summary + "**",
    "",
    "Passed: " + result.passCount + "/" + result.total,
    "Failed: " + result.failCount + "/" + result.total,
    "",
  ];

  for (const f of result.failed) {
    lines.push("## ❌ " + f.id + ": " + f.label);

    if (f.failCount > 0) {
      lines.push("Violations: " + f.failCount);
    }

    if (f.detail.length > 0) {
      lines.push("Details: " + f.detail.join(", "));
    }

    lines.push("Fix: " + f.suggestion, "");
  }

  if (result.allPass) {
    lines.push("✅ All guardrails pass. Code is rule-mcp-compliant.");
  }

  return {
    isError: !result.allPass,
    content: [{ type: "text", text: lines.join("\n") }],
    _meta: { ruleGuardrails: result },
  };
}

/** mode=summary: the first 30 lines. */
export function summaryMode(skillName, content) {
  const lines = content.split("\n").slice(0, 30);

  return {
    content: [{ type: "text", text: "# " + skillName + " (summary)\n\n" + lines.join("\n") + "\n\n..." }],
  };
}

/** mode=search: line matches inside this one skill. */
export function searchMode(skillName, content, query) {
  const lines = content.split("\n");
  const matches = lines
    .map((l, index) => ({ i: index + 1, t: l }))
    .filter((l) => l.t.toLowerCase().includes(query))
    .slice(0, 20);

  return {
    content: [
      {
        type: "text",
        text: '# Search "' + query + '" in ' + skillName + "\n\n" + (matches.length > 0 ? matches.map((x) => "L" + x.i + ": " + x.t).join("\n") : "No matches."),
      },
    ],
  };
}

/** mode=tldr: BM25-compressed - only the sections relevant to the query. */
export async function tldrMode(skillName, displayName, query) {
  const { search, buildIndex, isIndexReady } = await import("../../core/bm25/index.js");

  if (!isIndexReady()) {
    await buildIndex();
  }
  // Search with larger limit (50) then filter by skill - avoids top-5-before-filter bug
  const results = query
    ? search(query, 50)
        .filter((r) => r.skill === skillName)
        .slice(0, 5)
    : [];

  if (results.length > 0) {
    const lines = ["# " + skillName + " (TLDR)", ""];

    for (const r of results) {
      const snippet = r.snippet.length > 300 ? r.snippet.slice(0, 300) + "..." : r.snippet;

      lines.push("## " + r.section + " _(score: " + r.score + ")", "", snippet, "");
    }

    lines.push("---", "Full skill: call `rule_tool_" + displayName + "` mode=full");

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }

  return { content: [{ type: "text", text: "# " + skillName + " (TLDR)\n\nNo relevant sections found." }] };
}
