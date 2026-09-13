/** Guardrail `css-flex-first`: Flex first, grid only when flex cannot do it */

export const cssFlexFirst = {
  id: "css-flex-first",
  label: "Flex first, grid only when flex cannot do it",
  description:
    "display:grid has to earn itself: named template areas, subgrid, explicit item placement or overlap, " +
    "auto-fit/auto-fill tracks, or a stated `/* grid: why */` reason. Anything a flex row or column can do is flex.",
  check: (code, context) => {
    const { extractRealCSS, unjustifiedGrids } = context.helpers;

    const cssBlock = extractRealCSS(code, context);
    if (!cssBlock) {
      return { pass: true, note: "No CSS block found, skipping" };
    }
    const offenders = unjustifiedGrids(cssBlock);
    if (offenders.length === 0) {
      return { pass: true, note: "Layout is flex, or the grid says why it has to be one" };
    }

    return {
      pass: false,
      failCount: offenders.length,
      detail: offenders.slice(0, 10),
      suggestion:
        "Use flex: `display: flex` with `gap` for a row or column, `flex-wrap: wrap` plus `flex: 1 1 <basis>` on the " +
        "items for a wrapping set, and `margin-inline-start: auto` to push one item to the end. Keep grid for named " +
        "areas, subgrid, explicit placement or overlap, and auto-fit tracks - and when it is one of those, say which " +
        "in a `/* grid: why */` comment above the rule.",
    };
  },
};
