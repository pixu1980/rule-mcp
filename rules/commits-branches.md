# Commits and Branches Rules

## Branch naming

Use the following prefixes:

- `feat/` — New feature
- `fix/` — Bug fix
- `refactor/` — Code refactoring without behavior change
- `chore/` — Tooling, dependencies, CI changes
- `docs/` — Documentation only
- `test/` — Adding or updating tests
- `hotfix/` — Urgent production fix

Format: `<prefix>/<short-kebab-description>`

### Branch naming rules

- Never use author names as branch names
- Do not use only a number or ID as the branch name
- Avoid overly generic or excessively long names

## Commit messages

Follow **Conventional Commits** specification (v1.0.0):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Usage                                        |
| ---------- | -------------------------------------------- |
| `feat`     | New feature                                  |
| `fix`      | Bug fix                                      |
| `refactor` | Refactoring without behavior change          |
| `chore`    | Tooling, deps, CI                            |
| `docs`     | Documentation                                |
| `test`     | Tests                                        |
| `perf`     | Performance improvement                      |
| `ci`       | CI pipeline changes                          |
| `style`    | Formatting (handled by Biome, rarely manual) |

### Scope

Use the package or module name: `backend`, `frontend`, `agent`, `docker`, `ci`, `docs`.

### Rules

- Subject line: imperative mood, lowercase, no period, max 72 characters.
- Body: wrap at 80 characters. Explain _what_ and _why_, not _how_.
- Breaking changes: add `BREAKING CHANGE:` footer or `!` after type.
- Reference GitLab issues: `Closes #123` or `Refs #456`.

## Merge request conventions

- Title follows the same Conventional Commits format.
- Description includes: what changed, why, how to test, screenshots if UI.
- Squash merge into `develop`. Rebase merge from `develop` into `main`.
- All pipelines must pass before merge.
- At least one approval required.
