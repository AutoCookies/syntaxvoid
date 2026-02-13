# Pomai Project Map: Design & Architecture

## Overview
`pomai-project-map` is a visualization tool for Atom/Pulsar that renders the project file structure as a **Squarified Treemap**. It highlights dependency relationships using curved links and provides a "Heatmap" mode to visualize file density.

## Design System
The UI follows a scoped design system (`.pm-clean` and `.pm-pixel` modes) defined in `styles/project-map.theme.less`.

### Modes
1.  **Clean (Default)**: Modern, flat, rounded corners, `Inter` font, soft colors.
2.  **Pixel**: Retro, hard edges, `monospace` font, CRT-like high contrast colors.

### Layout
The view is divided into a 3-pane grid:
-   **Header**: Controls for Theme, Color Mode, Links, Circular, Rescan.
-   **Body**:
    -   **Canvas**: The main visualization area (Treemap + Dependency Overlay).
    -   **Inspector**: Side panel showing details for the selected folder (Stats, Imports, Imported By).
-   **Footer**: Status bar showing file count, dependency count, and scan status.

## Interaction Model
-   **Hover**: Highlights the folder and its connected dependencies (fading out others). Show tooltip.
-   **Left Click + Drag**: Pan the view.
-   **Wheel**: Pan (vertical/horizontal).
-   **Ctrl + Wheel**: Zoom in/out.
-   **Double Click**: Reveal the folder in the editor's Tree View.
-   **Inspector**: Click "Reveal" to jump to the folder.

## Architecture

### `ProjectMapView` (`lib/ui/project-map-view.js`)
-   **Controller & View**: Manages the DOM, state (`themeMode`, `colorMode`, `zoomLevel`), and coordinates sub-components.
-   **Event Handling**: Listens to UI events and triggers re-renders or graph updates.
-   **Persistence**: Serializes UI state to restore view configuration between sessions.

### `GraphBuilder` (`lib/data/graph-builder.js`)
-   **Data Layer**: Scans the file system using `ripgrep` (via `atom.project.scan`) to build:
    -   **Folder Tree**: Nested structure with file counts.
    -   **Dependency Graph**: Edges representing imports between folders.
    -   **Circular Detection**: Identifies cycles in the graph.

### `TreemapRenderer` (`lib/ui/treemap-renderer.js`)
-   **Layout Engine**: Implements the Squarified Treemap algorithm.
-   **Rendering**: Calculates rectangles (`x, y, w, h`) for each folder.
-   **Color Strategies**:
    -   *Folder*: Colors based on depth/index from a base palette.
    -   *Heatmap*: Red-scale intensity based on file count.

### `DependencyOverlay` (`lib/ui/dependency-overlay.js`)
-   **Visualizer**: Draws curved Bézier lines between folder rectangles.
-   **Smart Opacity**: Reduces visual clutter by fading out irrelevant links when hovering a node.
-   **Directionality**: Indicators (arrows) and curve bias to show flow.

### `InspectorPanel` (`lib/ui/inspector-panel.js`)
-   **Details View**: Displays context-aware information for the active selection.

## Future Improvements
-   **Search**: Filter/Highlight nodes matching a query.
-   **Breadcrumbs**: Navigation bar for drilling down into sub-trees.
-   **Force Atlas**: Alternative layout for pure dependency graphing (not just treemap).
