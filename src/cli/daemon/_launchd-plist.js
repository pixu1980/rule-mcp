/** The LaunchAgent plist template. */
import { mkdirSync } from "node:fs";
import { getRuntimePaths } from "../paths.js";
import { escapePlist, WRAPPER_SCRIPT_PATH } from "./_service-shared.js";

/**
 * Generate the LaunchAgent plist XML.
 * Uses Program (wrapper script) instead of ProgramArguments with node directly,
 * so macOS shows "rule-mcpd" in Login Items.
 *
 * @param {{ node: string, script: string, command: string[] }} ep
 * @returns {string} - plist XML content
 */
export function generateLaunchAgentPlist(_ep) {
  const p = getRuntimePaths();
  const logPath = p.logFile;

  mkdirSync(p.stateDir, { recursive: true });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${LAUNCH_AGENT_LABEL}</string>

	<key>Program</key>
	<string>${escapePlist(WRAPPER_SCRIPT_PATH)}</string>

	<key>RunAtLoad</key>
	<true/>

	<key>KeepAlive</key>
	<true/>

	<key>StandardOutPath</key>
	<string>${escapePlist(logPath)}</string>

	<key>StandardErrorPath</key>
	<string>${escapePlist(logPath)}</string>

	<key>EnvironmentVariables</key>
	<dict>
		<key>RULE_MCP_DAEMON</key>
		<string>1</string>
		<key>PATH</key>
		<string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
	</dict>

	<key>WorkingDirectory</key>
	<string>${escapePlist(HOME)}</string>

	<key>ProcessType</key>
	<string>Background</string>

	<key>Nice</key>
	<integer>10</integer>
</dict>
</plist>
`;
}
