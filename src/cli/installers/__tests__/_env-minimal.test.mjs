/**
 * The installed server config mirrors an explicit minimal choice.
 *
 * The installer never invented env plumbing: `commandConfig` already merges
 * `options.env` over the saved file. This pins the one new rule - an ambient
 * `RULE_MCP_MINIMAL_TOOLS` (put there by `--minimal` / `--no-minimal`)
 * rides along into the written config, so the installed server runs the
 * surface the install chose.
 */
import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";

import { commandConfig, minimalEnvFrom, MINIMAL_ENV_VAR } from "../_env.js";

const saved = process.env[MINIMAL_ENV_VAR];

afterEach(() => {
  if (saved === undefined) {
    delete process.env[MINIMAL_ENV_VAR];
  } else {
    process.env[MINIMAL_ENV_VAR] = saved;
  }
});

test("minimalEnvFrom maps the ambient value and nothing else", () => {
  assert.deepEqual(minimalEnvFrom({}), {}, "absent ambient means no key");
  assert.deepEqual(minimalEnvFrom({ [MINIMAL_ENV_VAR]: "1" }), { [MINIMAL_ENV_VAR]: "1" });
  assert.deepEqual(minimalEnvFrom({ [MINIMAL_ENV_VAR]: "0" }), { [MINIMAL_ENV_VAR]: "0" });
});

test("commandConfig carries an ambient minimal choice into the server env", () => {
  process.env[MINIMAL_ENV_VAR] = "1";

  const config = commandConfig("/entry", {});

  assert.equal(config.env?.[MINIMAL_ENV_VAR], "1", "the installed server runs the chosen surface");
});
