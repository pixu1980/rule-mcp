/** Render one ADR document from its fields (Nygard template). */
import { adrAuthor } from "./_author.js";

/** Generate ADR markdown content. */
export function generateAdr({ number, title, status, context, decision, consequences, alternatives, endsWhen, tags, date, author }) {
  date ??= new Date().toISOString().slice(0, 10);
  const lines = [
    `# ${String(number).padStart(3, "0")}: ${title}`,
    "",
    `- **Date**: ${date}`,
    `- **Status**: ${status}`,
    `- **Tags**: ${tags.join(", ")}`,
    `- **Author**: ${author || adrAuthor()}`,
    "",
    "## Context",
    "",
    context || "The forcing factors that led to this decision.",
    "",
    "## Decision",
    "",
    decision || "The decision taken, and why.",
    "",
    "## Consequences",
    "",
    consequences || "What this costs and what it buys, both stated.",
    "",
    // Written now, because the assumptions a decision leans on are clear while
    // it is being taken and invisible a year later. Without it a reversal is
    // only ever noticed by accident.
    "## What would end this",
    "",
    endsWhen || "The assumption this leans on, and the observation that would make it wrong.",
    "",
  ];

  if (alternatives?.length > 0) {
    lines.push("## Alternatives Considered", "");

    for (const alt of alternatives) {
      lines.push(`1. ${alt}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/** Exported so the template can be asserted without writing a file. */
export function buildAdrBody(fields) {
  return generateAdr(fields);
}
