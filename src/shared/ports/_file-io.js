

/** @module shared/ports/file-io - one gzipped JSON file, written atomically */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

/**
 * The file's content as JSON, or undefined when it is absent, unreadable or
 * corrupt: a store that cannot read its file starts empty, it does not throw.
 *
 * @param {string} file
 * @returns {object|undefined}
 */
export function readJson(file) {
  try {
    return JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
  } catch {
    return;
  }
}

/**
 * Write JSON to the file, gzipped, through a temporary file and a rename.
 *
 * The rename is what makes the file whole or absent, never half-written: a
 * process that dies mid-write leaves the previous file in place.
 *
 * @param {string} file
 * @param {object} value
 */
export function writeJson(file, value) {
  try {
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    const payload = gzipSync(Buffer.from(JSON.stringify(value), "utf8"), { level: 9 });
    const temporary = `${file}.${process.pid}.tmp`;

    writeFileSync(temporary, payload, { mode: 0o600 });
    renameSync(temporary, file);
  } catch {
    /* best-effort persistence: a cache that cannot be written is still a cache */
  }
}
