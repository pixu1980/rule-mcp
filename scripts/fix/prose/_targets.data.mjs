

/** @module scripts/fix/prose/targets.data - which files the pass reads, and which it must never touch */

/**
 * Every tracked text file, not only the ones a skill is written in.
 *
 * The narrow `*.js, *.mjs, *.md` list let British spelling sit undisturbed in
 * shell scripts, PowerShell, JSON and YAML for three phases. The house style is
 * the house style in every file that has prose in it.
 */
export const TRACKED = ["*.js", "*.mjs", "*.cjs", "*.ts", "*.mts", "*.md", "*.json", "*.yml", "*.yaml", "*.sh", "*.ps1", "*.html", "*.css", "*.txt", "*.toml"];
/**
 * Files the pass must never touch.
 *
 * Fixtures are inputs, not prose. The other three are load-bearing:
 * fingerprint.js IS the British-to-American dictionary and its test file IS the
 * fixtures, so running the transformer over either would rewrite the very words
 * they exist to map and quietly break both; wcag-data.js is vendored from the
 * W3C, where the criterion titles are normative text we are not entitled to
 * respell.
 */
export const SKIP = [/^test\/fixtures\//, /^node_modules\//, /^pnpm-lock\.yaml$/, /^src\/core\/fingerprint\.js$/, /^src\/core\/wcag-data\.js$/, /^test\/fingerprint\.test\.mjs$/];

// --others --exclude-standard so a brand new file is checked too. Without it
