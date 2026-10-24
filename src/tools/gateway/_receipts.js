/**
 * In-memory receipt store (cleared on server restart).
 * Maps receipt token -> { codeHash, binding, skillName, allPass, expiresAt }
 *
 * `binding` records WHAT the receipt proves:
 *   - "content" - a hash of the checked code, no destination bound
 *   - "files"   - a hash of the ordered (path, content) tuples that were checked
 *
 * The two are never interchangeable. A caller that could downgrade a path-bound
 * receipt to the content-only check would simply pick the weaker one.
 */
import { createHmac, createHash, randomUUID } from "node:crypto";

const receiptStore = new Map();

/** Receipt lifetime (ms). */
const RECEIPT_TTL_MS = 300_000;

/**
 * Canonical digest of a file set: length-prefixed path AND content, in order.
 *
 * The previous digest hashed `contents.join("\n---FILE---\n")`, an in-band
 * separator that made [{a:"X\n---FILE---\nY"}] and [{a:"X"},{b:"Y"}] collide -
 * and it never covered paths at all, so a receipt earned for benign code
 * authorized writing that code to `.git/hooks/pre-commit`. Length prefixes make
 * every field unambiguous; including the path binds the destination.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @returns {string} sha256 hex
 */
export function canonicalFilesDigest(files) {
  const hash = createHash("sha256");

  hash.update(`files:${files.length}\n`);

  for (const file of files) {
    const path = String(file?.path ?? "");
    const content = String(file?.content ?? "");

    hash.update(`${Buffer.byteLength(path, "utf8")}:${path}\n`);
    hash.update(`${Buffer.byteLength(content, "utf8")}:`);
    hash.update(content, "utf8");
    hash.update("\n");
  }

  return hash.digest("hex");
}

/** Server secret for receipt signing (generated once per process). */
let SERVER_SECRET = null;

/** The signing secret, minted on first use. */
function getServerSecret() {
  if (!SERVER_SECRET) {
    SERVER_SECRET = randomUUID();
  }

  return SERVER_SECRET;
}

/**
 * Generate a receipt for validated code.
 * The receipt binds code hash + skill + pass status.
 *
 * @param {string} code - The code that was checked
 * @param {string} skillName - Skill used for validation
 * @param {boolean} allPass - Whether all guardrails passed
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {string} receipt token
 */
export function issueReceipt(code, skillName, allPass, now = Date.now()) {
  const codeHash = createHash("sha256").update(code).digest("hex");

  return storeReceipt({ codeHash, binding: "content", skillName, allPass, now });
}

/**
 * Generate a PATH-BOUND receipt: the digest covers the ordered
 * (path, content) tuples, so the receipt authorizes writing exactly these
 * contents to exactly these destinations and nothing else.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @param {string} skillName - Skill used for validation
 * @param {boolean} allPass - Whether all guardrails passed
 * @param {number} [now] - Injectable clock (ms) for deterministic testing
 * @returns {string} receipt token
 */
export function issueFilesReceipt(files, skillName, allPass, now = Date.now()) {
  return storeReceipt({
    codeHash: canonicalFilesDigest(files),
    binding: "files",
    skillName,
    allPass,
    now,
  });
}

/** Sign an entry, store it, and evict long-expired receipts. */
function storeReceipt({ codeHash, binding, skillName, allPass, now }) {
  const payload = `${binding}:${codeHash}:${skillName}:${allPass}:${now}`;
  const token = createHmac("sha256", getServerSecret()).update(payload).digest("hex");

  receiptStore.set(token, { codeHash, binding, skillName, allPass, expiresAt: now + RECEIPT_TTL_MS });
  // Cleanup receipts that expired over one TTL ago (i.e. issued > 2xTTL back).
  for (const [key, value] of receiptStore) {
    if (now - value.expiresAt > RECEIPT_TTL_MS) {
      receiptStore.delete(key);
    }
  }

  return token;
}

/** Shared checks: existence, TTL, guardrail outcome. */
export function openReceipt(token, now) {
  const entry = receiptStore.get(token);

  if (!entry) {
    return { error: "Receipt not found or expired" };
  }

  if (now > entry.expiresAt) {
    receiptStore.delete(token);

    return { error: "Receipt expired - re-run rule_tool_gateway" };
  }

  return { entry };
}
