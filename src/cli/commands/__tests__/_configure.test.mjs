// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** configure rejects a malformed --set pair before touching anything. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { configureCommand } from "../_configure.js";

test("a --set pair without = is rejected", async () => {
  await assert.rejects(configureCommand({ set: ["NOEQUALS"] }), /Invalid env format/, "the pair must be KEY=VALUE");
});
