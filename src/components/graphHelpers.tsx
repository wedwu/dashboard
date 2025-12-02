// ---------------------------------------------------------------------------
// graphHelpers.ts
// Low-level graph utilities for assignLayout()
// ---------------------------------------------------------------------------

import type { DeviceNode } from "./types";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface SCCResult {
  sccs: string[][];
  nodeToComp: Map<string, number>;
}

export interface AdjacencyResult {
  adj: Map<string, Set<string>>;
  revAdj: Map<string, Set<string>>;
  outDegree: Map<string, number>;
  inDegree: Map<string, number>;
}

// ---------------------------------------------------------------------------
// BUILD ADJACENCY FROM DEVICE LIST
// ---------------------------------------------------------------------------
export function buildAdjacency(devices: DeviceNode[]): AdjacencyResult {
  const adj = new Map<string, Set<string>>();
  const revAdj = new Map<string, Set<string>>();

  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();

  // Initialize empty sets
  for (const d of devices) {
    adj.set(d.id, new Set());
    revAdj.set(d.id, new Set());
    outDegree.set(d.id, 0);
    inDegree.set(d.id, 0);
  }

  // Fill edges
  for (const d of devices) {
    const from = d.id;
    const outs = d.links || [];

    for (const tgt of outs) {
      // Skip self-loops
      if (tgt === from) continue;

      if (!adj.has(from)) adj.set(from, new Set());
      adj.get(from)!.add(tgt);

      if (!revAdj.has(tgt)) revAdj.set(tgt, new Set());
      revAdj.get(tgt)!.add(from);
    }
  }

  // Compute degrees
  for (const [id, outs] of adj.entries()) {
    outDegree.set(id, outs.size);
  }

  for (const [id, ins] of revAdj.entries()) {
    inDegree.set(id, ins.size);
  }

  return { adj, revAdj, outDegree, inDegree };
}



// ---------------------------------------------------------------------------
// STRONGLY CONNECTED COMPONENTS — KOSARAJU
// ---------------------------------------------------------------------------
export function computeSCCs(
  ids: string[],
  adj: Map<string, Set<string>>,
  revAdj: Map<string, Set<string>>
): SCCResult {
  const visited = new Set<string>();
  const order: string[] = [];

  // 1. DFS on original graph to compute finishing order
  const dfs1 = (u: string) => {
    visited.add(u);
    for (const v of adj.get(u) || []) {
      if (!visited.has(v)) dfs1(v);
    }
    order.push(u);
  };

  for (const id of ids) {
    if (!visited.has(id)) dfs1(id);
  }

  // 2. Reverse DFS according to finishing order
  const compIndex = new Map<string, number>();
  const sccs: string[][] = [];
  visited.clear();

  const dfs2 = (u: string, label: number) => {
    visited.add(u);
    compIndex.set(u, label);
    sccs[label].push(u);

    for (const v of revAdj.get(u) || []) {
      if (!visited.has(v)) dfs2(v, label);
    }
  };

  let label = 0;
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (!visited.has(id)) {
      sccs.push([]);
      dfs2(id, label);
      label++;
    }
  }

  return { sccs, nodeToComp: compIndex };
}



// ---------------------------------------------------------------------------
// CLASSIFY LEAVES INTO {serviceLeaves, clientLeaves}
// Very lightweight heuristic, adjustable anytime.
// ---------------------------------------------------------------------------
export function classifyLeaves(
  ids: string[],
  adj: Map<string, Set<string>>,
  revAdj: Map<string, Set<string>>,
  outDegree: Map<string, number>
): {
  serviceLeaves: Set<string>;
  clientLeaves: Set<string>;
} {
  const serviceLeaves = new Set<string>();
  const clientLeaves = new Set<string>();

  for (const id of ids) {
    const outs = adj.get(id) || new Set();
    if (outs.size === 0) {
      // leaf!
      // Heuristic split:
      // - If leaf has ANY inbound connection from a hub or mid server, treat it as a client
      // - Otherwise it's a "service leaf"
      const ins = revAdj.get(id) || new Set();
      if (ins.size >= 1) clientLeaves.add(id);
      else serviceLeaves.add(id);
    }
  }

  return { serviceLeaves, clientLeaves };
}



// ---------------------------------------------------------------------------
// FIND HUB CLUSTER
// A hub is dynamically defined as a node with "many" edges.
// Here we treat "hub cluster" as a set of nodes whose SCCs contain
// lots of inbound and outbound traffic.
// ---------------------------------------------------------------------------
export function findHubCluster(
  ids: string[],
  adj: Map<string, Set<string>>,
  revAdj: Map<string, Set<string>>,
  serviceLeaves: Set<string>
): Set<string> {
  const hubs = new Set<string>();

  for (const id of ids) {
    const outCount = adj.get(id)?.size ?? 0;
    const inCount = revAdj.get(id)?.size ?? 0;

    // dynamic heuristic:
    // hubs are nodes that have both high in-degree and high out-degree
    if (outCount >= 3 && inCount >= 2) {
      hubs.add(id);
    }
  }

  return hubs;
}

