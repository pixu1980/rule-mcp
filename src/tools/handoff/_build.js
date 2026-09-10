

/** Assemble the handoff document from its sections, degrading format to fit the token budget. */
import { readAdrs, readContextValues, readProjectIdentity } from "./_sources.js";
import { getGitDiff, getGitLog } from "./_git.js";
import { scanProjectDocs } from "./_docs-scan.js";
import { estimateTokens } from "./_format.js";
import { headerLines, identityLines, adrLines, contextLines } from "./_sections-core.js";
import { workingTreeLines, gitLogLines, docsLines, footerLines } from "./_sections-repo.js";

/** Build one handoff, re-running itself one format tighter when it exceeds maxTokens. */
export function buildHandoff({ projectDir, includeContext, includeAdrs, includeIdentity, includeGitDiff, includeGitLog, includeRoadmap, compress, maxTokens, format, mode }) {
  const identity = includeIdentity ? readProjectIdentity(projectDir) : {};
  const adrs = includeAdrs ? readAdrs(projectDir) : [];
  const contextValues = includeContext ? readContextValues(projectDir) : {};
  const gitDiff = includeGitDiff === false ? null : getGitDiff(projectDir);
  const gitLog = includeGitLog === false ? null : getGitLog(projectDir);
  const docsScan = includeRoadmap === false ? null : scanProjectDocs(projectDir);

  const projectName = identity.name || (projectDir === "." ? process.cwd().split("/").pop() : projectDir.split("/").pop());
  const shape = {
    projectName,
    projectDir,
    compress,
    isCloseSession: mode === "close-session",
    isBrief: format === "brief",
    isMinimal: format === "minimal",
  };

  const lines = [
    ...headerLines(shape),
    ...identityLines(identity, shape),
    ...adrLines(adrs, shape),
    ...contextLines(contextValues, shape),
    ...workingTreeLines(gitDiff, shape),
    ...gitLogLines(gitLog, shape),
    ...docsLines(docsScan, shape),
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
    });
  }

  return {
    text: output,
    stats: {
      adrs: adrs.length,
      contextKeys: Object.keys(contextValues).length,
      lines: output.split("\n").length,
      tokens,
      format: shape.isMinimal ? "minimal" : shape.isBrief ? "brief" : "full",
    },
  };
}
