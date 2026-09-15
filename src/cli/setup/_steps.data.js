

/**
 * @module cli/setup/steps.data
 *
 * Step names for the rail and key hints for the bar, per wizard and per step.
 * Data file: exempt from the size cap.
 */

/** The rail labels, in order. */
export const STEP_NAMES = {
  install: ["Preflight", "Agents", "Mode", "Extras", "Commands", "Surface", "Review", "Install", "Done"],
  uninstall: ["Select", "Purge", "Review", "Remove", "Done"],
};

const MOVE = ["up/down", "move"];
const TOGGLE = ["space", "toggle"];
const ALL = ["a/n", "all/none"];
const NEXT = ["enter", "next"];
const BACK = ["esc", "back"];
const QUIT = ["q", "quit"];
const RUN = ["enter", "run"];
const DRY = ["d", "toggle dry run"];
const CLOSE = ["enter", "close"];

/** One hint row per step, indexed the same way as the views. */
export const HINTS = {
  install: [
    [NEXT, QUIT],
    [MOVE, TOGGLE, ALL, NEXT, BACK, QUIT],
    [MOVE, NEXT, BACK, QUIT],
    [MOVE, TOGGLE, NEXT, BACK, QUIT],
    [MOVE, TOGGLE, ALL, NEXT, BACK, QUIT],
    [MOVE, TOGGLE, ALL, NEXT, BACK, QUIT],
    [DRY, RUN, BACK, QUIT],
    [QUIT],
    [CLOSE],
  ],
  uninstall: [
    [MOVE, TOGGLE, ALL, NEXT, QUIT],
    [MOVE, TOGGLE, NEXT, BACK, QUIT],
    [DRY, RUN, BACK, QUIT],
    [QUIT],
    [CLOSE],
  ],
};
