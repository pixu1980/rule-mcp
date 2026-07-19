// ═══════════════════════════════════════════════════════════════════════════════
//  Store — cloning utilities
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { isObject } from "./_guards.js";

export function clonePlainValue(value, seen = new WeakMap()) {
  const raw = isObject(value) ? (value.__raw ?? value) : value;

  if (!isObject(raw)) { return raw; }
  if (seen.has(raw)) { return seen.get(raw); }
  if (raw instanceof Date) {
    return new Date(raw.getTime());
  }

  if (raw instanceof RegExp) {
    return new RegExp(raw.source, raw.flags);
  }

  if (raw instanceof Map) { const n = new Map(); seen.set(raw, n); for (const [k, v] of raw) n.set(clonePlainValue(k, seen), clonePlainValue(v, seen)); return n; }
  if (raw instanceof Set) { const n = new Set(); seen.set(raw, n); for (const v of raw) n.add(clonePlainValue(v, seen)); return n; }
  if (Array.isArray(raw)) { const n = []; seen.set(raw, n); for (const v of raw) n.push(clonePlainValue(v, seen)); return n; }
  const n = {}; seen.set(raw, n);
  for (const k of Reflect.ownKeys(raw)) { const d = Object.getOwnPropertyDescriptor(raw, k); if (!d?.enumerable) continue; n[k] = clonePlainValue(raw[k], seen); }

  return n;
}

export function deepClone(v) { return clonePlainValue(v); }

