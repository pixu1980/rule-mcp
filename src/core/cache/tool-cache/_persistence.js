/** The persistent tier: lazy load, debounced flush, atomic gzip write. */
import { gzipSync, gunzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { getRuntimePaths } from "@src/cli/paths/index.js";
import { cacheState } from "./_state.js";
import { cacheFile, namespace } from "./_config.js";

/** Lazily load the persistent tier into memory (once per process). */
export function ensureLoaded() {
  if (cacheState.isLoaded) {
    return;
  }

  cacheState.isLoaded = true;
  try {
    const file = cacheFile();

    if (!existsSync(file)) {
      return;
    }

    const parsed = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));

    if (parsed?.namespace === namespace() && parsed?.entries && typeof parsed.entries === "object") {
      for (const [k, v] of Object.entries(parsed.entries)) {
        // A file written before entries carried their dependencies stored the
        // result at the top level. Skipping those is cheaper and safer than
        // guessing what they depended on, and they are recomputed once.
        if (!v || typeof v !== "object" || !v.result) {
          continue;
        }
        // A core carrying a request id can never match a recompute, so it
        // would be reported as drift on every verify. Dropping it keeps the
        // cache converging without anyone clearing it (ADR 062).
        if (v.result?._meta?.pixEnforcement?.requestId !== undefined) {
          continue;
        }

        cacheState.memory.set(k, v);
      }
    }
    // A namespace mismatch means the on-disk cache is stale, ignore it; the next
    // flush overwrites the file with the current namespace.
  } catch {
    /* corrupt/unreadable cache is non-fatal, start empty */
  }
}

/** Schedule a debounced persistent flush (unref'd so it never holds the event loop). */
export function scheduleFlush() {
  cacheState.isDirty = true;

  if (cacheState.flushTimer) {
    return;
  }

  cacheState.flushTimer = setTimeout(() => {
    cacheState.flushTimer = null;
    flush();
  }, 2000);
  cacheState.flushTimer.unref?.();
}

/** Write the in-memory tier to the gzipped persistent file (atomic rename). */
export function flush() {
  if (!cacheState.isDirty) {
    return;
  }

  cacheState.isDirty = false;
  try {
    const { stateDir } = getRuntimePaths();
    mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    const entries = Object.fromEntries(cacheState.memory);
    const payload = gzipSync(Buffer.from(JSON.stringify({ namespace: namespace(), version: 3, entries }), "utf8"), {
      level: 9,
    });
    const temporary = `${cacheFile()}.${process.pid}.tmp`;

    writeFileSync(temporary, payload, { mode: 0o600 });
    renameSync(temporary, cacheFile());
  } catch {
    /* best-effort persistence */
  }
}

/** Flush pending writes on process exit so recycling survives restarts. */
process.on("exit", () => {
  try {
    flush();
  } catch {
    /* ignore */
  }
});
