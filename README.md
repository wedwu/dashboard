#  ** `README.md` (fully ready-to-save file)**

````markdown
# REACT — SVG Version

A React + SVG–based auto-layout diagram engine for rendering device graphs, dependency flows, and topology maps.  
This branch (`SVG-version`) focuses on **precise SVG line routing**, **DOM-measured layout**, and **reactive auto-positioning** of nodes and connection paths.

---

## Features

- **Automatic Column + Depth Layout**  
  Uses BFS forward/backward passes to compute upstream/downstream graph depth.

- **SVG Polyline Routing Engine**  
  Draws dynamic routed edges with clean elbow connectors.

- **Error Icons on Down Nodes**  
  When a target device has status `"down"`, a Material Symbol error icon is placed at the elbow.

- **DOM-aware Node Measurement**  
  `getRelativePos()` ensures all SVG coordinates align with rendered React DOM nodes.

- **Configurable Lane Spacing**  
  Supports `"fixed"`, `"flex"`, and `"adaptive"` routing lanes via `computeLaneGap()`.

- **Vitest + React Testing Library** unit testing included  
  Graph helpers, geometry helpers, and layout utilities all thoroughly tested.

---

## Installation

```bash
git clone https://github.com/wedwu/REACT.git
cd REACT
git checkout SVG-version
npm install
````

Run development server (if example/demo is included):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Project Structure

```
/
  src/
    components/
      DiagramAutoLayout.tsx
      SvgConnections.tsx
      DeviceBox.tsx
      ...
    utils/
      graphHelpers.js
      laneHelpers.js
      geometry.js
    styles/
      diagramStyles.js
  __tests__/
      graphHelpers.test.ts
      laneHelpers.test.ts
      geometry.test.ts
      SvgConnections.test.tsx
  package.json
  README.md
```

---

## Basic Usage

```tsx
import React from "react";
import DiagramAutoLayout from "./components/DiagramAutoLayout";

const devices = [
  { id: "root", status: "up", links: ["serverA", "serverB"] },
  { id: "serverA", status: "down", links: ["db1"] },
  { id: "serverB", status: "up", links: [] },
  { id: "db1", status: "up", links: [] },
];

export default function App() {
  return (
    <DiagramAutoLayout
      devices={devices}
      rootId="root"
      laneMode="adaptive"
      lanePreset="medium"
      routingMode="spine"
      laneScale={1}
    />
  );
}
```

This will:

* Group nodes into depth-based columns
* Render each node with a status dot + mini menu
* Draw SVG connections between nodes
* Add error icons on “down” nodes

---

## Core Algorithms

### **Graph Helpers (`utils/graphHelpers.js`)**

* `buildAdjacency(devices)` → forward + reverse maps
* `bfsForward(forward, root)` → downstream distances
* `bfsBackward(reverse, root)` → upstream distances
* `computeDepths(devices, root)` → final signed depth map

Depth semantics:

* `0` = root
* `+N` = downstream
* `-N` = upstream

---

### **Lane Helpers (`utils/laneHelpers.js`)**

Lane spacing is computed via:

* `"fixed"` → always preset × scale
* `"flex"` → span-based spacing
* `"adaptive"` → `min(flexGap, presetGap)`

---

### **Geometry Helper (`utils/geometry.js`)**

`getRelativePos(el, svg)` computes:

* left / right
* top / bottom
* width / height

…relative to container SVG viewport (critical for correct polyline routing).

---

## Testing

This repo includes complete tests for:

* Graph adjacency
* BFS forward/backward
* Depth computation
* Lane spacing logic
* Geometry calculations
* SVG Connections (DOM + RAF stubbing)

Run all tests:

```bash
npm test
```

or

```bash
npx vitest
```

---

## Future Enhancements (optional ideas)

* Interactive node dragging
* Zoom/pan SVG viewport
* Highlighting active paths
* Live animated routing
* Layout caching for large graphs

---

## License

MIT License — feel free to use, modify, and extend.

---

## Contributing


```
