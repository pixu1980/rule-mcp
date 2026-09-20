

/** Render one gateway reply from its core, minting the always-fresh receipt. */
import { issueReceipt, issueFilesReceipt } from "./_receipts.js";

/**
 * Build the reply lines, the receipt (minted per call, never cached) and the
 * structured response from a computed or cached core.
 *
 * @param {object} core - from computeGatewayCore (possibly via cache)
 * @param {{ code?: string }} arguments_
 * @param {Array<{ path: string, content: string }>|null} fileSet
 * @param {string[]} lines - opening lines already collected by the handler
 * @param {Array<{ path: string, fields: string[] }>} [stripped] - forbidden manifest fields the write path removed
 * @returns {{ lines: string[], response: object, receipt: string|null, checkResult: object|null }}
 */
export function renderGatewayReply(core, arguments_, fileSet, lines, stripped = []) {
  const { code } = arguments_;
  const effectiveRoute = core.effectiveRoute;
  const route = {
    route: core.effectiveRoute,
    confidence: core.confidence,
    sections: core.matchedSections,
    next_tools: core.routeNextTools,
  };
  const primarySkill = effectiveRoute?.startsWith("rule-") ? effectiveRoute : null;
  const checkResult = core.checkResult;
  const truncated = core.evidence.length > 8000 ? core.evidence.slice(0, 8000) + "\n\n... (truncated, use pix_* tool for full content)" : core.evidence;

  lines.push(`## Route: ${effectiveRoute} (confidence: ${Math.round((route.confidence || 0) * 100)}%)`);

  if (route.sections?.length) {
    lines.push(`**Matched sections:** ${route.sections.join(", ")}`);
  }

  lines.push("");

  if (primarySkill) {
    lines.push("## Evidence", "", truncated, "");
  }

  // ── Guardrails and the fresh receipt ──
  let receipt = null;

  if (fileSet || code) {
    const skillName = primarySkill || "rule-ui-design-system";

    // The removal happens before the check, so the receipt below covers the
    // cleaned content. Saying so is the whole point: without it the caller
    // applies what it sent and the receipt refuses it.
    if (stripped.length > 0) {
      lines.push("## Stripped manifest fields", "");

      for (const entry of stripped) {
        lines.push(`- \`${entry.path}\`: removed ${entry.fields.map((field) => `\`${field}\``).join(", ")}`);
      }

      lines.push("", "The fields are gone before the check, and the receipt below covers the cleaned content. Apply what is returned here, not what you sent.", "");
    }

    lines.push("## Guardrail Check", "");

    if (checkResult.allPass) {
      lines.push(`✅ All ${checkResult.total} guardrails pass${fileSet ? ` across ${fileSet.length} file(s)` : ""}.`);
      // Issue receipt only on full pass: minted HERE, on every call, so a
      // cache hit still gets a token bound to this call and expiring now.
      receipt = fileSet ? issueFilesReceipt(fileSet, skillName, true) : issueReceipt(code, skillName, true);
      lines.push(
        `**Receipt:** \`${receipt}\` (valid 5 min, pass to pix_apply)`,
        fileSet
          ? "Bound to these exact paths and contents - writing elsewhere is refused."
          : "Content-only receipt: authorizes a single-file write. Pass `files` here for a path-bound receipt.",
      );
    } else {
      lines.push(`❌ ${checkResult.failCount} guardrails FAIL. Fix and re-check via pix_gateway.`);

      for (const f of checkResult.failed) {
        lines.push(`- **${f.id}**${f.file ? ` (${f.file})` : ""}: ${f.label} - ${f.suggestion}`);
      }
    }

    lines.push("");
  }

  // ── Next tools hint ──
  const nextTools = [...new Set([...(route.next_tools || []), "pix_gateway", "pix_apply", "pix_search"])].slice(0, 10);

  lines.push("## Next Steps", "");
  lines.push(
    `Available tools: ${nextTools.join(", ")}`,
    receipt
      ? `\nTo write files, call pix_apply with the receipt above. The receipt proves pix_gateway validated this exact code.`
      : `\nFix failures, then run pix_gateway again with the updated code.`,
  );

  const response = {
    route: effectiveRoute,
    originalRoute: route.route === effectiveRoute ? undefined : route.route,
    confidence: route.confidence,
    evidence_loaded: !!primarySkill,
    checkResult,
    receipt,
    receipt_binding: receipt ? (fileSet ? "files" : "content") : undefined,
    next_tools: nextTools,
  };

  if (stripped.length > 0) {
    response.stripped_fields = stripped;
    response.sanitized_files = fileSet;
  }

  return { lines, response, receipt, checkResult };
}
