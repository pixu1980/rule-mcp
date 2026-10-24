/** Basic same-origin view transitions between docs pages (vanilla JS). */

function reduceMotion() {
  const motion = document.documentElement.dataset.motion;

  if (motion === "reduce") {
    return true;
  }

  if (motion === "ok") {
    return false;
  }

  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bind() {
  if (typeof document.startViewTransition !== "function") {
    return;
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = event.target instanceof Element ? event.target.closest("a") : null;

    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
      return;
    }

    const url = new URL(anchor.getAttribute("href"), location.href);

    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) {
      return;
    }

    if (reduceMotion()) {
      return;
    }

    event.preventDefault();
    document.startViewTransition(() => {
      location.assign(url.href);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bind);
} else {
  bind();
}
