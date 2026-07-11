/**
 * pix-architect Context Interview Wizard — Dynamic Stepper Mode
 *
 * Fully data-driven: renders steps from placeholders.json sections.
 * Uses pix-frontend-vanilla-reactive: Store + Signal + html\`\` + render().
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
  return sections.filter(s => TIER_ORDER[s.tier] <= TIER_ORDER[tier]);
}

// ─── Custom Element ──────────────────────────────────────────

class ContextWizard extends HTMLElement {
  static {
    customElements.define("context-wizard", this);
  }

  constructor() {
    super();
    this._dispose = null;
  }

  connectedCallback() {
    this.loadData();
  }

  disconnectedCallback() {
    if (this._dispose) this._dispose();
  }

  async loadData() {
    try {
      const [pr, ir] = await Promise.all([
        fetch("/api/placeholders"),
        fetch("/api/init-values"),
      ]);
      const data = await pr.json();
      store.state.placeholders = data;
      store.state.sections = data.sections || [];

      let initValues = {};
      try { initValues = await ir.json(); } catch {}

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
    if (phase === "loading") return this.renderSimple('<section data-part="loading"><p data-part="loading-text">Loading interview…</p></section>');
    if (phase === "error") return this.renderSimple(`<section data-part="error"><p data-part="error-text">${store.state.error}</p><button data-part="back-btn" onclick="this.closest('context-wizard').loadData()">Retry</button></section>`);
    if (phase === "generating") return this.renderSimple('<section data-part="generating"><p data-part="generating-text">Generating .context/…</p></section>');
    if (phase === "done") return this.renderDone();
    this.renderForm();
  }

  renderSimple(htmlStr) {
    this.innerHTML = htmlStr;
    this.updateSummary();
  }

  // ─── Root form render via html\`\` (stable DOM) ────────────

  renderForm() {
    const stepIdx = store.state.step;
    const tier = store.state.tier;
    const sections = visibleSections(tier);
    const isDepthStep = stepIdx === 0;
    const section = isDepthStep ? null : sections[stepIdx - 1];
    if (!isDepthStep && !section) {
      this.innerHTML = "<p>No sections for this tier.</p>";
      this.updateSummary();
      return;
    }

    // Build tab data array
    const tabData = [
      { id: "depth", num: 0, label: "Analysis Depth", isActiveStr: stepIdx === 0 ? "true" : "", isDoneStr: "" },
      ...sections.map((s, i) => ({
        id: "step-" + (i + 1),
        num: i + 1,
        label: s.label.replace(/^Step \d+ — /, ""),
        isActiveStr: stepIdx === i + 1 ? "true" : "",
        isDoneStr: stepIdx > i + 1 ? "true" : "",
      })),
    ];

    const isFirst = stepIdx === 0;
    const isLast = stepIdx === sections.length;

    const stepContent = isDepthStep ? this.renderTierStep() : `
      <h2 data-part="section-title">${section.label}</h2>
      ${section.desc ? `<p data-part="section-desc">${section.desc}</p>` : ""}
      ${section.fields ? section.fields.filter(f => this.isFieldVisible(f)).map(f => this.renderField(section, f)).join("") : ""}
    `;

    const actionsHtml = `
      ${!isFirst ? `<button type="button" data-part="nav-btn" data-direction="prev" onclick="document.querySelector('context-wizard').goToStep(${stepIdx - 1})">← Back</button>` : ""}
      ${!isLast ? `<button type="button" data-part="nav-btn" data-direction="next" onclick="document.querySelector('context-wizard').goToStep(${stepIdx + 1})">Next →</button>` : ""}
      ${isLast ? `<nav data-part="submit-row">
        <button type="button" data-part="submit-btn" onclick="document.querySelector('context-wizard').collectAndSubmit('generate')">Generate .context/</button>
        <button type="button" data-part="download-btn" onclick="document.querySelector('context-wizard').collectAndSubmit('download')">Download .context/</button>
      </nav>` : ""}
    `;

    const ctx = {
      tabs: tabData,
    };

    const result = html`
      <nav data-part="stepper-nav">
        <for each="t in tabs">
          <button type="button" data-part="step-dot"
            data-state-active="{{ t.isActiveStr }}"
            data-state-done="{{ t.isDoneStr }}"
            onclick="document.querySelector('context-wizard').goToStep({{ t.num }})">
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
    this.updateSummary();
  }

  selectCard(key, id) {
    this.track(key, id);
  }

  selectTier(id) {
    store.state.tier = id;
    const maxStep = visibleSections(id).length;
    if (store.state.step > maxStep) store.state.step = maxStep;
  }

  goToStep(idx) {
    const sections = visibleSections(store.state.tier);
    const maxStep = sections.length;
    if (idx < 0 || idx > maxStep) return;
    store.state.step = idx;
  }

  renderTierStep() {
    const ph = store.state.placeholders || {};
    const tiers = ph.tiers || [];
    const current = store.state.tier;
    const cards = tiers.map(t => {
      const selected = t.key === current;
      return `<button type="button" data-part="tier-btn" data-state-active="${selected ? "true" : ""}"
        onclick="document.querySelector('context-wizard').selectTier('${t.key}')">
        <span data-part="tier-label">${t.label}</span>
        ${t.description ? `<span data-part="tier-desc">${t.description}</span>` : ""}
      </button>`;
    }).join("");
    return `<section data-part="tier-selector">
      <h2 data-part="section-title">Step 0 — Analysis Depth</h2>
      <p data-part="section-desc">Choose how deep the analysis and interview should go.</p>
      <nav data-part="tier-nav">${cards}</nav>
    </section>`;
  }

  renderChoiceCards(field, key, val, list, cfg) {
    const selectedType = store.state.values["PROJECT_TYPE"] || "";
    const filteredList = list.filter(o => {
      if (!cfg.filterByProjectType || !selectedType || selectedType === "other") return true;
      if (cfg.fieldOptions === "stacks") return !o.projectType || o.projectType === selectedType;
      const allowed = Array.isArray(o.projectTypes) ? o.projectTypes : (o.projectType ? [o.projectType] : []);
      return allowed.length === 0 || allowed.includes(selectedType);
    });
    const cards = filteredList.map(o => {
      const id = o.key || o.id;
      const selected = id === val;
      const desc = o.description || "";
      const build = o.build || "";
      const skill = o.pixGalaxySkill || "";
      return `<article data-part="${cfg.cardPart}" data-key="${id}" ${skill ? `data-skill="${skill}"` : ""}
        data-state-selected="${selected ? "true" : ""}" role="button" tabindex="0"
        onclick="document.querySelector('context-wizard').selectCard('${key}','${id}')">
        <div data-part="card-body">
          <h3 data-part="${cfg.namePart}">${o.label}</h3>
          ${desc ? `<p data-part="${cfg.descPart}">${desc}</p>` : ""}
          ${cfg.showBuild && build ? `<p data-part="${cfg.buildPart}">Build: ${build}</p>` : ""}
        </div>
        ${skill ? `<code data-part="skill-tag">${skill}</code>` : ""}
      </article>`;
    }).join("");
    return `<h3 data-part="subtitle">${field.label || ""}</h3>
      <nav data-part="${cfg.gridPart}">${cards}</nav>
      ${field.description ? `<p data-part="hint">${field.description}</p>` : ""}`;
  }

  renderField(section, field) {
    const key = field.key;
    const val = store.state.values[key] || field.default || "";
    const ph = store.state.placeholders || {};
    const inputId = `f-${key}`;

    if (field.type === "select" && typeof field.options === "string") {
      const list = ph[field.options] || [];
      const cardConfigs = {
        projectTypes: { cardPart: "project-type-card", gridPart: "type-grid", namePart: "type-name", descPart: "type-desc", buildPart: "type-build", showBuild: true, filterByProjectType: false, fieldOptions: "projectTypes" },
        stacks: { cardPart: "stack-card", gridPart: "stack-grid", namePart: "stack-name", descPart: "stack-desc", buildPart: "stack-build", showBuild: true, filterByProjectType: true, fieldOptions: "stacks" },
        databaseEngines: { cardPart: "tech-card", gridPart: "tech-grid", namePart: "stack-name", descPart: "tech-desc", buildPart: "stack-build", showBuild: false, filterByProjectType: true, fieldOptions: "databaseEngines" },
        apiStyles: { cardPart: "tech-card", gridPart: "tech-grid", namePart: "stack-name", descPart: "tech-desc", buildPart: "stack-build", showBuild: false, filterByProjectType: true, fieldOptions: "apiStyles" },
        designSystems: { cardPart: "tech-card", gridPart: "tech-grid", namePart: "stack-name", descPart: "tech-desc", buildPart: "stack-build", showBuild: false, filterByProjectType: true, fieldOptions: "designSystems" },
      };
      const cfg = cardConfigs[field.options];
      if (cfg) return this.renderChoiceCards(field, key, val, list, cfg);
      const opts = list.map(o =>
        `<option value="${o.key || o.id}" ${(o.key === val || o.id === val) ? "selected" : ""}>${o.label}</option>`
      ).join("");
      return `<p data-part="field"><label data-part="label" for="${inputId}">${field.label}</label>
        <select data-part="input" id="${inputId}" name="${key}" onchange="document.querySelector('context-wizard').track('${key}', this.value)"><option value="">-- Select --</option>${opts}</select>
        ${field.description ? `<span data-part="hint">${field.description}</span>` : ""}</p>`;
    }

    if (field.type === "select" && Array.isArray(field.options)) {
      const opts = field.options.map(o =>
        `<option value="${o.key || o.id}" ${(o.key === val || o.id === val) ? "selected" : ""}>${o.label}</option>`
      ).join("");
      return `<p data-part="field"><label data-part="label" for="${inputId}">${field.label}</label>
        <select data-part="input" id="${inputId}" name="${key}" onchange="document.querySelector('context-wizard').track('${key}', this.value)"><option value="">-- Select --</option>${opts}</select></p>`;
    }

    if (field.type === "version-select") {
      return `<p data-part="field"><label data-part="label" for="${inputId}">${field.label}</label>
        <input data-part="input" type="text" id="${inputId}" name="${key}" value="${val || field.default || ""}" placeholder="${field.default || "e.g. 22.x"}"
          oninput="document.querySelector('context-wizard').track('${key}', this.value)" />
        <span data-part="hint">Pin major version. Default: ${field.default || "latest"}</span></p>`;
    }

    if (field.type === "textarea") {
      return `<p data-part="field"><label data-part="label" for="${inputId}">${field.label}</label>
        <textarea data-part="input" id="${inputId}" name="${key}" placeholder="${field.placeholder || ""}"
          oninput="document.querySelector('context-wizard').track('${key}', this.value)">${val}</textarea>
        ${field.description ? `<span data-part="hint">${field.description}</span>` : ""}</p>`;
    }

    if (field.type === "entity-list" || field.type === "repeatable") {
      return this.renderRepeatableGroup(section, field);
    }

    return `<p data-part="field"><label data-part="label" for="${inputId}">${field.label}</label>
      <input data-part="input" type="text" id="${inputId}" name="${key}" value="${val}" placeholder="${field.placeholder || ""}"
        oninput="document.querySelector('context-wizard').track('${key}', this.value)" />
      ${field.description ? `<span data-part="hint">${field.description}</span>` : ""}</p>`;
  }

  // ─── Repeatable Groups ─────────────────────────────────────

  getRepeatableCount(prefix, subfields) {
    const values = store.state.values;
    const storedCount = parseInt(values[`${prefix}_count`]);
    if (storedCount > 0) return storedCount;
    let count = 0;
    const fields = Array.isArray(subfields) ? subfields : [];
    for (let i = 1; i <= 100; i++) {
      if (!fields.some(sf => values[`${prefix}_${i}_${sf.key}`] !== undefined)) break;
      count = i;
    }
    return Math.max(1, count);
  }

  addRepeatable(btn) {
    const prefix = btn.dataset.prefix;
    const values = store.state.values;
    let subfields = [];
    try { subfields = JSON.parse(btn.dataset.subfields || "[]"); } catch {}
    const currentCount = this.getRepeatableCount(prefix, subfields);
    const nextIdx = currentCount + 1;
    if (subfields.length === 0) subfields = [{ key: "name" }, { key: "description" }];
    for (const sf of subfields) values[`${prefix}_${nextIdx}_${sf.key}`] = "";
    values[`${prefix}_count`] = String(nextIdx);
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
    Object.keys(values).filter(k => k.startsWith(fullPrefix + "_")).forEach(k => delete values[k]);
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
  }

  renderRepeatableGroup(section, field) {
    const prefix = field.key;
    const singular = field.singular || field.label || "Item";
    const subfields = field.subfields || [];
    const values = store.state.values;
    const count = this.getRepeatableCount(prefix, subfields);
    let h = `<h3 data-part="subtitle">${field.label || singular}</h3>`;
    for (let i = 1; i <= count; i++) {
      h += `<article data-part="repeatable-group" data-index="${i}">`;
      h += `<header data-part="group-header"><span data-part="group-num">${singular} ${i}</span>`;
      if (count > 1) h += `<button type="button" data-part="remove-btn" data-prefix="${prefix}_${i}" data-section="${section.key}" aria-label="Remove ${singular}">&times;</button>`;
      h += `</header>`;
      for (const sf of subfields) {
        const k = `${prefix}_${i}_${sf.key}`;
        const v = values[k] || "";
        const fid = `f-${k}`;
        if (sf.type === "select" && Array.isArray(sf.options)) {
          const opts = sf.options.map(o => `<option value="${o.key || o}" ${(o.key === v || o === v) ? "selected" : ""}>${o.label || o}</option>`).join("");
          h += `<p data-part="field"><label data-part="label" for="${fid}">${sf.label}</label><select data-part="input" id="${fid}" name="${k}" onchange="document.querySelector('context-wizard').track('${k}', this.value)"><option value="">--</option>${opts}</select></p>`;
        } else if (sf.type === "boolean") {
          h += `<p data-part="field"><label data-part="label"><input type="checkbox" name="${k}" ${v === "true" || v === true ? "checked" : ""} onchange="document.querySelector('context-wizard').track('${k}', this.checked ? 'true' : '')" /> ${sf.label}</label></p>`;
        } else if (sf.type === "textarea") {
          h += `<p data-part="field"><label data-part="label" for="${fid}">${sf.label}</label><textarea data-part="input" id="${fid}" name="${k}" placeholder="${sf.placeholder || ""}" oninput="document.querySelector('context-wizard').track('${k}', this.value)">${v}</textarea></p>`;
        } else {
          h += `<p data-part="field"><label data-part="label" for="${fid}">${sf.label}</label><input data-part="input" type="text" id="${fid}" name="${k}" value="${v}" placeholder="${sf.placeholder || ""}" oninput="document.querySelector('context-wizard').track('${k}', this.value)" /></p>`;
        }
      }
      h += `</article>`;
    }
    h += `<p data-part="field"><button type="button" data-part="add-btn" data-prefix="${prefix}" data-section="${section.key}" data-subfields='${JSON.stringify(subfields)}'>+ Add ${singular}</button></p>`;
    return h;
  }

  isFieldVisible(field) {
    if (!field.showIf) return true;
    const values = store.state.values;
    for (const [condKey, condVal] of Object.entries(field.showIf)) {
      if (values[condKey] !== condVal) return false;
    }
    return true;
  }

  updateSummary() {
    const panel = document.querySelector("[data-part='summary-panel']");
    if (!panel) return;
    const scrollEl = panel.querySelector("[data-part='summary-scroll']");
    const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const values = store.state.values;
    const rows = Object.entries(values)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter(([k]) => !k.endsWith("_count"))
      .map(([k, v]) => `<tr><td data-part="summary-key">${k}</td><td data-part="summary-val">${v || "<em style='color:var(--color-text-muted)'>\u2014</em>"}</td></tr>`).join("");
    const json = JSON.stringify(values, null, 2);
    const inner = `\n      <h3>\u26a1 Configuration Summary</h3>\n      <div data-part="summary-scroll">\n        <table>${rows}</table>\n        <pre data-part="summary-json">${json}</pre>\n      </div>`;
    if (panel.innerHTML !== inner) {
      panel.innerHTML = inner;
      if (scrollTop > 0) { const ns = panel.querySelector("[data-part='summary-scroll']"); if (ns) ns.scrollTop = scrollTop; }
    }
  }

  collectAndSubmit(mode) {
    const values = { ...store.state.values };
    this.querySelectorAll("input, textarea, select").forEach(el => {
      if (el.name && el.type !== "checkbox") values[el.name] = el.value;
    });
    if (mode === "download") {
      store.state.phase = "generating";
      fetch("/api/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values, tier: store.state.tier }) })
        .then(r => r.json())
        .then(result => {
          if (result.files) {
            let text = "# pix-architect .context/ Export\n\n";
            for (const f of result.files) text += `=== ${f.path} ===\n\n${f.content}\n\n`;
            const blob = new Blob([text], { type: "text/plain" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "context-export.txt"; a.click();
            URL.revokeObjectURL(a.href);
            store.state.result = { summary: "Downloaded " + result.files.length + " files" }; store.state.phase = "done";
          }
        }).catch(err => { store.state.error = err.message; store.state.phase = "done"; });
      return;
    }
    store.state.phase = "generating";
    fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values, tier: store.state.tier }) })
      .then(r => r.json()).then(result => { store.state.result = result; store.state.phase = "done"; }).catch(err => { store.state.error = err.message; store.state.phase = "done"; });
  }

  renderDone() {
    const result = store.state.result;
    const error = store.state.error;
    if (error) {
      this.innerHTML = `<section data-part="result"><h2 data-part="result-title">Failed</h2><p>${error}</p><button data-part="back-btn" onclick="this.closest('context-wizard').loadData()">Try Again</button></section>`;
      this.updateSummary(); return;
    }
    const files = (result && result.files) || [];
    const allFilled = files.filter(f => f.unfilled === 0).length;
    this.innerHTML = `
      <section data-part="result" data-state-success="true">
        <h2 data-part="result-title">\u2705 ${result.summary || "Generated!"}</h2>
        <p data-part="result-path">Target: <code>${result.target || "./.context/"}</code></p>
        <table data-part="result-table"><thead><tr><th data-part="th">File</th><th data-part="th">Filled</th><th data-part="th">Unfilled</th></tr></thead>
          <tbody>${files.map(f => `<tr><td data-part="td"><code>${f.path}</code></td><td data-part="td">${f.filled}</td><td data-part="td">${f.unfilled}</td></tr>`).join("")}</tbody>
        </table>
        <p>${allFilled === files.length ? "\u2705 All filled" : `\u26a0\ufe0f ${allFilled}/${files.length} filled`}</p>
        <button data-part="back-btn" onclick="this.closest('context-wizard').loadData()">Start Over</button>
      </section>`;
    this.updateSummary();
  }
}

// ─── Event delegation for add/remove repeatable buttons ─────

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-part='add-btn'], [data-part='remove-btn']");
  if (!btn) return;
  e.preventDefault();
  const wizard = document.querySelector("context-wizard");
  if (!wizard) return;
  if (btn.dataset.part === "add-btn") wizard.addRepeatable(btn);
  if (btn.dataset.part === "remove-btn") wizard.removeRepeatable(btn);
});
