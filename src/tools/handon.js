/**
 * @module tools/handon
 *
 * `rule_tool_process_handon` - the other half of `rule_tool_process_handoff`.
 *
 * A handoff is a snapshot of a moment. Read three days later, every sentence in
 * it still reads as present tense: the branch is on `feat/x`, the suite is
 * green, ADR 046 is pending. By then the branch may have merged, a test may
 * have broken and the ADR may have landed, and nothing in the file says so. The
 * reader acts on all three.
 *
 * So this tool does not summarize a handoff. It parses what the handoff claims
 * and checks each claim against the repository as it is now, which is the part a
 * model asked to "read the last handoff" will not do: it will restate the text
 * with the confidence of the original, because that is what it was handed.
 *
 * Three rules make the answer trustworthy:
 *
 *   - **Read-only.** No checkout, no stash, no write. Only git plumbing that
 *     reports.
 *   - **Never re-run a claimed command.** A handon that runs the suite takes
 *     four minutes and sometimes writes files. It reports what was claimed and
 *     when, and lets the reader decide.
 *   - **Never guess.** "Unverified" is a real answer. Inventing "probably still
 *     fine" is exactly how a stale handoff does its damage.
 *
 * @see ADR 052 - why this verifies rather than summarizes
 * @see module:tools/handoff - the half that writes
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";

import { neutralizeDirectives } from "../core/untrusted.js";
import { join } from "node:path";
import { z } from "zod/v4";
import { registerTool } from "./router.js";

/** Where handoffs live, relative to the project root. */
const HANDOFF_DIR = "docs/handoff";
/** Where ADRs live, for checking whether a referenced decision landed. */
const ADR_DIR = "docs/adr";
/** Branches a feature branch is normally merged into, most likely first. */
const TRUNKS = new Set(["main", "master", "develop"]);
/** How far either side of an ADR reference to look for a claim of pendingness. */
const PENDING_WINDOW = 140;

/** Verdicts that mean the handoff still describes reality. */
const HOLDS = new Set(["current", "unchanged", "still proposed"]);

/**
 * Run a read-only git command. Returns "" on any failure, because "this
 * repository cannot answer that" is a verdict and not an error.
 *
 * Arguments are passed as an array, never interpolated into a shell string: a
 * branch name comes out of a handoff file, which is input.
 *
 * @param {string} cwd
 * @param {string[]} arguments_
 * @returns {string}
 */
function git(cwd, arguments_) {
  try {
    return execFileSync("git", arguments_, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
      killSignal: "SIGKILL",
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

/**
 * The handoff files in a project, newest number first.
 *
 * @param {string} projectDir
 * @returns {string[]} paths relative to the project root
 */
function listHandoffs(projectDir) {
  const dir = join(projectDir, HANDOFF_DIR);

  if (!existsSync(dir)) {
    return [];
  }

  try {
    return readdirSync(dir)
      .filter((name) => /^\d{2,4}-.+\.md$/.test(name))
      .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10))
      .map((name) => `${HANDOFF_DIR}/${name}`);
  } catch {
    return [];
  }
}

/** Every inline code span in a body, in order, deduplicated. */
function codeSpans(body) {
  return [...new Set([...body.matchAll(/`([^`\n]+)`/g)].map((match) => match[1].trim()))];
}

/**
 * A branch prefix and a directory name are the same word.
 *
 * `test/tool-surface-budget.test.mjs` opens with a branch prefix and is a file,
 * so the extension check is what separates them - without it a handoff naming
 * test files reports three branches that never existed.
 */
const looksLikeBranch = (text) =>
  !/\.[a-z]{1,5}$/i.test(text) &&
  (/^(?:feat|fix|chore|docs|refactor|test|perf|ci|hotfix|release|spike)\/[\w.-]+$/.test(text) || TRUNKS.has(text));

/**
 * Has git ever known this path?
 *
 * Ignored or simply never committed, either way the repository cannot say
 * whether it was deleted or never existed, and saying so is the honest verdict.
 *
 * @param {string} projectDir
 * @param {string} file - repo-relative path
 * @returns {boolean}
 */
function gitKnows(projectDir, file) {
  if (git(projectDir, ["log", "--oneline", "-1", "--", file])) {
    return true;
  }

  return Boolean(git(projectDir, ["ls-files", "--", file]));
}

/**
 * A glob is not a path. `src/core/telemetry*.js` matched nothing on disk and was
 * reported as deleted, which is a fabricated fact from a real handoff.
 */
const looksLikePath = (text) =>
  !text.includes(" ") &&
  !/[*?[\]]/.test(text) &&
  text.includes("/") &&
  /\.[a-z]{1,5}$/i.test(text) &&
  !looksLikeBranch(text);

const looksLikeCommand = (text) => /^(?:pnpm|npm|pnpx|node|bash|git|sh)\s+\S/.test(text);

/**
 * What the handoff says is left to do.
 *
 * Two shapes, because handoffs are written by hand and both are in use: an
 * unchecked checkbox anywhere in the document, and the list under a "Next"
 * heading, which is what every handoff in this repository actually uses. A
 * checked box is done, and prose under the heading is prose, so neither counts.
 * The list ends where the following heading begins.
 *
 * @param {string} body - the handoff's text
 * @returns {string[]} the items, in the order the handoff put them
 */
function openItems(body) {
  const boxes = [...body.matchAll(/^[ \t]*[-*]\s*\[ \]\s*(.+?)\s*$/gm)].map((match) => match[1]);
  const lines = body.split("\n");
  const heading = lines.findIndex((line) => /^#{2,}[ \t]*Next\b/i.test(line));

  if (heading === -1) {
    return boxes;
  }

  const listed = [];
  let current = "";

  const flush = () => {
    if (current === "") {
      return;
    }

    listed.push(current);
    current = "";
  };

  for (const line of lines.slice(heading + 1)) {
    if (/^#{2,}[ \t]/.test(line)) {
      break;
    }

    const item = line.match(/^[ \t]*(?:\d{1,3}\.|[-*])[ \t]+(?!\[[ xX]\])(.{1,300}?)[ \t]*$/);

    if (item) {
      flush();
      current = item[1];
      continue;
    }

    // A handoff is written to a column, so an item longer than the line
    // continues on the next one. Truncating at the wrap hands the next session
    // half a sentence, which is worse than handing it nothing.
    if (current !== "" && line.trim() !== "") {
      current = `${current} ${line.trim()}`.slice(0, 400);
      continue;
    }

    flush();
  }

  flush();

  const seen = new Set(boxes);

  return [...boxes, ...listed.filter((item) => !seen.has(item))];
}

/**
 * What a handoff asserts.
 *
 * A claim that cannot be found is not silently dropped - it lands in `missing`,
 * and the report names it. Half a report the reader can see the shape of beats a
 * whole report that quietly left something out.
 *
 * @param {string} body
 * @returns {object}
 */
function parseHandoff(body) {
  const spans = codeSpans(body);
  const rangeMatch = body.match(/\b([0-9a-f]{7,40})\.\.(HEAD|[0-9a-f]{7,40})\b/);
  const declared = body.match(/\*\*Branch:\*\*\s*`?([\w./-]+)`?/)?.[1];

  const branches = [...new Set([declared, ...spans.filter((span) => looksLikeBranch(span))].filter(Boolean))];
  const files = spans.filter((span) => looksLikePath(span));

  const adrs = new Set();
  const pending = new Set();

  for (const match of body.matchAll(/\bADRs?\s+(\d{3})(?:\s+(?:to|-|through)\s+(\d{3}))?/gi)) {
    const from = Number.parseInt(match[1], 10);
    const to = match[2] ? Number.parseInt(match[2], 10) : from;
    const around = body.slice(Math.max(0, match.index - PENDING_WINDOW), match.index + PENDING_WINDOW);
    const claimsPending = /\b(?:pending|proposed|not written|unwritten|still to|to be accepted|outstanding)\b/i.test(
      around,
    );

    for (let number = from; number <= to && number - from < 20; number += 1) {
      const id = String(number).padStart(3, "0");
      adrs.add(id);

      if (claimsPending) {
        pending.add(id);
      }
    }
  }

  for (const match of body.matchAll(new RegExp(String.raw`${ADR_DIR}/(\d{3})`, "g"))) {
    adrs.add(match[1]);
  }

  const open = openItems(body);

  const commands = spans.filter((span) => {
    if (!looksLikeCommand(span)) {
      return false;
    }

    const at = body.indexOf(`\`${span}\``);
    const around = body.slice(at, at + span.length + PENDING_WINDOW);

    return /\b(?:green|pass(?:es|ed|ing)?|clean|zero|succeeds?|ok)\b/i.test(around);
  });

  const missing = [];

  if (branches.length === 0) {
    missing.push("branch");
  }

  if (!rangeMatch) {
    missing.push("commit range");
  }

  if (files.length === 0) {
    missing.push("files in flight");
  }

  return {
    title: body.match(/^#\s+(.+)$/m)?.[1] ?? "",
    date: body.match(/\*\*Date:\*\*\s*`?([\d-]+)`?/)?.[1] ?? "",
    branches,
    range: rangeMatch ? { start: rangeMatch[1], end: rangeMatch[2] } : undefined,
    files,
    adrs: [...adrs].sort(),
    pending,
    open,
    commands,
    missing,
  };
}

/**
 * Where a branch stands now.
 *
 * @param {string} projectDir
 * @param {string} branch
 * @param {string} current
 * @returns {string}
 */
function verifyBranch(projectDir, branch, current) {
  if (!git(projectDir, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])) {
    return "gone";
  }

  if (branch === current) {
    return "current";
  }

  for (const trunk of TRUNKS) {
    if (trunk === branch) {
      continue;
    }

    if (!git(projectDir, ["rev-parse", "--verify", "--quiet", `refs/heads/${trunk}`])) {
      continue;
    }

    const merged =
      git(projectDir, ["merge-base", "--is-ancestor", branch, trunk]) === "" && isAncestor(projectDir, branch, trunk);

    if (merged) {
      return `merged into ${trunk}`;
    }
  }

  return "exists, not checked out";
}

/**
 * `git merge-base --is-ancestor` answers through its exit code and prints
 * nothing, so it needs its own call rather than the empty-string convention.
 *
 * @param {string} projectDir @param {string} a @param {string} b
 * @returns {boolean}
 */
function isAncestor(projectDir, a, b) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], {
      cwd: projectDir,
      stdio: "ignore",
      timeout: 5000,
      killSignal: "SIGKILL",
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * The status of a referenced ADR, read from the file rather than from the index.
 *
 * @param {string} projectDir @param {string} id
 * @returns {string}
 */
function verifyAdr(projectDir, id) {
  const dir = join(projectDir, ADR_DIR);

  if (!existsSync(dir)) {
    return "not written";
  }

  const file = readdirSync(dir).find((name) => name.startsWith(`${id}-`));

  if (!file) {
    return "not written";
  }

  const status = readFileSync(join(dir, file), "utf8")
    .match(/\*\*Status\*\*:\s*(\w+)/)?.[1]
    ?.toLowerCase();

  if (status === "proposed") {
    return "still proposed";
  }

  return status ?? "unverified, no status line";
}

/** Days between a `YYYY-MM-DD` string and today, or undefined. */
function ageInDays(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return;
  }

  const then = Date.parse(`${date}T00:00:00Z`);

  if (Number.isNaN(then)) {
    return;
  }

  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

/** "3 days ago", "today", or "" when the handoff carried no date. */
function ageLabel(date) {
  const days = ageInDays(date);

  if (days === undefined) {
    return "";
  }

  if (days === 0) {
    return "today";
  }

  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/**
 * Check every parsed claim against the repository.
 *
 * @param {string} projectDir
 * @param {object} claimed from parseHandoff
 * @returns {Array<{ kind: string, value: string, verdict: string, bucket: string }>}
 */
function verify(projectDir, claimed) {
  const hasGit = git(projectDir, ["rev-parse", "--git-dir"]) !== "";
  const current = hasGit ? git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]) : "";
  const claims = [];
  const add = (kind, value, verdict) =>
    claims.push({
      kind,
      value,
      verdict,
      bucket:
        verdict.startsWith("unverified") || verdict.includes("not re-verified")
          ? "unverified"
          : HOLDS.has(verdict)
            ? "still-true"
            : "changed",
    });

  for (const branch of claimed.branches) {
    add("branch", branch, hasGit ? verifyBranch(projectDir, branch, current) : "unverified, no git repository");
  }

  let rangeKnown = false;

  if (claimed.range) {
    const { start, end } = claimed.range;
    const reachable = hasGit && git(projectDir, ["rev-parse", "--verify", "--quiet", `${start}^{commit}`]) !== "";

    if (reachable) {
      rangeKnown = true;
      // Counting from the start of the range answers a different question than
      // the one a reader asks. A handoff that covers `abc1234..HEAD` records no
      // sha for where HEAD was, so the count includes the work the handoff
      // itself describes: reported as "commits since" it read as work that
      // landed afterwards, and on this repository it was over-reporting by the
      // size of the range every time. A fixed end can be counted from.
      const openEnded = end.toUpperCase() === "HEAD";
      const endFixed = !openEnded && git(projectDir, ["rev-parse", "--verify", "--quiet", `${end}^{commit}`]) !== "";
      const from = endFixed ? end : start;
      const count = git(projectDir, ["rev-list", "--count", `${from}..HEAD`]) || "0";
      // Three facts, each with its own sentence: an end that can be counted
      // from, an end the handoff never fixed, and an end it fixed on a commit
      // this repository no longer has, which is what a rewritten message
      // leaves behind.
      const why = openEnded ? "which ends at HEAD" : "whose end is gone from this repository";
      add(
        "range",
        `${start}..${end}`,
        endFixed ? `${count} commits since the range ended` : `${count} commits in and since the range, ${why}`,
      );
    } else {
      add(
        "range",
        `${start}..${end}`,
        hasGit ? "unverified, commit not in this repository" : "unverified, no git repository",
      );
    }
  }

  for (const file of claimed.files) {
    if (existsSync(join(projectDir, file))) {
      if (rangeKnown) {
        const touched = git(projectDir, ["diff", "--name-only", `${claimed.range.start}..HEAD`, "--", file]);
        add("file", file, touched ? "modified since" : "unchanged");
      } else {
        add("file", file, "unverified, no commit range to compare against");
      }
    } else if (hasGit && !gitKnows(projectDir, file)) {
      // Absent and never tracked: a handoff naming a gitignored path, like the
      // recorder directory or an acceptance file, is explaining where something
      // lives. Calling that deleted invents a fact the same way a glob did.
      add("file", file, "unverified, git does not track this path");
    } else {
      add("file", file, "deleted");
    }
  }

  for (const id of claimed.adrs) {
    const status = verifyAdr(projectDir, id);
    add("adr", id, status);
    // An ADR the handoff called pending, and which has since landed, is the
    // single most misleading line to leave standing. One the handoff merely
    // cited as the record is a fact, not a change, however it reads now.
    claims.at(-1).bucket = claimed.pending.has(id) && status !== "still proposed" ? "changed" : "still-true";
  }

  for (const item of claimed.open) {
    add("open", item, "unverified, human judgment");
  }

  const when = ageLabel(claimed.date);

  for (const command of claimed.commands) {
    add("command", command, `claimed${when ? ` ${when}` : " in the handoff"}, not re-verified`);
  }

  return claims;
}

/**
 * Group the file claims so a handoff naming fifteen paths does not produce
 * fifteen lines. The claims array keeps them one by one; the prose does not.
 *
 * @param {Array<object>} claims @param {string} bucket
 * @returns {string[]}
 */
function lines(claims, bucket) {
  const inBucket = claims.filter((claim) => claim.bucket === bucket);
  const out = [];
  const files = new Map();
  const adrs = new Map();

  for (const claim of inBucket) {
    if (claim.kind === "file") {
      files.set(claim.verdict, [...(files.get(claim.verdict) ?? []), claim.value]);
      continue;
    }

    if (claim.kind === "adr") {
      adrs.set(claim.verdict, [...(adrs.get(claim.verdict) ?? []), claim.value]);
      continue;
    }

    switch (claim.kind) {
      case "branch": {
        out.push(`- branch \`${claim.value}\`: ${claim.verdict}`);
        break;
      }
      case "range": {
        out.push(`- ${claim.verdict}`);
        break;
      }
      case "command": {
        out.push(`- \`${claim.value}\`: ${claim.verdict}`);
        break;
      }
      case "open": {
        out.push(`- open: ${claim.value}`);
        break;
      }
      default: {
        break;
      }
    }
  }

  for (const [verdict, ids] of adrs) {
    out.push(`- ADR${ids.length > 1 ? "s" : ""} ${runs(ids)}: ${verdict}`);
  }

  for (const [verdict, paths] of files) {
    out.push(`- ${verdict}: ${paths.map((path) => `\`${path}\``).join(", ")}`);
  }

  return out;
}

/**
 * Collapse consecutive numbers into ranges: eight ADRs that all landed are one
 * fact, and eight lines saying so is the padding a handon exists to remove.
 *
 * @param {string[]} ids zero-padded, ascending
 * @returns {string}
 */
function runs(ids) {
  const groups = [];

  for (const id of ids) {
    const last = groups.at(-1);

    if (last && Number.parseInt(id, 10) === Number.parseInt(last.at(-1), 10) + 1) {
      last.push(id);
    } else {
      groups.push([id]);
    }
  }

  return groups.map((group) => (group.length > 2 ? `${group[0]} to ${group.at(-1)}` : group.join(", "))).join(", ");
}

/**
 * What to do first, given what changed. One sentence, and it names the reason.
 *
 * @param {Array<object>} claims @param {object} claimed
 * @returns {string}
 */
function firstMove(claims, claimed) {
  const command = claims.find((claim) => claim.kind === "command");
  const range = claims.find((claim) => claim.kind === "range");
  const since = range?.verdict.match(/^(\d+) commits/)?.[1];

  if (command) {
    const age = ageLabel(claimed.date);
    const reason = [age && `the claim is ${age}`, since && since !== "0" && `${since} commits have landed since`]
      .filter(Boolean)
      .join(" and ");

    return `Re-run \`${command.value}\` before continuing${reason ? `: ${reason}` : ""}.`;
  }

  const branch = claims.find((claim) => claim.kind === "branch" && claim.bucket === "changed");

  if (branch) {
    return `The branch this work was on (\`${branch.value}\`) is ${branch.verdict}. Confirm where it continues before editing.`;
  }

  const moved = claims.filter((claim) => claim.kind === "file" && claim.bucket === "changed").length;

  if (moved > 0 && since && since !== "0") {
    return `${since} commits landed and ${moved} of the files the handoff named have changed. Re-read those before trusting the narrative around them.`;
  }

  if (claimed.open.length > 0) {
    return `Start with: ${claimed.open[0]}`;
  }

  return "Nothing in the handoff contradicts the repository. Continue where it left off.";
}

/**
 * Read the last handoff and report what is still true.
 *
 * @param {{ projectDir?: string, file?: string, list?: boolean }} options
 * @returns {{ source?: string, claims: Array<object>, text: string, parsed?: object }}
 */
export function handon({ projectDir = ".", file, list = false } = {}) {
  const available = listHandoffs(projectDir);

  if (list) {
    const text =
      available.length === 0
        ? `No handoff found. \`${HANDOFF_DIR}/\` is missing or holds no \`NN-slug.md\` file.`
        : [`# Handoffs in ${HANDOFF_DIR}/`, "", ...available.map((path) => `- ${path}`)].join("\n");

    return { claims: [], text };
  }

  const source = file ?? available[0];

  if (!source || !existsSync(join(projectDir, source))) {
    return {
      claims: [],
      text: [
        "# No handoff to resume from",
        "",
        file ? `\`${file}\` does not exist.` : `\`${HANDOFF_DIR}/\` is missing or holds no \`NN-slug.md\` file.`,
        "",
        "Write one with `rule_tool_process_handoff` at the end of a session. Guessing" +
          " at a session that did not happen would be worse than saying nothing.",
      ].join("\n"),
    };
  }

  const body = readFileSync(join(projectDir, source), "utf8");
  const claimed = parseHandoff(body);
  const claims = verify(projectDir, claimed);

  const range = claims.find((claim) => claim.kind === "range");
  const since = range?.verdict.match(/^\d+ commits\b/) ? `, ${range.verdict}` : "";
  const age = ageLabel(claimed.date);
  const out = [
    `# Resuming from ${source.split("/").at(-1)}${age ? ` (${age}${since})` : since ? ` (${since.slice(2)})` : ""}`,
  ];

  for (const [heading, bucket] of [
    ["Still true", "still-true"],
    ["Changed since", "changed"],
    ["Unverified", "unverified"],
  ]) {
    const rows = lines(claims, bucket);
    out.push("", `## ${heading}`, "", ...(rows.length > 0 ? rows : ["- nothing"]));
  }

  // The open items come out of a file in the repository, which is input, not
  // instruction: a hostile checkout could otherwise ship "ignore previous
  // instructions" as step 1 of the next session (hardening 4.4).
  out.push("", "## Next, as the handoff left it", "");
  out.push(
    ...(claimed.open.length > 0
      ? claimed.open.map((item, index) => `${index + 1}. ${neutralizeDirectives(item)}`)
      : ["- the handoff listed no open items"]),
  );

  if (claimed.missing.length > 0) {
    out.push(
      "",
      "## Could not parse",
      "",
      `- ${claimed.missing.join(", ")}`,
      "",
      "Reported rather than dropped: what is missing here was never checked.",
    );
  }

  out.push("", "## Suggested first move", "", firstMove(claims, claimed));

  return { source, claims, text: out.join("\n"), parsed: claimed };
}

const HandonSchema = z.object({
  projectDir: z.string().optional().default(".").describe("Project root directory"),
  file: z.string().optional().describe("A specific handoff to read instead of the newest"),
  list: z.boolean().optional().default(false).describe("List the handoffs and verify nothing"),
});

/** Register the rule_tool_process_handon tool. */
export function registerProcessHandonTool() {
  registerTool({
    name: "rule_tool_process_handon",
    description:
      "Read the last handoff in docs/handoff/ and report which of its claims are still true: branch, commit range, files, ADRs, open work. Read-only, never re-runs a claimed command.",
    zodSchema: HandonSchema,
    annotations: { readOnlyHint: true },
    handler: async (arguments_) => ({
      content: [{ type: "text", text: handon(arguments_ ?? {}).text }],
    }),
  });
}
