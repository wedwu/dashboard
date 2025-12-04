// src/layout/buildColumnsFromLinks.ts
import type { RawDevice } from "../types";

// -------------------------------------------------------------
// Build adjacency
// -------------------------------------------------------------
function buildAdjacency(devices: RawDevice[]) {
  const adj = new Map<string, string[]>();
  devices.forEach((d) => adj.set(d.id, d.links ?? []));
  return adj;
}

// -------------------------------------------------------------
// Kosaraju SCC
// -------------------------------------------------------------
function computeSCCs(devices: RawDevice[]): string[][] {
  const adj = buildAdjacency(devices);
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs1(node: string) {
    if (visited.has(node)) return;
    visited.add(node);
    for (const nxt of adj.get(node) || []) dfs1(nxt);
    stack.push(node);
  }

  devices.forEach((d) => dfs1(d.id));

  // reverse graph
  const radj = new Map<string, string[]>();
  devices.forEach((d) => radj.set(d.id, []));
  devices.forEach((d) => {
    for (const nxt of d.links) {
      if (!radj.has(nxt)) radj.set(nxt, []);
      radj.get(nxt)!.push(d.id);
    }
  });

  visited.clear();
  const sccList: string[][] = [];

  function dfs2(node: string, comp: string[]) {
    if (visited.has(node)) return;
    visited.add(node);
    comp.push(node);
    for (const nxt of radj.get(node) || []) dfs2(nxt, comp);
  }

  while (stack.length) {
    const n = stack.pop()!;
    if (!visited.has(n)) {
      const comp: string[] = [];
      dfs2(n, comp);
      sccList.push(comp);
    }
  }

  return sccList;
}

// -------------------------------------------------------------
// Collapse SCCs into DAG
// -------------------------------------------------------------
function collapseSCCs(devices: RawDevice[]) {
  const sccs = computeSCCs(devices);
  const nodeToGroup = new Map<string, number>();

  sccs.forEach((group, i) => {
    group.forEach((n) => nodeToGroup.set(n, i));
  });

  const dag = new Map<number, Set<number>>();
  sccs.forEach((_, i) => dag.set(i, new Set()));

  devices.forEach((d) => {
    const from = nodeToGroup.get(d.id)!;
    for (const nxt of d.links) {
      const to = nodeToGroup.get(nxt)!;
      if (from !== to) dag.get(from)!.add(to);
    }
  });

  return { sccs, dag, nodeToGroup };
}

// -------------------------------------------------------------
// BFS / topo depth on DAG
// -------------------------------------------------------------
function computeDAGDepths(dag: Map<number, Set<number>>) {
  const indegree = new Map<number, number>();
  dag.forEach((_, node) => indegree.set(node, 0));
  dag.forEach((outs) => {
    outs.forEach((to) => {
      indegree.set(to, (indegree.get(to) || 0) + 1);
    });
  });

  const queue: number[] = [];
  const depth = new Map<number, number>();

  indegree.forEach((deg, node) => {
    if (deg === 0) {
      queue.push(node);
      depth.set(node, 0);
    }
  });

  while (queue.length) {
    const n = queue.shift()!;
    const d = depth.get(n)!;
    for (const nxt of dag.get(n) || []) {
      indegree.set(nxt, (indegree.get(nxt) || 0) - 1);
      if (indegree.get(nxt)! === 0) {
        depth.set(nxt, d + 1);
        queue.push(nxt);
      }
    }
  }

  return depth;
}

// -------------------------------------------------------------
// Public API – returns columns: { [columnIndex]: string[] }
// -------------------------------------------------------------
export function buildColumnsFromLinks(devices: RawDevice[]): Record<number, string[]> {
  const { sccs, dag, nodeToGroup } = collapseSCCs(devices);
  const groupDepths = computeDAGDepths(dag);

  const depths = new Map<string, number>();
  sccs.forEach((group, i) => {
    const d = groupDepths.get(i) ?? 0;
    group.forEach((node) => depths.set(node, d));
  });

  const columns: Record<number, string[]> = {};
  devices.forEach((d) => {
    const col = depths.get(d.id) ?? 0;
    if (!columns[col]) columns[col] = [];
    columns[col].push(d.id);
  });

  return columns;
}
