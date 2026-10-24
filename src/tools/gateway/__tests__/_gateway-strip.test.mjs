/**
 * The write path strips forbidden manifest fields before it checks and mints.
 *
 * A model that writes `packageManager` or `engines` into a `package.json` must
 * not be able to get a receipt for it. The gateway cleans the file first, so the
 * check runs on what would be written, the receipt binds that, and the reply
 * carries the cleaned content back for the caller to apply.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { answerOf, callTool, validateApply } from "./_receipt.fixture.mjs";

const MANIFEST =
  '{\n  "name": "app",\n  "packageManager": "pnpm@11.25.0",\n  "engines": {\n    "node": ">=22"\n  },\n  "devEngines": {\n    "packageManager": {\n      "name": "pnpm"\n    },\n    "runtime": {\n      "name": "node",\n      "version": "24.0.0"\n    }\n  }\n}\n';
const CLEANED = '{\n  "name": "app",\n  "devEngines": {\n    "runtime": {\n      "name": "node",\n      "version": "24.0.0"\n    }\n  }\n}\n';

const ARGUMENTS = {
  prompt: "check this package.json: it must not activate corepack or declare engines",
  files: [{ path: "package.json", content: MANIFEST }],
};

test("the gateway strips the fields, then checks the cleaned manifest", async () => {
  const answer = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));

  assert.equal(answer.checkResult.allPass, true, "the cleaned manifest passes, so the strip ran before the check");
  assert.deepEqual(answer.stripped_fields, [{ path: "package.json", fields: ["packageManager", "engines", "devEngines.packageManager"] }], "every forbidden field is named");
  assert.deepEqual(answer.sanitized_files, [{ path: "package.json", content: CLEANED }], "the reply carries the content to apply");
  assert.ok(answer.receipt, "a receipt is minted for the cleaned content");
});

test("the receipt authorizes the cleaned content and refuses the original", async () => {
  const answer = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));

  assert.equal(validateApply(answer.receipt, answer.sanitized_files).valid, true, "the cleaned file is what the receipt binds");
  assert.equal(validateApply(answer.receipt, ARGUMENTS.files).valid, false, "the original manifest is refused");
});

test("a clean manifest is not reported as stripped", async () => {
  const answer = answerOf(await callTool("rule_tool_gateway", { prompt: ARGUMENTS.prompt, files: [{ path: "package.json", content: CLEANED }] }));

  assert.equal("stripped_fields" in answer, false, "nothing was removed, so nothing is reported");
  assert.equal("sanitized_files" in answer, false);
});
