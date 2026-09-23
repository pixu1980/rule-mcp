/**
 * jsdom ships its own undici, and loading it can install a global dispatcher
 * that Node's built-in fetch cannot drive: responses arrive raw and
 * compressed, with no headers, which makes content-type sniffing fail.
 *
 * Capture whatever dispatcher exists before jsdom loads, then put it back
 * before any fetch. `undefined` lets Node create its own native dispatcher.
 */

const DISPATCHER = Symbol.for("undici.globalDispatcher.1");

const captured = Reflect.get(globalThis, DISPATCHER);

/** Restore the dispatcher that was in place before jsdom replaced it. */
export function restoreUndiciDispatcher(): void {
  Reflect.set(globalThis, DISPATCHER, captured);
}
