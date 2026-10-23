

/**
 * @module scripts/docs-site/pages
 *
 * The route of every public page.
 *
 * Two rules, and each one is a decision rather than a formatting habit:
 *
 * - **The number is a repository device, not a URL.** `docs/17-surface-map.md`
 *   is a file you find in a sorted directory; `/docs/surface-map.html` is a
 *   page you read. The prefix is stripped at emit time and nowhere else, so the
 *   handbook keeps the ordering the numbering test enforces.
 * - **One page can have more than one source.** `docs/instructions.html`
 *   carries both the generated command inventory and the hand-written agent
 *   workflow, because a reader asking what an agent is told does not care which
 *   of the two files owns which paragraph.
 */

/** A page assembled from several sources, in reading order. */
export const COMPOSED_PAGES = [
  {
    out: "docs/instructions.html",
    title: "Instructions",
    sources: ["docs/12-instructions.md", "docs/03-agent-instructions.md"],
  },
];

/** Sources that appear only inside a composed page, never as their own. */
export const MERGED_SOURCES = new Set(COMPOSED_PAGES.flatMap((page) => page.sources));

/**
 * `docs/17-surface-map.md` becomes `docs/surface-map.html`; the root README
 * becomes the index.
 *
 * @param {string} src - posix-relative path of a Markdown source
 * @returns {string}
 */
export function routeOf(src) {
  if (src === "README.md") {
    return "index.html";
  }

  return src.replace(/\/(\d\d)-/u, "/").replace(/\.md$/u, ".html");
}

/**
 * Every source path a page can be reached by, mapped to the page it emits.
 *
 * A link to a merged source lands on the page that now carries it, which is why
 * the generated inventories can keep linking `12-instructions.md` and still
 * resolve on the site.
 *
 * @param {Array<{ src: string, out: string, sources?: string[] }>} pages
 * @returns {Map<string, string>}
 */
export function sourceMap(pages) {
  const map = new Map();

  for (const page of pages) {
    for (const src of page.sources ?? [page.src]) {
      map.set(src, page.out);
    }
  }

  return map;
}
