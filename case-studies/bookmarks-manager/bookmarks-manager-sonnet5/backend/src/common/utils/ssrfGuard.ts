/**
 * @module common/utils/ssrfGuard
 *
 * Blocks Server-Side Request Forgery: before the backend ever fetches a
 * user-supplied URL, this module validates the scheme and resolves the
 * hostname to its IP address(es), rejecting anything that points at
 * loopback, private, link-local, multicast, or otherwise internal network
 * ranges. This runs on every scrape request, not just at input validation
 * time, so DNS-rebinding attacks (a hostname that resolves to a public IP at
 * validation time but a private IP at request time) are also mitigated by
 * re-resolving right before the fetch.
 */

import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { AppError } from "../errors/AppError.js";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Returns true when the given IP address belongs to a private, loopback,
 * link-local, multicast, or otherwise non-routable range.
 *
 * @param address - IPv4 or IPv6 literal.
 */
function isDisallowedIp(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address);
    const range = parsed.range();
    // ipaddr.js ranges: "unicast" is the only publicly-routable bucket for
    // both IPv4 and IPv6; everything else (private, loopback, linkLocal,
    // uniqueLocal, multicast, reserved, carrierGradeNat, ...) is blocked.
    return range !== "unicast";
  } catch {
    return true;
  }
}

/**
 * Validates a user-supplied URL string and asserts it is safe to fetch
 * server-side: http(s) only, resolvable, and not pointing at an internal
 * network address.
 *
 * @param rawUrl - untrusted URL string from the request body.
 * @returns the parsed, validated {@link URL}.
 * @throws {AppError} `URL_NOT_ALLOWED` when the URL is malformed, uses a
 * disallowed protocol, or resolves to a blocked IP range.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError(400, "URL_NOT_ALLOWED", "The provided value is not a valid absolute URL.");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new AppError(400, "URL_NOT_ALLOWED", "Only http and https URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new AppError(400, "URL_NOT_ALLOWED", "Localhost URLs are not allowed.");
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError(400, "URL_NOT_ALLOWED", "The hostname could not be resolved.");
  }

  if (addresses.length === 0 || addresses.some((entry) => isDisallowedIp(entry.address))) {
    throw new AppError(400, "URL_NOT_ALLOWED", "This URL resolves to a disallowed network address.");
  }

  return url;
}
