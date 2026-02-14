# SyntaxVoid UI Kit

A modern, theme-aware design system for SyntaxVoid.

## Features
- **Theme Bridge:** Maps Atom/Pulsar theme variables to stable CSS Custom Properties (`--sv-*`).
- **Components:** Reusable classes for panels, headers, buttons, inputs.
- **Micro-interactions:** Animations, focus states, hovering.
- **Skins:** "Clean" (Default) and "Pixel".

## Usage

In your LESS file:

```less
@import "syntaxvoid-ui-kit/styles/index.less";

.my-panel {
  .sv-panel; // Mixin or just use class in DOM
}
```

In your TS file:

```typescript
import { panelRoot, header, button } from 'syntaxvoid-ui-kit';

const el = panelRoot();
el.appendChild(header('My Panel'));
```
