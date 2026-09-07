/** Source contract: probe, heal, escape hatch, error surfacing, TTY gate, uninstall reversal. */
import { strict as assert } from "node:assert";

import { installSh, uninstallSh } from "./_shim.fixture.mjs";

// ── Source contract ─────────────────────────────────────────────────────────

assert.match(installSh, /shim_works\(\) \{/, "install.sh must define a launch probe");
assert.match(installSh, /rule-mcp --version/, "the probe must actually launch the binary");
assert.match(installSh, /ensure_global_shim\(\) \{/, "install.sh must define ensure_global_shim");
assert.match(installSh, /RULE_MCP_SKIP_GLOBAL_LINK/, "install.sh must expose a link-skip escape hatch");
assert.doesNotMatch(
  installSh,
  /CI=true pnpm link --global/,
  "install.sh must NOT run `pnpm link --global` (pnpm 10/11 rewrites pnpm-workspace.yaml overrides)",
);
assert.match(installSh, /bin_dir\/rule-mcp/, "install.sh must write the shim directly into the global bin dir");
assert.match(installSh, /chmod \+x/, "install.sh must make the shim executable");
assert.match(
  installSh,
  /if shim_works; then\n {4}rule-mcp "\$@"/,
  "run_cli must prefer the shim only when it launches",
);
assert.match(installSh, /node "\$LOCAL_BIN" "\$@"/, "run_cli must keep the local-binary fallback");
assert.doesNotMatch(
  installSh,
  /run_cli install --agent "\$\{TARGET_AGENT\}" --mode "\$\{INSTALL_MODE\}" --json >\/dev\/null/,
  "install.sh must not swallow a failed CLI install",
);
assert.match(installSh, /out="\$\(run_cli install --agent "\$\{TARGET_AGENT\}"/, "install.sh must capture CLI errors");
assert.match(installSh, /USE_COLOR=false/, "install.sh must gate colors behind a TTY/NO_COLOR check");
assert.match(installSh, /\[\[ -t 1 \]\]/, "install.sh must check stdout is a TTY before coloring");

assert.match(uninstallSh, /pnpm unlink --global rule-mcp/, "uninstall.sh must unlink the pnpm-linked package");
assert.match(uninstallSh, /for shim_name in rule-mcp rule-mcpd/, "uninstall.sh must remove both pnpm bin shims, the retired -mcpd alias included");
assert.match(
  uninstallSh,
  /global\/"\*\/node_modules\/rule-mcp/,
  "uninstall.sh must remove the link from the global store",
);
assert.match(uninstallSh, /USE_COLOR=false/, "uninstall.sh must gate colors the same way");

console.log("  \u{2705} uninstall.sh reverses the shim: pnpm unlink + bin shim + store link");
