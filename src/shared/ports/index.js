/**
 * @module shared/ports
 *
 * The store shape a process keeps its state behind.
 *
 * A caller that holds its state in a bare Map cannot be handed another kind of
 * store without editing it, and cannot be driven by a test without reaching into
 * it. The port is the four operations both sides agree on - get, set, delete and
 * the sliding-window sweep - plus the two reads a caller needs to walk or bound
 * what it holds.
 *
 * @typedef {object} StorePort
 * @property {(key: string) => any} get
 * @property {(key: string, value: any) => void} set
 * @property {(key: string) => boolean} delete
 * @property {(predicate?: (value: any, key: string) => boolean) => number} sweep
 * @property {() => number} size
 * @property {() => Iterable<[string, any]>} entries
 */

export * from "./_memory.js";
export * from "./_file.js";
