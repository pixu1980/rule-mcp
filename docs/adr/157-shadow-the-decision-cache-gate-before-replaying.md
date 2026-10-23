# 157: Shadow the decision-cache gate before replaying

- **Date**: 2026-10-23
- **Status**: accepted
- **Tags**: decision-models, cache, routing, observability
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The decision model is a closed-choice reranker, not a code analyzer. The tool cache has L0 exact, L1 normalized and an opt-in Nyx L2; a decision L3 could replay a cached result for a paraphrase, but the model's probabilities are not calibrated (Laya's correct picks sat at 0.067-0.332) and a false replay hands back the wrong answer. The decision cache already keys model + state + questions, so a stable candidate set is cheap to re-ask.

## Decision

Add an opt-in L3 gate built from deterministic parts: same-tool, same non-prompt args, fresh and non-echoing candidates; IDF-weighted overlap top five plus none; a redacted state and stable candidate descriptions; a choice question; a strict parser and hard guards. Phase 1 is shadow-only behind PIX_GALAXY_MCP_DECISION_CACHE_SHADOW=1: it writes decision-shadow.jsonl and never replays. The threshold defaults to 0.9 and is provisional. Replay waits until the corpus shows zero false replays. ADR 158 records the later opt-in replay and its measured floor.

## Consequences

No response changes in phase 1; an opt-in model call runs after the response on a cache miss; the report is local. Phase 2 can reuse the same protocol for replay. NON_CACHEABLE tools, error results, echoed prompts, stale deps and PIX_GALAXY_MCP_NO_CACHE still win. The gate is limited to pix_tool because it is the only tool with a NORMALIZABLE prompt field.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

A corpus where the shadow gate marks a replay that the deterministic oracle calls wrong, or a shadow hit rate that does not beat L0/L1, ends the gate; it stays shadow-only and is removed rather than tuned into risk.

## Alternatives Considered

1. Replay immediately and tune later: rejected because the probabilities are not calibrated and a wrong replay is silent.
1. Use a chat model to analyze code and decide cache admission: rejected for this phase because the decision model is the closed-choice head and code analysis would add a separate model stage.
1. Rely on the Nyx L2 only: rejected because it needs an external adapter and carries no decision labels for arbitrary cache entries.
