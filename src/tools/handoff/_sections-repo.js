/** Handoff sections from the repository: working tree, semantic changes, recent commits, docs scan, footers. */
import { TOKENSAVE_DIRECTIVE, tokensaveActive } from "../../core/agents/_integrations.js";

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

/** The session-close recovery steps and the closing handoff instruction. */
export function footerLines({ projectName, isMinimal, isCloseSession }) {
  const lines = [];

  if (isCloseSession && !isMinimal) {
    lines.push(
      "### Next Session Recovery",
      "",
      "To resume this session in a new chat:",
      "",
      "1. Run `rule_tool_process_handoff` to load this context.",
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
    lines.push(
      "### Handoff Instruction",
      "",
      `You are continuing work on **${projectName}**.`,
      "The ADR log and context snapshot capture everything decided so far.",
      "",
      "Review ADRs for architectural decisions. Review snapshot for configuration.",
      "Continue without re-asking answered questions.",
      "",
    );
  }

  return lines;
}
