

/** The installed MCP SDK version, straight from its package.json. */
import { readFileSync } from "node:fs";

/**
 * Get the installed SDK version string.
 * @returns {string} - e.g. "1.29.0" or "unknown"
 */
export function getSdkVersion() {
  try {
    const sdkPackagePath = new URL("../../../node_modules/@modelcontextprotocol/sdk/package.json", import.meta.url);
    const sdkPackage = JSON.parse(readFileSync(sdkPackagePath, "utf8"));

    return sdkPackage.version || "unknown";
  } catch {
    return "unknown";
  }
}
