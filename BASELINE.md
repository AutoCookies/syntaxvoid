# Baseline Snapshot

## Platform Notes
- OS: Linux (`uname -a`: `Linux 977aeaa618e6 6.12.47 #1 SMP Mon Oct 27 10:01:15 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux`)
- Node.js: `v20.19.6`
- npm: `11.4.2`
- Yarn: `4.12.0`

## Commands Used
1. `yarn --version`
2. `yarn install`
3. `yarn build`
4. `yarn start`

## Observed Errors
### `yarn install`
- Failed during dependency resolution for a git dependency:
  - `document-register-element@https://github.com/pulsar-edit/document-register-element.git#1f5868f`
  - Error: `CONNECT tunnel failed, response 403`
- Result: dependencies were not installed.

### `yarn build`
- Failed because install did not complete and lock state was unresolved:
  - `This package doesn't seem to be present in your lockfile; run "yarn install" to update the lockfile`

### `yarn start`
- Failed with the same unresolved-lockfile error as build:
  - `This package doesn't seem to be present in your lockfile; run "yarn install" to update the lockfile`

## Baseline Conclusion
- Baseline is currently blocked by external git dependency fetch failures (network/proxy path to GitHub), which prevents install/build/run from succeeding.
