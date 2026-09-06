/** @module scripts/reports/census/instructions-file - the generated 10-instructions.md entry */

import { GENERATED_HEADER, bullets, table } from "./_markdown.mjs";
import { names, routerCommands, areaCommands, sessionCommands, personaCommands, otherNames, rooFiles, commandTargets } from "./_surface.mjs";

export const INSTRUCTIONS_FILE = {
  file: "10-instructions.md",
  title: "# Instructions",
  build: () =>
    [
      GENERATED_HEADER,
      "",
      "# Instructions: the agent command surface (" + names.length + " commands)",
      "",
      "The `/rule-*` command set is generated from the prompt registry and the",
      "persona catalog, then written into every agent/IDE that has a command",
      "directory. Regenerate or list it with `rule-mcp agent-commands`.",
      "",
      table(
        ["Category", "Count"],
        [
          ["Router (`/rule`)", routerCommands.length],
          ["Area / workflow (`/rule-area-*`, `/rule-adr`, `/rule-flight`)", areaCommands.length + 2],
          ["Session (`/rule-handoff`, `/rule-handon`, `/rule-init`, `/rule-process-check`, `/rule-update`)", sessionCommands.length],
          ["Persona (`/rule-{plan,audit,review}-<role>`)", personaCommands.length],
          ["Other", otherNames.length],
        ],
      ),
      "",
      "## Command list",
      "",
      bullets(names),
      "",
      "## Install targets (agent command directories)",
      "",
      table(["Agent", "Format", "Scope", "Directory"], commandTargets),
      "",
      rooFiles.length > 0
        ? [
            "## `.roo/commands/` snapshot (" + rooFiles.length + " files)",
            "",
            "Installed `.md` snapshots for agents that read macros from there; refresh with `rule-mcp agent-commands --dir .roo/commands`.",
            "",
            bullets(rooFiles),
            "",
          ].join("\n")
        : "",
    ].join("\n"),
};
