// src/layout/graphLayers.ts
import type { RawDevice } from "../types/types";

// The algorithm iteratively propagates layer assignments from root nodes 
// (those with no incoming edges) 
// through the graph, repeatedly updating each node's layer to be 
// one more than the maximum layer of any of its predecessors until 
// the assignments stabilize, then pushes only true leaf nodes 
// (with no outgoing edges) to a final column.

interface Graph {
  nodes: string[];
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

function buildGraph(devices: RawDevice[]): Graph {
  const nodes = new Set<string>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  // Collect all node IDs
  for (const d of devices) {
    nodes.add(d.id);
    for (const link of d.links || []) {
      nodes.add(link);
    }
  }

  // Initialize adjacency lists
  for (const node of nodes) {
    outgoing.set(node, []);
    incoming.set(node, []);
  }

  // Build edges
  for (const d of devices) {
    for (const to of d.links || []) {
      outgoing.get(d.id)!.push(to);
      incoming.get(to)!.push(d.id);
    }
  }

  return { nodes: Array.from(nodes), outgoing, incoming };
}

// Assign layers based on longest path, but don't treat back-edges as blockers
function computeLayersWithBackEdges(graph: Graph): Map<string, number> {
  const { nodes, outgoing, incoming } = graph;
  const layers = new Map<string, number>();
  
  // Find roots (nodes with no incoming edges)
  const roots = nodes.filter((id) => incoming.get(id)!.length === 0);
  
  if (roots.length === 0) {
    // No clear roots - pick nodes with minimum incoming degree
    let minIncoming = Infinity;
    for (const id of nodes) {
      minIncoming = Math.min(minIncoming, incoming.get(id)!.length);
    }
    for (const id of nodes) {
      if (incoming.get(id)!.length === minIncoming) {
        layers.set(id, 0);
      }
    }
  } else {
    for (const root of roots) {
      layers.set(root, 0);
    }
  }

  // Iteratively update layers until stable
  let changed = true;
  let iterations = 0;
  const maxIterations = nodes.length * 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const u of nodes) {
      if (!layers.has(u)) continue;
      
      const currentLayer = layers.get(u)!;

      for (const v of outgoing.get(u) || []) {
        const proposedLayer = currentLayer + 1;
        const existingLayer = layers.get(v);

        if (existingLayer === undefined) {
          layers.set(v, proposedLayer);
          changed = true;
        } else if (proposedLayer > existingLayer) {
          // Only update if this creates a longer path
          layers.set(v, proposedLayer);
          changed = true;
        }
      }
    }
  }

  // Handle any unreachable nodes
  for (const id of nodes) {
    if (!layers.has(id)) {
      layers.set(id, 0);
    }
  }

  return layers;
}

const computeLayers = (devices: RawDevice[]): Map<string, number> => {
  const graph = buildGraph(devices);
  const layers = computeLayersWithBackEdges(graph);
  
  // Find true leaf nodes (no outgoing edges at all)
  const maxLayer = Math.max(...Array.from(layers.values()));
  const result = new Map<string, number>();

  for (const id of graph.nodes) {
    const outgoing = graph.outgoing.get(id) || [];
    
    // Only push to final column if node has NO outgoing edges
    if (outgoing.length === 0) {
      result.set(id, maxLayer + 1);
    } else {
      result.set(id, layers.get(id)!);
    }
  }

  return result;
};

export default computeLayers;