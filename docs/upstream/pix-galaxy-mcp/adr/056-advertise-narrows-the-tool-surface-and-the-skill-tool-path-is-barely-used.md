# 056: Advertise narrows the tool surface, and the skill-tool path is barely used

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: tools, tokens, measurement, mcp, schema, skills

- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

R1 raised the tool-surface ceiling from 16,500 to 16,800 and recorded that R4 would not fit under it either, with the instruction to weigh whether ninety tool entries is still the right shape before raising it again. R2 built the instrument that question needed: every call now records the path it arrived on.

The number, over 1,340 real calls in this repository's own log: 58% arrived at the router, 25% at an action tool, 8% at the gateway, and 8% straight at a skill tool. **Two of the eighty-seven skill tools had ever been called.** Eighty-five tools were being described on every turn of every session, including the turns that touch no skill, for a path used eight percent of the time and covering two skills.

Then a second finding, from looking at where the weight actually was. `listTools()` derives the advertised schema from the zod schema whenever one is present, and overwrites any hand-written `inputSchema`. So the deliberately lean `inputSchema` in `tools/skill.js` had been dead code since P7, and the comments beside it claimed savings that never happened. P7's trim worked, but it worked because the property descriptions were removed from the zod schema, not because of the block that said it was there to be lean.

## Decision

Two things, and the ordering matters: trim first, and the trim turned out to be larger than any raise would have been.

A tool may declare `advertise`, a list of property names, and `listTools()` narrows what it publishes to those. It does not narrow what the tool accepts: validation stays with the zod schema, so a caller that knows about a field keeps it. The two questions are genuinely different - a property costs tokens on every turn and is worth advertising only if the model should reach for it - and they had been conflated because only one of them was implemented. It is opt-in per tool, because a hand-written schema sitting beside a zod schema was silently ignored for three phases and an explicit list cannot be misread that way.

The skill tools now advertise four properties instead of seven. `fileName`, `isComponent` and `allowedDependencies` are guardrail context for `mode=check` only, and `pix_check` is the tool built for that job and advertises all three in full. That freed about 2,700 tokens per turn, so the ceiling came **down** to 14,500 with the surface at ~14,080 after R4's two new skills - tighter than it has ever been, against 16,800 before.

The entry-path number is recorded here rather than acted on. It is one machine and mostly this repository's own sessions, so it argues for a shape change rather than proving one, and removing eighty-five tools would supersede part of ADR 033 and break every client that calls one directly. R8 is the phase that owns that decision, and it now has both a number and 400 tokens of headroom instead of a raise.

## Consequences

Two new skills, `rule-mcp-context-engineering` and `rule-mcp-agent-architecture`, at 195 and 207 lines. The corpus gained six prompts and sits at 51 of 59 exact, 100% top-or-alternative, against 46 of 53 before.

Adding two documents to the corpus caused two regressions, which is the risk the modern-platform plan named and which arrived a phase early. One was a real defect and is fixed: `rule-mcp-prompting` could not win "how do I write a better prompt for the agent" because the stemmer does not reduce "prompting" to "prompt", so the skill about prompts gets no name bonus from the word while the skill about agents gets a full one from "agent". The fix is content - the reader's own words now appear in a heading - because changing the stemmer is a scorer change and belongs in its own phase with its own number.

The other is left as a near miss and annotated in the corpus. "Where did I leave off last session" lost to the prompting skill because two more documents shift the term statistics for every query, and after stopwords that query is competing on the word "session" alone: "leave", "off" and "last" are all filtered. Fixing it would mean writing prose to satisfy a scorer, which is the inverse of the rule that a corpus of prompts written to pass measures nothing.

## Alternatives Considered

1. Raise the ceiling a second time. Rejected: the budget file already called raising it repeatedly the absence of a decision, and a trim existed.
2. Remove the three fields from the zod schema instead of from what is advertised. Rejected: Zod strips unknown keys silently, so a caller passing `fileName` would lose it with no error, turning an advertising change into a capability regression.
3. Make a hand-written `inputSchema` win over the derived one. Rejected for now: fifteen tools supply both, so it would change what every one of them advertises at once, and each would need auditing for a required field the hand-written version omits.
4. Act on the entry-path number here by hiding the skill tools. Rejected: it supersedes part of ADR 033, breaks direct callers, and rests on one machine's log. It is R8's decision, with the number in hand.
