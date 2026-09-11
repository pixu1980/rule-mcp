

/** @module scripts/docs-site/template - one semantic shell for every page */

function escapeHtml(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function depthPrefix(out) {
  const depth = out.split("/").length - 1;

  return "../".repeat(depth);
}

export function nav(pages, current) {
  const chapters = pages.filter((page) => /^docs\/\d\d-.*\.html$/u.test(page.out)).sort((left, right) => left.out.localeCompare(right.out));
  const items = [{ out: "index.html", title: "Home" }, ...chapters, { out: "docs/adr/ADR.html", title: "ADRs" }];

  return items
    .map((item) => {
      const href = `${depthPrefix(current)}${item.out}`;
      const here = item.out === current ? ' aria-current="page"' : "";

      return `<li><a href="${href}"${here}>${escapeHtml(item.title)}</a></li>`;
    })
    .join("\n");
}

export function layout({ title, out, body, pages }) {
  const prefix = depthPrefix(out);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)} - rule-mcp docs</title>`,
    `<link rel="stylesheet" href="${prefix}style.css">`,
    "</head>",
    "<body>",
    "<header><nav><ul>",
    nav(pages, out),
    "</ul></nav></header>",
    "<main>",
    body,
    "</main>",
    "<footer><p>Generated from <code>docs/</code> - edit the Markdown, not this file.</p></footer>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export function titleOf(markdown, fallback) {
  return /^# (.+)$/mu.exec(markdown)?.[1].trim() ?? fallback;
}
