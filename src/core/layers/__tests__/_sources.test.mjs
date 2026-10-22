

/**
 * The three layers a skill or persona can come from, and the order they
 * resolve in (ADR 089): native, then project, then user. Last wins.
 *
 * Path computation only - nothing here touches the directories it names, so
 * the order is a property of the code rather than of the machine.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const home = mkdtempSync(join(tmpdir(), "rule-layers-home-"));

process.env.RULE_MCP_HOME = home;

const { layerSources, LAYERS } = await import("../_sources.js");
const { findProjectRoot } = await import("../../../cli/paths/index.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

/** A scratch project with the given marker directories created. */
function project(...markers) {
  const root = mkdtempSync(join(tmpdir(), "rule-layers-project-"));

  for (const marker of markers) {
    mkdirSync(join(root, marker), { recursive: true });
  }

  return root;
}

test("the layers resolve native first and user last", () => {
  const root = project(".git");

  try {
    const sources = layerSources("skills", { cwd: root });

    assert.deepEqual(
      sources.map((source) => source.layer),
      ["native", "project", "user"],
      "the order is the precedence: the last one read wins",
    );
    assert.deepEqual(LAYERS, ["native", "project", "user"], "the order is published, so a caller never re-derives it");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("each layer points where that layer lives", () => {
  const root = project(".git");

  try {
    const [native, projectLayer, user] = layerSources("skills", { cwd: root });

    assert.equal(native.dir, fileURLToPath(new URL("../../../../skills", import.meta.url)), `the native layer is the bundled directory: ${native.dir}`);
    assert.equal(projectLayer.dir, join(root, ".rule-mcp", "skills"), "the project layer lives in the checkout");
    assert.equal(user.dir, join(home, "skills"), "the user layer lives under the rule home");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("personas resolve through the same three layers", () => {
  const root = project(".git");

  try {
    const [native, projectLayer, user] = layerSources("personas", { cwd: root });

    assert.equal(native.dir, fileURLToPath(new URL("../../../../personas", import.meta.url)), `personas are bundled beside skills: ${native.dir}`);
    assert.equal(projectLayer.dir, join(root, ".rule-mcp", "personas"));
    assert.equal(user.dir, join(home, "personas"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the project layer is found by walking up to the repository root", () => {
  const root = project(".git");
  const nested = join(root, "packages", "web", "src");
  mkdirSync(nested, { recursive: true });

  try {
    const [, projectLayer] = layerSources("skills", { cwd: nested });

    assert.equal(projectLayer.dir, join(root, ".rule-mcp", "skills"), "a server started in a subdirectory still finds the project");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a .rule-mcp directory marks a project root on its own", () => {
  const root = project(".rule-mcp");
  const nested = join(root, "src");
  mkdirSync(nested, { recursive: true });

  try {
    assert.equal(findProjectRoot(nested), root, "a project needs no git to declare itself");
    assert.equal(layerSources("skills", { cwd: nested })[1].dir, join(root, ".rule-mcp", "skills"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a directory that is no project falls back to itself", () => {
  const root = project();

  try {
    assert.equal(findProjectRoot(root), root, "with no marker the starting directory is the project");
    assert.equal(layerSources("skills", { cwd: root })[1].dir, join(root, ".rule-mcp", "skills"), "so the project layer is still addressable");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unknown kind is refused rather than resolved to a guess", () => {
  assert.throws(() => layerSources("plugins"), /unknown layer kind/i, "only skills and personas are layered");
});
