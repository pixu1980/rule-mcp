/** Detect IDE configs, model configuration, stored keys, environment info. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { platform, arch } from "node:os";
import { join } from "node:path";
import { getRuntimePaths } from "../paths.js";
import { HOME } from "./_detect-agents.js";

/**
 * Check if IDE-specific configs exist.
 *
 * @returns {Array<{ name: string, configured: boolean, configFile: string|null }>}
 */
export function detectIdeConfigs() {
  const vscodeUserConfigPath =
    platform() === "darwin"
      ? join(HOME, "Library", "Application Support", "Code", "User", "mcp.json")
      : platform() === "win32"
        ? join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "Code", "User", "mcp.json")
        : join(HOME, ".config", "Code", "User", "mcp.json");
  let skillsCount = 0;
  try {
    if (existsSync("skills")) {
      skillsCount = readdirSync("skills").filter((d) => d.startsWith("rule")).length;
    }
  } catch {
    /* skills dir may be absent in packaged installs */
  }

  const checks = [
    { name: "Skills directory", ok: skillsCount >= 60, detail: `${skillsCount} skills` },
    { name: "Cursor (IDE)", path: join(HOME, ".cursor", "mcp.json") },
    { name: "Windsurf (IDE)", path: join(HOME, ".windsurf", "mcp.json") },
    { name: "VS Code User", path: vscodeUserConfigPath },
  ];

  // Platform-specific IDE checks
  if (platform() === "darwin") {
    // macOS: Check for JetBrains Toolbox
    const jetbrainsToolbox = join(HOME, "Library", "Application Support", "JetBrains", "Toolbox");
    checks.push({ name: "JetBrains Toolbox", path: jetbrainsToolbox });
  }

  return checks.map(({ name, path, ok, detail }) => {
    if (typeof ok === "boolean") {
      return { name, configured: ok, configFile: null, detail };
    }

    return {
      name,
      configured: existsSync(path),
      configFile: existsSync(path) ? path : null,
    };
  });
}

/**
 * Check model provider environment variable configuration.
 * Detects which API keys are set in the environment.
 *
 * @returns {Array<{ provider: string, configured: boolean, keyName: string }>}
 */
export function detectModelConfig() {
  const modelKeys = [
    { provider: "OpenAI", keyName: "OPENAI_API_KEY" },
    { provider: "Anthropic", keyName: "ANTHROPIC_API_KEY" },
    { provider: "Google Gemini", keyName: "GEMINI_API_KEY" },
    { provider: "xAI Grok", keyName: "XAI_API_KEY" },
    { provider: "Mistral AI", keyName: "MISTRAL_API_KEY" },
    { provider: "AWS Bedrock", keyName: "AWS_ACCESS_KEY_ID" },
    { provider: "Cohere", keyName: "CO_API_KEY" },
    { provider: "Together AI", keyName: "TOGETHER_API_KEY" },
    { provider: "OpenRouter", keyName: "OPENROUTER_API_KEY" },
    { provider: "DeepSeek", keyName: "DEEPSEEK_API_KEY" },
  ];

  return modelKeys.map(({ provider, keyName }) => ({
    provider,
    keyName,
    configured: !!process.env[keyName],
  }));
}

/**
 * Check locally stored API key files.
 *
 * @returns {Array<{ provider: string, configured: boolean, file: string|null }>}
 */
export function detectStoredModelKeys() {
  const configDir = join(HOME, ".config", "rule-mcp");
  const keyFiles = ["openai-key", "anthropic-key", "gemini-key", "xai-key"];

  return keyFiles.map((file) => {
    const fullPath = join(configDir, file);
    const exists = existsSync(fullPath);

    return {
      provider: file
        .replace("-key", "")
        .replaceAll("-", " ")
        .replaceAll(/\b\w/g, (c) => c.toUpperCase()),
      configured: exists,
      file: exists ? fullPath : null,
    };
  });
}

/**
 * Get environment info for diagnostics.
 *
 * @returns {object}
 */
export function getEnvironmentInfo() {
  return {
    platform: platform(),
    arch: arch(),
    home: HOME,
    node: process.version,
    cwd: process.cwd(),
    shell: process.env.SHELL || process.env["ComSpec"] || "unknown",
    terminal: process.env.TERM || "unknown",
  };
}
