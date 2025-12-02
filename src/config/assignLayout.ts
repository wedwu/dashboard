// -------------------------------------------------------------
// FULL ASSIGN-LAYOUT WITH HUB BACK-EDGE PRUNING
// -------------------------------------------------------------

import {
  computeSCCs,
  buildAdjacency,
  classifyLeaves,
  findHubCluster,
} from "./graphHelpers"; // ← adjust paths as needed

import type {
  DeviceNode,
  NodeDebugInfo,
  NodeType,
} from "./types"; // ← adjust paths as needed


// -------------------------------------------------------------
// Normalize duplicate device IDs (merge links, preserve status)
// -------------------------------------------------------------
function normalizeDevices(devs: DeviceNode[]): DeviceNode[] {
  const map = new Map<string, DeviceNode>();

  for (const d of devs) {
    if (!map.has(d.id)) {
      map.set(d.id, { ...d, links: [...(d.links || [])] });
    } else {
      const existing = map.get(d.id)!;
      existing.links = Array.from(
        new Set([...(existing.links || []), ...(d.links || [])])
      );
    }
  }
  return Array.from(map.values());
}



// -------------------------------------------------------------
// MAIN LAYOUT FUNCTION
// -------------------------------------------------------------
const assignLayout = (
  inputDevices: DeviceNode[]
): {
  columns: { col: number; items: DeviceNode[] }[];
  debugInfo: Map<string, NodeDebugInfo>;
  roots: Set<string>;
  hubs: Set<string>;
  leaves: Set<string>;
  sccCount: number;
} => {

  // ---------------------------------------------------------
  // 0. Normalize duplicates (timedoor) + shallow copy
  // ---------------------------------------------------------
  let devices: DeviceNode[] = normalizeDevices(inputDevices);

  const ids = devices.map((d) => d.id);
  let { adj, revAdj, outDegree, inDegree } = buildAdjacency(devices);


  // ---------------------------------------------------------
  // 0.B DYNAMIC HUB BACK-EDGE PRUNING FOR LAYOUT GRAPH
  // (Leader-lines still use full graph; pruning affects SCC/DAG only)
  // ---------------------------------------------------------
  const prunedAdj = new Map<string, Set<string>>();
  const prunedRev = new Map<string, Set<string>>();

  const outDeg = new Map<string, number>();
  for (const [id, outs] of adj.entries()) outDeg.set(id, outs.size);

  // Dynamic heuristic: hubs = out-degree ≥ 4
  const isHub = (id: string) => (outDeg.get(id) ?? 0) >= 4;

  // Initialize empty adjacency lists
  for (const id of ids) {
    prunedAdj.set(id, new Set());
    prunedRev.set(id, new Set());
  }

  // Copy edges except hub → non-hub
  for (const [id, outs] of adj.entries()) {
    for (const tgt of outs) {
      if (isHub(id) && !isHub(tgt)) {
        // prune this back-edge for SCC/DAG
        continue;
      }
      // keep edge
      prunedAdj.get(id)!.add(tgt);
      prunedRev.get(tgt)!.add(id);
    }
  }

  // Replace layout graph with pruned edges
  adj = prunedAdj;
  revAdj = prunedRev;


  // ---------------------------------------------------------
  // 1. Compute SCCs (Kosaraju)
  // ---------------------------------------------------------
  const { sccs, nodeToComp } = computeSCCs(ids, adj, revAdj);
  const compCount = sccs.length;


  // ---------------------------------------------------------
  // 1.B Component DAG
  // ---------------------------------------------------------
  const compAdj = new Map<number, Set<number>>();
  const compIndeg = new Map<number, number>();

  for (let i = 0; i < compCount; i++) {
    compAdj.set(i, new Set());
    compIndeg.set(i, 0);
  }

  for (const [u, outs] of adj.entries()) {
    const cu = nodeToComp.get(u)!;
    for (const v of outs) {
      const cv = nodeToComp.get(v)!;
      if (cu !== cv) {
        if (!compAdj.get(cu)!.has(cv)) {
          compAdj.get(cu)!.add(cv);
          compIndeg.set(cv, (compIndeg.get(cv) || 0) + 1);
        }
      }
    }
  }


  // ---------------------------------------------------------
  // 2. Longest-path depth in component DAG
  // ---------------------------------------------------------
  const depth = new Array(compCount).fill(0);
  const indeg = new Array(compCount).fill(0);

  for (let i = 0; i < compCount; i++) {
    indeg[i] = compIndeg.get(i) || 0;
  }

  const queue: number[] = [];
  for (let i = 0; i < compCount; i++) {
    if (indeg[i] === 0) queue.push(i);
  }

  while (queue.length) {
    const c = queue.shift()!;
    const base = depth[c];
    for (const nxt of compAdj.get(c) || []) {
      if (base + 1 > depth[nxt]) depth[nxt] = base + 1;
      indeg[nxt]--;
      if (indeg[nxt] === 0) queue.push(nxt);
    }
  }


  // ---------------------------------------------------------
  // 3. WCC balancing (weakly-connected components)
  // ---------------------------------------------------------
  const depthByComp = new Map<number, number>();
  let globalMax = 0;

  for (let i = 0; i < compCount; i++) {
    depthByComp.set(i, depth[i]);
    if (depth[i] > globalMax) globalMax = depth[i];
  }

  // Build undirected graph
  const und = new Map<number, Set<number>>();
  for (let i = 0; i < compCount; i++) und.set(i, new Set());

  for (let u = 0; u < compCount; u++) {
    for (const v of compAdj.get(u) || []) {
      und.get(u)!.add(v);
      und.get(v)!.add(u);
    }
  }

  // Find WCC groups
  const compSeen = new Set<number>();
  const compGroups: number[][] = [];

  for (let i = 0; i < compCount; i++) {
    if (compSeen.has(i)) continue;
    const stack = [i];
    compSeen.add(i);
    const group: number[] = [];

    while (stack.length) {
      const c = stack.pop()!;
      group.push(c);
      for (const nxt of und.get(c) || []) {
        if (!compSeen.has(nxt)) {
          compSeen.add(nxt);
          stack.push(nxt);
        }
      }
    }
    compGroups.push(group);
  }

  // Compute delta shift per WCC
  const compDelta = new Map<number, number>();
  for (const g of compGroups) {
    let maxD = 0;
    for (const c of g) maxD = Math.max(maxD, depthByComp.get(c)!);

    const delta = globalMax - maxD;
    for (const c of g) compDelta.set(c, delta);
  }


  // ---------------------------------------------------------
  // 4. Base + final column assignment
  // ---------------------------------------------------------
  const baseColMap = new Map<string, number>();
  const finalColMap = new Map<string, number>();

  for (const id of ids) {
    const comp = nodeToComp.get(id)!;
    const base = depthByComp.get(comp)!;
    const delta = compDelta.get(comp) || 0;

    baseColMap.set(id, base);
    finalColMap.set(id, base + delta);
  }


  // ---------------------------------------------------------
  // 5. Missing-node handling (if used elsewhere)
  // ---------------------------------------------------------
  for (const d of devices) {
    if (d.status !== "missing") continue;

    const parents = revAdj.get(d.id) || [];
    const children = adj.get(d.id) || [];

    const parentCols = parents.map(
      (p) => finalColMap.get(p) ?? baseColMap.get(p) ?? 0
    );
    const childCols = children.map(
      (c) => finalColMap.get(c) ?? baseColMap.get(c) ?? 0
    );

    if (parentCols.length && !childCols.length) {
      const col = Math.max(...parentCols) + 1;
      baseColMap.set(d.id, col);
      finalColMap.set(d.id, col);
      continue;
    }

    if (childCols.length && !parentCols.length) {
      const col = Math.min(...childCols) - 1;
      baseColMap.set(d.id, col);
      finalColMap.set(d.id, col);
      continue;
    }

    if (parentCols.length && childCols.length) {
      const p = Math.max(...parentCols);
      const c = Math.min(...childCols);
      const mid = Math.floor((p + c) / 2);
      baseColMap.set(d.id, mid);
      finalColMap.set(d.id, mid);
    }
  }


  // ---------------------------------------------------------
  // 5.5 Missing nodes MUST NOT become leaves
  // ---------------------------------------------------------
  for (const d of devices) {
    if (d.status === "missing") {
      if (adj.get(d.id)?.size === 0) {
        adj.get(d.id)!.add("__missing_sentinel__");
      }
    }
  }


  // ---------------------------------------------------------
  // 6. Identify roots, leaves, hubs
  // ---------------------------------------------------------
  const roots = new Set<string>();
  const leaves = new Set<string>();

  for (const id of ids) {
    if ((revAdj.get(id) || []).length === 0) roots.add(id);
    if ((adj.get(id) || []).length === 0) leaves.add(id);
  }

  const { serviceLeaves, clientLeaves } = classifyLeaves(
    ids,
    adj,
    revAdj,
    outDegree
  );

  const hubCluster = findHubCluster(ids, adj, revAdj, serviceLeaves);
  const hubs = new Set<string>(hubCluster);


  // ---------------------------------------------------------
  // 7. Build output columns + debug info
  // ---------------------------------------------------------
  const colsDict: Record<number, DeviceNode[]> = {};
  const debugInfo = new Map<string, NodeDebugInfo>();

  for (const d of devices) {
    const id = d.id;
    const base = baseColMap.get(id) ?? 0;
    const col = finalColMap.get(id) ?? base;
    const sccIndex = nodeToComp.get(id) ?? 0;

    let type: NodeType = "normal";
    if (roots.has(id)) type = "root";
    else if (hubs.has(id)) type = "hub";
    else if (leaves.has(id)) type = "leaf";

    debugInfo.set(id, {
      baseCol: base,
      finalCol: col,
      sccIndex,
      type,
    });

    if (!colsDict[col]) colsDict[col] = [];
    colsDict[col].push(d);
  }

  const columns = Object.keys(colsDict)
    .map((key) => ({
      col: Number(key),
      items: colsDict[Number(key)],
    }))
    .sort((a, b) => a.col - b.col);


  return {
    columns,
    debugInfo,
    roots,
    hubs,
    leaves,
    sccCount: sccs.length,
  };
};

export default assignLayout;
