# Roadmap

Where rule-mcp is going, in three horizons. Each item names the ADR
that justifies it, so the reasoning stays traceable.

## Now

Finish the single-installer follow-through (ADR 080): the Node wizard is
in place and the shell scripts are thin bootstraps, so what remains is
keeping the agent catalog drift-free and verifying the PowerShell
bootstraps in CI, where a shell actually exists to run them.

## Next

Prove releases end to end (ADR 082): cut a scratch prerelease tag and
watch the build/verify/release jobs carry a signed tarball plus
SHA256SUMS to the GitHub Release, bring the Scorecard and SBOM signal
online, and get the first CodeQL run green on main.

## Later

Publish the project outward (ADR 081): claim the MCP registry namespace
once the pipeline above proves itself, and build the documentation site
whose URL becomes the canonical install address.
