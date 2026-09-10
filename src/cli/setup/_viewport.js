/**
 * @module cli/setup/viewport
 *
 * The terminal's current size, as state.
 *
 * Ink lays out against whatever height it is given. A wizard that fills the
 * screen needs a resize subscription, or a window change leaves it laying
 * out against a stale height and the frame tears.
 */

import { useEffect, useState } from "react";

/** Floors so a very small window still renders something usable. */
const MIN_ROWS = 16;
const MIN_COLUMNS = 60;

const read = (stdout) => ({
  rows: Math.max(MIN_ROWS, stdout?.rows ?? 24),
  columns: Math.max(MIN_COLUMNS, stdout?.columns ?? 80),
});

/**
 * @param {NodeJS.WriteStream} stdout
 * @returns {{ rows: number, columns: number }}
 */
export function useViewport(stdout) {
  const [size, setSize] = useState(() => read(stdout));

  useEffect(() => {
    if (!stdout?.on) {
      return;
    }

    const onResize = () => setSize(read(stdout));

    stdout.on("resize", onResize);

    return () => stdout.off("resize", onResize);
  }, [stdout]);

  return size;
}
