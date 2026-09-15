

/**
 * @module cli/setup/mount
 *
 * Putting a wizard on the alternate screen and taking it off again.
 *
 * The alternate screen is what makes this a viewport application instead of
 * scrollback: the frame owns the window while it runs, and the user's shell
 * history is exactly as they left it afterwards. The consequence is that
 * everything drawn is gone on exit, which is why the caller prints a plain
 * summary once the screen is restored.
 */

import { render } from "ink";

import { h } from "./_h.js";

const ALT_ON = "\u001B[?1049h\u001B[H";
const ALT_OFF = "\u001B[?1049l";
const CURSOR_HIDE = "\u001B[?25l";
const CURSOR_SHOW = "\u001B[?25h";

/**
 * The Ink options the wizard needs.
 *
 * `interactive: true` overrides Ink's CI detection. That detection reads
 * `is-in-ci`, which trips on `CONTINUOUS_INTEGRATION` as well as `CI` - a
 * variable some VS Code and agent shells export without being a CI job - and
 * a non-interactive Ink disables synchronized output and cursor control. The
 * full-frame erase and redraw is then visible as flicker.
 *
 * `incrementalRendering` updates only the lines that changed instead of
 * repainting the whole frame, which removes what is left on a slow terminal.
 *
 * @returns {object}
 */
export function wizardRenderOptions() {
  return { exitOnCtrlC: false, patchConsole: true, interactive: true, incrementalRendering: true };
}

/**
 * Render one wizard component full-screen and resolve with what it finished
 * with.
 *
 * The screen is restored on every path, including a thrown render error and
 * a SIGINT, because a process that dies inside the alternate screen leaves
 * the terminal with no cursor.
 *
 * @param {Function} App
 * @param {object} props
 * @returns {Promise<{ results: object[], dryRun: boolean }>}
 */
export async function mountWizard(App, props = {}) {
  const { stdout } = process;
  let outcome = { results: [], dryRun: false };

  stdout.write(ALT_ON + CURSOR_HIDE);

  const restore = () => stdout.write(CURSOR_SHOW + ALT_OFF);

  process.once("SIGINT", restore);
  process.once("SIGTERM", restore);

  try {
    const instance = render(
      h(App, {
        ...props,
        onFinish: (result) => {
          outcome = result;
        },
      }),
      wizardRenderOptions(),
    );

    await instance.waitUntilExit();
  } finally {
    restore();
    process.off("SIGINT", restore);
    process.off("SIGTERM", restore);
  }

  return outcome;
}
