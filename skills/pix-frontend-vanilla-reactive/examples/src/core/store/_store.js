// ═══════════════════════════════════════════════════════════════════════════════
//  PART 2 - Store (Proxy-based state container)
// ═══════════════════════════════════════════════════════════════════════════════

import { isObject } from "./_guards.js";
import { toPathArray } from "./_paths.js";
import { deepClone, clonePlainValue } from "./_clone.js";

export class Store {
  constructor(initialState = {}, opts = {}) {
    this.events = opts.eventsTarget ?? window;
    this.target = deepClone(initialState);
    this.proxyCache = new WeakMap();
    this.state = this._createProxy(this.target, []);
  }
  _createProxy(target, path) {
    if (!isObject(target)) return target;
    if (this.proxyCache.has(target)) return this.proxyCache.get(target);
    const store = this;
    const proxy = new Proxy(target, {
      get(raw, key) {
        if (key === "__raw") return raw;
        if (key === "__path") return path;
        const value = Reflect.get(raw, key);
        if (isObject(value)) return store._createProxy(value, [...path, key]);
        return value;
      },
      set(raw, key, value) {
        const nextPath = [...path, key];
        const old = raw[key];
        const prepared = clonePlainValue(value);
        const result = Reflect.set(raw, key, prepared);
        if (old !== prepared) store._emitChange(nextPath, old, prepared);
        return result;
      },
      deleteProperty(raw, key) {
        if (!(key in raw)) return true;
        const nextPath = [...path, key];
        const old = raw[key];
        const result = Reflect.deleteProperty(raw, key);
        store._emitChange(nextPath, old, undefined);
        return result;
      },
    });
    this.proxyCache.set(target, proxy);
    return proxy;
  }
  _emitChange(path, oldValue, newValue) {
    const detail = { path: toPathArray(path).join("."), oldValue: deepClone(oldValue), newValue: deepClone(newValue) };
    this.events.dispatchEvent(new CustomEvent("store:change", { detail }));
  }
  get(path) {
    const parts = toPathArray(path);
    let current = this.state;
    for (const p of parts) current = current?.[p];
    return current;
  }
  set(path, value) {
    const parts = toPathArray(path);
    if (!parts.length) throw new Error("Path required");
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
    this._emitChange([], old, this.target);
  }
  snapshot() {
    return deepClone(this.target);
  }
}
