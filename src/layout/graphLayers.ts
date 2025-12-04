// src/layout/graphLayers.ts
import type { RawDevice } from "../types/types";

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

  // Track initial assignments to detect minimum valid column
  const minColumn = new Map<string, number>();

  // First pass: assign minimum columns based on incoming edges (ignore back-edges)
  let changed = true;
  let iterations = 0;
  const maxIterations = graph.size * 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const [id, node] of graph) {
      if (node.column === -1) continue;

      // For each outgoing connection
      for (const targetId of node.outgoingTo) {
        const target = graph.get(targetId)!;
        const proposedColumn = node.column + 1;

        // Only update if this is a forward edge (not a back-edge)
        // A back-edge is when target already has a column <= current node
        const isBackEdge = target.column !== -1 && target.column <= node.column;
        
        if (!isBackEdge) {
          if (target.column === -1 || proposedColumn > target.column) {
            target.column = proposedColumn;
            
            // Track minimum valid column for this node
            if (!minColumn.has(targetId) || proposedColumn < minColumn.get(targetId)!) {
              minColumn.set(targetId, proposedColumn);
            }
            
            changed = true;
          }
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

  // Second pass: for nodes with bidirectional connections, use the minimum column
  for (const [id, node] of graph) {
    for (const targetId of node.outgoingTo) {
      const target = graph.get(targetId)!;
      
      // Check if bidirectional (target also points back)
      if (target.outgoingTo.includes(id)) {
        // Both nodes should use their minimum calculated column
        if (minColumn.has(id)) {
          const minCol = minColumn.get(id)!;
          if (node.column > minCol) {
            node.column = minCol;
          }
        }
        if (minColumn.has(targetId)) {
          const minCol = minColumn.get(targetId)!;
          if (target.column > minCol) {
            target.column = minCol;
          }
        }
      }
    }
  }
}

function adjustSpecialCases(graph: Map<string, NodeInfo>): void {
  // Find max column before adjustments
  let maxColumn = 0;
  for (const [id, node] of graph) {
    if (node.column > maxColumn) {
      maxColumn = node.column;
    }
  }

  // Identify leaf nodes (no outgoing connections)
  const leafNodes = new Set<string>();
  for (const [id, node] of graph) {
    if (node.outgoingTo.length === 0 && node.incomingFrom.length > 0) {
      leafNodes.add(id);
    }
  }

  // Move all leaf nodes to final column
  for (const leafId of leafNodes) {
    graph.get(leafId)!.column = maxColumn + 1;
  }
}

const computeLayers = (devices: RawDevice[]): Map<string, number> => {
  // Step 1: Build indexed object with connections
  const graph = buildGraph(devices);

  // Step 2: Find starting points (nodes with no incoming)
  const roots = findRootNodes(graph);

  // Step 3: Do rough placement using longest path (detecting back-edges)
  roughPlacement(graph, roots);

  // Step 4: Adjust special cases (move leafs to final column)
  adjustSpecialCases(graph);

  // Step 5: Convert to result map
  const result = new Map<string, number>();
  for (const [id, node] of graph) {
    result.set(id, node.column);
  }

  return result;
};

export default computeLayers;