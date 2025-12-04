// src/layout/graphLayers.ts
import type { RawDevice } from "../types/types";

// -------------------------------------------------------------
// Build directed graph from devices
// -------------------------------------------------------------
interface Graph {
  nodes: string[];
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

function buildGraph(devices: RawDevice[]): Graph {
  const nodes: string[] = [];
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  // ensure every listed device id is present
  for (const d of devices) {
    if (!outgoing.has(d.id)) outgoing.set(d.id, []);
    if (!incoming.has(d.id)) incoming.set(d.id, []);
    nodes.push(d.id);
  }

  // wire edges
  for (const d of devices) {
    const from = d.id;
    for (const to of d.links || []) {
      // be robust if a link points at a node not in devices
      if (!outgoing.has(to)) outgoing.set(to, []);
      if (!incoming.has(to)) incoming.set(to, []);

      outgoing.get(from)!.push(to);
      incoming.get(to)!.push(from);
    }
  }

  return { nodes, outgoing, incoming };
}

// -------------------------------------------------------------
// BFS layering: minimum distance from any root
// -------------------------------------------------------------
function bfsLayers(graph: Graph): Map<string, number> {
  const { nodes, outgoing, incoming } = graph;
  const layers = new Map<string, number>();

  // roots = nodes with no incoming edges
  const roots = nodes.filter((id) => (incoming.get(id) || []).length === 0);

  const queue: string[] = [];

  if (roots.length === 0) {
    // degenerate case: treat all as roots
    for (const id of nodes) {
      layers.set(id, 0);
      queue.push(id);
    }
  } else {
    for (const r of roots) {
      layers.set(r, 0);
      queue.push(r);
    }
  }

  while (queue.length) {
    const u = queue.shift()!;
    const base = layers.get(u) ?? 0;

    for (const v of outgoing.get(u) || []) {
      const current = layers.get(v);
      const candidate = base + 1;

      // keep the smallest (closest-to-root) layer
      if (current === undefined || candidate < current) {
        layers.set(v, candidate);
        queue.push(v);
      }
    }
  }

  // any unreachable node → default to 0
  for (const id of nodes) {
    if (!layers.has(id)) layers.set(id, 0);
  }

  return layers;
}

// -------------------------------------------------------------
// Compute final layers:
//  - base layer from BFS
//  - "sink-like" nodes pushed to last column
// -------------------------------------------------------------
const computeLayers = (devices: RawDevice[]): Map<string, number> => {
  const graph = buildGraph(devices);
  const base = bfsLayers(graph);

  // find max base layer
  let maxBase = 0;
  base.forEach((v) => {
    if (v > maxBase) maxBase = v;
  });

  const result = new Map<string, number>();

  for (const id of graph.nodes) {
    const myLayer = base.get(id) ?? 0;
    const outs = graph.outgoing.get(id) || [];

    let sinkLike = false;

    if (outs.length === 0) {
      // no outgoing edges at all → definite sink
      sinkLike = true;
    } else {
      // sink-like if ALL outgoing edges go to STRICTLY earlier layers
      sinkLike = outs.every((to) => {
        const toLayer = base.get(to);
        return toLayer !== undefined && toLayer < myLayer;
      });
    }

    if (sinkLike) {
      // push to final column
      result.set(id, maxBase + 1);
    } else {
      result.set(id, myLayer);
    }
  }

  return result;
}


export default computeLayers
