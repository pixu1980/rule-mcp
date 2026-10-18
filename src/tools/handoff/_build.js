

/** Assemble the handoff document from its sections, degrading format to fit the token budget. */
import { readAdrs, readContextValues, readProjectIdentity } from "./_sources.js";
import { getGitDiff, getGitLog } from "./_git.js";
import { featureSummary } from "./_feature.js";
import { graphChanges } from "../../core/tokensave/_changes.js";
import { affectedTests } from "../../core/tokensave/_insights.js";
import { sessionRecall } from "../../core/tokensave/_memory.js";
import { scanProjectDocs } from "./_docs-scan.js";
import { archiveCompletedDocs, closeoutLines } from "./_closeout.js";
import { autoRenumber, renumberLines } from "./_renumber.js";
import { estimateTokens } from "./_format.js";
import { headerLines, identityLines, adrLines, contextLines } from "./_sections-core.js";
import { featureRangeLines, workingTreeLines, gitLogLines, docsLines, footerLines } from "./_sections-repo.js";
import { semanticLines } from "./_sections-semantic.js";
import { affectedTestLines, recallLines } from "./_sections-tokensave.js";

/** Build one handoff, re-running itself one format tighter when it exceeds maxTokens. */
export function buildHandoff({
  projectDir,
  includeContext,
  includeAdrs,
  includeIdentity,
  includeGitDiff,
  includeGitLog,
  includeRoadmap,
  compress,
  maxTokens,
  format,
  mode,
  closeout,
  _closeout,
  _renumber,
}) {
  // Archiving completed papers and repairing the ADR numbering are one act: a
  // run that writes ADRs renumbers so it cannot leave a collision behind, and a
  // run asked to keep its hands off the tree does neither. Both handoff modes
  // archive (ADR 103); `closeout: false` is the read-only diagnosis.
  const shouldArchive = closeout !== false;
  const renumber = _renumber === undefined && shouldArchive ? autoRenumber(projectDir, { apply: true }) : _renumber;
  const identity = includeIdentity ? readProjectIdentity(projectDir) : {};
  const adrs = includeAdrs ? readAdrs(projectDir) : [];
  const contextValues = includeContext ? readContextValues(projectDir) : {};
  const gitDiff = includeGitDiff === false ? null : getGitDiff(projectDir);
  const changes = includeGitDiff === false ? null : graphChanges(projectDir, { files: gitDiff?.files ?? [] });
  const decisions = includeGitDiff === false ? null : sessionRecall(projectDir, { limit: 8 });
  const affected = includeGitDiff === false ? null : affectedTests(projectDir, gitDiff?.files ?? []);
  const gitLog = includeGitLog === false ? null : getGitLog(projectDir);
  const docsScan = includeRoadmap === false ? null : scanProjectDocs(projectDir);
  const feature = featureSummary(projectDir);

  const projectName = identity.name || (projectDir === "." ? process.cwd().split("/").pop() : projectDir.split("/").pop());
  const shape = {
    projectName,
    projectDir,
    compress,
    isCloseSession: mode === "close-session",
    isBrief: format === "brief",
    isMinimal: format === "minimal",
  };
  // The renumber runs before the archive reads the ADR log, so the handoff
  // quotes the numbers that exist after the repair.
  const closeoutResult = _closeout === undefined && shouldArchive ? archiveCompletedDocs(projectDir) : _closeout;

  const lines = [
    ...headerLines(shape),
    ...identityLines(identity, shape),
    ...featureRangeLines(feature, shape),
    ...adrLines(adrs, shape),
    ...contextLines(contextValues, shape),
    ...workingTreeLines(gitDiff, shape),
    ...semanticLines(changes, shape),
    ...recallLines(decisions, shape),
    ...affectedTestLines(affected, shape),
    ...gitLogLines(gitLog, shape),
    ...docsLines(docsScan, shape),
    ...renumberLines(renumber, shape),
    ...closeoutLines(closeoutResult, shape),
    ...footerLines(shape),
  ];

  const output = lines.join("\n");
  const tokens = estimateTokens(output);

  // Over budget: degrade full -> brief -> minimal, re-running with the tighter format.
  if (maxTokens > 0 && tokens > maxTokens && !shape.isBrief && !shape.isMinimal) {
    return buildHandoff({
      projectDir,
      includeContext,
      includeAdrs,
      includeIdentity,
      compress: true,
      maxTokens,
      format: "brief",
      _closeout: closeoutResult,
      _renumber: renumber,
    });
  }

  if (maxTokens > 0 && tokens > maxTokens && shape.isBrief && !shape.isMinimal) {
    return buildHandoff({
      projectDir,
      includeContext,
      includeAdrs,
      includeIdentity,
      compress: true,
      maxTokens,
      format: "minimal",
      _closeout: closeoutResult,
      _renumber: renumber,
    });
  }

  return {
    text: output,
    stats: {
      adrs: adrs.length,
      archived: closeoutResult ? closeoutResult.archived.length : 0,
      contextKeys: Object.keys(contextValues).length,
      lines: output.split("\n").length,
      tokens,
      format: shape.isMinimal ? "minimal" : shape.isBrief ? "brief" : "full",
    },
  };
}
