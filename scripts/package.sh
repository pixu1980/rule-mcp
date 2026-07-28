#!/usr/bin/env bash
# Package rule-mcp for npm, Homebrew, and direct download
set -euo pipefail

VERSION=${1:-$(node -e "console.log(require('./package.json').version)")}
NAME="rule-mcp"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Packaging $NAME v$VERSION ==="

# 1. Embed skills
node "$ROOT/scripts/embed-skills.mjs"

# 2. Verify
if [ ! -f "$ROOT/bin/rule-mcp.js" ]; then
  echo "ERROR: bin/rule-mcp.js not found"
  exit 1
fi

# 3. Create npm tarball
echo "--- pnpm pack ---"
cd "$ROOT"
pnpm pack 2>/dev/null || echo "  pnpm pack skipped (use 'pnpm publish' directly)"

# 4. Create Homebrew formula
echo "--- Homebrew formula ---"
SHASUM=$(shasum -a 256 "${NAME}-${VERSION}.tgz" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
cat > "${NAME}.rb" << FORMULA
class PixGalaxyMcp < Formula
  desc "MCP server for the rule-* skill ecosystem"
  homepage "https://github.com/rule-ai/rule-mcp"
  url "https://registry.npmjs.org/${NAME}/-/${NAME}-${VERSION}.tgz"
  sha256 "${SHASUM}"
  license "MIT"

  depends_on "node"

  def install
    libexec.install Dir["*"]
    bin.install_symlink libexec/"bin/rule-mcp.js" => "rule-mcp"
  end

  test do
    system "#{bin}/rule-mcp", "doctor"
  end
end
FORMULA
echo "  Formula: ${NAME}.rb (sha256: ${SHASUM})"

# 5. Create install scripts
echo "--- Install scripts ---"
cat > "$ROOT/scripts/install.sh" << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
echo "Installing rule-mcp..."
pnpm add -g rule-mcp || {
  echo "pnpm add failed. Try:"
  echo "  pnpx rule-mcp serve"
  exit 1
}
echo "Installed. Run:"
echo "  rule-mcp doctor"
echo "  rule-mcp install --agent all"
SCRIPT
chmod +x "$ROOT/scripts/install.sh"

cat > "$ROOT/scripts/install.ps1" << 'SCRIPT'
#!/usr/bin/env pwsh
Write-Host "Installing rule-mcp..."
pnpm add -g rule-mcp
if ($LASTEXITCODE -ne 0) {
  Write-Host "pnpm add failed. Try: pnpx rule-mcp serve"
  exit 1
}
Write-Host "Installed. Run:"
Write-Host "  rule-mcp doctor"
Write-Host "  rule-mcp install --agent all"
SCRIPT

echo "=== Done ==="
echo ""
echo "Publish to npm:"
echo "  pnpm publish"
echo ""
echo "Publish to Homebrew:"
echo "  gh release upload v$VERSION ${NAME}.rb"
echo ""
echo "Or install directly:"
echo "  pnpm add -g ${NAME}"
