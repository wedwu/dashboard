// ============================================================================
//  MESH → COLUMN ENGINE  (STAND-ALONE VERSION)
//  - No external imports
//  - Includes SCC (Kosaraju)
//  - Includes hub back-edge pruning
//  - Includes WCC balancing
//  - Includes missing-node midpoint
// ============================================================================


// ============================================================================
// TYPES
// ============================================================================
export interface DeviceNode {
  id: string;
  status?: string;
  links: string[];
}

export interface NodeDebugInfo {
  baseCol: number;
  finalCol: number;
  sccIndex: number;
  type: "root" | "hub" | "leaf" | "normal";
}


// ============================================================================
// 1. NORMALIZE DUPLICATE IDS
// ============================================================================
function normalize(devices: DeviceNode[]): DeviceNode[] {
  const map = new Map<string, DeviceNode>();

  for (const d of devices) {
    if (!map.has(d.id)) {
      map.set(d.id, { ...d, links: [...(d.links || [])] });
    } else {
      const ex = map.get(d.id)!;
      ex.links = Array.from(new Set([...(ex.links || []), ...(d.links || [])]));
    }
  }
  return [...map.values()];
}



// ============================================================================
// 2. BUILD ADJACENCY
// ============================================================================
function buildAdj(devs: DeviceNode[]) {
  const ids = devs.map(d => d.id);

  const adj = new Map<string, Set<string>>();
  const rev = new Map<string, Set<string>>();
  const outDeg = new Map<string, number>();
  const inDeg = new Map<string, number>();

  // prep maps
  for (const id of ids) {
    adj.set(id, new Set());
    rev.set(id, new Set());
    outDeg.set(id, 0);
    inDeg.set(id, 0);
  }

  // fill edges
  for (const d of devs) {
    const from = d.id;
    for (const t of d.links || []) {
      if (from === t) continue;
      if (!adj.has(from)) adj.set(from, new Set());
      adj.get(from)!.add(t);

      if (!rev.has(t)) rev.set(t, new Set());
      rev.get(t)!.add(from);
    }
  }

  // degrees
  for (const [id, outs] of adj.entries()) outDeg.set(id, outs.size);
  for (const [id, ins] of rev.entries()) inDeg.set(id, ins.size);

  return { adj, rev, outDeg, inDeg };
}



// ============================================================================
// 3. KOSARAJU SCC
// ============================================================================
function kosaraju(ids: string[], adj: Map<string, Set<string>>, rev: Map<string, Set<string>>) {
  let visited = new Set<string>();
  const order: string[] = [];

  const dfs1 = (u: string) => {
    visited.add(u);
    for (const v of adj.get(u) || []) if (!visited.has(v)) dfs1(v);
    order.push(u);
  };

  for (const id of ids) if (!visited.has(id)) dfs1(id);

  visited = new Set<string>();
  const comp = new Map<string, number>();
  const sccs: string[][] = [];

  const dfs2 = (u: string, c: number) => {
    visited.add(u);
    comp.set(u, c);
    sccs[c].push(u);
    for (const v of rev.get(u) || []) if (!visited.has(v)) dfs2(v, c);
  };

  let c = 0;
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (!visited.has(id)) {
      sccs.push([]);
      dfs2(id, c++);
    }
  }

  return { sccs, nodeToComp: comp };
}



// ============================================================================
// 4. CLASSIFY LEAVES
// ============================================================================
function classifyLeaves(
  ids: string[],
  adj: Map<string, Set<string>>,
  rev: Map<string, Set<string>>
) {
  const leaves = new Set<string>();
  for (const id of ids) {
    if ((adj.get(id) || []).size === 0) leaves.add(id);
  }
  return leaves;
}



// ============================================================================
// 5. DETECT HUBS (dynamic rule)
// ============================================================================
function detectHubs(ids: string[], outDeg: Map<string, number>) {
  const hubs = new Set<string>();
  for (const id of ids) {
    if ((outDeg.get(id) ?? 0) >= 4) hubs.add(id);
  }
  return hubs;
}



// ============================================================================
// 6. MAIN ENGINE
// ============================================================================
export default function meshToColumns(
  inputDevices: DeviceNode[]
): {
  columns: { col: number; items: DeviceNode[] }[];
  debugInfo: Map<string, NodeDebugInfo>;
  roots: Set<string>;
  hubs: Set<string>;
  leaves: Set<string>;
  sccCount: number;
} {
  // -----------------------------------------------------------
  // Normalize duplicates
  // -----------------------------------------------------------
  let devices = normalize(inputDevices);
  const ids = devices.map((d) => d.id);

  // Build full adjacency
  let { adj, rev, outDeg, inDeg } = buildAdj(devices);

  // -----------------------------------------------------------
  // HUB BACK-EDGE PRUNING  (construct FlowGraph)
  // -----------------------------------------------------------
  const hubs = detectHubs(ids, outDeg);
  const flowAdj = new Map<string, Set<string>>();
  const flowRev = new Map<string, Set<string>>();

  for (const id of ids) {
    flowAdj.set(id, new Set());
    flowRev.set(id, new Set());
  }

  for (const [from, outs] of adj.entries()) {
    for (const to of outs) {
      // prune hub → non-hub edges (core of Mesh → Column converter)
      if (hubs.has(from) && !hubs.has(to)) continue;

      flowAdj.get(from)!.add(to);
      flowRev.get(to)!.add(from);
    }
  }

  // -----------------------------------------------------------
  // SCC on pruned graph (FlowGraph)
  // -----------------------------------------------------------
  const { sccs, nodeToComp } = kosaraju(ids, flowAdj, flowRev);
  const compCount = sccs.length;

  // -----------------------------------------------------------
  // Component DAG
  // -----------------------------------------------------------
  const compAdj = new Map<number, Set<number>>();
  const compIndeg = new Array(compCount).fill(0);

  for (let i = 0; i < compCount; i++) compAdj.set(i, new Set());

  for (const [u, outs] of flowAdj.entries()) {
    const cu = nodeToComp.get(u)!;
    for (const v of outs) {
      const cv = nodeToComp.get(v)!;
      if (cu !== cv) {
        if (!compAdj.get(cu)!.has(cv)) {
          compAdj.get(cu)!.add(cv);
          compIndeg[cv]++;
        }
      }
    }
  }

  // -----------------------------------------------------------
  // Longest-path depth
  // -----------------------------------------------------------
  const depth = new Array(compCount).fill(0);
  const indeg = [...compIndeg];
  const q: number[] = [];

  for (let i = 0; i < compCount; i++) if (indeg[i] === 0) q.push(i);

  while (q.length) {
    const c = q.shift()!;
    for (const nxt of compAdj.get(c) || []) {
      if (depth[c] + 1 > depth[nxt]) depth[nxt] = depth[c] + 1;
      indeg[nxt]--;
      if (indeg[nxt] === 0) q.push(nxt);
    }
  }

  // -----------------------------------------------------------
  // WCC balancing
  // -----------------------------------------------------------
  let globalMax = Math.max(...depth);
  const und = new Map<number, Set<number>>();
  for (let i = 0; i < compCount; i++) und.set(i, new Set());

  for (let u = 0; u < compCount; u++) {
    for (const v of compAdj.get(u) || []) {
      und.get(u)!.add(v);
      und.get(v)!.add(u);
    }
  }

  const seen = new Set<number>();
  const groups: number[][] = [];

  for (let i = 0; i < compCount; i++) {
    if (seen.has(i)) continue;
    const st = [i];
    seen.add(i);
    const g: number[] = [];

    while (st.length) {
      const x = st.pop()!;
      g.push(x);
      for (const y of und.get(x) || []) {
        if (!seen.has(y)) {
          seen.add(y);
          st.push(y);
        }
      }
    }
    groups.push(g);
  }

  const delta = new Map<number, number>();
  for (const g of groups) {
    let maxD = 0;
    for (const c of g) maxD = Math.max(maxD, depth[c]);
    const shift = globalMax - maxD;
    for (const c of g) delta.set(c, shift);
  }

  // -----------------------------------------------------------
  // Compute final columns
  // -----------------------------------------------------------
  const baseCol = new Map<string, number>();
  const finalCol = new Map<string, number>();

  for (const id of ids) {
    const c = nodeToComp.get(id)!;
    const b = depth[c];
    baseCol.set(id, b);
    finalCol.set(id, b + (delta.get(c) || 0));
  }

  // -----------------------------------------------------------
  // Missing-node midpoint rule
  // -----------------------------------------------------------
  for (const d of devices) {
    if (d.status === "missing") {
      const parents = [...(flowRev.get(d.id) || [])];
      const children = [...(flowAdj.get(d.id) || [])];

      const pCols = parents.map((p) => finalCol.get(p) ?? 0);
      const cCols = children.map((c) => finalCol.get(c) ?? 0);

      if (pCols.length && !cCols.length) {
        const col = Math.max(...pCols) + 1;
        finalCol.set(d.id, col);
        continue;
      }

      if (cCols.length && !pCols.length) {
        const col = Math.min(...cCols) - 1;
        finalCol.set(d.id, col);
        continue;
      }

      if (pCols.length && cCols.length) {
        const col = Math.floor(
          (Math.max(...pCols) + Math.min(...cCols)) / 2
        );
        finalCol.set(d.id, col);
      }
    }
  }

  // -----------------------------------------------------------
  // Roots, leaves
  // -----------------------------------------------------------
  const leaves = classifyLeaves(ids, flowAdj, flowRev);

  const roots = new Set<string>();
  for (const id of ids) if ((flowRev.get(id) || []).size === 0) roots.add(id);

  // -----------------------------------------------------------
  // Build columns
  // -----------------------------------------------------------
  const colDict: Record<number, DeviceNode[]> = {};

  const debugInfo = new Map<string, NodeDebugInfo>();

  for (const d of devices) {
    const id = d.id;
    const col = finalCol.get(id) ?? 0;
    const b = baseCol.get(id) ?? col;
    const sccIndex = nodeToComp.get(id) ?? 0;

    const type: NodeDebugInfo["type"] =
      roots.has(id) ? "root" :
      hubs.has(id) ? "hub" :
      leaves.has(id) ? "leaf" : "normal";

    debugInfo.set(id, { baseCol: b, finalCol: col, sccIndex, type });

    if (!colDict[col]) colDict[col] = [];
    colDict[col].push(d);
  }

  const columns = Object.entries(colDict)
    .map(([k, v]) => ({ col: Number(k), items: v }))
    .sort((a, b) => a.col - b.col);

  return {
    columns,
    debugInfo,
    roots,
    hubs,
    leaves,
    sccCount: sccs.length,
  };
}

