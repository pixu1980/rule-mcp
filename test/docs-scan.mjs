import { loadAllSkills } from "../src/core/skills.js";
import { listTools } from "../src/tools/router.js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

await loadAllSkills();
const tools = new Set(listTools().map(x => x.name));
const archivalDirectories = new Set(["adr", "handoff", "plans", "reports"]);

function scan(dir) {
  let stale = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory() && !["node_modules", ".git", ".context", ".tokensave", ".pi"].includes(e.name) && !archivalDirectories.has(e.name)) {
      stale += scan(p);
    } else if (e.name.endsWith(".md")) {
      const c = readFileSync(p, "utf8");
      const lines = c.split("\n");
      for (let i = 0; i < lines.length; i++) {
        for (const m of lines[i].matchAll(/\bpix_[a-z0-9_]+\b/g)) {
          if (!tools.has(m[0]) && m[0] !== "pix_galaxy_mcp" && m[0] !== "pix_process_handoff") {
            console.log("STALE:", p + ":" + (i + 1) + " " + m[0]);
            stale++;
          }
        }
      }
    }
  }
  return stale;
}

const total = scan("docs");
console.log(total === 0 ? "✅ ALL CLEAN — 0 stale references across live docs/" : "❌ " + total + " stale references found");
process.exit(total > 0 ? 1 : 0);
