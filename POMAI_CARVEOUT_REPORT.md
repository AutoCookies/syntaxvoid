# SyntaxVoid Carveout Report

## Phase 0 — Baseline
- Captured install/build/run attempts in `BASELINE.md`.
- Baseline blocker identified: git dependency fetch over current network/proxy path.

## Phase 1 — Identity
- Confirmed SyntaxVoid root metadata and tightened package description/repository metadata.
- Added architecture vision doc at `docs/architecture/VISION.md`.
- Added `CODEOWNERS`.

## Phase 2 — Platform façade
- Added thin platform wrappers:
  - `core/platform/commands.{js,ts}`
  - `core/platform/settings.{js,ts}`
  - `core/platform/panels.{js,ts}`
  - `core/platform/logging.{js,ts}`
  - `core/platform/paths.{js,ts}`
- Updated `packages/syntaxvoid-project-map` to consume façade wrappers for commands/settings/panels/path access.

## Phase 3 — Legacy subsystem reduction
- Disabled updater checks by default.
- Set exception-reporting package activation to no-op and left package stubs in place.
- Documented removals in `CLEANUP_REMOVALS.md`.

## Phase 4 — Default package set
- Added authoritative package SOT in `src/syntaxvoid-default-package-set.js`.
- Wired `core.disabledPackages` default to optional disabled list.
- Kept `syntaxvoid-project-map` in required package set.

## Phase 5 — Build/runtime stabilization
- Added deterministic developer entrypoint script:
  - `yarn dev` => install + build + start
- Added lightweight checks:
  - `yarn check:build`
  - `yarn check:smoke-launch`

## Phase 6 — Quality gates
- Baseline and post-change checks executed where environment allowed.
- CI independence from Pulsar services improved by default-off updater/exception-reporting pathways.

## Build / Run
- `yarn install`
- `yarn build`
- `yarn start`
- or `yarn dev`

## Remaining risks / next steps
- Replace remaining git-based dependencies with registry or vendored tarball equivalents to fully unblock restricted-network installs.
- Gradually route more first-party package integration through `core/platform/*`.
- Add CI matrix smoke launch once dependency resolution is fully deterministic.
