/** Static contract: the scripts name the runtime home and the purge/keep paths (bash + PowerShell). */
import { strict as assert } from "node:assert";

import { installPs1, installSh, uninstallPs1, uninstallSh } from "./_purge.fixture.mjs";

// ── 1. install.sh must recreate the runtime home explicitly ────────────────
assert.match(
  installSh,
  /PIX_HOME_DIR="\$HOME_DIR\/\.pix-galaxy-mcp"/,
  "install.sh must define the runtime home path (~/.pix-galaxy-mcp)",
);
assert.match(
  installSh,
  /mkdir -p "\$PIX_HOME_DIR\/state" "\$PIX_HOME_DIR\/data" "\$PIX_HOME_DIR\/projects" "\$PIX_HOME_DIR\/config"/,
  "install.sh must recreate state/, data/, projects/, config/ under ~/.pix-galaxy-mcp",
);

// ── 2. uninstall.sh --purge must remove ~/.pix-galaxy-mcp/ ─────────────────
assert.match(
  uninstallSh,
  /PIX_HOME_DIR="\$HOME_DIR\/\.pix-galaxy-mcp"/,
  "uninstall.sh must define the runtime home path (~/.pix-galaxy-mcp)",
);
assert.match(
  uninstallSh,
  /rm -rf "\$PIX_HOME_DIR"/,
  "uninstall.sh --purge must delete the whole ~/.pix-galaxy-mcp/ directory",
);
assert.match(
  uninstallSh,
  /KEEP_CONFIG.*== "true"[\s\S]*?Keeping runtime home/,
  "uninstall.sh --keep-config must keep the runtime home",
);
assert.match(
  uninstallSh,
  /Also delete ~\/\.config\/pix-galaxy-mcp\/, ~\/\.pix-galaxy-mcp\/ and API keys/,
  "uninstall.sh --help must advertise both directories under --purge",
);

// ── 3. PowerShell parity ────────────────────────────────────────────────────
assert.match(
  installPs1,
  /New-Item -ItemType Directory -Force.*\$pixHomeDir/s,
  "install.ps1 must recreate the runtime home directory",
);
assert.match(
  uninstallPs1,
  /\$pixHomeDir = Join-Path \$HomeDir "\.pix-galaxy-mcp"/,
  "uninstall.ps1 must define the runtime home path",
);
assert.match(
  uninstallPs1,
  /Remove-Item \$pixHomeDir -Recurse -Force/,
  "uninstall.ps1 -Purge must delete the whole ~/.pix-galaxy-mcp/ directory",
);

console.log("  \u{2705} the scripts declare the runtime home and the purge/keep-config contract");
