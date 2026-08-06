/**
 * rule-architect Context Interview Wizard — Dynamic Stepper Mode
 *
 * Fully data-driven: renders steps from placeholders.json sections.
 * Uses rule-frontend-vanilla-reactive: Store + Signal + html\`\` + render().
 * Root DOM is stable (html parts) → no scroll loss on re-render.
 */

import { Store, Signal, effect, html, render, registerFilter } from "./core/index.js";

// ─── Store (vanilla-reactive Proxy) ──────────────────────────

const store = new Store({
  tier: "standard",
  step: 0,
  values: {},
  sections: [],
  placeholders: null,
  phase: "loading",
  result: null,
  error: null,
  versionsFetching: false,
  versionsFetched: false,
  versionCache: {},
});

// ─── TickState bridge ────────────────────────────────────────

const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener("store:change", () => tickState.set(performance.now()));

// ─── Helpers ─────────────────────────────────────────────────

const TIER_ORDER = { starter: 0, standard: 1, deep: 2 };

function visibleSections(tier) {
  const sections = store.state.sections || [];
  return sections.filter((s) => TIER_ORDER[s.tier] <= TIER_ORDER[tier]);
}

// Escape HTML-significant characters before interpolating an UNTRUSTED value
// into innerHTML (or into an HTML attribute value). "Untrusted" means anything
// that isn't a static string literal authored in this file: user free-text
// input, values seeded by /api/init-values -> detectProjectValues (e.g.
// PROJECT_NAME from package.json's `name` or a markdown `# H1`), resolved
// select/repeatable labels derived from those values, generated file content,
// and file paths. Only literal template strings written directly in this
// source file (data-part names, static markup) are trusted and may be
// interpolated unescaped. Also escapes quotes so the result is safe to place
// inside a double- or single-quoted HTML attribute, not just text content.
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

// data-part styling + PROJECT_TYPE filtering per option group (wizard-spec.json
// optionGroups key -> card taxonomy). Groups not listed here (e.g. desktopFrameworks,
// architectureSkills) fall back to the generic skill-card rendering.
const CARD_CONFIGS = {
  projectTypes: {
    cardPart: "project-type-card",
    gridPart: "type-grid",
    namePart: "type-name",
    descPart: "type-desc",
    buildPart: "type-build",
    showBuild: true,
    filterByProjectType: false,
  },
  frontendFrameworks: {
    cardPart: "tech-card",
    gridPart: "tech-grid",
    namePart: "stack-name",
    descPart: "tech-desc",
    buildPart: "stack-build",
    showBuild: false,
    filterByProjectType: true,
  },
  metaFrameworks: {
    cardPart: "tech-card",
    gridPart: "tech-grid",
    namePart: "stack-name",
    descPart: "tech-desc",
    buildPart: "stack-build",
    showBuild: false,
    filterByProjectType: true,
  },
  backendFrameworks: {
    cardPart: "tech-card",
    gridPart: "tech-grid",
    namePart: "stack-name",
    descPart: "tech-desc",
    buildPart: "stack-build",
    showBuild: false,
    filterByProjectType: true,
  },
  databaseEngines: {
    cardPart: "tech-card",
    gridPart: "tech-grid",
    namePart: "stack-name",
    descPart: "tech-desc",
    buildPart: "stack-build",
    showBuild: false,
    filterByProjectType: true,
  },
  apiStyles: {
    cardPart: "tech-card",
    gridPart: "tech-grid",
    namePart: "stack-name",
    descPart: "tech-desc",
    buildPart: "stack-build",
    showBuild: false,
    filterByProjectType: true,
  },
  designSystems: {
    cardPart: "tech-card",
    gridPart: "tech-grid",
    namePart: "stack-name",
    descPart: "tech-desc",
    buildPart: "stack-build",
    showBuild: false,
    filterByProjectType: true,
  },
};

// ─── Custom Element ──────────────────────────────────────────

class ContextWizard extends HTMLElement {
  static {
    customElements.define("context-wizard", this);
  }

  constructor() {
    super();
    this._dispose = null;
    // Summary/Files panel state (element-local — not part of the reactive
    // store, since switching views/tabs never needs to rebuild the wizard form).
    this._panelView = "summary"; // "summary" | "files"
    this._filesSelected = "AGENTS.md";
    this._filesData = null; // last-fetched [{path, content, filled, unfilled}] or null
    this._filesLoading = false;
    this._filesError = null;
    this._filesReqSeq = 0; // race guard: only the latest /api/download response wins
    this._filesDebounceTimer = null;
  }

  connectedCallback() {
    this.loadData();
  }

  disconnectedCallback() {
    if (this._dispose) this._dispose();
    if (this._filesDebounceTimer) clearTimeout(this._filesDebounceTimer);
  }

  async loadData() {
    try {
      const [pr, ir] = await Promise.all([fetch("/api/placeholders"), fetch("/api/init-values")]);
      const data = await pr.json();
      store.state.placeholders = data;
      store.state.sections = data.sections || [];
      store.state.phases = data.phases || [];

      let initValues = {};
      try {
        initValues = await ir.json();
      } catch {}

      store.state.values = { ...initValues };
      store.state.step = 0;
      store.state.phase = "form";
      this.mountEffect();
    } catch (err) {
      store.state.error = "Load failed: " + err.message;
      store.state.phase = "error";
      this.mountEffect();
    }
  }

  mountEffect() {
    if (this._dispose) this._dispose();
    this._dispose = effect(() => {
      tickState.get();
      this.render();
    });
  }

  render() {
    const phase = store.state.phase;
    if (phase === "loading")
      return this.renderSimple(
        '<section data-part="loading"><p data-part="loading-text">Loading interview…</p></section>',
      );
    if (phase === "error")
      return this.renderSimple(
        `<section data-part="error"><p data-part="error-text">${esc(store.state.error)}</p><button data-part="back-btn" onclick="this.closest('context-wizard').loadData()">Retry</button></section>`,
      );
    if (phase === "generating")
      return this.renderSimple(
        '<section data-part="generating"><p data-part="generating-text">Generating .context/…</p></section>',
      );
    if (phase === "done") return this.renderDone();
    this.renderForm();
  }

  renderSimple(htmlStr) {
    this.innerHTML = htmlStr;
    this._lastFormSig = null;
    this.updateSummary();
  }

  // ─── Root form render via html\`\` (stable DOM) ────────────

  renderForm() {
    const stepIdx = store.state.step;
    const tier = store.state.tier;
    const sections = visibleSections(tier);
    const section = sections[stepIdx];
    if (!section) {
      this.innerHTML = "<p>No sections for this tier.</p>";
      this._lastFormSig = null;
      this.updateSummary();
      return;
    }

    // ── Structural signature ──────────────────────────────────
    // Rebuild the field DOM only when the STRUCTURE changes: step, tier, which
    // fields are visible, repeatable counts, or a card-select value (drives both
    // visibility via showIf and the selected-card highlight). Free-text input
    // values are deliberately EXCLUDED — the browser already holds what the user
    // typed, so rebuilding the field on every keystroke would only destroy the
    // focused node and lose focus + caret. All showIf conditions depend on
    // `select` fields, so including select values here keeps visibility correct.
    const values = store.state.values;
    const visibleFields = section.fields ? section.fields.filter((f) => this.isFieldVisible(f)) : [];
    const sig = JSON.stringify({
      phase: store.state.phase,
      step: stepIdx,
      tier,
      section: section.key,
      fields: visibleFields.map((f) => f.key),
      selects: visibleFields.filter((f) => f.type === "select").map((f) => [f.key, values[f.key] || ""]),
      counts: visibleFields
        .filter((f) => f.type === "entity-list" || f.type === "repeatable" || f.type === "repeatable-inline")
        .map((f) => [f.key, this.getRepeatableCount(f.key, f.subfields || [])]),
    });
    if (this._lastFormSig === sig && this.querySelector("[data-part='wizard-step']")) {
      // Value-only change — DOM already reflects it. Skip rebuild to preserve focus.
      this.updateSummary();
      return;
    }
    this._lastFormSig = sig;

    // Build tab data array
    const tabData = sections.map((s, i) => ({
      id: "step-" + i,
      num: i,
      label: s.label.replace(/^Step \d+ — /, ""),
      phase: (this.getPhase(s.key) || {}).label || "",
      isActiveStr: stepIdx === i ? "true" : "",
      isDoneStr: stepIdx > i ? "true" : "",
    }));

    const isFirst = stepIdx === 0;
    const isLast = stepIdx === sections.length - 1;

    const stepContent = `
      <h2 data-part="section-title">${esc(section.label)}</h2>
      ${section.description ? `<p data-part="section-desc">${esc(section.description)}</p>` : ""}
      ${visibleFields.map((f) => this.renderField(section, f)).join("")}
    `;

    const actionsHtml = `
      ${!isFirst ? `<button type="button" data-part="nav-btn" data-direction="prev" onclick="document.querySelector('context-wizard').goToStep(${stepIdx - 1})">← Back</button>` : ""}
      ${!isLast ? `<button type="button" data-part="nav-btn" data-direction="next" onclick="document.querySelector('context-wizard').goToStep(${stepIdx + 1})">Next →</button>` : ""}
      ${
        isLast
          ? `<nav data-part="submit-row">
        <button type="button" data-part="submit-btn" onclick="document.querySelector('context-wizard').collectAndSubmit('generate')">Generate .context/</button>
        <button type="button" data-part="download-btn" onclick="document.querySelector('context-wizard').collectAndSubmit('download')">Download .context/</button>
      </nav>`
          : ""
      }
    `;

    const ctx = {
      tabs: tabData,
    };

    const result = html`
      <nav data-part="stepper-nav">
        <for each="t in tabs">
          <button
            type="button"
            data-part="step-dot"
            data-state-active="{{ t.isActiveStr }}"
            data-state-done="{{ t.isDoneStr }}"
            data-phase="{{ t.phase }}"
            onclick="document.querySelector('context-wizard').goToStep({{ t.num }})"
          >
            <span data-part="step-num">{{ t.num }}</span>
            <span data-part="step-label">{{ t.label }}</span>
          </button>
        </for>
      </nav>

      <section data-part="wizard-body">
        <section data-part="wizard-step"></section>
      </section>

      <nav data-part="step-actions"></nav>
    `;
    result._context = ctx;
    render(result, this);

    // Manually set dynamic HTML content (template engine can't handle raw HTML strings via ChildNodePart)
    const stepEl = this.querySelector("[data-part='wizard-step']");
    if (stepEl) stepEl.innerHTML = stepContent;
    const actionsEl = this.querySelector("[data-part='step-actions']");
    if (actionsEl) actionsEl.innerHTML = actionsHtml;

    this.updateSummary();
  }

  track(key, value) {
    store.state.values[key] = value;
    // Auto-detect tier from ANALYSIS_DEPTH field
    if (key === "ANALYSIS_DEPTH" && ["starter", "standard", "deep"].includes(value)) {
      store.state.tier = value;
      store.state.step = 0;
    }
    if (this._panelView === "files") this.scheduleFilesFetch();
    this.updateSummary();
  }

  selectCard(key, id) {
    this.track(key, id);
  }

  goToStep(idx) {
    const sections = visibleSections(store.state.tier);
    const maxIdx = sections.length - 1;
    if (idx < 0 || idx > maxIdx) return;
    store.state.step = idx;
  }

  getPhase(key) {
    const phases = store.state.phases || [];
    const s = (store.state.sections || []).find((s2) => s2.key === key);
    if (!s) return { label: "" };
    return phases.find((p) => p.key === s.phase) || { label: "" };
  }

  // Keep an option if it has no projectTypes filter, or PROJECT_TYPE is unset/"other"
  // (show everything), or its projectTypes array includes the selected PROJECT_TYPE.
  filterByProjectType(list) {
    const selectedType = store.state.values.PROJECT_TYPE || "";

    if (!selectedType || selectedType === "other") {
      return list;
    }

    return list.filter((o) => !o.projectTypes || o.projectTypes.includes(selectedType));
  }

  renderChoiceCards(field, key, val, list, cfg) {
    const hasCfg = cfg && cfg.cardPart;
    const filteredList = hasCfg && cfg.filterByProjectType ? this.filterByProjectType(list) : list;
    const cards = filteredList
      .map((o) => {
        const id = o.key || o.id;
        const selected = id === val;
        const desc = o.description || "";
        const build = o.build || "";
        const skill = o.pixGalaxySkill || "";
        if (hasCfg) {
          return `<article data-part="${cfg.cardPart}" data-key="${esc(id)}" ${skill ? `data-skill="${esc(skill)}"` : ""}
          data-state-selected="${selected ? "true" : ""}" role="button" tabindex="0"
          onclick="document.querySelector('context-wizard').selectCard('${key}','${id}')">
          <div data-part="card-body">
            <h3 data-part="${cfg.namePart}">${esc(o.label)}</h3>
            ${desc ? `<p data-part="${cfg.descPart}">${esc(desc)}</p>` : ""}
            ${cfg.showBuild && build ? `<p data-part="${cfg.buildPart}">Build: ${esc(build)}</p>` : ""}
          </div>
          ${skill ? `<code data-part="skill-tag">${esc(skill)}</code>` : ""}
        </article>`;
        }
        // Generic card for inline options
        return `<article data-part="skill-card" data-key="${esc(id)}" ${skill ? `data-skill="${esc(skill)}"` : ""}
        data-state-selected="${selected ? "true" : ""}" role="button" tabindex="0"
        onclick="document.querySelector('context-wizard').selectCard('${key}','${id}')">
        <div data-part="card-body">
          <h3 data-part="card-name">${esc(o.label)}</h3>
          ${desc ? `<p data-part="card-desc">${esc(desc)}</p>` : ""}
          ${build ? `<p data-part="card-build">${esc(build)}</p>` : ""}
        </div>
        ${skill ? `<code data-part="skill-tag">${esc(skill)}</code>` : ""}
      </article>`;
      })
      .join("");
    const gridPart = hasCfg && cfg.gridPart ? cfg.gridPart : "card-grid";
    return `<h3 data-part="subtitle">${esc(field.label || "")}</h3>
      <nav data-part="${gridPart}">${cards}</nav>
      ${field.description ? `<p data-part="hint">${esc(field.description)}</p>` : ""}`;
  }

  renderField(section, field) {
    const key = field.key;
    const val = store.state.values[key] || field.default || "";
    const ph = store.state.placeholders || {};
    const inputId = `f-${key}`;

    // ALL select types render as cards — no dropdowns
    if (field.type === "select") {
      const list =
        typeof field.options === "string" ? ph[field.options] || [] : Array.isArray(field.options) ? field.options : [];
      const cfg = (typeof field.options === "string" && CARD_CONFIGS[field.options]) || {};
      return this.renderChoiceCards(field, key, val, list, cfg);
    }

    if (field.type === "version-select") {
      return `<p data-part="field"><label data-part="label" for="${inputId}">${esc(field.label)}</label>
        <input data-part="input" type="text" id="${inputId}" name="${key}" value="${esc(val || field.default || "")}" placeholder="${esc(field.default || "e.g. 22.x")}"
          oninput="document.querySelector('context-wizard').track('${key}', this.value)" />
        <span data-part="hint">Pin major version. Default: ${esc(field.default || "latest")}</span></p>`;
    }

    if (field.type === "textarea") {
      return `<p data-part="field"><label data-part="label" for="${inputId}">${esc(field.label)}</label>
        <textarea data-part="input" id="${inputId}" name="${key}" placeholder="${esc(field.placeholder || "")}"
          oninput="document.querySelector('context-wizard').track('${key}', this.value)">${esc(val)}</textarea>
        ${field.description ? `<span data-part="hint">${esc(field.description)}</span>` : ""}</p>`;
    }

    if (field.type === "entity-list" || field.type === "repeatable") {
      return this.renderRepeatableGroup(section, field);
    }

    return `<p data-part="field"><label data-part="label" for="${inputId}">${esc(field.label)}</label>
      <input data-part="input" type="text" id="${inputId}" name="${key}" value="${esc(val)}" placeholder="${esc(field.placeholder || "")}"
        oninput="document.querySelector('context-wizard').track('${key}', this.value)" />
      ${field.description ? `<span data-part="hint">${esc(field.description)}</span>` : ""}</p>`;
  }

  // ─── Repeatable Groups ─────────────────────────────────────

  getRepeatableCount(prefix, subfields) {
    const values = store.state.values;
    const storedCount = parseInt(values[`${prefix}_count`]);
    if (storedCount > 0) return storedCount;
    let count = 0;
    const fields = Array.isArray(subfields) ? subfields : [];
    for (let i = 1; i <= 100; i++) {
      if (!fields.some((sf) => values[`${prefix}_${i}_${sf.key}`] !== undefined)) break;
      count = i;
    }
    return Math.max(1, count);
  }

  addRepeatable(btn) {
    const prefix = btn.dataset.prefix;
    const values = store.state.values;
    let subfields = [];
    try {
      subfields = JSON.parse(btn.dataset.subfields || "[]");
    } catch {}
    const currentCount = this.getRepeatableCount(prefix, subfields);
    const nextIdx = currentCount + 1;
    if (subfields.length === 0) subfields = [{ key: "name" }, { key: "description" }];
    for (const sf of subfields) values[`${prefix}_${nextIdx}_${sf.key}`] = "";
    values[`${prefix}_count`] = String(nextIdx);
    if (this._panelView === "files") this.scheduleFilesFetch();
  }

  removeRepeatable(btn) {
    const fullPrefix = btn.dataset.prefix;
    const values = store.state.values;
    const basePrefix = fullPrefix.replace(/_(\d+)$/, "");
    const idx = parseInt(fullPrefix.match(/_(\d+)$/)?.[1] || "0");
    let currentCount = parseInt(values[`${basePrefix}_count`]);
    if (!(currentCount > 0)) {
      for (const k of Object.keys(values)) {
        const m = k.match(new RegExp(`^${basePrefix}_(\\d+)_`));
        if (m) currentCount = Math.max(currentCount, parseInt(m[1]));
      }
    }
    if (!(currentCount > 0)) currentCount = 1;
    Object.keys(values)
      .filter((k) => k.startsWith(fullPrefix + "_"))
      .forEach((k) => delete values[k]);
    if (idx > 0) {
      for (const k of Object.keys(values)) {
        const m = k.match(new RegExp("^" + basePrefix + "_(\\d+)_(.+)$"));
        if (m && parseInt(m[1]) > idx) {
          const newKey = basePrefix + "_" + (parseInt(m[1]) - 1) + "_" + m[2];
          values[newKey] = values[k];
          delete values[k];
        }
      }
    }
    values[`${basePrefix}_count`] = String(Math.max(1, currentCount - 1));
    if (this._panelView === "files") this.scheduleFilesFetch();
  }

  renderRepeatableGroup(section, field) {
    const prefix = field.key;
    const singular = field.singular || field.label || "Item";
    const subfields = field.subfields || [];
    const values = store.state.values;
    const count = this.getRepeatableCount(prefix, subfields);
    let h = `<h3 data-part="subtitle">${esc(field.label || singular)}</h3>`;
    for (let i = 1; i <= count; i++) {
      h += `<article data-part="repeatable-group" data-index="${i}">`;
      h += `<header data-part="group-header"><span data-part="group-num">${esc(singular)} ${i}</span>`;
      if (count > 1)
        h += `<button type="button" data-part="remove-btn" data-prefix="${prefix}_${i}" data-section="${section.key}" aria-label="Remove ${esc(singular)}">&times;</button>`;
      h += `</header>`;
      for (const sf of subfields) {
        const k = `${prefix}_${i}_${sf.key}`;
        const v = values[k] || "";
        const fid = `f-${k}`;
        if (sf.type === "select" && Array.isArray(sf.options)) {
          const opts = sf.options
            .map(
              (o) =>
                `<option value="${esc(o.key || o)}" ${o.key === v || o === v ? "selected" : ""}>${esc(o.label || o)}</option>`,
            )
            .join("");
          h += `<p data-part="field"><label data-part="label" for="${fid}">${esc(sf.label)}</label><select data-part="input" id="${fid}" name="${k}" onchange="document.querySelector('context-wizard').track('${k}', this.value)"><option value="">--</option>${opts}</select></p>`;
        } else if (sf.type === "boolean") {
          h += `<p data-part="field"><label data-part="label"><input type="checkbox" name="${k}" ${v === "true" || v === true ? "checked" : ""} onchange="document.querySelector('context-wizard').track('${k}', this.checked ? 'true' : '')" /> ${esc(sf.label)}</label></p>`;
        } else if (sf.type === "textarea") {
          h += `<p data-part="field"><label data-part="label" for="${fid}">${esc(sf.label)}</label><textarea data-part="input" id="${fid}" name="${k}" placeholder="${esc(sf.placeholder || "")}" oninput="document.querySelector('context-wizard').track('${k}', this.value)">${esc(v)}</textarea></p>`;
        } else {
          h += `<p data-part="field"><label data-part="label" for="${fid}">${esc(sf.label)}</label><input data-part="input" type="text" id="${fid}" name="${k}" value="${esc(v)}" placeholder="${esc(sf.placeholder || "")}" oninput="document.querySelector('context-wizard').track('${k}', this.value)" /></p>`;
        }
      }
      h += `</article>`;
    }
    h += `<p data-part="field"><button type="button" data-part="add-btn" data-prefix="${prefix}" data-section="${section.key}" data-subfields='${esc(JSON.stringify(subfields))}'>+ Add ${esc(singular)}</button></p>`;
    return h;
  }

  isFieldVisible(field) {
    if (!field.showIf) return true;
    const values = store.state.values;
    for (const [condKey, condVal] of Object.entries(field.showIf)) {
      const actual = values[condKey];
      if (Array.isArray(condVal)) {
        // Array: field is visible if actual value is IN the array
        if (!condVal.includes(actual)) return false;
      } else if (typeof condVal === "object" && condVal !== null && "not" in condVal) {
        // Negation: field is visible if actual value is NOT this value
        if (actual === condVal.not) return false;
      } else {
        // Simple equality
        if (actual !== condVal) return false;
      }
    }
    return true;
  }

  // Resolve a `select` field's stored key to its human option label.
  resolveSelectLabel(field, raw, ph) {
    const list =
      typeof field.options === "string" ? ph[field.options] || [] : Array.isArray(field.options) ? field.options : [];
    const opt = list.find((o) => (o.key || o.id) === raw);
    return opt ? opt.label : raw;
  }

  // One bullet per filled entry of a repeatable/entity-list field: prefer the
  // "name" subfield, else the first subfield with a non-empty value.
  summaryRepeatableItems(field, values) {
    const prefix = field.key;
    const subfields = field.subfields || [];
    const count = this.getRepeatableCount(prefix, subfields);
    const primary = subfields.find((sf) => sf.key === "name") || subfields[0];
    const items = [];
    for (let i = 1; i <= count; i++) {
      let text = primary ? String(values[`${prefix}_${i}_${primary.key}`] || "").trim() : "";
      if (!text) {
        for (const sf of subfields) {
          const v = String(values[`${prefix}_${i}_${sf.key}`] || "").trim();
          if (v) {
            text = v;
            break;
          }
        }
      }
      if (text) items.push(text);
    }
    return items;
  }

  // Render one field as a summary-row (label -> value), or a labeled bulleted
  // list for repeatable/entity-list fields. Returns "" when there's nothing to show.
  renderSummaryRow(field, values, ph) {
    const label = esc(field.label || field.key);
    if (field.type === "entity-list" || field.type === "repeatable" || field.type === "repeatable-inline") {
      const items = this.summaryRepeatableItems(field, values);
      if (items.length === 0) return "";
      return `<div data-part="summary-row"><span data-part="summary-label">${label}</span><ul data-part="summary-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
    }
    const raw = values[field.key];
    if (raw === undefined || raw === null || String(raw).trim() === "") return "";
    const display = field.type === "select" ? this.resolveSelectLabel(field, raw, ph) : raw;
    return `<div data-part="summary-row"><span data-part="summary-label">${label}</span><span data-part="summary-value">${esc(display)}</span></div>`;
  }

  // --- Summary/Files panel ------------------------------------

  // Merge tracked store values with whatever is currently in the DOM
  // (uncommitted keystrokes on the focused input). Shared by the Files
  // preview fetch and the final generate/download submit, so both see
  // the same in-progress answers.
  collectValues() {
    const values = { ...store.state.values };
    this.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.name && el.type !== "checkbox") values[el.name] = el.value;
    });
    return values;
  }

  setPanelView(view) {
    if (view !== "summary" && view !== "files") return;
    if (this._panelView === view) return;
    this._panelView = view;
    if (view === "files") {
      this.scheduleFilesFetch();
    } else if (this._filesDebounceTimer) {
      // Leaving Files: cancel any pending debounced fetch — Summary stays
      // purely client-side, it must never trigger a network request.
      clearTimeout(this._filesDebounceTimer);
      this._filesDebounceTimer = null;
    }
    this.updateSummary();
  }

  selectFile(path) {
    if (!path || this._filesSelected === path) return;
    this._filesSelected = path;
    this.updateSummary();
  }

  // Debounce (~400ms) so a fetch fires once per pause in typing, not per
  // keystroke. Called on entering Files and on every value change while
  // Files is active; never while on Summary.
  scheduleFilesFetch() {
    if (this._filesDebounceTimer) clearTimeout(this._filesDebounceTimer);
    this._filesLoading = true;
    this._filesError = null;
    this.updateSummary();
    this._filesDebounceTimer = setTimeout(() => this.fetchFiles(), 400);
  }

  fetchFiles() {
    // Belt-and-suspenders alongside the setPanelView timer-cancel: never POST
    // while Summary is showing, even if this got invoked some other way.
    if (this._panelView !== "files") return;
    // Race guard: bump the sequence now, and only accept the response whose
    // seq still matches when it resolves -- a later request that resolves
    // first must not get clobbered by a slower, now-stale earlier one.
    const seq = ++this._filesReqSeq;
    const values = this.collectValues();
    fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values, tier: store.state.tier }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (seq !== this._filesReqSeq) return;
        this._filesLoading = false;
        this._filesData = result.files || [];
        if (!this._filesData.some((f) => f.path === this._filesSelected)) {
          const fallback = this._filesData.find((f) => f.path === "AGENTS.md") || this._filesData[0];
          this._filesSelected = fallback ? fallback.path : "AGENTS.md";
        }
        this.updateSummary();
      })
      .catch((err) => {
        if (seq !== this._filesReqSeq) return;
        this._filesLoading = false;
        this._filesError = err.message;
        this.updateSummary();
      });
  }

  renderPanelToggle() {
    const view = this._panelView;
    return `<div data-part="panel-toggle">
      <button type="button" data-part="panel-tab" data-state-active="${view === "summary" ? "true" : ""}" onclick="document.querySelector('context-wizard').setPanelView('summary')">Summary</button>
      <button type="button" data-part="panel-tab" data-state-active="${view === "files" ? "true" : ""}" onclick="document.querySelector('context-wizard').setPanelView('files')">Files</button>
    </div>`;
  }

  renderSummaryBody() {
    const values = store.state.values;
    const ph = store.state.placeholders || {};
    const sections = visibleSections(store.state.tier);

    const groups = sections
      .map((section) => {
        const rows = (section.fields || [])
          .filter((f) => this.isFieldVisible(f))
          .map((f) => this.renderSummaryRow(f, values, ph))
          .filter(Boolean)
          .join("");
        if (!rows) return "";
        const title = esc((section.label || "").replace(/^Step \d+ \u2014 /, ""));
        return `<section data-part="summary-group"><h4 data-part="summary-group-title">${title}</h4>${rows}</section>`;
      })
      .filter(Boolean)
      .join("");

    const body =
      groups || `<p data-part="summary-empty">Fill in the interview fields to see a live summary of all choices.</p>`;
    return `<div data-part="summary-scroll">${body}</div>`;
  }

  renderFilesBody() {
    const files = this._filesData || [];
    const tabs = files
      .map(
        (f) =>
          `<button type="button" data-part="file-tab" data-path="${esc(f.path)}" data-state-active="${f.path === this._filesSelected ? "true" : ""}">${esc(f.path)}</button>`,
      )
      .join("");
    const selected = files.find((f) => f.path === this._filesSelected) || files[0];

    let contentHtml;
    if (selected) {
      contentHtml = `<pre data-part="file-content">${esc(selected.content || "")}</pre>`;
    } else if (this._filesLoading) {
      contentHtml = "";
    } else {
      contentHtml = `<p data-part="summary-empty">No files yet \u2014 fill in the interview to see a live preview.</p>`;
    }

    return `<div data-part="files-body">
      ${files.length ? `<nav data-part="file-tabs">${tabs}</nav>` : ""}
      ${this._filesLoading ? `<p data-part="files-loading">Updating\u2026</p>` : ""}
      ${this._filesError ? `<p data-part="files-error">${esc(this._filesError)}</p>` : ""}
      ${contentHtml}
    </div>`;
  }

  updateSummary() {
    const panel = document.querySelector("[data-part='summary-panel']");
    if (!panel) return;
    const view = this._panelView;
    const scrollPart = view === "files" ? "file-content" : "summary-scroll";
    const scrollEl = panel.querySelector(`[data-part='${scrollPart}']`);
    const scrollTop = scrollEl ? scrollEl.scrollTop : 0;

    const body = view === "files" ? this.renderFilesBody() : this.renderSummaryBody();
    const inner = `\n      <h3>\u26a1 Configuration Summary</h3>${this.renderPanelToggle()}${body}`;
    if (panel.innerHTML !== inner) {
      panel.innerHTML = inner;
      if (scrollTop > 0) {
        const ns = panel.querySelector(`[data-part='${scrollPart}']`);
        if (ns) ns.scrollTop = scrollTop;
      }
    }
  }

  collectAndSubmit(mode) {
    const values = this.collectValues();
    if (mode === "download") {
      store.state.phase = "generating";
      fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, tier: store.state.tier }),
      })
        .then((r) => r.json())
        .then((result) => {
          if (result.files) {
            let text = "# rule-architect .context/ Export\n\n";
            for (const f of result.files) text += `=== ${f.path} ===\n\n${f.content}\n\n`;
            const blob = new Blob([text], { type: "text/plain" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "context-export.txt";
            a.click();
            URL.revokeObjectURL(a.href);
            store.state.result = { summary: "Downloaded " + result.files.length + " files" };
            store.state.phase = "done";
          }
        })
        .catch((err) => {
          store.state.error = err.message;
          store.state.phase = "done";
        });
      return;
    }
    store.state.phase = "generating";
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values, tier: store.state.tier }),
    })
      .then((r) => r.json())
      .then((result) => {
        store.state.result = result;
        store.state.phase = "done";
      })
      .catch((err) => {
        store.state.error = err.message;
        store.state.phase = "done";
      });
  }

  renderDone() {
    this._lastFormSig = null;
    const result = store.state.result;
    const error = store.state.error;
    if (error) {
      this.innerHTML = `<section data-part="result"><h2 data-part="result-title">Failed</h2><p>${esc(error)}</p><button data-part="back-btn" onclick="this.closest('context-wizard').loadData()">Try Again</button></section>`;
      this.updateSummary();
      return;
    }
    const files = (result && result.files) || [];
    const allFilled = files.filter((f) => f.unfilled === 0).length;
    this.innerHTML = `
      <section data-part="result" data-state-success="true">
        <h2 data-part="result-title">\u2705 ${esc(result.summary || "Generated!")}</h2>
        <p data-part="result-path">Target: <code>${esc(result.target || "./.context/")}</code></p>
        <table data-part="result-table"><thead><tr><th data-part="th">File</th><th data-part="th">Filled</th><th data-part="th">Unfilled</th></tr></thead>
          <tbody>${files.map((f) => `<tr><td data-part="td"><code>${f.path}</code></td><td data-part="td">${f.filled}</td><td data-part="td">${f.unfilled}</td></tr>`).join("")}</tbody>
        </table>
        <p>${allFilled === files.length ? "\u2705 All filled" : `\u26a0\ufe0f ${allFilled}/${files.length} filled`}</p>
        <button data-part="back-btn" onclick="this.closest('context-wizard').loadData()">Start Over</button>
      </section>`;
    this.updateSummary();
  }
}

// ─── Event delegation for add/remove repeatable buttons ─────

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-part='add-btn'], [data-part='remove-btn'], [data-part='file-tab']");
  if (!btn) return;
  e.preventDefault();
  const wizard = document.querySelector("context-wizard");
  if (!wizard) return;
  if (btn.dataset.part === "add-btn") wizard.addRepeatable(btn);
  if (btn.dataset.part === "remove-btn") wizard.removeRepeatable(btn);
  if (btn.dataset.part === "file-tab") wizard.selectFile(btn.dataset.path);
});
