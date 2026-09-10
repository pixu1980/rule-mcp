

/** The IDE config path helpers, one arm per platform. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { devinConfigPath, vscodeGlobalDir } from "../_agents-ide.js";

/** Run a function with process.platform (and APPDATA) faked, then restore. */
function onPlatform(platform, fn, { appdata } = {}) {
  const realPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  const realAppdata = process.env.APPDATA;
  Object.defineProperty(process, "platform", { value: platform });

  if (appdata === null) {
    delete process.env.APPDATA;
  } else if (appdata) {
    process.env.APPDATA = appdata;
  }

  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", realPlatform);

    if (realAppdata === undefined) {
      delete process.env.APPDATA;
    } else {
      process.env.APPDATA = realAppdata;
    }
  }
}

test("vscodeGlobalDir picks the platform-native user directory", () => {
  const darwin = onPlatform("darwin", () => vscodeGlobalDir());
  assert.match(darwin, /Library[/\\]Application Support[/\\]Code[/\\]User$/, "darwin uses Application Support");

  const linux = onPlatform("linux", () => vscodeGlobalDir());
  assert.match(linux, /\.config[/\\]Code[/\\]User$/, "linux uses .config");

  const winAppdata = onPlatform("win32", () => vscodeGlobalDir(), { appdata: String.raw`C:\Users\me\AppData\Roaming` });
  assert.match(winAppdata, /AppData/, "win32 honors APPDATA");

  const winBare = onPlatform("win32", () => vscodeGlobalDir(), { appdata: null });
  assert.match(winBare, /AppData[/\\]Roaming[/\\]Code[/\\]User$/, "win32 falls back to the home AppData");
});

test("devinConfigPath picks .config on posix and AppData on windows", () => {
  const posix = onPlatform("linux", () => devinConfigPath());
  assert.match(posix, /\.config[/\\]devin[/\\]mcp_config\.json$/, "posix uses .config");

  const win = onPlatform("win32", () => devinConfigPath(), { appdata: null });
  assert.match(win, /AppData[/\\]Roaming[/\\]devin[/\\]mcp_config\.json$/, "win32 falls back to the home AppData");
});
