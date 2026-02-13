# SyntaxVoid Project Map

A **project topology visualization** package for SyntaxVoid — a cognition tool that replaces the traditional file-tree mental model with a spatial treemap and dependency graph.

## What It Does

- **Treemap view**: Folders rendered as nested rectangles sized by file count. Larger folders are visually larger, giving you an instant sense of project weight distribution.
- **Dependency links**: Curved lines between folders that import each other, drawn from scanning `import`/`require` statements in JS/TS files.
- **Circular dependency detection**: Edges forming cycles are highlighted in red with a glow effect using Tarjan's SCC algorithm.
- **Hover tooltips**: Shows folder path, file count, and number of import connections.

## Usage

| Action | How |
|--------|-----|
| Toggle panel | `Ctrl-Alt-M` or Command Palette → "Project Map: Toggle" |
| Show/hide links | Click **Links** button in header |
| Circular only | Click **Circular** button in header |

The panel docks on the right by default; drag to left or bottom.

## Architecture

```
lib/
├── data/                    # Pure logic — no DOM, reusable by agents
│   ├── file-scanner.js      # Async recursive directory walker
│   ├── import-parser.js     # Regex import/require extractor
│   ├── cycle-detector.js    # Tarjan's SCC for circular deps
│   └── graph-builder.js     # Orchestrator with debounced rebuild
└── ui/                      # Canvas-based rendering
    ├── treemap-renderer.js  # Squarified treemap layout
    ├── dependency-overlay.js # Bezier curve link drawing
    └── project-map-view.js  # Dock panel (canvas + controls + tooltips)
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxFiles` | 10000 | File scan cap to prevent hanging on monorepos |
| `debounceMs` | 500 | Delay before rescanning after file save |
| `showDependencyLinks` | true | Show/hide dependency curves |
| `circularOnly` | false | Show only circular dependency edges |
| `ignoredDirectories` | `node_modules,.git,dist,...` | Directories to skip |

## Performance

- Canvas rendering (not DOM) for smooth interaction
- 10k file cap with graceful truncation
- 500ms debounced rebuild on file save
- `requestAnimationFrame` for paint scheduling
- `ResizeObserver` for responsive relayout

## License

MIT
