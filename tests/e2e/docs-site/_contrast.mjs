/**
 * @module tests/e2e/docs-site/_contrast
 *
 * The contrast ratio of one element, computed from the rendered colors.
 *
 * This function is serialized into the page by `page.evaluate`, so it must
 * reference nothing outside its own body: no imports, no closure, no constants
 * from this module.
 */

/**
 * @param {string} selector
 * @returns {number|null} the ratio, or null when nothing matches
 */
export function ratioOf(selector) {
  const luminance = (rgb) => {
    const channels = rgb
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map((part) => {
        const channel = Number(part) / 255;

        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const opaque = (color) => Number(color.match(/[\d.]+/g)?.[3] ?? 1) > 0.99;
  const element = document.querySelector(selector);

  if (!element) {
    return null;
  }

  const foreground = getComputedStyle(element).color;
  let node = element;
  let background = "rgb(255, 255, 255)";

  while (node) {
    const candidate = getComputedStyle(node).backgroundColor;

    if (opaque(candidate)) {
      background = candidate;
      break;
    }

    node = node.parentElement;
  }

  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}
