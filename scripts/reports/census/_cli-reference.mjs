/** Render the CLI reference doc from the real commander program. */
import { GENERATED_HEADER, table } from "./_markdown.mjs";

/** @param {() => object} buildProgram - injected so the script controls load order */
export function buildCliReference(buildProgram) {
  const program = buildProgram();
  const lines = [
    GENERATED_HEADER,
    "",
    "# CLI reference",
    "",
    "`rule-mcp` (binary: `bin/rule-mcp.js`). Invoked with no command it",
    "starts the STDIO MCP server (agents spawn it bare).",
    "",
    "Global flags: `-h, --help` (usage) and `-v, --version` (package version).",
    "Errors exit 1 and print to stderr; `--help` exits 0.",
    "",
  ];

  const seen = new Set();
  for (const command of program.commands) {
    const name = command.name();
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);

    const args = (command._args ?? []).map((arg) => ({
      name: String(arg.name()),
      desc: arg.description,
      def: arg.defaultValue,
    }));
    const options = (command.options ?? []).map((option) => ({
      flags: option.flags,
      desc: option.description,
      def: option.defaultValue,
      choices: option.choices,
    }));

    lines.push("## " + name, "");
    if (command.description()) {
      lines.push(command.description(), "");
    }
    const usage = ["rule-mcp", name, ...args.map((a) => a.name)];
    lines.push("```", usage.join(" "), "```", "");

    if (args.length > 0) {
      lines.push(
        "### Arguments",
        "",
        table(
          ["Argument", "Description", "Default"],
          args.map((a) => ["`" + a.name + "`", a.desc || "-", a.def === undefined ? "-" : String(a.def)]),
        ),
        "",
      );
    }

    if (options.length > 0) {
      lines.push(
        "### Options",
        "",
        table(
          ["Flag", "Description", "Default", "Choices"],
          options.map((o) => ["`" + o.flags + "`", o.desc || "-", o.def === undefined ? "-" : String(o.def), Array.isArray(o.choices) ? o.choices.join(", ") : "-"]),
        ),
        "",
      );
    }

    lines.push("---", "");
  }

  return lines.join("\n");
}
