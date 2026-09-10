<!-- What CI actually enforces - keep this list in sync with .github/workflows/ci.yml -->

## Checklist

- [ ] `pnpm test:all` is green (or the affected scope, stated below)
- [ ] `pnpm lint` and `pnpm format` are clean
- [ ] `pnpm census:check` is current (run `pnpm census` after catalog changes)
- [ ] Conventional Commits with a mandatory scope (`type(scope): subject`)
- [ ] Structural change carries an ADR in `docs/adr/` (skip for small fixes)

## What changed and why

<!-- one paragraph: the change, the reason, how to verify it -->
