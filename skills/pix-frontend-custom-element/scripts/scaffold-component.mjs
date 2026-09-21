// @ts-check
// CLI entry + public exports for the component scaffolder.
// Implementation lives under ./scaffold/ (ADR 061 folder + barrel).

import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseArgs } from "./scaffold/_args.mjs";
import { scaffoldComponent } from "./scaffold/_run.mjs";

export { parseArgs, scaffoldComponent };

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const result = await scaffoldComponent(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFile === currentFile) {
  main().catch((error) => {
    process.stderr.write(`scaffold-component error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
