/**
 * @module test/tokensave/changes-arms
 *
 * The arms `_changes.test.mjs` does not walk: a graph that answered but said
 * nothing worth printing, a diff that failed while the commit succeeded, a
 * modified symbol that is not the kind a history is worth asking for.
 *
 * Every one of them has to end in a smaller answer, never a thrown one: the
 * handoff prints what the graph gave and the raw diff carries the rest.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { graphChanges } from "../_changes.js";

const available = () => ({ available: true });

/** A client that answers each tool from a table, and fails anything absent. */
const clientOf = (table) => (tool) => table[tool] ?? { ok: false };

test("a commit call that failed is the same as no graph", () => {
  assert.equal(graphChanges("/tmp/p", { probe: available, client: clientOf({}) }), null);
});

test("a commit with an empty message and nothing changed says nothing", () => {
  assert.equal(graphChanges("/tmp/p", { probe: available, client: clientOf({ commit_context: { ok: true, value: { message: " ".repeat(3) } } }) }), null);
});

test("a commit payload that is not an object is refused", () => {
  assert.equal(graphChanges("/tmp/p", { probe: available, client: clientOf({ commit_context: { ok: true, value: null } }) }), null);
  assert.equal(graphChanges("/tmp/p", { probe: available, client: clientOf({ commit_context: { ok: true, value: "a string" } }) }), null);
});

test("changed files alone are enough to report, with no message", () => {
  const result = graphChanges("/tmp/p", { probe: available, client: clientOf({ commit_context: { ok: true, value: { changed_files: ["a.js"] } } }) });

  assert.ok(result, "the commit is worth printing");
  assert.equal(result.diff, null, "no files were named, so no diff was asked for");
  assert.equal(result.history, null, "and no symbol means no history");
});

test("symbols by role alone are enough too", () => {
  const result = graphChanges("/tmp/p", { probe: available, client: clientOf({ commit_context: { ok: true, value: { symbols_by_role: { added: ["f"] } } } }) });

  assert.ok(result);
  assert.deepEqual(Object.keys(result.commit.symbols_by_role), ["added"]);
});

test("a diff that failed leaves the commit standing", () => {
  const result = graphChanges("/tmp/p", {
    files: ["src/a.js"],
    probe: available,
    client: clientOf({ commit_context: { ok: true, value: { message: "a real subject" } }, diff_context: { ok: false } }),
  });

  assert.ok(result.commit, "the commit is reported");
  assert.equal(result.diff, null, "the diff that failed is simply absent");
});

test("a modified symbol of an uninteresting kind asks for no history", () => {
  const calls = [];
  const client = (tool, args) => {
    calls.push(tool);

    if (tool === "commit_context") {
      return { ok: true, value: { message: "a real subject" } };
    }

    return { ok: true, value: { changed_files: ["a.js"], modified_symbols: [{ name: "SOME_CONST", kind: "constant" }] } };
  };
  const result = graphChanges("/tmp/p", { files: ["src/a.js"], probe: available, client });

  assert.ok(result.diff, "the diff still reports");
  assert.equal(result.history, null);
  assert.ok(!calls.includes("log"), `no log call was made: ${calls.join(", ")}`);
});

test("a log that answered with no events reports no history", () => {
  const result = graphChanges("/tmp/p", {
    files: ["src/a.js"],
    probe: available,
    client: clientOf({
      commit_context: { ok: true, value: { message: "a real subject" } },
      diff_context: { ok: true, value: { changed_files: ["a.js"], modified_symbols: [{ name: "f", kind: "function" }] } },
      log: { ok: true, value: { events: [] } },
    }),
  });

  assert.equal(result.history, null, "an empty history is not a history");
});

test("a log that failed reports no history either", () => {
  const result = graphChanges("/tmp/p", {
    files: ["src/a.js"],
    probe: available,
    client: clientOf({
      commit_context: { ok: true, value: { message: "a real subject" } },
      diff_context: { ok: true, value: { changed_files: ["a.js"], modified_symbols: [{ name: "f", kind: "function" }] } },
      log: { ok: false },
    }),
  });

  assert.equal(result.history, null);
});

test("history is capped at five events", () => {
  const events = Array.from({ length: 9 }, (unused, n) => ({ short_sha: `sha${n}`, summary: `event ${n}` }));
  const result = graphChanges("/tmp/p", {
    files: ["src/a.js"],
    probe: available,
    client: clientOf({
      commit_context: { ok: true, value: { message: "a real subject" } },
      diff_context: { ok: true, value: { changed_files: ["a.js"], modified_symbols: [{ name: "f", kind: "function" }] } },
      log: { ok: true, value: { events } },
    }),
  });

  assert.equal(result.history.events.length, 5);
});

test("a diff call is handed at most fifty files", () => {
  let handed = 0;
  const client = (tool, args) => {
    if (tool === "commit_context") {
      return { ok: true, value: { message: "a real subject" } };
    }

    handed = args.files.length;

    return { ok: true, value: { changed_files: args.files } };
  };

  graphChanges("/tmp/p", { files: Array.from({ length: 120 }, (unused, n) => `src/f${n}.js`), probe: available, client });

  assert.equal(handed, 50, "the rest are left to the raw diff the handoff already prints");
});
