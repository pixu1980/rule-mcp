/** @module core/telemetry/recorder/buffer */

import { appendEvents } from "../store/index.js";

/** Flush once the buffer reaches this, so a long session is not lost on a kill. */
const BUFFER_LIMIT = 25;

let _buffer = [];

/** Write the buffer out. Never throws. */
export function flush() {
  if (_buffer.length === 0) {
    return;
  }

  const pending = _buffer;
  _buffer = [];
  try {
    appendEvents(pending);
  } catch {
    /* a metric is never worth an outage */
  }
}

/**
 * Queue one event, flushing when the buffer is full.
 *
 * @param {object} event
 */
export function pushEvent(event) {
  _buffer.push(event);

  if (_buffer.length >= BUFFER_LIMIT) {
    flush();
  }
}

// Flush what is buffered on a normal exit.
//
// Deliberately NOT on SIGINT or SIGTERM. Registering a listener for those
// removes Node's default termination behavior, so a core module that hooks
// them stops the whole process from dying on a signal - which is exactly what
// happened here: the SSE tests terminate their servers with SIGTERM and hung
// until the suite timed out. A telemetry buffer is not worth breaking the
// shutdown path; the graceful routes already flush through endSession().
try {
  process.on("exit", () => {
    try {
      flush();
    } catch {
      /* ignore */
    }
  });
} catch {
  /* ignore */
}
