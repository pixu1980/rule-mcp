// test/architect-golden-snapshot.test.mjs
//
// Phase 5, Task 4: pin the generated pack so the lean + conditional policy
// cannot drift silently. The empty-section policy is the one change in Phase 5
// with a broad blast radius — it rewrites every markdown file — so a snapshot
// is the only thing that catches an accidental over-deletion.
//
// Two variants, because `emitWhen` makes the pack shape input-dependent:
//   - generic  (PROJECT_TYPE=webapp) — the 3 domain-overfit templates omitted
//   - domain   (PROJECT_TYPE=other)  — all templates emitted, including the
//                                      JSON schema whose format policy differs
//
// The snapshot stores a manifest (path + size + sha256 of every emitted file)
// rather than full bodies: it fails on any content change, stays readable in
// a diff, and does not bloat the repo. Regenerate intentionally with:
//
//   UPDATE_ARCHITECT_SNAPSHOT=1 node --test test/architect-golden-snapshot.test.mjs
//
// and review the manifest diff in the commit.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";
import { generateContext, generateContextContent } from "../skills/rule-architect/generator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SNAPSHOT_PATH = join(__dirname, "fixtures/architect-golden-manifest.json");

const spec = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/wizard-spec.json"), "utf-8"));
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/architect-full-answers.json"), "utf-8"));

const VARIANTS = {
  generic: { ...fixture, PROJECT_TYPE: "webapp" },
  domain: { ...fixture, PROJECT_TYPE: "other" },
};

function sha256(text) {
  return createHash("sha256").update(text, "utf-8").digest("hex").slice(0, 16);
}

function manifestOf(files) {
  return Object.fromEntries(
    [...files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => [f.path, { bytes: Buffer.byteLength(f.content, "utf-8"), sha256: sha256(f.content) }])
  );
}

function buildManifest() {
  return Object.fromEntries(
    Object.entries(VARIANTS).map(([name, answers]) => [name, manifestOf(generateContextContent(answers, spec))])
  );
}

const actual = buildManifest();

if (process.env.UPDATE_ARCHITECT_SNAPSHOT === "1") {
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(actual, null, 2)}\n`, "utf-8");
  console.log(`architect golden snapshot rewritten: ${relative(ROOT, SNAPSHOT_PATH)}`);
}

test("the generated pack matches the committed golden snapshot", () => {
  assert.ok(
    existsSync(SNAPSHOT_PATH),
    `missing snapshot — create it with UPDATE_ARCHITECT_SNAPSHOT=1 node --test ${relative(ROOT, import.meta.filename)}`
  );
  const expected = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));

  for (const variant of Object.keys(VARIANTS)) {
    assert.deepEqual(
      Object.keys(actual[variant]).sort(),
      Object.keys(expected[variant] || {}).sort(),
      `${variant}: the set of emitted files changed`
    );
    assert.deepEqual(
      actual[variant],
      expected[variant],
      `${variant}: generated content changed — inspect the diff, then re-run with UPDATE_ARCHITECT_SNAPSHOT=1 if intended`
    );
  }
});

test("the two variants differ by exactly the gated templates", () => {
  const generic = new Set(Object.keys(actual.generic));
  const domain = new Set(Object.keys(actual.domain));

  const onlyInDomain = [...domain].filter((p) => !generic.has(p)).sort();
  const onlyInGeneric = [...generic].filter((p) => !domain.has(p)).sort();

  assert.deepEqual(onlyInDomain, [
    "schemas/ruleset.schema.json",
    "specs/03-calculation-engine.md",
    "specs/04-ruleset-config.md",
  ]);
  assert.deepEqual(onlyInGeneric, [], "no template may be exclusive to the generic project");
});

test("the disk writer produces byte-identical content to the in-memory renderer", () => {
  // Guards the two generator entry points against drift: same answers must
  // yield the same bytes whether the caller is a server (in-memory) or the
  // CLI (disk). They share renderAll, and this is what proves it.
  const dir = mkdtempSync(join(tmpdir(), "architect-golden-"));
  try {
    const { files: reported } = generateContext(VARIANTS.domain, spec, dir);

    const onDisk = [];
    const walk = (current) => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          onDisk.push(full);
        }
      }
    };
    walk(dir);

    // `.context/`-relative paths are reported without the `.context/` prefix,
    // so compare on the reported path of each written file.
    const diskByPath = new Map(
      onDisk.map((full) => [
        relative(dir, full).split(sep).join("/").replace(/^\.context\//, ""),
        readFileSync(full, "utf-8"),
      ])
    );

    assert.equal(diskByPath.size, reported.length, "every reported file must exist on disk exactly once");
    for (const file of reported) {
      assert.ok(diskByPath.has(file.path), `${file.path} was reported but not written`);
      assert.equal(diskByPath.get(file.path), file.content, `${file.path} differs between disk and memory`);
    }

    assert.deepEqual(manifestOf(reported), actual.domain, "the disk run must match the in-memory manifest");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rendering is deterministic across repeated runs", () => {
  assert.deepEqual(buildManifest(), actual, "two renders of the same answers must be identical");
});

test("every emitted file is non-empty", () => {
  for (const [variant, files] of Object.entries(actual)) {
    for (const [path, meta] of Object.entries(files)) {
      assert.ok(meta.bytes > 0, `${variant}: ${path} is empty`);
      // A file gutted down to a lone heading is a policy bug, not lean output.
      assert.ok(meta.bytes > 40, `${variant}: ${path} is suspiciously small (${meta.bytes} bytes)`);
    }
  }
  // Sanity-check the helper is actually seeing real files.
  assert.ok(statSync(join(ROOT, "skills/rule-architect/templates.json")).size > 0);
});
