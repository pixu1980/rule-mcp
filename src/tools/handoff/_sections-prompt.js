

/**
 * @module tools/handoff/sections-prompt
 *
 * The block the handoff closes with: the prompt the next session opens with.
 *
 * A prompt printed in the chat alone dies with the chat. Written into the
 * document it travels with the file, and `handon` hands it back on resume.
 *
 * What this renderer cannot know is the two facts that make the block worth
 * having: the path of the document it lands in, and the first step of the next
 * session. Both are added by whoever persists the handoff, which is told to.
 */

/**
 * The resume prompt section, or nothing when the format is a one-line paste.
 *
 * @param {{ projectName: string }} data
 * @param {{ isMinimal?: boolean, heading?: string }} [shape]
 * @returns {string[]}
 */
export function resumePromptLines({ projectName }, { isMinimal, heading = "###" } = {}) {
  // A minimal handoff is a paste, not a document anyone resumes from, and four
  // lines of prompt would be most of it.
  if (isMinimal) {
    return [];
  }

  return [
    `${heading} Resume Prompt`,
    "",
    "The next session opens with this block. Add the path of this document and the first step of the next session before saving it.",
    "",
    "```prompt",
    `Resume work on ${projectName}. Run \`rule_tool_handon\` first: it checks which claims in this handoff still hold before any of them are trusted.`,
    "The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions.",
    "Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.",
    "```",
    "",
  ];
}
