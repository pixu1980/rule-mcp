

/**
 * @module test/post-process
 *
 * Security + correctness tests for core/post-process.js.
 *  - Tool-controlled file paths must NEVER reach a shell (no command injection).
 *  - Formatting must operate on the file's real absolute path (the project),
 *    not a path resolved against the server's own source tree.
 */

import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Post-process Tests ===\n");

const { postProcessFiles } = await import("../../../src/core/index.js");

const tmpDir = mkdtempSync(join(tmpdir(), "rule-mcp-pp-"));
const origCwd = process.cwd();

try {
  // ── T1: no command injection via crafted .js filename ──
  // The payload is slash-free so it is a legal single filename; the shell's cwd
  // is pinned to tmpDir, so a leaked `touch INJECTED` would land there. With
  // argv-based execution the metacharacters stay literal and nothing runs.
  const sentinel = join(tmpDir, "INJECTED");
  const evilName = "evil$(touch INJECTED).js";
  const evilAbs = join(tmpDir, evilName);
  writeFileSync(evilAbs, "function f() {\nconst a = 1;\nreturn a;\n}\n", "utf8");

  process.chdir(tmpDir);
  try {
    postProcessFiles([{ path: evilName, status: "written", absPath: evilAbs }]);
  } catch {
    /* prettier may reject the file - irrelevant to the security assertion */
  }
  process.chdir(origCwd);

  check("T1 no shell injection (sentinel not created)", !existsSync(sentinel));

  // ── T2: blank-line fixer runs against the REAL absolute path ──
  const okAbs = join(tmpDir, "ok.js");
  writeFileSync(okAbs, "function g() {\nconst a = 1;\nreturn a;\n}\n", "utf8");
  postProcessFiles([{ path: "ok.js", status: "written", absPath: okAbs }]);
  const formatted = readFileSync(okAbs, "utf8");
  check("T2 blank line inserted before return", /\n\s*\n\s*return/.test(formatted));

  // ── T3: dry-run / non-written entries are ignored ──
  const untouched = join(tmpDir, "skip.js");
  writeFileSync(untouched, "const x=1;return x;", "utf8");
  postProcessFiles([{ path: "skip.js", status: "dry-run", absPath: untouched }]);
  check("T3 non-written entry untouched", readFileSync(untouched, "utf8") === "const x=1;return x;");
} finally {
  try {
    process.chdir(origCwd);
  } catch {
    /* ignore */
  }
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
