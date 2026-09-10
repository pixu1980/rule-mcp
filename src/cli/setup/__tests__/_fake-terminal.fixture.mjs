/**
 * A stdin/stdout pair Ink will render into without a real terminal.
 *
 * Ink only needs `columns`, `rows`, `write`, and an event emitter for
 * resize; stdin needs the raw-mode surface it calls on mount. That is the
 * whole contract, so the fake is a few dozen lines rather than a dependency.
 *
 * Fixture file: exempt from the size cap.
 */

import { EventEmitter } from "node:events";

/* eslint-disable unicorn/prefer-event-target -- Ink subscribes with
   stdout.on("resize") and stdin.on("readable"); the Node EventEmitter API is
   the contract these fakes have to satisfy, not a preference. */

const ESC = "\u001B";
const ANSI = /\u001B\[[\d;?]*[A-Za-z]/g;

/** Collects every frame Ink paints. */
export class FakeStdout extends EventEmitter {
  constructor({ columns = 110, rows = 30 } = {}) {
    super();
    this.columns = columns;
    this.rows = rows;
    this.frames = [];
  }

  write(data) {
    this.frames.push(data);

    return true;
  }

  /** The most recent frame, ANSI stripped. */
  get lastFrame() {
    return String(this.frames.at(-1) ?? "").replaceAll(ANSI, "");
  }

  /** Every frame concatenated, ANSI stripped - for "did this ever render" checks. */
  get output() {
    return this.frames.join("").replaceAll(ANSI, "");
  }
}

/**
 * Enough of a TTY stdin for Ink's raw-mode setup.
 *
 * Ink 6 pulls input with `readable` + `read()` rather than listening for
 * `data`, so a fake that only emits `data` renders fine and never receives a
 * keystroke. The queue below is what makes keys actually arrive.
 */
export class FakeStdin extends EventEmitter {
  constructor() {
    super();
    this.isTTY = true;
    this.queue = [];
  }

  setEncoding() {}
  setRawMode() {}
  ref() {}
  unref() {}
  resume() {}
  pause() {}

  read() {
    return this.queue.shift() ?? null;
  }

  /** Put bytes back, as the kitty-protocol probe does when it gives up. */
  unshift(chunk) {
    this.queue.unshift(String(chunk));
  }

  /** Send a keystroke the way a terminal would. */
  press(sequence) {
    this.queue.push(sequence);
    this.emit("readable");
    this.emit("data", sequence);
  }
}

/** Keys the wizard binds, by name. */
export const KEY = {
  enter: "\r",
  space: " ",
  down: `${ESC}[B`,
  up: `${ESC}[A`,
  escape: ESC,
  quit: "q",
  dryRun: "d",
};

/** Let React flush and Ink repaint. */
export const settle = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

/* eslint-enable unicorn/prefer-event-target */
