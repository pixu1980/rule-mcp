

/** @module scripts/fix/post-process/help - the --help text */

export function printHelp() {
  console.log(`
Usage: node scripts/post-process.mjs [options]

Validate and auto-fix project file tree structure against rule-mcp AI conventions.

Options:
  --dir <path>      Project root directory (default: .)
  --src-dir <path>  Source directory relative to root (default: src)
  --fix             Apply auto-fixes (default: lint-only)
  --no-dry-run      Actually apply fixes (default: dry-run preview)
  --json            Output as JSON (machine-readable)
  --help            Show this help

Examples:
  node scripts/post-process.mjs                      # Lint project
  node scripts/post-process.mjs --fix --no-dry-run   # Auto-fix project
  node scripts/post-process.mjs --src-dir app         # Custom source dir
  node scripts/post-process.mjs --json | jq .         # JSON output

Exit codes:
  0 - All clean (or all fixed)
  1 - Issues remain (or errors during fix)
`);
}
