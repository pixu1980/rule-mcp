/**
 * @module test/plans/_cross-branch
 *
 * Reading the plans of branches this worktree does not check out. The level-0
 * test asks `git show` for them; this module owns the plumbing so the test
 * reads as assertions.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TEXT = readFileSync(join(root, "docs", "plans", "plan-of-plans.md"), "utf8");
export const BRANCHES = { ex: "feat/export", nyx: "feat/nyx" };
export const STATUSES = new Set(["planned", "in-progress", "done", "blocked", "superseded"]);
export const GRAPH_LINES = ["Depends on:", "Feeds:", "Shared files:"];

export const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

/** Local branch, else its remote-tracking twin, else fail: the gate is not optional. */
function ref(branch) {
  for (const candidate of [branch, `origin/${branch}`]) {
    try {
      git("rev-parse", "--verify", "--quiet", candidate);

      return candidate;
    } catch {
      // try the next spelling
    }
  }

  assert.fail(`branch ${branch} is neither local nor on origin`);
}

export const REFS = Object.fromEntries(Object.entries(BRANCHES).map(([alias, branch]) => [alias, ref(branch)]));
export const files = Object.fromEntries(
  Object.entries(REFS).map(([alias, resolved]) => [
    alias,
    git("ls-tree", "-r", "--name-only", resolved, "--", "docs/plans/")
      .split("\n")
      .filter((path) => path.endsWith(".md"))
      .sort(),
  ]),
);
export const instances = Object.entries(files).flatMap(([alias, paths]) => paths.map((path) => ({ alias, path })));
export const read = (alias, path) => git("show", `${REFS[alias]}:${path}`);

/** The body of a `## <heading>` section, or "". */
export function section(text, heading) {
  const start = text.indexOf(`\n${heading}`);

  if (start === -1) {
    return "";
  }

  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ", 3);

  return end === -1 ? rest : rest.slice(0, end);
}

/** One parseable line from a section body, trimmed, or "". */
export function line(body, label) {
  const found = body.split("\n").find((row) => row.trim().startsWith(label));

  return found ? found.trim().slice(label.length).trim() : "";
}

export const graph = (text) => section(text, "## Dependency graph");
export const stageSection = section(TEXT, "## 7 - Stages");
export const edgeSection = section(TEXT, "## 5 - The level-1 graph");

/** Every way a plan on the retrofitted branches breaks the ADR 154 format. */
export function formatOffenders() {
  const offenders = [];

  for (const { alias, path } of instances) {
    const text = read(alias, path);
    const value = text
      .match(/^Status:\s*(.+)$/m)?.[1]
      ?.replaceAll("`", "")
      .trim()
      .split(/[\s,.]/, 1)[0];
    const body = graph(text);
    const where = `${path} on ${BRANCHES[alias]}`;

    if (!value || !STATUSES.has(value)) {
      offenders.push(`${where}: ${value ?? "no Status: line"}`);
    }

    if (!body) {
      offenders.push(`${where}: no ## Dependency graph`);
    }

    for (const label of GRAPH_LINES) {
      if (!line(body, label)) {
        offenders.push(`${where}: no ${label}`);
      }
    }

    if (!/^- \[[ xX]\]/m.test(text)) {
      offenders.push(`${where}: no checkbox step`);
    }
  }

  return offenders;
}

/** The stage number of a branch alias, from the headings of section 7. */
export function stageOf(alias) {
  const found = stageSection.match(new RegExp(String.raw`^### Stage (\d+) - [^\n]*\`${alias}\``, "m"));

  return found ? Number(found[1]) : null;
}

/** The MERGE and REBASE edges of section 5, as source/target pairs. */
export function mergeEdges() {
  return edgeSection
    .split("\n")
    .filter((row) => /^\| `/.test(row))
    .map((row) =>
      row
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .flatMap(([from, to, kind]) => {
      if (!["MERGE", "REBASE"].includes(kind.replaceAll("`", ""))) {
        return [];
      }

      const target = to.match(/`([^`]+)`/)?.[1] ?? "";
      const sources = [...from.split("->", 1)[0].matchAll(/`([^`]+)`/g)].map((match) => match[1]);

      return sources.map((source) => ({ source, target }));
    });
}

/** The level-1 edges of the fenced block, as from/to pairs. */
export function levelEdges() {
  return [...edgeSection.matchAll(/^(\S+)\s+--[A-Z]+-->\s+(\S+)/gm)].map(([, from, to]) => ({ from, to }));
}
