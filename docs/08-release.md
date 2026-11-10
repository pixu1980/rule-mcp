# Release

This chapter tells how to publish a version and the documentation site. RuleMCP has no npm package. CI uses pnpm and the workspace for each build.

## What a release gives you

A release is a GitHub Release with three files.

| File                     | Content                                |
| ------------------------ | -------------------------------------- |
| `rule-mcp-<version>.tgz` | The source tree of the tag             |
| `SHA256SUMS`             | The checksum of the tarball            |
| `sbom.cdx.json`          | The list of dependencies, in CycloneDX |

## Do this once

Turn on GitHub Pages. In the repository, go to Settings, then Pages, then Source. Select GitHub Actions. The token of a workflow cannot do this step.

## Publish a version

1. Commit your work on `main`.
2. Do a dry run. It writes no release, but it fetches tags from `origin`.

   ```bash
   pnpm release --dry-run --version 0.1.0
   ```

3. Publish the first version.

   ```bash
   pnpm release --version 0.1.0
   ```

After `v0.1.0`, use `pnpm release` with no version. The commits since the last tag set the version: `fix` gives a patch, `feat` gives a minor, and `!` or `BREAKING CHANGE` gives a major.

The command stops before it writes in four cases. The branch is not `main`, the tree has changes, `main` is behind `origin`, or the tag exists.

The command then does these steps:

1. It writes the version in the manifests.
2. It writes the census and the changelog again.
3. It runs `pnpm run ci`.
4. It commits `chore(release): vX.Y.Z` and adds an annotated tag.
5. It pushes `main` and the tag in one atomic push.

Use `--no-push` to stop before the push. Use `--no-checks` to skip `pnpm run ci`.

If the push fails, the commit and the tag stay on your machine. Fix the cause, and then run `git push --atomic origin main v0.1.0` with your tag.

## Keep the changelog current

After the first tag, CI fails if `CHANGELOG.md` is not current. Each entry holds the SHA of its commit, so a commit cannot hold its own entry.

The `post-commit` hook adds the entry in a second commit, `chore(changelog): refresh`. It starts after each commit that is not a `chore`. It does nothing during a rebase, a merge, a cherry-pick, or a revert. After a rebase, run `pnpm changelog` and commit the result as a `chore`.

`pnpm hooks:install` installs the hook. If you set a global `core.hooksPath`, git ignores `.git/hooks`. Then that global directory needs a `post-commit` file that calls the hook of the repository.

## What CI does

The tag starts `.github/workflows/release.yml`:

| Job       | Steps                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| `build`   | Install with pnpm, check the version and the audit, pack, checksum, SBOM                |
| `verify`  | Check the checksum, extract the tarball, install with pnpm, build the site, run the CLI |
| `release` | Read the changelog entry and publish the GitHub Release                                 |

A tag with a hyphen, for example `v0.2.0-rc.1`, makes a prerelease.

The push to `main` starts `.github/workflows/pages.yml`. It runs `pnpm docs:build` and publishes `site-dist/` to GitHub Pages. The site reads `README.md` and `docs/`. It does not publish `docs/adr/` or `docs/handoff/`.

To see the site on your machine, run `pnpm docs:dev`.

## Install from a release

```bash
tar -xzf rule-mcp-0.1.0.tgz
```

```bash
cd rule-mcp-0.1.0
```

```bash
pnpm setup
```

To check the file, put `rule-mcp-0.1.0.tgz` and `SHA256SUMS` in one directory and run `shasum -a 256 -c SHA256SUMS`.

`rule-mcp update` works only in a git clone. For a tarball install, download the new tarball.

## What is not available

There is no npm package, Homebrew formula, published Docker image, winget package, or scoop package. This project publishes nothing to npm, so `pnpm dlx rule-mcp` and `npx rule-mcp` are not install routes.
