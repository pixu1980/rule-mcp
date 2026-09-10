

/**
 * JSON writers: upsert/remove the MCP server entry in per-agent JSON configs
 * and the VS Code variants (settings.json server blocks).
 * @module cli/installers/writers-json
 */

import { serverName } from "./_paths.js";

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** Serialize JSON with pretty formatting. */

const toJson = (object) => `${JSON.stringify(object, null, 2)}\n`;

const upsertJsonServer = (current, config) => {
  const json = current.trim() ? parseJson(current) : {};

  if (json === null) {
    return null;
  }

  json.mcpServers = json.mcpServers ?? {};
  json.mcpServers[serverName] = { ...json.mcpServers[serverName], ...config };

  return toJson(json);
};

const removeJsonServer = (current) => {
  if (!current.trim()) {
    return current;
  }

  const json = parseJson(current);

  if (json === null) {
    return null;
  }

  if (json.mcpServers?.[serverName]) {
    delete json.mcpServers[serverName];

    if (Object.keys(json.mcpServers).length === 0) {
      delete json.mcpServers;
    }
  }

  return Object.keys(json).length > 0 ? toJson(json) : "";
};

const vscodeServerType = (config) => {
  if (!config.url) {
    return "stdio";
  }

  return config.url.endsWith("/mcp") ? "http" : "sse";
};

const upsertVscode = (current, config) => {
  const json = current.trim() ? parseJson(current) : {};

  if (json === null) {
    return null;
  }

  json.servers = json.servers ?? {};
  // VS Code owns `servers`; remove only this server from the `mcpServers` key.
  if (json.mcpServers?.[serverName]) {
    delete json.mcpServers[serverName];

    if (Object.keys(json.mcpServers).length === 0) {
      delete json.mcpServers;
    }
  }

  if (json.servers[serverName]) {
    delete json.servers[serverName];
  }

  json.servers[serverName] = { ...json.servers[serverName], ...config, type: vscodeServerType(config) };

  return toJson(json);
};

const removeVscodeServer = (current) => {
  if (!current.trim()) {
    return current;
  }

  const json = parseJson(current);

  if (json === null) {
    return null;
  }

  if (json.servers?.[serverName]) {
    delete json.servers[serverName];

    if (Object.keys(json.servers).length === 0) {
      delete json.servers;
    }
  }

  if (json.mcpServers?.[serverName]) {
    delete json.mcpServers[serverName];

    if (Object.keys(json.mcpServers).length === 0) {
      delete json.mcpServers;
    }
  }

  return Object.keys(json).length > 0 ? toJson(json) : "";
};

export { parseJson, toJson, upsertJsonServer, removeJsonServer, vscodeServerType, upsertVscode, removeVscodeServer };
