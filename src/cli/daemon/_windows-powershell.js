/** The PowerShell fallback that creates the Windows service when sc.exe cannot. */
import { execFileSync } from "node:child_process";

/** Quote a value as a PowerShell single-quoted literal. */
function psQuote(value) {
  return value.replaceAll("'", "''");
}

/**
 * Create the service through PowerShell, as one argv element.
 *
 * Nothing is interpolated into a shell string: the script arrives as a single
 * argument, and every value inside it is a single-quoted PowerShell literal, so
 * a name or a path with a quote cannot split it into a second command.
 *
 * @param {string} name
 * @param {string} command
 * @returns {{ ok: boolean, name: string, action?: string, error?: string }}
 */
export function installViaPowerShell(name, command) {
  const script = [
    `New-Service -Name '${psQuote(name)}' -BinaryPathName '${psQuote(command)}' -StartupType Automatic -Description 'MCP server for the rule-mcp-* skill ecosystem'`,
    `Start-Service -Name '${psQuote(name)}'`,
  ].join("; ");

  try {
    execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 30_000, stdio: "pipe" });

    return { ok: true, name, action: "created-and-started (PowerShell)" };
  } catch (error) {
    return { ok: false, name, error: `Failed to create service (exit ${error.status ?? "unknown"})` };
  }
}
