/**
 * @module utils/formatDomain
 *
 * Presentation helpers for turning a raw bookmark URL into a short,
 * human-friendly domain label (e.g. for the card's source line).
 */

/**
 * Extracts a lowercase, `www.`-stripped hostname from a URL string.
 *
 * @param url - absolute URL. Falls back to the raw string if unparsable.
 */
export function formatDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
