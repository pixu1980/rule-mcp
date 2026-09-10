import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The MCP registry identity must be publishable (OSS-3).
 *
 * The registry validates namespace ownership against the publishing
 * account, so `server.json` must claim `io.github.<owner>/<name>` where
 * `<owner>` is the owner in its own `repository.url` - not a namespace
 * the maintainer does not control. The version must track package.json,
 * otherwise a release ships a manifest that disagrees with its tag.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function githubOwner(repositoryUrl) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/u.exec(repositoryUrl);

  assert.ok(match, `repository.url is not a github.com owner/repo URL: ${repositoryUrl}`);

  return { owner: match[1], repo: match[2] };
}

test("server.json claims the repository owner's namespace", () => {
  const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));
  const { owner, repo } = githubOwner(server.repository.url);

  assert.equal(server.name, `io.github.${owner}/${repo}`, "the registry namespace must be owned by the publishing account (OSS-3)");
});

test("server.json version tracks package.json", () => {
  const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  assert.equal(server.version, manifest.version, "tag, package.json and server.json must agree");
});
