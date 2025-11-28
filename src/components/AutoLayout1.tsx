// AutoLayout.tsx
import React from "react";

export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

interface Props {
  devices: DeviceNode[];
}

const STATUS_COLORS: Record<string, string> = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#7f8c8d",
};

const DeviceBox: React.FC<{ device: DeviceNode }> = ({ device }) => {
  const dotColor = STATUS_COLORS[device.status] || STATUS_COLORS.unknown;

  return (
    <div style={boxStyles.container}>
      <div style={{ ...boxStyles.dot, backgroundColor: dotColor }} />
      <span style={boxStyles.label}>{device.id}</span>
    </div>
  );
};

const boxStyles: Record<string, React.CSSProperties> = {
  container: {
    border: "2px solid #111",
    padding: "10px 16px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff",
    minWidth: "150px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
    color: "#000",
  },
  dot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  label: {
    color: "#000",
  },
};

type GraphMaps = {
  adj: Map<string, string[]>;
  revAdj: Map<string, string[]>;
};

const buildAdjacency = (devices: DeviceNode[]): GraphMaps => {
  const ids = new Set(devices.map((d) => d.id));
  const adj = new Map<string, string[]>();
  const revAdj = new Map<string, string[]>();

  for (const d of devices) {
    adj.set(d.id, []);
    revAdj.set(d.id, []);
  }

  for (const d of devices) {
    const out: string[] = [];
    for (const target of d.links || []) {
      if (!ids.has(target)) continue;
      out.push(target);
      revAdj.get(target)!.push(d.id);
    }
    adj.set(d.id, out);
  }

  return { adj, revAdj };
};

// Strongly Connected Components (Kosaraju)
// Kosaraju's algorithm is a linear-time method for finding strongly connected components (SCCs) in a directed graph
const computeSCCs = (ids: string[], adj: Map<string, string[]>, revAdj: Map<string, string[]>) => {
  const visited = new Set<string>();
  const order: string[] = [];

  const dfs1 = (node: string) => {
    visited.add(node);
    for (const nxt of adj.get(node) || []) {
      if (!visited.has(nxt)) dfs1(nxt);
    }
    order.push(node);
  };

  for (const id of ids) {
    if (!visited.has(id)) dfs1(id);
  }

  visited.clear();
  const sccs: string[][] = [];

  const dfs2 = (node: string, comp: string[]) => {
    visited.add(node);
    comp.push(node);
    for (const nxt of revAdj.get(node) || []) {
      if (!visited.has(nxt)) dfs2(nxt, comp);
    }
  };

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (!visited.has(id)) {
      const comp: string[] = [];
      dfs2(id, comp);
      sccs.push(comp);
    }
  }

  return sccs;
};

// -------------------------------------------------------------
// GRAPH VALIDATOR
// -------------------------------------------------------------
export interface FlowValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFlowGraph(devices: DeviceNode[]): FlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ids = new Set(devices.map(d => d.id));
  const adj = new Map<string, string[]>();
  const rev = new Map<string, string[]>();

  for (const d of devices) {
    adj.set(d.id, []);
    rev.set(d.id, []);
  }

  // Build adjacency + reverse
  for (const d of devices) {
    for (const t of d.links || []) {
      if (!ids.has(t)) continue;
      adj.get(d.id)!.push(t);
      rev.get(t)!.push(d.id);
    }
  }

  // ---- 1. Roots / Leaves ---------------------------------------------------
  const roots = [...ids].filter(id => (rev.get(id)!.length === 0));
  const leaves = [...ids].filter(id => (adj.get(id)!.length === 0));

  if (roots.length === 0) {
    errors.push("No roots detected. The graph has no starting point.");
  }
  if (leaves.length === 0) {
    errors.push("No leaves detected. The graph has no end point.");
  }

  // ---- 2. Excessive cycles via SCC size -----------------------------------
  const visited = new Set<string>();
  const order: string[] = [];

  // DFS1
  const dfs1 = (id: string) => {
    visited.add(id);
    for (const n of adj.get(id) || []) {
      if (!visited.has(n)) dfs1(n);
    }
    order.push(id);
  };
  for (const id of ids) {
    if (!visited.has(id)) dfs1(id);
  }

  // DFS2
  visited.clear();
  const sccs: string[][] = [];
  const dfs2 = (id: string, comp: string[]) => {
    visited.add(id);
    comp.push(id);
    for (const n of rev.get(id) || []) {
      if (!visited.has(n)) dfs2(n, comp);
    }
  };

  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (!visited.has(id)) {
      const comp: string[] = [];
      dfs2(id, comp);
      sccs.push(comp);
    }
  }

  const largeSCCs = sccs.filter(c => c.length > 3);
  if (largeSCCs.length > 0) {
    warnings.push(`Large cycles detected (${largeSCCs.length}). Layout may not be strictly directional.`);
  }

  // ---- 3. Detect bidirectional edges --------------------------------------
  let bidirectionalCount = 0;
  for (const a of ids) {
    for (const b of adj.get(a) || []) {
      if (adj.get(b)?.includes(a)) {
        bidirectionalCount++;
      }
    }
  }
  if (bidirectionalCount >= 3) {
    warnings.push(`Graph contains many bidirectional edges (${bidirectionalCount}). This may break left→right flow.`);
  }

  // ---- 4. Too many hubs (incoming >=2) ------------------------------------
  let hubCount = 0;
  for (const id of ids) {
    if (rev.get(id)!.length >= 2) hubCount++;
  }
  if (hubCount > 6) {
    warnings.push(`Graph has ${hubCount} hub-like nodes (incoming >=2). Could indicate a mesh, not a flow.`);
  }

  // ---- 5. Disconnected subgraphs ------------------------------------------
  // BFS through undirected version
  const und = new Map<string, Set<string>>();
  for (const id of ids) und.set(id, new Set());
  for (const id of ids) {
    for (const t of adj.get(id) || []) {
      und.get(id)!.add(t);
      und.get(t)!.add(id);
    }
  }

  const seen = new Set<string>();
  let componentCount = 0;

  for (const id of ids) {
    if (seen.has(id)) continue;
    componentCount++;

    const stack = [id];
    seen.add(id);
    let size = 0;

    while (stack.length) {
      const x = stack.pop()!;
      size++;
      for (const n of und.get(x) || []) {
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }

    if (size <= 2) {
      // okay (cribl -> dgn, message-relay -> client are small)
    } else if (size > devices.length * 0.7) {
      // big main component (okay)
    } else {
      warnings.push(`Subcomponent of size ${size} detected. May not align cleanly with main flow.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

const assignColumnsFromGraph = (devices: DeviceNode[]): Map<string, number> => {
  const ids = devices.map((d) => d.id);
  const { adj, revAdj } = buildAdjacency(devices);

  // SCCs
  const sccs = computeSCCs(ids, adj, revAdj);
  const nodeToComp = new Map<string, number>();
  sccs.forEach((comp, idx) => {
    comp.forEach((id) => nodeToComp.set(id, idx));
  });

  const compCount = sccs.length;

  // Component DAG
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
      if (cu === cv) continue;
      const set = compAdj.get(cu)!;
      if (!set.has(cv)) {
        set.add(cv);
        compIndeg.set(cv, (compIndeg.get(cv) || 0) + 1);
      }
    }
  }

  // Longest path depth per component (topological order)
  const depth: number[] = new Array(compCount).fill(0);
  const indegWork: number[] = new Array(compCount);

  for (let i = 0; i < compCount; i++) {
    indegWork[i] = compIndeg.get(i) || 0;
  }

  const queue: number[] = [];
  for (let i = 0; i < compCount; i++) {
    if (indegWork[i] === 0) queue.push(i);
  }

  while (queue.length) {
    const c = queue.shift()!;
    const baseDepth = depth[c];

    for (const nxt of compAdj.get(c) || []) {
      if (baseDepth + 1 > depth[nxt]) {
        depth[nxt] = baseDepth + 1;
      }
      indegWork[nxt] -= 1;
      if (indegWork[nxt] === 0) queue.push(nxt);
    }
  }

  // Weakly connected component grouping at component level
  const undAdj = new Map<number, Set<number>>();
  for (let i = 0; i < compCount; i++) undAdj.set(i, new Set());

  for (let u = 0; u < compCount; u++) {
    for (const v of compAdj.get(u) || []) {
      undAdj.get(u)!.add(v);
      undAdj.get(v)!.add(u);
    }
  }

  const compVisited = new Set<number>();
  const compGroups: number[][] = [];

  for (let i = 0; i < compCount; i++) {
    if (compVisited.has(i)) continue;
    const group: number[] = [];
    const stack: number[] = [i];
    compVisited.add(i);

    while (stack.length) {
      const c = stack.pop()!;
      group.push(c);
      for (const nxt of undAdj.get(c) || []) {
        if (!compVisited.has(nxt)) {
          compVisited.add(nxt);
          stack.push(nxt);
        }
      }
    }
    compGroups.push(group);
  }

  // Shift each connected component so its deepest node lines up with global max
  const depthByComp = new Map<number, number>();
  for (let i = 0; i < compCount; i++) {
    depthByComp.set(i, depth[i]);
  }

  let globalMax = 0;
  const groupMax: number[] = [];
  for (const group of compGroups) {
    let m = 0;
    for (const c of group) {
      const d = depthByComp.get(c)!;
      if (d > m) m = d;
    }
    groupMax.push(m);
    if (m > globalMax) globalMax = m;
  }

  const compDelta = new Map<number, number>();
  compGroups.forEach((group, idx) => {
    const m = groupMax[idx];
    const delta = globalMax - m;
    for (const c of group) {
      compDelta.set(c, delta);
    }
  });

  // Final column per node = depth(component) + delta(component)
  const colMap = new Map<string, number>();
  for (const id of ids) {
    const c = nodeToComp.get(id)!;
    const base = depthByComp.get(c)!;
    const delta = compDelta.get(c) || 0;
    colMap.set(id, base + delta);
  }

  return colMap;
};

const buildColumns = (devices: DeviceNode[]) => {
  const colMap = assignColumnsFromGraph(devices);
  const cols: Record<number, DeviceNode[]> = {};

  for (const d of devices) {
    const c = colMap.get(d.id) ?? 0;
    if (!cols[c]) cols[c] = [];
    cols[c].push(d);
  }

  return Object.keys(cols)
    .map((key) => ({ col: Number(key), items: cols[Number(key)] }))
    .sort((a, b) => a.col - b.col);
};

const AutoLayout: React.FC<Props> = ({ devices }) => {
  const columns = buildColumns(devices);

  const validation = validateFlowGraph(devices);

  if (!validation.ok) {
    console.error("FLOW GRAPH VALIDATION FAILED:", validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn("FLOW GRAPH VALIDATION WARNINGS:", validation.warnings);
  }

  return (
    <div style={layoutStyles.container}>
      {columns.map(({ col, items }) => (
        <div key={col} style={layoutStyles.column}>
          {items.map((d) => (
            <div key={d.id} style={layoutStyles.boxWrapper}>
              <DeviceBox device={d} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AutoLayout;

const layoutStyles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    gap: "60px",
    padding: "40px",
    background: "#111",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "flex-start",
  },
  boxWrapper: {
    display: "flex",
  },
};
