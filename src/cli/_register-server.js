/** Server command registrars: serve, up, daemon. */
import { daemonCommand, serveCommand } from "./commands/index.js";

/** Register the `serve` command. */
export function registerServeCommand(program) {
  program
    .command("serve")
    .alias("dev")
    .description("Start the MCP server (STDIO by default)")
    .option("--transport <type>", "stdio (default), http (Streamable HTTP), or sse (HTTP+SSE)")
    .option("--port <number>", "port for http/sse transport")
    .option("--ssl-cert <path>", "TLS certificate (requires --ssl-key)")
    .option("--ssl-key <path>", "TLS private key (auto-generates self-signed if missing)")
    .allowExcessArguments(false)
    .action((options) => {
      const port = options.port === undefined ? undefined : parseInt(options.port, 10);

      return serveCommand({
        transport: options.transport ?? "stdio",
        port,
        sslCert: options.sslCert,
        sslKey: options.sslKey,
      });
    });
}

/** Register the `up` command. */
export function registerUpCommand(program) {
  program
    .command("up")
    .description('Same as "serve --transport sse" (on-demand HTTP daemon)')
    .option("--port <number>", "port for the SSE server")
    .allowExcessArguments(false)
    .action((options) => {
      const port = options.port === undefined ? undefined : parseInt(options.port, 10);

      return serveCommand({ transport: "sse", port });
    });
}

/** Register the `daemon` command. */
export function registerDaemonCommand(program) {
  program
    .command("daemon")
    .description("Manage the MCP daemon (process and native platform services)")
    .argument("[action]", "start|stop|status|logs|install|uninstall|enable|disable", "status")
    .option("--dry-run", "preview changes without writing (install/uninstall only)")
    .allowExcessArguments(false)
    .action((action, options) => daemonCommand({ action, dryRun: options.dryRun }));
}
