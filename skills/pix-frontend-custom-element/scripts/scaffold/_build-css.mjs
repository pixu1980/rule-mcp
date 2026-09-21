// @ts-check

/**
 * @param {{ tag: string, extendsElement: string }} options
 * @returns {Record<string, string>}
 */
export const buildComponentCssFiles = (options) => {
  const { tag, extendsElement } = options;

  const cssEntry = `@import "./_core.css" layer(components.${tag});
@import "./states/_states.css" layer(components.${tag});
`;

  const selector = extendsElement ? `[is="${tag}"]` : tag;

  const cssCore = `:root {
  --${tag}--padding: var(--space-4);
  --${tag}--color: var(--color-text);
  --${tag}--background-color: var(--color-surface);
  --${tag}--border-color: var(--color-border);
  --${tag}--border-radius: var(--radius-control);
}

${selector} {
  display: block;
  padding: var(--${tag}--padding);
  color: var(--${tag}--color);
  background-color: var(--${tag}--background-color);
  border: 0.1rem solid var(--${tag}--border-color);
  border-radius: var(--${tag}--border-radius);
}
`;

  const cssStates = `${selector} {
  /* state-driven rules go here, e.g. &[open], &[disabled], &:focus-within */
}
`;

  return {
    [`styles/${tag}.css`]: cssEntry,
    [`styles/_core.css`]: cssCore,
    [`styles/states/_states.css`]: cssStates,
  };
};
