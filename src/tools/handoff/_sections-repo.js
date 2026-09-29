

/** Handoff sections from the repository: working tree, semantic changes, recent commits, docs scan, footers. */
import { TOKENSAVE_DIRECTIVE, tokensaveActive } from "../../core/agents/_integrations.js";
import { resumePromptLines } from "./_sections-prompt.js";

/** Uncommitted changes, deferring to the code graph instead of a raw diff when tokensave runs. */
export function workingTreeLines(gitDiff, { isMinimal, compress, projectDir }) {
  if (!gitDiff || gitDiff.files.length === 0) {
    return [];
  }

  if (isMinimal) {
    return [`Changed:${gitDiff.files.length} files`];
  }

  const lines = ["### Working Tree Changes (uncommitted)", "", `Changed ${gitDiff.files.length} file(s):`];

  for (const f of gitDiff.files) {
    lines.push(`- \`${f}\``);
  }

  lines.push("");

  if (!compress && gitDiff.unstaged.length > 0) {
    if (tokensaveActive(projectDir)) {
      lines.push(TOKENSAVE_DIRECTIVE, "");
    } else {
      lines.push("```diff", gitDiff.unstaged.slice(0, 2000), "```", "");
    }
  }

  return lines;
}

/**
 * The feature commit range, the boundary every handoff-adjacent command shares.
 *
 * @param {{ baseRef: string, mergeBase: string, count: number, violations: number, merges: number }|null} feature
 * @param {{ isMinimal: boolean }} shape
 * @returns {string[]}
 */
export function featureRangeLines(feature, { isMinimal }) {
  if (!feature || isMinimal || !feature.baseRef || feature.count === 0) {
    return [];
  }

  return [
    "### Feature Range",
    "",
    `- Base: \`${feature.baseRef}\` (merge base \`${feature.mergeBase}\`)`,
    `- Range: \`${feature.mergeBase}..HEAD\` (${feature.count} commit(s))`,
    `- Conventional Commit violations: ${feature.violations}${feature.merges > 0 ? ` | merge commits: ${feature.merges}` : ""}`,
    "",
  ];
}

/** The recent commit log, full format only. */
export function gitLogLines(gitLog, { isMinimal, isBrief }) {
  if (!gitLog || gitLog.length === 0 || isMinimal || isBrief) {
    return [];
  }

  return ["### Recent Commits", "", "```", gitLog.slice(0, 1000), "```", ""];
}

/** Roadmaps, changelogs and key documents found under docs/. */
export function docsLines(docsScan, { isMinimal, isBrief }) {
  if (!docsScan || isMinimal) {
    return [];
  }

  const lines = [];

  if (docsScan.roadmaps.length > 0 || docsScan.changelogs.length > 0) {
    lines.push("### Documentation Status", "");

    if (docsScan.roadmaps.length > 0) {
      lines.push("**Roadmaps:**");

      for (const r of docsScan.roadmaps) {
        lines.push(`- \`${r.path}\` (${r.size}B, last modified: ${r.modified})`);
      }

      lines.push("");
    }

    if (docsScan.changelogs.length > 0) {
      lines.push("**Changelogs:**");

      for (const c of docsScan.changelogs) {
        lines.push(`- \`${c.path}\` (${c.size}B, last modified: ${c.modified})`);
      }

      lines.push("");
    }
  }

  if (docsScan.keyDocs.length > 0 && !isBrief) {
    lines.push("**Key documents:**");
    const sorted = docsScan.keyDocs.sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, 10);

    for (const d of sorted) {
      lines.push(`- \`${d.path}\` (${d.size}B, ${d.modified})`);
    }

    lines.push("");
  }

  return lines;
}

/** The session-close recovery steps and the resume prompt the document closes with. */
export function footerLines({ projectName, isMinimal, isCloseSession }) {
  const lines = [];

  if (isCloseSession && !isMinimal) {
    lines.push(
      "### Next Session Recovery",
      "",
      "To resume this session in a new chat:",
      "",
      "1. Run `rule_tool_handoff` to load this context.",
      "2. Review the ADR log in `docs/adr/` for all decisions made.",
      "3. Check the working tree changes listed above.",
      "4. Review planning artifacts in `_bmad-output/` or `.context/` if applicable.",
      "5. Continue from the next logical task.",
      "",
    );
  }

  if (isMinimal) {
    lines.push("Continue work on " + projectName + ". ADRs at docs/adr/. Do not re-ask.", "");
  } else {
    lines.push(...resumePromptLines({ projectName }));
  }

  return lines;
}
