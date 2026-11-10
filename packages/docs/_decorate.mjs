/**
 * @module packages/docs/decorate
 *
 * The Markdown holds no HTML, so the site adds the structure the stylesheet
 * needs here, from the shape of the rendered page.
 *
 * Each pass finds its anchor or leaves the page as it is. A heading renamed in
 * the Markdown loses the styling and never loses the content.
 */

/**
 * The home page: hero, stats and call to action from the opening block, then one
 * section for the flow and one for the cards.
 *
 * @param {string} html
 * @returns {string}
 */
export function decorateHome(html) {
  const [opening, ...rest] = html.split(/(?=<h2>)/u);
  const hero = opening.replace(/(<\/h1>\n?)([\s\S]*)$/u, (_, heading, body) => {
    const stats = body
      .replace(/^<p>/u, '<p data-part="lead">')
      .replace("<ul>", '<ul data-part="stats">')
      .replace(/<p>(<a [\s\S]*?)<\/p>\s*$/u, '<p data-part="cta">$1</p>\n');
    // The brand kit's primary icon, in the rounded-square plate the guidelines
    // describe. Decorative here: the hero heading already names the product.
    const plate = '<div data-part="brand-plate"><img src="assets/primary-icon.png" alt="" width="128" height="128" decoding="async"></div>\n';

    return `${heading}<section data-part="hero">\n${plate}${stats}</section>\n`;
  });

  const sections = rest.map((section) => {
    if (section.startsWith("<h2>How it works</h2>")) {
      return `<section data-part="flow">\n${section}</section>\n`;
    }

    if (section.startsWith("<h2>Start here</h2>")) {
      const cards = section.replaceAll(/<h3>[\s\S]*?(?=<h3>|$)/gu, (card) => `<article>\n${card}</article>\n`);

      return `<section data-part="cards">\n${cards}</section>\n`;
    }

    if (section.startsWith("<h2>What the server does</h2>")) {
      // The closing prose: one band across both columns, under the cards.
      return `<section data-part="closing">\n${section}</section>\n`;
    }

    // Everything else stays in the README for the repository page and is not
    // part of the site home. The page ends with the cards and this prose, and
    // its own footer carries the build line and the copyright.
    return "";
  });

  return [hero, ...sections].join("");
}

/**
 * The request path as a diagram: the first ordered list under its heading, with
 * the bold lead of each item as the step title.
 *
 * @param {string} html
 * @returns {string}
 */
export function decorateRequestPath(html) {
  return html.replace(/(<h2>Request path<\/h2>[\s\S]*?)<ol>([\s\S]*?)<\/ol>/u, (_, before, items) => {
    const steps = items.replaceAll(
      /<li><strong>([^<]*?)\.?<\/strong>\s*([\s\S]*?)<\/li>/gu,
      (__, title, text) => `<li data-part="step">\n<h3>${title}</h3>\n<p>${text}</p>\n</li>`,
    );

    return `${before}<ol data-part="architecture-diagram" aria-label="Request path, from the agent to the response">${steps}</ol>`;
  });
}

/**
 * A slug per heading, the way GitHub makes them, so one in-page link works in
 * both places. A repeated heading takes a numeric suffix.
 *
 * @param {string} html
 * @returns {string}
 */
export function addHeadingIds(html) {
  const seen = new Map();

  return html.replaceAll(/<h([2-4])>([\s\S]*?)<\/h\1>/gu, (_, level, inner) => {
    const base = inner
      .replaceAll(/<[^>]+>/gu, "")
      .replaceAll(/&[a-z]+;|&#\d+;/gu, "")
      .toLowerCase()
      .replaceAll(/[^\w\- ]/gu, "")
      .trim()
      .replaceAll(" ", "-");
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);

    return `<h${level} id="${count === 0 ? base : `${base}-${count}`}">${inner}</h${level}>`;
  });
}

/**
 * The structure one page needs, by route.
 *
 * @param {string} html
 * @param {string} out - the route of the page
 * @returns {string}
 */
export function decorate(html, out) {
  if (out === "index.html") {
    return decorateHome(html);
  }

  return out === "docs/architecture.html" ? decorateRequestPath(html) : html;
}
