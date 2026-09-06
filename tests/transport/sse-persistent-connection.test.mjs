/** SSE streams must not inherit a short HTTP idle timeout. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync("src/transport/_sse.js", "utf8");
assert.match(source, /httpServer\.timeout\s*=\s*0/, "SSE server must keep long-lived streams open");

console.log("  ✅ SSE server disables the generic idle connection timeout");
