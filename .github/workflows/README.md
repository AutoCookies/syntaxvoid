# SyntaxVoid CI/CD Workflows

## Workflows

### `ci.yml` — Continuous Integration
Runs on every push/PR to `main`, `master`, or `dev`.

- **Smoke check** on Linux, Windows, macOS: installs deps + builds native modules
- **ESLint** lint pass

### `build.yml` — Build & Release
Runs when you push a version tag (`v1.2.3`) or manually dispatch.

Produces downloadable artifacts for every platform:

| Platform | Artifacts |
|---|---|
| Linux x64 | `.AppImage`, `.deb`, `.rpm`, `.tar.gz` |
| Linux ARM64 | `.AppImage`, `.deb`, `.rpm`, `.tar.gz` |
| Windows x64 | `.exe` (NSIS installer), `.zip` |
| macOS Universal | `.dmg`, `.zip` |

---

## How to create a release

```bash
# 1. Bump the version in package.json
npm version 1.2.3   # or manually edit

# 2. Commit and tag
git add package.json
git commit -m "chore: release v1.2.3"
git tag v1.2.3

# 3. Push — this triggers the build workflow
git push origin main --tags
```

GitHub Actions will:
1. Build SyntaxVoid on all 4 platform runners in parallel
2. Collect all `.AppImage`, `.deb`, `.rpm`, `.tar.gz`, `.exe`, `.zip`, `.dmg` files
3. Create a GitHub Release at `https://github.com/AutoCookies/syntaxvoid/releases/tag/v1.2.3`
4. Attach all files as downloadable assets

---

## Optional: macOS Code Signing

Without signing, macOS users see a Gatekeeper warning. To enable signing,
add these **repository secrets** (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `MACOS_CERT_P12` | Base64-encoded `.p12` Developer ID certificate |
| `MACOS_CERT_PASSWORD` | Password for the `.p12` |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_APP_PASSWORD` | App-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |

Without these secrets, the workflow produces **unsigned builds** that still
work — users just need to right-click → Open on first launch.

---

## Pre-release / canary builds

Tags with a pre-release suffix are automatically marked as pre-releases:

```bash
git tag v1.2.3-beta.1
git push origin v1.2.3-beta.1
```

To build a **SyntaxVoidNext** (canary) package that runs alongside stable:

1. Go to **Actions → Build & Release → Run workflow**
2. Set `channel` to `next`
