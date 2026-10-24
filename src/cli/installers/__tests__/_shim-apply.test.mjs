/**
 * The global launcher: probed, healed, and removed.
 *
 * A shim pins the absolute path of the repo it was created from. Move the
 * project and it stays on PATH and crashes on launch, and every agent install
 * after it fails silently (ADR 045). This was a contract asserted against the
 * bash in install.sh; the bash is a bootstrap now (ADR 090), so the same
 * contract is asserted against the node that replaced it.
 *
 * Every case runs in a child process with its own HOME, PATH and PNPM_HOME:
 * the module reads the real PATH to find the shim, and a test that let it see
 * this machine's would depend on this machine.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const applyModule = join(here, "..", "..", "setup", "_shim-apply.js");
const localBin = join(here, "..", "..", "..", "..", "bin", "rule-mcp.js");

/** Whether one swept entry actually went. */
const isRemoved = (entry) => entry.status === "removed";

/** A HOME with its own bin dir, and optionally a shim that does not launch. */
function sandbox({ brokenShim = false } = {}) {
  const home = mkdtempSync(join(tmpdir(), "rule-mcp-shim-"));
  const bin = join(home, "bin");

  mkdirSync(bin, { recursive: true });

  if (brokenShim) {
    writeFileSync(join(bin, "rule-mcp"), "#!/bin/sh\nexit 3\n");
    chmodSync(join(bin, "rule-mcp"), 0o755);
  }

  return { home, bin };
}

/**
 * Run one call against the module in a child process, and return its JSON.
 *
 * @param {string} call - an expression over the module's exports
 * @param {{ home: string, bin: string, skip?: boolean }} env
 */
function run(call, { home, bin, skip = false }) {
  const source = `
    const mod = await import(${JSON.stringify(applyModule)});
    const { ensureGlobalShim, removeGlobalShims } = mod;
    process.stdout.write(JSON.stringify(${call}));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", source], {
    encoding: "utf8",
    env: {
      PATH: [bin, dirname(process.execPath), "/usr/bin", "/bin"].join(":"),
      HOME: home,
      PNPM_HOME: join(home, ".pnpm"),
      ...(skip && { RULE_MCP_SKIP_GLOBAL_LINK: "1" }),
    },
  });

  return JSON.parse(out);
}

test("a shim that does not launch is rewritten, not trusted", () => {
  const box = sandbox({ brokenShim: true });

  try {
    const result = run(`ensureGlobalShim({ localBin: ${JSON.stringify(localBin)} })`, box);

    assert.equal(result.status, "relinked", JSON.stringify(result));

    const written = readFileSync(result.path, "utf8");

    assert.match(written, /^#!\/bin\/sh/, "the shim is a launcher script");
    assert.ok(written.includes(JSON.stringify(localBin)), "the launcher points at this checkout");
    assert.doesNotMatch(written, /pnpm link --global/, "pnpm 10+ rewrites pnpm-workspace.yaml and the lockfile");
  } finally {
    rmSync(box.home, { recursive: true, force: true });
  }
});

test("no shim at all is a shim created", () => {
  const box = sandbox();

  try {
    const result = run(`ensureGlobalShim({ localBin: ${JSON.stringify(localBin)} })`, box);

    assert.equal(result.status, "created", JSON.stringify(result));
    assert.equal(result.path, join(box.home, ".pnpm", "bin", "rule-mcp"), "PNPM_HOME/bin wins when it is set");
  } finally {
    rmSync(box.home, { recursive: true, force: true });
  }
});

test("the escape hatch writes nothing, and says which one it is", () => {
  const box = sandbox({ brokenShim: true });

  try {
    const result = run(`ensureGlobalShim({ localBin: ${JSON.stringify(localBin)} })`, { ...box, skip: true });

    assert.equal(result.status, "skipped");
    assert.match(result.reason, /RULE_MCP_SKIP_GLOBAL_LINK/);
    assert.equal(readFileSync(join(box.bin, "rule-mcp"), "utf8"), "#!/bin/sh\nexit 3\n", "the stale shim is left");
  } finally {
    rmSync(box.home, { recursive: true, force: true });
  }
});

test("a dry run plans the write and performs none of it", () => {
  const box = sandbox();

  try {
    const result = run(`ensureGlobalShim({ localBin: ${JSON.stringify(localBin)}, dryRun: true })`, box);

    assert.equal(result.status, "planned");
    assert.throws(() => readFileSync(join(box.home, ".pnpm", "bin", "rule-mcp"), "utf8"));
  } finally {
    rmSync(box.home, { recursive: true, force: true });
  }
});

test("a removal sweeps the current name and the retired alias", () => {
  const box = sandbox();
  const dir = join(box.home, ".pnpm", "bin");

  mkdirSync(dir, { recursive: true });

  for (const name of ["rule-mcp", "rule-mcpd"]) {
    writeFileSync(join(dir, name), "#!/bin/sh\nexit 0\n");
  }

  try {
    const removed = run("removeGlobalShims()", box);
    const paths = removed.map((entry) => entry.path);

    // The -mcpd alias is retired (ADR 061): a stale shim keeps `command -v`
    // resolving forever and silently breaks the next install.
    assert.deepEqual(new Set(paths), new Set([join(dir, "rule-mcp"), join(dir, "rule-mcpd")]));
    assert.ok(removed.every(isRemoved), JSON.stringify(removed));
    assert.deepEqual(run("removeGlobalShims()", box), [], "a second removal finds nothing left");
  } finally {
    rmSync(box.home, { recursive: true, force: true });
  }
});
