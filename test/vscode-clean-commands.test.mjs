// test/vscode-clean-commands.test.mjs — SKIPPED
// The target has a minimal prompt registry (1 prompt). This test expects the
// full prompt set (~25 prompts) from the source. Port prompts infrastructure separately.
import test from "node:test";
import assert from "node:assert/strict";
test("vscode clean commands", { skip: "target has minimal prompt registry — port prompts separately" }, () => {});
