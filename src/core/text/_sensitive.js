/**
 * @module core/text/sensitive
 *
 * The refusal list a compression request has to clear, and the LLM-wrapper
 * strip that comes with it. Ported from the compression-reference companion skill's
 * `compress.py` (`SENSITIVE_BASENAME_REGEX`, `SENSITIVE_PATH_COMPONENTS`,
 * `SENSITIVE_NAME_TOKENS`, `strip_llm_wrapper`).
 *
 * A file name is the only signal available before the read, so the check is a
 * hard refuse rather than a warning after the fact.
 */

/** Filenames that must never be read for compression, however prose-shaped. */
const SENSITIVE_BASENAME_RE =
  /^(?:\.env(?:\..+)?|\.netrc|credentials(?:\..+)?|secrets?(?:\..+)?|passwords?(?:\..+)?|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|authorized_keys|known_hosts|.*\.(?:pem|key|p12|pfx|crt|cer|jks|keystore|asc|gpg))$/i;
const SENSITIVE_PATH_COMPONENTS = new Set([".ssh", ".aws", ".gnupg", ".kube", ".docker"]);
const SENSITIVE_NAME_TOKENS = ["secret", "credential", "password", "passwd", "apikey", "accesskey", "token", "privatekey"];

/** An outer fence that wraps the whole text (an LLM wrapper, not content). */
const OUTER_FENCE_RE = /^\s*```(?:\w*)\n([\S\s]*)\n```\s*$/;

/**
 * Would compressing this file name leak a secret to whoever reads the output?
 *
 * @param {string} fileName
 * @returns {boolean}
 */
export function isSensitivePath(fileName) {
  if (typeof fileName !== "string" || fileName === "") {
    return false;
  }

  const parts = fileName.split(/[/\\]/);
  const base = parts.at(-1) ?? "";

  if (SENSITIVE_BASENAME_RE.test(base)) {
    return true;
  }

  if (parts.some((part) => SENSITIVE_PATH_COMPONENTS.has(part.toLowerCase()))) {
    return true;
  }

  // Normalize separators so "api-key" and "api_key" both match "apikey".
  const flattened = base.toLowerCase().replaceAll(/[\s\-._]/g, "");

  return SENSITIVE_NAME_TOKENS.some((token) => flattened.includes(token));
}

/**
 * Strip an outer fence that wraps the entire text.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripOuterFence(text) {
  return OUTER_FENCE_RE.exec(text)?.[1] ?? text;
}
