// @ts-check

/**
 * Returns the `extends` option for `customElements.define` when the component
 * targets a built-in element extension (e.g. `<details is="pix-details">`).
 *
 * @param {{ extendsElement?: string }} component
 * @returns {{ extends: string } | undefined}
 */
export function buildExtendOptions(component) {
  return component.extendsElement ? { extends: component.extendsElement } : undefined;
}
