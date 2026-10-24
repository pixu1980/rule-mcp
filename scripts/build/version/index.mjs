#!/usr/bin/env node

/**
 * @module scripts/build-version
 *
 * One version, three places: package.json, server.json and the newest
 * CHANGELOG.md release heading (OSS-21).
 *
 *   node scripts/build/version/index.mjs --check          exits 0 when they agree
 *   node scripts/build/version/index.mjs --next           prints the version the commits imply
 *   node scripts/build/version/index.mjs --apply 1.2.3    writes 1.2.3 everywhere
 *   node scripts/build/version/index.mjs --apply-next     derives that version and writes it
 *
 * `--apply` also stamps server.json packages[].version, inserts a bare
 * `## [1.2.3]` heading above the newest release heading, and refreshes the
 * scoop/winget version fields, tarball URLs and hashes from a throwaway
 * pack. It never touches the [Unreleased] section; entries arrive via
 * `pnpm changelog`.
 *
 * `--next` derives PATCH/MINOR/MAJOR from the commits since the newest tag
 * (`_derive.mjs`), so the number is a function of the history rather than a
 * choice: fix -> PATCH, feat -> MINOR, `!` or BREAKING CHANGE -> MAJOR.
 */

import { apply, applyNext, check, reportNext } from "./_commands.mjs";

const [flag, value] = process.argv.slice(2);

switch (flag) {
  case "--check": {
    check();
    break;
  }
  case "--apply": {
    apply(value);
    break;
  }
  case "--next": {
    reportNext();
    break;
  }
  case "--apply-next": {
    applyNext();
    break;
  }
  default: {
    process.stderr.write("usage: version/index.mjs (--check|--next|--apply <x.y.z>|--apply-next)\n");
    process.exitCode = 1;
  }
}
