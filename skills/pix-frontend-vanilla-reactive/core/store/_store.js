// ═══════════════════════════════════════════════════════════════════════════════
//  PART 2 — Store (Proxy-based state container)
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { isObject } from "./_guards.js";
import { toPathArray } from "./_paths.js";
import { deepClone, clonePlainValue } from "./_clone.js";
import { StateSignal } from "../signals/_state-signal.js";

export class Store {
  constructor(initialState = {}, opts = {}) {
    this.events = opts.eventsTarget ?? window;
    this.target = deepClone(initialState);
    this.proxyCache = new WeakMap();
    this.state = this._createProxy(this.target, []);

    // Auto-create tickState signal for reactive rendering
    // Access via store.tick.get() in ComputedSignal / effect
    // Fires once on construction so effects created later render immediately.
    // Disable with: new Store(data, { autoTick: false })
    if (opts.autoTick !== false) {
      this.tick = new StateSignal(0, {
        equals: () => {
          return false;
        },
      });
      this.tick.set(performance.now()); // initial kick
    }
  }

  _createProxy(target, path) {
    if (!isObject(target)) {
      return target;
    }

    if (this.proxyCache.has(target)) {
      return this.proxyCache.get(target);
    }
    const store = this;

    const proxy = new Proxy(target, {
      get(raw, key) {
        if (key === "__raw") {
          return raw;
        }

        if (key === "__path") {
          return path;
        }

        const value = Reflect.get(raw, key);

        if (isObject(value)) {
          return store._createProxy(value, [...path, key]);
        }

        return value;
      },

      set(raw, key, value) {
        const nextPath = [...path, key];

        const old = raw[key];
        // Skip clone + emit if same reference (e.g. resetting to current array)
        if (old === value) {
          return Reflect.set(raw, key, value);
        }

        const prepared = clonePlainValue(value);

        const result = Reflect.set(raw, key, prepared);
        store._emitChange(nextPath);

        return result;
      },

      deleteProperty(raw, key) {
        if (!(key in raw)) {
          return true;
        }

        const nextPath = [...path, key];

        const old = raw[key];
        const result = Reflect.deleteProperty(raw, key);

        store._emitChange(nextPath);

        return result;
      },
    });
    this.proxyCache.set(target, proxy);

    return proxy;
  }

  _emitChange(path) {
    // Brief change event (no deepClone — too expensive for large state)
    this.events.dispatchEvent(
      new CustomEvent("store:change", {
        detail: { path: toPathArray(path).join(".") },
      }),
    );
    // Notify reactivity system
    if (this.tick) {
      this.tick.set(performance.now());
    }
  }

  get(path) {
    const parts = toPathArray(path);

    let current = this.state;
    for (const p of parts) current = current?.[p];

    return current;
  }

  set(path, value) {
    const parts = toPathArray(path);

    if (!parts.length) {
      throw new Error("Path required");
    }

    const last = parts.pop();

    let current = this.state;

    for (const p of parts) {
      if (!isObject(current[p])) current[p] = {};
      current = current[p];
    }

    current[last] = value;

    return value;
  }

  replace(next) {
    const old = deepClone(this.target);

    this.target = deepClone(next);
    this.proxyCache = new WeakMap();
    this.state = this._createProxy(this.target, []);
    this._emitChange([]);
  }

  snapshot() {
    return deepClone(this.target);
  }
}
