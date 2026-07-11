# Astro Performance PR Checklist

## 1. Client directives

- Are islands using the least aggressive client directive possible?
- Is `client:load` justified (component needed immediately)?
- Could `client:visible` replace `client:load` for below-the-fold components?
- Could `client:idle` replace `client:load` for non-critical interactions?

## 2. Island boundaries

- Are islands as small as possible?
- Could static parts be moved outside the island wrapper?
- Is a framework island necessary, or could vanilla JS work?

## 3. Content Collections

- Is content stored in Content Collections?
- Are queries efficient (filtering at build time)?
- Is `getCollection` used instead of `Astro.glob` for structured content?

## 4. View Transitions

- Is `<ViewTransitions />` included in the layout?
- Do navigation links use `data-astro-prefetch`?
- Are transition animations defined (named transitions, `transition:name`)?

## 5. Images

- Are local images using `<Image />` or `<Picture />` from `astro:assets`?
- Are below-the-fold images using `loading="lazy"`?
- Are responsive sizes defined (`sizes`, `widths`)?
- Are images given explicit `width` and `height` to prevent layout shift?

## 6. Rendering strategy

- Is SSG the default for all pages?
- Is SSR used only when necessary (user-specific, real-time data)?
- Are `getStaticPaths` functions efficient?

## 7. Framework overhead

- Are framework islands (React, Vue, Svelte) used only when needed?
- Could simple interactivity be implemented with vanilla JS or web components?
- Is only one framework used (not multiple framework runtimes)?

## 8. Layout composition

- Are layouts nested efficiently (base → section → page)?
- Is repeated boilerplate avoided?
- Are `<slot>` names used for multiple content regions?

## 9. Critical resources

- Is critical CSS inlined or loaded in `<head>`?
- Is non-critical CSS deferred?
- Are third-party scripts loaded with appropriate `loading` attributes?

## 10. Final review

- Is the page's Core Web Vitals profile acceptable (LCP, CLS, INP)?
- Is the JS bundle size measured and justified?
- Could the page be faster with better directive choices?
