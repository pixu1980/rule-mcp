

/**
 * A probe component for the list hook, and the reader that parses its frame.
 *
 * The bindings are the contract every selection screen inherits, so they are
 * driven through a component that renders nothing else: testing them through
 * a real screen would tie them to that screen's rows.
 *
 * Fixture file: exempt from the size cap.
 */

import { settle } from "./_fake-terminal.fixture.mjs";
import { mountApp } from "./_mount.fixture.mjs";
import { h, Text } from "../_h.js";
import { useSelection } from "../_use-selection.js";

/** A heading, an enabled row, a disabled row, a second heading, a last row. */
export const ITEMS = [{ section: true, label: "Coding agents" }, { id: "claude" }, { id: "codex", disabled: true }, { section: true, label: "Editors" }, { id: "zed" }];

/** A component that renders nothing but the hook's answer. */
const probeOf =
  (options = {}) =>
  () => {
    const { cursor, selected, current } = useSelection(ITEMS, options);

    return h(Text, null, `cursor=${cursor} current=${current?.id ?? current?.label} selected=${[...selected].join(",")}`);
  };

/** Mount a probe and hand back the driving handles. */
export async function probe(options) {
  const handles = mountApp(probeOf(options));
  await settle();

  return handles;
}

/** The single line the probe renders, parsed into its fields. */
export const state = (stdout) =>
  Object.fromEntries(
    stdout.lastFrame
      .trim()
      .split(" ")
      .map((pair) => pair.split("=")),
  );
