// rule-architect http-guard helper - same-origin enforcement for the two
// interview servers. Pure logic, no I/O, no server. Shared by both.
//
// Both servers bind loopback and send no CORS headers, which stops a hostile
// page from READING their responses - not from SENDING requests. A cross-origin
// POST with `Content-Type: text/plain` is a CORS "simple request": no preflight
// is issued, so the absence of CORS headers never comes into play and the
// handler runs. For POST /api/generate the side effect IS the attack: files
// written into the user's project, overwriting root files when `force` is set.
//
// A web page cannot forge Origin, Sec-Fetch-Site, or Host - the browser sets
// them. Validating those three closes the hole with no change to the wizard UI:
//
//   Sec-Fetch-Site  same-origin | none  → the served page, or a typed URL
//   Origin          loopback + our port → the served page
//   Host            loopback + our port → not a rebound DNS name
//
// A non-browser client (curl, a test) sends none of the first two and is
// accepted: the threat model here is the user's browser, and anything already
// running code on the loopback interface is outside it.

/** Hostnames that mean "this machine". `URL.hostname` keeps IPv6 brackets. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0:0:0:0:0:0:0:1"]);

/** Sec-Fetch-Site values a same-origin fetch or a direct navigation can carry. */
const ALLOWED_FETCH_SITES = new Set(["same-origin", "none"]);

/** Node may hand back an array for a repeated header; the first value wins. */
const first = (value) => (Array.isArray(value) ? value[0] : value);

/** Refusal shaped like the accept case so callers branch on `ok` only. */
const deny = (reason) => ({ ok: false, status: 403, reason });

/**
 * Split an authority (`host[:port]`) into hostname and port without throwing.
 * Returns null when the value cannot be parsed as an authority at all.
 *
 * @param {string} authority
 * @returns {{ hostname: string, port: string }|null}
 */
function parseAuthority(authority) {
  try {
    const url = new URL(`http://${authority}`);
    return { hostname: url.hostname, port: url.port };
  } catch {
    return null;
  }
}

/**
 * Decide whether a request may reach a loopback-only interview endpoint.
 *
 * @param {{ headers: Record<string, string|string[]|undefined> }} req
 * @param {{ port?: number|string }} [options] - the port the server listens on;
 *   when given, an Origin or Host pointing at a different port is refused
 *   (another local server is still a different origin).
 * @returns {{ ok: true }|{ ok: false, status: number, reason: string }}
 */
export function checkLocalRequest(req, options = {}) {
  const headers = req?.headers ?? {};
  const expectedPort = options.port === undefined ? "" : String(options.port);

  // ── Host: HTTP/1.1 requires it; a foreign name means DNS rebinding ──
  const host = first(headers.host);
  if (!host) {
    return deny("Missing Host header.");
  }
  const hostParts = parseAuthority(host);
  if (!hostParts || !LOOPBACK_HOSTS.has(hostParts.hostname)) {
    return deny(`Host "${host}" is not a loopback address.`);
  }
  if (expectedPort && hostParts.port && hostParts.port !== expectedPort) {
    return deny(`Host "${host}" does not match the served port ${expectedPort}.`);
  }

  // ── Sec-Fetch-Site: set by the browser, unforgeable by page script ──
  const fetchSite = first(headers["sec-fetch-site"]);
  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    return deny(`Sec-Fetch-Site "${fetchSite}" is not same-origin.`);
  }

  // ── Origin: absent on same-origin GETs, present on any cross-site fetch ──
  const origin = first(headers.origin);
  if (origin && origin !== "null") {
    let originUrl;
    try {
      originUrl = new URL(origin);
    } catch {
      return deny(`Origin "${origin}" is not a valid origin.`);
    }
    if (!LOOPBACK_HOSTS.has(originUrl.hostname)) {
      return deny(`Origin "${origin}" is not a loopback origin.`);
    }
    if (expectedPort && originUrl.port !== expectedPort) {
      return deny(`Origin "${origin}" does not match the served port ${expectedPort}.`);
    }
  }

  return { ok: true };
}

/**
 * Apply the guard and, on refusal, write the 403 response.
 * Returns true when the caller must stop handling the request.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {{ port?: number|string }} [options]
 * @returns {boolean}
 */
export function denyForeignRequest(req, res, options = {}) {
  const verdict = checkLocalRequest(req, options);
  if (verdict.ok) {
    return false;
  }
  res.writeHead(verdict.status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: `Refused: ${verdict.reason}` }));
  return true;
}
