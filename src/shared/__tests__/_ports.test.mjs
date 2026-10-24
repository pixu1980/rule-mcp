/**
 * ARCH-5: the store port is four operations and no surprises.
 *
 * A caller that keeps its state in a bare Map cannot be handed another kind of
 * store without editing it, and cannot be driven by a test without reaching
 * into it. The port is the shape both sides agree on, and these tests pin what
 * each operation does - including the one that moves the sliding window
 * (`sweep`), which is the operation a caller is most likely to get wrong.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const { createFileStore, createMemoryStore } = await import("../ports/index.js");

/** A scratch directory for the tests that need a file. */
function home() {
  return mkdtempSync(join(tmpdir(), "rule-mcp-ports-"));
}

/** The shape a caller supplies: what goes in the file, and what comes back out. */
const CODEC = {
  encode: (entries) => ({ version: 1, entries: Object.fromEntries(entries) }),
  decode: (parsed) => Object.entries(parsed.entries ?? {}),
};

test("a store returns what was set and reports what it holds", () => {
  const store = createMemoryStore();

  assert.equal(store.size(), 0, "a new store is empty");
  assert.equal(store.get("absent"), undefined, "and answers nothing for a key it never held");

  store.set("a", { seen: 1 });

  assert.deepEqual(store.get("a"), { seen: 1 }, "a set value comes back");
  assert.equal(store.size(), 1, "and counts once");
});

test("deleting reports whether the key was there", () => {
  const store = createMemoryStore();

  store.set("a", 1);

  assert.equal(store.delete("a"), true, "the key was there");
  assert.equal(store.delete("a"), false, "and the second delete says it was not");
  assert.equal(store.size(), 0, "the store is empty again");
});

test("sweep drops what the predicate accepts, and everything without one", () => {
  const store = createMemoryStore();

  store.set("old", { seen: 0 });
  store.set("fresh", { seen: 100 });

  const dropped = store.sweep((value) => value.seen < 50);

  assert.equal(dropped, 1, "sweep reports how many it dropped");
  assert.equal(store.get("old"), undefined, "the stale entry is gone");
  assert.deepEqual(store.get("fresh"), { seen: 100 }, "and the fresh one is untouched");

  assert.equal(store.sweep(), 1, "a sweep with no predicate drops the rest");
  assert.equal(store.size(), 0, "leaving an empty store");
});

test("entries walks what is there, so a caller can act on each of them", () => {
  const store = createMemoryStore();

  store.set("a", 1);
  store.set("b", 2);

  assert.deepEqual(
    [...store.entries()].sort(),
    [
      ["a", 1],
      ["b", 2],
    ],
    "every pair is reachable",
  );
});

test("two stores do not share state", () => {
  const first = createMemoryStore();
  const second = createMemoryStore();

  first.set("a", 1);

  assert.equal(second.size(), 0, "a store is its own state, so a test cannot leak into production");
});

test("a file store keeps what a memory store keeps", () => {
  const store = createFileStore({ file: join(home(), "cache.gz"), ...CODEC });

  store.set("a", { seen: 1 });

  assert.deepEqual(store.get("a"), { seen: 1 }, "the port answers the same way");
  assert.equal(store.size(), 1, "and counts the same way");
  assert.equal(store.delete("a"), true, "and deletes the same way");
  assert.equal(store.size(), 0, "leaving the same empty store");
});

test("a file store survives the process that wrote it", () => {
  const file = join(home(), "cache.gz");
  const first = createFileStore({ file, ...CODEC });

  first.set("kept", { seen: 1 });
  first.persist();

  // A second store reads the same file: this is the restart, in one process.
  const second = createFileStore({ file, ...CODEC });

  assert.deepEqual(second.get("kept"), { seen: 1 }, "an entry outlives the store that wrote it");
});

test("releasing hands the entries back and keeps the file", () => {
  const file = join(home(), "cache.gz");
  const store = createFileStore({ file, ...CODEC });

  store.set("kept", { seen: 1 });

  assert.equal(store.release(), 1, "release reports what it let go of");
  assert.equal(store.size(), 0, "the store holds nothing until something asks");
  assert.deepEqual(store.get("kept"), { seen: 1 }, "and the next read takes the entries back from the file");
});

test("an entry the decode step rejects never loads", () => {
  const file = join(home(), "cache.gz");
  const write = createFileStore({ file, ...CODEC });

  write.set("stale", { seen: 1 });
  write.persist();

  const read = createFileStore({ file, encode: CODEC.encode, decode: () => [] });

  assert.deepEqual([...read.entries()], [], "the file's entries are the decode step's to accept or drop");
  assert.equal(read.get("stale"), undefined, "and a rejected entry is never served");
});
