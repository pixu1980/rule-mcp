/** ADR authorship: the tool is never the one who decided. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { renderRenumberPlan, planRenumber, applyRenumber } from "../../../src/core/docs-numbering/index.js";
import { git } from "./_doctor.fixture.mjs";

test("an ADR whose author is the tool, or missing, is reported", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-author-"));
  try {
    git(["init", "--quiet", "--initial-branch=main"], root);
    git(["config", "user.email", "ada@example.com"], root);
    git(["config", "user.name", "Ada Lovelace"], root);
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "001-tool-author.md"), "# 001: Tool author\n\n- **Status**: accepted\n- **Tags**: x\n- **Author**: rule-mcp\n");
    writeFileSync(join(root, "docs", "adr", "002-no-author.md"), "# 002: No author\n\n- **Status**: accepted\n- **Tags**: x\n");
    writeFileSync(join(root, "docs", "adr", "003-a-person.md"), "# 003: A person\n\n- **Status**: accepted\n- **Tags**: x\n- **Author**: Grace Hopper <grace@example.com>\n");
    git(["add", "-A"], root);
    git(["commit", "--quiet", "-m", "docs(adr): three decisions"], root);

    const plan = planRenumber({ projectDir: root });

    assert.deepEqual(
      plan.authors.map((entry) => entry.file).sort(),
      ["docs/adr/001-tool-author.md", "docs/adr/002-no-author.md"],
      "the tool name and the missing line are both the same problem",
    );
    assert.equal(plan.authors[0].author, "Ada Lovelace <ada@example.com>", "the author comes from the adding commit");
    assert.match(renderRenumberPlan(plan), /author/i, "the report says so");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applying names the person who decided", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-author-fix-"));
  try {
    git(["init", "--quiet", "--initial-branch=main"], root);
    git(["config", "user.email", "ada@example.com"], root);
    git(["config", "user.name", "Ada Lovelace"], root);
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    writeFileSync(join(root, "docs", "adr", "001-tool-author.md"), "# 001: Tool author\n\n- **Status**: accepted\n- **Tags**: x\n- **Author**: rule-mcp\n");
    writeFileSync(join(root, "docs", "adr", "002-no-author.md"), "# 002: No author\n\n- **Status**: accepted\n- **Tags**: x\n");
    git(["add", "-A"], root);
    git(["commit", "--quiet", "-m", "docs(adr): two decisions"], root);

    const applied = applyRenumber(planRenumber({ projectDir: root }), { projectDir: root });

    assert.equal(applied.authorsNamed, 2, "both files were repaired");
    assert.match(readFileSync(join(root, "docs", "adr", "001-tool-author.md"), "utf8"), /^- \*\*Author\*\*: Ada Lovelace <ada@example\.com>$/m, "the tool name was replaced");
    assert.match(
      readFileSync(join(root, "docs", "adr", "002-no-author.md"), "utf8"),
      /^- \*\*Tags\*\*: x\n- \*\*Author\*\*: Ada Lovelace <ada@example\.com>$/m,
      "the missing line was added next to the tags",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
