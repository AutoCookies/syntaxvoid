# Cleanup / Removals

## Disabled by default
- `pulsar-updater` update checks (`checkForUpdatesOnLaunch=false`) to keep updater endpoints inactive by default.
- `exception-reporting` package runtime behavior replaced with a no-op activation path.
- Optional package defaults moved into `core.disabledPackages` defaults via Pomai package set.

## Platform hardening
- Added `src/pomai-default-package-set.js` as source-of-truth for required and optional bundled packages.
- Wired config defaults so optional legacy packages remain disabled unless explicitly re-enabled.

## Why
- Reduce legacy Pulsar-hosted service dependencies (telemetry/update surface).
- Keep startup stable without invasive engine rewrites.
- Keep package loading intact while shifting to Pomai-owned defaults.
