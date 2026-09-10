

/**
 * @module tools/meta/concepts.data
 *
 * What each meta-framework is recognized by when the prompt does not name it,
 * and what to load beside it when it does.
 *
 * The concepts are the vocabulary each framework owns rather than shares:
 * "islands" is Astro's word, "server action" is Next's, "nitro" is Nuxt's,
 * "loader" is Remix's. A word two of them share is not in the table, because a
 * tie here routes worse than no match at all.
 */

/** @type {Record<string, string[]>} */
export const META_CONCEPTS = {
  astro: ["island", "islands", "partial hydration", "client:load", "client:visible", "content collection", "astro adapter", "zero javascript"],
  next: ["app router", "server component", "server action", "use server", "use client", "next/image", "isr", "revalidatepath", "route handler"],
  nuxt: ["nitro", "auto-import", "auto-imports", "useasyncdata", "usefetch", "definenuxtconfig", "nuxt module", "hybrid rendering"],
  remix: ["loader", "clientloader", "action function", "nested route", "progressive enhancement", "useloaderdata", "remix vite"],
};

/**
 * The skills that belong beside each meta skill: the component layer it renders
 * with, plus the styleguide, because all four of them emit markup.
 *
 * @type {Record<string, string[]>}
 */
export const META_HUB = {
  astro: ["rule-frontend", "rule-styleguide"],
  next: ["rule-frontend-react", "rule-styleguide"],
  nuxt: ["rule-frontend-vue", "rule-styleguide"],
  remix: ["rule-frontend-react", "rule-styleguide"],
};
