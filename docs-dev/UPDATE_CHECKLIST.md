# Update & Stability Checklist (Mossy Desktop)

This repo is optimized for *stability first*.

## Golden rules

- Prefer `npm ci` over `npm install` when you want reproducible installs.
- Do **not** run `npm audit fix --force` unless you’re intentionally accepting breaking upgrades.
- Keep `package-lock.json` committed. If it changes, treat that change as significant.
- Run `npm run smoke` after any change; run `npm run verify` before any merge/release.

## Quick commands

- Fast local confidence: `npm run smoke`
- Full local confidence: `npm run verify`

## Before pulling updates

1. Make sure your working tree is clean (commit or stash local edits).
2. Run `npm run verify` on the *current* revision (baseline).

## After pulling updates

1. Install deps reproducibly:
   - `npm ci`
2. Run stability checks:
   - `npm run smoke`
   - `npm run verify` (recommended)

If anything fails, fix it immediately or revert the update.

## Dependency update policy (safe-by-default)

### Routine updates

- Prefer upgrading one “tier” at a time:
  1) App code
  2) Dev tooling (eslint/typescript)
  3) Bundler (Vite)
  4) Runtime (Electron)
  5) Packager (electron-builder)

After each step, run `npm run verify`.

### Security advisories (npm audit)

Some advisories require major upgrades to fix:

- Electron advisories often require bumping Electron major versions.
- Vite/esbuild advisories may require a Vite major.
- electron-builder advisories often require electron-builder major.

For those, create a dedicated branch and upgrade incrementally while running `npm run verify` after each bump.

## Debug HUD

The dev-only debug HUD is now toggleable and **defaults OFF**.

- Toggle with the `DBG` button (top-left) or `Ctrl+Shift+D`.
- Use it only when diagnosing layout/click/overlay issues.

## When something “randomly breaks”

1. Run `npm run smoke`.
2. If the UI looks wrong (overlays/clicks), enable `DBG` and capture:
   - `probe(main-center)`
   - `probe(mid-right)`
3. Revert the most recent change first; then re-apply in smaller steps.
