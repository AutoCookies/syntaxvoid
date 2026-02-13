# SyntaxVoid Platform Vision

SyntaxVoid is a **first-party platform** composed of:

- **Core editor runtime** (existing editor engine and shell)
- **Platform surface** (`core/platform/*`) for package-safe integration
- **Packages** (bundled + first-party such as `syntaxvoid-project-map`)
- **Future daemons/services** for background indexing, sync, and automation

## Principles
- Keep editor engine behavior stable.
- Carve out legacy subsystems behind flags/no-op shims instead of deep rewrites.
- Provide a stable, minimal platform API for first-party packages.
- Maintain a clean startup surface with an authoritative default package set.
