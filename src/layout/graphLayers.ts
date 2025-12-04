// src/layout/graphLayers.ts
import type { RawDevice } from "../types/types";

/* 
 * The algorithm finds root nodes (those with no incoming connections) 
 * and sets them to column 0, then iteratively assigns each node to 
 * one column beyond the maximum column of any node linking to it 
 * (longest path); finally, it identifies client nodes 
 * (those with incoming connections from hubs but low outgoing connections) 
 * and moves them to a final rightmost column.
 */

interface NodeInfo {
  id: string;
  incomingFrom: string[];
  outgoingTo: string[];
  column: number;
}

function buildGraph(devices: RawDevice[]): Map<string, NodeInfo> {
  const graph = new Map<string, NodeInfo>();

  // Initialize all nodes
  for (const d of devices) {
    if (!graph.has(d.id)) {
      graph.set(d.id, {
        id: d.id,
        incomingFrom: [],
        outgoingTo: [],
        column: -1,
      });
    }

    // Add links
    for (const link of d.links || []) {
      // Ensure linked node exists
      if (!graph.has(link)) {
        graph.set(link, {
          id: link,
          incomingFrom: [],
          outgoingTo: [],
          column: -1,
        });
      }

      // Update connections
      graph.get(d.id)!.outgoingTo.push(link);
      graph.get(link)!.incomingFrom.push(d.id);
    }
  }

  return graph;
}

function findRootNodes(graph: Map<string, NodeInfo>): string[] {
  const roots: string[] = [];
  for (const [id, node] of graph) {
    if (node.incomingFrom.length === 0) {
      roots.push(id);
    }
  }
  return roots;
}

function roughPlacement(graph: Map<string, NodeInfo>, roots: string[]): void {
  // Set roots to column 0
  for (const rootId of roots) {
    graph.get(rootId)!.column = 0;
  }

  // Iteratively assign columns based on longest path from roots
  let changed = true;
  let iterations = 0;
  const maxIterations = graph.size * 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const [id, node] of graph) {
      if (node.column === -1) continue;

      // For each outgoing connection, set its column to at least current + 1
      for (const targetId of node.outgoingTo) {
        const target = graph.get(targetId)!;
        const proposedColumn = node.column + 1;

        if (target.column === -1 || proposedColumn > target.column) {
          target.column = proposedColumn;
          changed = true;
        }
      }
    }
  }

  // Handle any unreachable nodes (set them to 0)
  for (const [id, node] of graph) {
    if (node.column === -1) {
      node.column = 0;
    }
  }
}

function adjustSpecialCases(graph: Map<string, NodeInfo>): void {
  // Find hubs (nodes with many outgoing connections)
  const hubs = new Set<string>();
  for (const [id, node] of graph) {
    if (node.outgoingTo.length >= 3) {
      hubs.add(id);
    }
  }

  // Identify clients: nodes with incoming from hubs, low out-degree, not hubs themselves
  const clients = new Set<string>();
  for (const [id, node] of graph) {
    if (hubs.has(id)) continue;
    if (node.incomingFrom.length === 0) continue;

    // Pure leaf with incoming
    if (node.outgoingTo.length === 0) {
      clients.add(id);
      continue;
    }

    // Low out-degree with incoming from hub
    if (node.outgoingTo.length <= 2) {
      const hasIncomingFromHub = node.incomingFrom.some((src) => hubs.has(src));
      if (hasIncomingFromHub) {
        const nonHubIncoming = node.incomingFrom.filter((src) => !hubs.has(src));
        if (nonHubIncoming.length === 0) {
          clients.add(id);
        }
      }
    }
  }

  // Find max column (excluding clients)
  let maxColumn = 0;
  for (const [id, node] of graph) {
    if (!clients.has(id) && node.column > maxColumn) {
      maxColumn = node.column;
    }
  }

  // Move clients to final column
  for (const clientId of clients) {
    graph.get(clientId)!.column = maxColumn + 1;
  }
}

const computeLayers = (devices: RawDevice[]): Map<string, number> => {
  // Step 1: Build indexed object with connections
  const graph = buildGraph(devices);

  // Step 2: Find starting points (nodes with no incoming)
  const roots = findRootNodes(graph);

  // Step 3: Do rough placement
  roughPlacement(graph, roots);

  // Step 4: Adjust special cases (clients, etc.)
  adjustSpecialCases(graph);

  // Step 5: Convert to result map
  const result = new Map<string, number>();
  for (const [id, node] of graph) {
    result.set(id, node.column);
  }

  return result;
};

export default computeLayers;