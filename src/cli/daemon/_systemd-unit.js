

/** The systemd user unit template. */
import { mkdirSync } from "node:fs";
import { getRuntimePaths } from "../paths/index.js";

/**
 * Quote one ExecStart argument for systemd, whose rules are not the shell's.
 *
 * systemd groups a quoted run and reads `\` as an escape, so a backslash or a
 * double quote inside a path has to be escaped or the argument splits into two
 * that systemd reads as its own directives.
 *
 * @param {string} value
 * @returns {string}
 */
export function systemdQuote(value) {
  if (!/[\s"\\]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', String.raw`\"`)}"`;
}

/**
 * Generate the systemd user service unit file.
 * @param {{ node: string, script: string, command: string[] }} ep
 * @returns {string} - systemd unit content
 */
export function generateSystemdUnit(ep) {
  const p = getRuntimePaths();
  const logPath = p.logFile;

  mkdirSync(p.stateDir, { recursive: true });

  // Build the ExecStart line from the argv array, each element quoted by systemd's rules.
  const command = ep.command.map(systemdQuote).join(" ");

  // Extract node bin dir for PATH
  const nodeBinDir = ep.node.replace(/\/node$/, "");

  return `[Unit]
Description=rule-mcp MCP Server
Documentation=https://github.com/pixu1980/rule-mcp
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${command}
Restart=on-failure
RestartSec=5
RestartSteps=3
RestartMaxDelaySec=30
StartLimitBurst=5
StartLimitIntervalSec=60

Environment=RULE_MCP_DAEMON=1
Environment=PATH=/usr/local/bin:/usr/bin:/bin:${nodeBinDir}

StandardOutput=append:${logPath}
StandardError=append:${logPath}

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${p.stateDir}

[Install]
WantedBy=default.target
`;
}
