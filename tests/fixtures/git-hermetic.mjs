/**
 * @module test/fixtures/git-hermetic
 *
 * A private global git config for the whole process, so a fixture repository is
 * decided by the fixture and not by the machine it runs on.
 *
 * An ambient `core.hooksPath` (the commit gate this project installs, and the
 * reason a fixture's `git commit -m first` can be rejected), a `commit.gpgsign`
 * or an `init.defaultBranch` otherwise reaches every temporary repository a test
 * creates, and the test then passes or fails because of a setting nobody in this
 * repository wrote.
 *
 * Import it for the side effect, anywhere among the imports of the file that
 * creates repositories:
 *
 *   import "../../../tests/fixtures/git-hermetic.mjs";
 *
 * The config file is empty on purpose: pointing `GIT_CONFIG_GLOBAL` at it is
 * what removes the user's settings, and `GIT_CONFIG_NOSYSTEM` writes off the
 * machine-wide one. `GIT_TERMINAL_PROMPT=0` keeps a missing credential from
 * hanging a test on a prompt nobody can answer.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOME = mkdtempSync(join(tmpdir(), "rule-git-home-"));

/** The empty config file every hermetic fixture points `GIT_CONFIG_GLOBAL` at. */
export const HERMETIC_CONFIG = join(HOME, "gitconfig");

writeFileSync(HERMETIC_CONFIG, "");
process.env.GIT_CONFIG_GLOBAL = HERMETIC_CONFIG;
process.env.GIT_CONFIG_NOSYSTEM = "1";
process.env.GIT_TERMINAL_PROMPT = "0";
