

/**
 * opencode's JSON dialect: the server lives under `mcp`, `command` is one
 * array that already holds the arguments, and environment variables live
 * under `environment`. `mcpServers` and a separate `args` key are not read
 * by opencode at all.
 * @module cli/installers/writers-opencode
 */

import { serverName } from "./_paths.js";
import { parseJson, toJson } from "./_writers-json.js";

/** The shared config, translated into opencode's own shape. */
const opencodeServerConfig = (config) => {
  if (config.url) {
    return { type: "remote", url: config.url, enabled: true, ...(config.headers && { headers: config.headers }) };
  }

  return {
    type: "local",
    command: [config.command, ...(config.args ?? [])],
    enabled: true,
    ...(config.env && { environment: config.env }),
  };
};

/**
 * The options an upstream write keeps for the user, per transport. Everything
 * else opencode accepts is built by `opencodeServerConfig`, and anything it
 * does not accept (`args`, `env`, the `mcpServers` extras) is dropped:
 * opencode's schema is `additionalProperties: false`, so one stale key makes
 * the whole config fail to load.
 */
const carriedOptions = (entry, config) => {
  const keys = config.url ? ["oauth", "enabled", "timeout"] : ["cwd", "enabled", "timeout"];

  if (entry === null || typeof entry !== "object") {
    return {};
  }

  return Object.fromEntries(keys.filter((key) => key in entry).map((key) => [key, entry[key]]));
};

/**
 * Upsert the server into opencode's global config, registering the instruction
 * file opencode only reads when `instructions` names it. A stale entry is
 * rebuilt rather than merged key by key, so the migration from the
 * `mcpServers` shape (or a hand-edit of it) cannot leave an invalid key behind.
 */
const upsertOpencode = (current, config, instructionPath) => {
  const json = current.trim() ? parseJson(current) : { $schema: "https://opencode.ai/config.json" };

  if (json === null) {
    return null;
  }

  json.mcp = json.mcp ?? {};
  json.mcp[serverName] = { ...opencodeServerConfig(config), ...carriedOptions(json.mcp[serverName], config) };

  const list = json.instructions === undefined || Array.isArray(json.instructions);

  if (instructionPath && list && !json.instructions?.includes(instructionPath)) {
    json.instructions = [...(json.instructions ?? []), instructionPath];
  }

  return toJson(json);
};

/** Remove the server and its instruction registration, pruning emptied blocks. */
const removeOpencode = (current, instructionPath) => {
  if (!current.trim()) {
    return current;
  }

  const json = parseJson(current);

  if (json === null) {
    return null;
  }

  if (json.mcp?.[serverName]) {
    delete json.mcp[serverName];

    if (Object.keys(json.mcp).length === 0) {
      delete json.mcp;
    }
  }

  if (instructionPath && Array.isArray(json.instructions)) {
    json.instructions = json.instructions.filter((entry) => entry !== instructionPath);

    if (json.instructions.length === 0) {
      delete json.instructions;
    }
  }

  return Object.keys(json).length > 0 ? toJson(json) : "";
};

export { opencodeServerConfig, upsertOpencode, removeOpencode };
