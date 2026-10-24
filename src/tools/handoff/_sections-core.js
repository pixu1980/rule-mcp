/** Handoff sections from project state: header, identity, the ADR log, the context snapshot. */
import { compressValue, priorityScore } from "./_format.js";

/** Title line(s), with the session-close banner when closing. */
export function headerLines({ projectName, isMinimal, isCloseSession }) {
  if (isMinimal) {
    return [`HANDOFF:${projectName}`];
  }

  const lines = [`## ${isCloseSession ? "SESSION CLOSE" : "HANDOFF"}: ${projectName}`, ""];

  if (isCloseSession) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    lines.push(`_Session closed at ${now}_`, `_Run \`rule_tool_handoff\` in a new session to resume._`, "");
  }

  return lines;
}

/** The project identity block. */
export function identityLines(identity, { isBrief, isMinimal }) {
  if (!identity.name || isMinimal) {
    return [];
  }

  if (isBrief) {
    return [`Project: ${identity.name}${identity.version ? ` v${identity.version}` : ""}`, ""];
  }

  const lines = ["### Project Identity"];

  if (identity.description) {
    lines.push(`- Description: ${compressValue(identity.description, 150)}`);
  }

  if (identity.version) {
    lines.push(`- Version: ${identity.version}`);
  }

  lines.push("");

  return lines;
}

/** The ADR log, highest priority: table, brief list, or minimal head. */
export function adrLines(adrs, { isBrief, isMinimal }) {
  if (adrs.length === 0) {
    return isMinimal ? [] : ["### ADR Log", "*No ADRs recorded yet.*", ""];
  }

  const lines = [];

  if (isMinimal) {
    lines.push(`ADRs:${adrs.length}`);

    for (const a of adrs.slice(0, 3)) {
      lines.push(`- ${String(a.number).padStart(3, "0")}|${a.status}|${compressValue(a.title, 60)}`);
    }
  } else if (isBrief) {
    lines.push(`ADRs (${adrs.length}):`);

    for (const a of adrs) {
      lines.push(`- ${String(a.number).padStart(3, "0")}: [${a.status}] ${compressValue(a.title, 80)}`);
    }
  } else {
    lines.push("### ADR Log", "", "| # | Status | Title | Tags | Decision |", "|---|--------|-------|------|----------|");

    for (const a of adrs) {
      lines.push(`| ${String(a.number).padStart(3, "0")} | ${a.status} | ${compressValue(a.title, 60)} | ${a.tags.slice(0, 3).join(", ")} | ${compressValue(a.decision, 100)} |`);
    }
  }

  lines.push("");

  return lines;
}

/** The context snapshot, sorted by priority then compressed to the format. */
export function contextLines(contextValues, { isBrief, isMinimal, compress }) {
  const contextEntries = Object.entries(contextValues);

  if (contextEntries.length === 0) {
    return [];
  }

  const sorted = contextEntries.sort((a, b) => priorityScore(b[0]) - priorityScore(a[0]));
  const lines = [];

  if (isMinimal) {
    const minimal = {};

    for (const [k, v] of sorted.slice(0, 15)) {
      minimal[k] = compressValue(v, 40);
    }

    lines.push(`Ctx:${JSON.stringify(minimal)}`);
  } else if (compress) {
    const chunk = sorted
      .filter(([k]) => !k.endsWith("_count"))
      .slice(0, 30)
      .map(([k, v]) => `${k}=${compressValue(String(v).replaceAll("\n", String.raw`\n`), 60)}`)
      .join("  ");

    lines.push("### Snapshot (compressed)", chunk);
  } else {
    lines.push("### Context Snapshot", "");

    for (const [k, v] of sorted) {
      if (!k.endsWith("_count")) {
        lines.push(`- \`${k}\`: ${compressValue(v, isBrief ? 50 : 200)}`);
      }
    }
  }

  lines.push("");

  return lines;
}
