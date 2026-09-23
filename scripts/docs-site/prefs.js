

/** Theme + a11y preferences for the docs site (vanilla JS). */

const STORAGE_KEY = "rule-mcp-docs-prefs";

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyPrefs(prefs) {
  const root = document.documentElement;

  if (prefs.theme && prefs.theme !== "system") {
    root.dataset.theme = prefs.theme;
  } else {
    delete root.dataset.theme;
  }

  if (prefs.contrast === "more") {
    root.dataset.contrast = "more";
  } else {
    delete root.dataset.contrast;
  }

  if (prefs.motion === "reduce") {
    root.dataset.motion = "reduce";
  } else {
    delete root.dataset.motion;
  }
}

function syncSummary(prefs) {
  const summary = document.querySelector("header details[data-part='prefs'] summary");

  if (!summary) {
    return;
  }

  const parts = [prefs.theme && prefs.theme !== "system" ? prefs.theme : null, prefs.contrast === "more" ? "more contrast" : null].filter(Boolean);

  summary.textContent = parts.length > 0 ? `Preferences · ${parts.join(" · ")}` : "Preferences";
}

function syncControls(prefs) {
  const theme = prefs.theme || "system";

  for (const input of document.querySelectorAll('input[name="theme"]')) {
    input.checked = input.value === theme;
  }

  const contrast = document.querySelector('input[name="contrast"]');

  if (contrast) {
    contrast.checked = prefs.contrast === "more";
  }

  const motion = document.querySelector('input[name="motion"]');

  if (motion) {
    motion.checked = prefs.motion === "reduce";
  }
}

function bind() {
  const prefs = readPrefs();

  // The inline head script already applied this before first paint; re-applying
  // here would just repeat that work a frame late.
  syncControls(prefs);
  syncSummary(prefs);

  document.querySelector("header")?.addEventListener("change", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const next = readPrefs();

    if (target.name === "theme") {
      next.theme = target.value;
    }

    if (target.name === "contrast") {
      next.contrast = target.checked ? "more" : "default";
    }

    if (target.name === "motion") {
      next.motion = target.checked ? "reduce" : "ok";
    }

    writePrefs(next);
    applyPrefs(next);
    syncSummary(next);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      for (const open of document.querySelectorAll("header details[data-part='prefs'][open]")) {
        open.removeAttribute("open");
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bind);
} else {
  bind();
}
