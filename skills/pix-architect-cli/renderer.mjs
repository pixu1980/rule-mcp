// rule-architect-cli renderer — Minimal interactive CLI wizard
// Arrow keys for selects. Readline for text. Alternate screen buffer.
// Each step screen replaces the previous one via ANSI alt screen.

import * as readline from "node:readline";
import { isFieldVisible } from "../rule-architect/validators.mjs";

// ══════════════════════════════════════════════════════════════════════════════
// Alternate screen buffer — each step replaces the previous
// ══════════════════════════════════════════════════════════════════════════════

let altScreen = false;

/** Enter alternate screen buffer — saves main terminal content */
export function enterAltScreen() {
  if (!altScreen) {
    process.stdout.write("\x1b[?1049h");
    altScreen = true;
  }
}

/** Exit alternate screen buffer — restores main terminal content */
export function exitAltScreen() {
  if (altScreen) {
    process.stdout.write("\x1b[?1049l");
    altScreen = false;
  }
}

/** Clear screen and home cursor within alt buffer */
function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

// ══════════════════════════════════════════════════════════════════════════════
// Raw mode key reader (single key at a time)
// ══════════════════════════════════════════════════════════════════════════════

process.stdin.setEncoding("utf8");

let raw = false;

function rawOn() {
  if (!raw) { process.stdin.setRawMode(true); raw = true; }
}
function rawOff() {
  if (raw) { process.stdin.setRawMode(false); raw = false; }
}

function waitKey() {
  return new Promise((resolve) => {
    const h = (buf) => {
      process.stdin.removeListener("data", h);
      const s = buf.toString();
      if (s === "\x03") resolve("ctrl-c");
      else if (s === "\r" || s === "\n") resolve("enter");
      else if (s === "\x1b") resolve("esc");
      else if (s === "\x1b[A") resolve("up");
      else if (s === "\x1b[B") resolve("down");
      else if (s === "\x1b[C") resolve("right");
      else if (s === "\x1b[D") resolve("left");
      else if (s.length === 1 && s >= " " && s < "\x7f") resolve(s);
      else resolve("?");
    };
    process.stdin.on("data", h);
  });
}

// ── Cursor helpers ──

function cursorUp(n) { if (n > 0) process.stdout.write(`\x1b[${n}A`); }
function clearRest() { process.stdout.write("\x1b[0J"); }
function hide() { process.stdout.write("\x1b[?25l"); }
function show() { process.stdout.write("\x1b[?25h"); }

// ── Readline question ──

function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (a) => { rl.close(); resolve(a.trim()); });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Select field — arrow-key picker
// ══════════════════════════════════════════════════════════════════════════════

async function pickOption(field, values, optGroups) {
  const list = typeof field.options === "string"
    ? (optGroups[field.options] || [])
    : (Array.isArray(field.options) ? field.options : []);

  const req = field.required ? " *" : "";
  const current = values[field.key];
  let idx = Math.max(0, list.findIndex(o => (o.key ?? o.id) === current));

  function buildOutput() {
    const parts = [`  ${field.label}${req}`];
    if (field.description) parts.push(`  \x1b[2m${field.description}\x1b[0m`);
    parts.push("");

    list.forEach((opt, i) => {
      const arrow = i === idx ? "\x1b[36m▸\x1b[0m" : " ";
      const hl = i === idx ? "\x1b[1;36m" : "";
      const tag = opt.pixAISkill ? ` \x1b[2m[${opt.pixAISkill}]\x1b[0m` : "";
      const desc = opt.description ? `\n  \x1b[2m${opt.description}\x1b[0m` : "";
      parts.push(`  ${hl}${arrow} ${i + 1}. ${opt.label}${tag}\x1b[0m${desc}`);
    });

    parts.push("");
    parts.push("  \x1b[2m↑↓ select  Enter confirm\x1b[0m");
    return parts.join("\n");
  }

  hide();
  let output = buildOutput();
  let printedRows = output.split("\n").length;
  console.log(output);

  rawOn();
  while (true) {
    const key = await waitKey();
    if (key === "up" && idx > 0) {
      idx--;
      cursorUp(printedRows);
      clearRest();
      output = buildOutput();
      printedRows = output.split("\n").length;
      console.log(output);
    } else if (key === "down" && idx < list.length - 1) {
      idx++;
      cursorUp(printedRows);
      clearRest();
      output = buildOutput();
      printedRows = output.split("\n").length;
      console.log(output);
    } else if (key === "enter") {
      break;
    } else if (key === "esc") {
      rawOff(); show(); return;
    }
  }
  rawOff();

  values[field.key] = list[idx].key ?? list[idx].id ?? "";
  console.log(`  \x1b[36m✔ ${list[idx].label}\x1b[0m`);
  show();
}

// ══════════════════════════════════════════════════════════════════════════════
// Text field — readline
// ══════════════════════════════════════════════════════════════════════════════

async function inputText(field, values) {
  const val = values[field.key] || "";
  const ph = field.placeholder || "";
  const req = field.required ? " *" : "";
  console.log(`  ${field.label}${req}`);
  if (field.description) console.log(`  ${field.description}`);
  const hint = val || ph;
  console.log(`  \x1b[2m[${hint}]\x1b[0m`);
  const answer = await ask("  \x1b[36m→\x1b[0m ");
  if (answer) values[field.key] = answer;
  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// Textarea — line by line
// ══════════════════════════════════════════════════════════════════════════════

async function inputTextarea(field, values) {
  const val = values[field.key] || "";
  const ph = field.placeholder || "";
  const req = field.required ? " *" : "";
  console.log(`  ${field.label}${req}`);
  if (field.description) console.log(`  ${field.description}`);
  if (val) { val.split("\n").forEach(l => console.log(`  \x1b[2m│ ${l}\x1b[0m`)); }
  else { console.log(`  \x1b[2m(${ph || "one per line, blank = done"})\x1b[0m`); }

  const lines = val ? val.split("\n").filter(Boolean) : [];
  while (true) {
    const line = await ask("  \x1b[36m│\x1b[0m ");
    if (!line) break;
    lines.push(line);
  }
  values[field.key] = lines.join("\n");
  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// Repeatable
// ══════════════════════════════════════════════════════════════════════════════

async function inputRepeatable(field, values) {
  const arr = [...(values[field.key] || [])];
  const sf = field.subFields || [{ key: "name", label: "Name", type: "text" }];
  const nameKey = sf[0].key;
  const req = field.required ? " *" : "";

  console.log(`  ${field.label}${req}`);
  if (field.description) console.log(`  ${field.description}`);
  if (arr.length === 0) console.log(`  \x1b[2m(empty)\x1b[0m`);
  else arr.forEach((item, i) => console.log(`  ${i + 1}. ${item[nameKey] || "-"}`));
  console.log(`  \x1b[2ma=add  dN=del  Enter=done\x1b[0m`);

  while (true) {
    const cmd = await ask("  \x1b[36m→\x1b[0m ");
    if (!cmd) break;
    if (cmd === "a") {
      const name = await ask(`  New ${nameKey}: `);
      if (name) {
        const item = {}; sf.forEach(s => { item[s.key] = ""; });
        item[nameKey] = name; arr.push(item);
        console.log(`  \x1b[2mAdded: ${name}\x1b[0m`);
      }
    } else if (cmd.startsWith("d")) {
      const i = parseInt(cmd.slice(1), 10) - 1;
      if (i >= 0 && i < arr.length) {
        const r = arr.splice(i, 1);
        console.log(`  \x1b[2mRemoved: ${r[0][nameKey]}\x1b[0m`);
      }
    }
  }
  values[field.key] = arr;
  console.log();
}

// ══════════════════════════════════════════════════════════════════════════════
// Step nav — press Enter/→/n for next, Esc/←/p for back
// ══════════════════════════════════════════════════════════════════════════════

async function navPrompt(nav) {
  const parts = [];
  if (!nav.isFirst) parts.push("\x1b[2mEsc\x1b[0m←Back");
  if (nav.isLast) parts.push("\x1b[36;1mEnter\x1b[0m✓Submit");
  else parts.push("\x1b[36;1mEnter\x1b[0m→Next");
  parts.push("\x1b[2mCtrl+C\x1b[0mQuit");

  console.log(`  ${parts.join("  ")}`);

  rawOn();
  while (true) {
    const k = await waitKey();
    if (k === "ctrl-c") { rawOff(); return "quit"; }
    if (k === "enter" || k === "right" || k === "n") { rawOff(); return nav.isLast ? "submit" : "next"; }
    if ((k === "esc" || k === "left" || k === "p") && !nav.isFirst) { rawOff(); return "prev"; }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Public API — called by wizard.mjs for each step
// ══════════════════════════════════════════════════════════════════════════════

export async function renderStep(step, values, optionGroups, nav) {
  const vFields = step.fields.filter(f => isFieldVisible(f, values));

  if (vFields.length === 0) {
    return { action: nav.isLast ? "submit" : "next", values };
  }

  // ── Clear screen — each step replaces previous ──
  clearScreen();

  // ── Header ──
  const showCounter = nav.totalSteps > 0;
  const pct = showCounter ? Math.round((nav.stepNum / nav.totalSteps) * 100) : 0;
  const bar = showCounter
    ? "\x1b[36m" + "█".repeat(Math.round(pct / 10)) + "\x1b[0m" + "\x1b[2m" + "░".repeat(10 - Math.round(pct / 10)) + "\x1b[0m"
    : "\x1b[2m?\x1b[0m";
  const stepLabel = showCounter ? `Step ${nav.stepNum}/${nav.totalSteps}` : "Analysis Depth";
  console.log(`\x1b[2m${"─".repeat(64)}\x1b[0m`);
  console.log(`  \x1b[1;36mrule-architect\x1b[0m\x1b[2m  Interview\x1b[0m  ${bar}  \x1b[2m${stepLabel}\x1b[0m`);
  console.log(`\x1b[2m${"─".repeat(64)}\x1b[0m`);
  console.log(`  \x1b[1m${step.label}\x1b[0m`);
  if (step.description) console.log(`  \x1b[2m${step.description}\x1b[0m`);
  console.log();

  // ── Fields ──
  for (const field of vFields) {
    switch (field.type) {
      case "select": await pickOption(field, values, optionGroups); break;
      case "text": await inputText(field, values); break;
      case "textarea": await inputTextarea(field, values); break;
      case "repeatable": await inputRepeatable(field, values); break;
      default: await inputText({ ...field, type: "text" }, values);
    }
  }

  // ── Navigation ──
  const action = await navPrompt(nav);
  show();
  return { action, values };
}
