

/** The two key tiers: what normalizes, what forks the key, what has no key at all. */
import test from "node:test";
import assert from "node:assert/strict";
import { cacheClear, cacheKey, normalizedKey } from "./_tiers.fixture.mjs";

// ── The normalized key ──

test("a rephrased prompt produces the same normalized key", () => {
  const a = normalizedKey("pix_tool", { prompt: "Svelte stores for shared state?" });
  const b = normalizedKey("pix_tool", { prompt: "svelte store for shared state" });

  assert.ok(a, "a prompt-shaped argument produces a normalized key");
  assert.equal(a, b, "the two phrasings are one question");
});

test("an interrogative opening does not fork the key", () => {
  assert.equal(normalizedKey("pix_tool", { prompt: "How do I use a container query?" }), normalizedKey("pix_tool", { prompt: "container queries" }));
});

test("a field whose value reaches the output is not normalizable", async () => {
  // The reason, checked rather than assumed: `mode=search` prints the query in
  // its own heading, so replaying a stored answer for a rephrased query would
  // hand back a header for a question nobody asked.
  const { callTool: call } = await import("../../../../tools/router/index.js");
  const { loadAllSkills } = await import("../../../skills/index.js");
  await loadAllSkills(true);

  const searched = await call("rule_tool_styleguide_css", { mode: "search", query: "zzmarkerzz container" });
  assert.ok(searched.content[0].text.includes("zzmarkerzz"), "search echoes its query verbatim");
  assert.equal(normalizedKey("rule_tool_styleguide_css", { query: "zzmarkerzz container" }), null, "so it must not get a normalized key");

  const routed = await call("pix_tool", { prompt: "react button component" });
  assert.ok(normalizedKey("pix_tool", { prompt: "react button component" }), "the router's prompt is on the allowlist");
  assert.ok(routed.content[0].text.includes("rule-frontend-react"), "and it routed");
});

test("an answer that quotes the question gets no normalized entry", async () => {
  // The allowlist is necessary and not sufficient. `pix_tool` does not echo the
  // prompt when it routes confidently, and does echo it when it cannot: the
  // uncertain answer carries `No strong match for "<prompt>"`. Replaying that
  // for a differently worded question hands back a sentence about a prompt
  // nobody typed, and the uncertain answer is the least worth replaying.
  const { callTool: call } = await import("../../../../tools/router/index.js");
  cacheClear();

  const uncertain = await call("pix_tool", { prompt: "zzmarkerzz zzothermarkerzz" });
  assert.ok(uncertain.content[0].text.includes("zzmarkerzz"), "an uncertain route quotes the prompt");

  const rephrased = await call("pix_tool", { prompt: "zzothermarkerzz zzmarkerzz!" });
  assert.equal(rephrased._meta?.pixCache?.tier, undefined, "so the rephrasing must recompute");

  cacheClear();
  await call("pix_tool", { prompt: "svelte store for shared state" });
  const confident = await call("pix_tool", { prompt: "Svelte stores for shared state?" });
  assert.equal(confident._meta?.pixCache?.tier, "normalized", "a confident route does replay");
});

test("a non-prompt argument still changes the answer, so it stays in the key", () => {
  const base = { prompt: "react button", mode: "full" };
  assert.notEqual(normalizedKey("pix_tool", base), normalizedKey("pix_tool", { ...base, mode: "tldr" }), "an unrelated argument changes the output and must change the key");
  assert.notEqual(normalizedKey("pix_tool", base), normalizedKey("pix_tool", { ...base, framework: "vue" }));
});

test("capitalization does not fork the key", () => {
  // The search tokenizer splits camelCase and emits the parts alongside the
  // whole token, so `TypeScript` produced three terms and `typescript` one.
  // Canonicalization must not, or the same question typed two ways is two keys.
  assert.equal(normalizedKey("pix_tool", { prompt: "TypeScript: any vs unknown?" }), normalizedKey("pix_tool", { prompt: "typescript any vs unknown" }));
});

test("merging stays conservative: a content word is not dropped", () => {
  // Under-merging costs one miss. Over-merging replays an answer to a question
  // that was not asked, and the caller cannot tell.
  assert.notEqual(normalizedKey("pix_tool", { prompt: "build a react button component" }), normalizedKey("pix_tool", { prompt: "react button component" }));
});

test("two tools never share a normalized key", () => {
  assert.notEqual(normalizedKey("pix_tool", { prompt: "react button" }), normalizedKey("rule_tool_gateway", { prompt: "react button" }));
});

test("no normalizable argument means no normalized key", () => {
  assert.equal(normalizedKey("rule_tool_detect", { path: "." }), null, "nothing to normalize");
  assert.equal(normalizedKey("rule_tool_component", { component: "button" }), null);
  assert.equal(normalizedKey("pix_tool", { prompt: "the and for" }), null, "a prompt of only stopwords");
});

test("a non-cacheable tool has no key at either tier", () => {
  for (const tool of ["rule_tool_apply", "rule_tool_fix", "rule_tool_process_handon", "rule_tool_gateway"]) {
    assert.equal(cacheKey(tool, { prompt: "x" }), null, `${tool} must not be keyed`);
    assert.equal(normalizedKey(tool, { prompt: "x" }), null, `${tool} must not be keyed`);
  }
});

test("the normalized key cannot collide with the exact key", () => {
  const args = { prompt: "react button" };
  assert.notEqual(cacheKey("pix_tool", args), normalizedKey("pix_tool", args));
});
