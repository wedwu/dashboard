// AutoLayout.tsx
import React from "react";

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------
export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

interface Props {
  devices: DeviceNode[];
}

// -------------------------------------------------------------
// STATUS COLORS
// -------------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#7f8c8d"
};

// -------------------------------------------------------------
// DEVICE BOX
// -------------------------------------------------------------
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
    color: "#000"
  },
  dot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0
  },
  label: {
    color: "#000"
  }
};

// -------------------------------------------------------------
// GRAPH HELPERS
// -------------------------------------------------------------
type Maps = {
  children: Map<string, string[]>;
  parents: Map<string, string[]>;
  outDegree: Map<string, number>;
  inDegree: Map<string, number>;
};

const buildMaps = (devices: DeviceNode[]): Maps => {
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const d of devices) {
    children.set(d.id, []);
    parents.set(d.id, []);
    outDegree.set(d.id, 0);
    inDegree.set(d.id, 0);
  }

  for (const d of devices) {
    const outs = children.get(d.id)!;
    for (const target of d.links || []) {
      if (!children.has(target)) continue;
      outs.push(target);
      parents.get(target)!.push(d.id);
      outDegree.set(d.id, (outDegree.get(d.id) || 0) + 1);
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  }

  return { children, parents, outDegree, inDegree };
};

// classify leaves into "service leaves" (like influx) vs "client leaves"
const classifyLeaves = (
  ids: string[],
  children: Map<string, string[]>,
  parents: Map<string, string[]>,
  outDegree: Map<string, number>
) => {
  const nonLeaves = new Set(
    ids.filter((id) => (outDegree.get(id) || 0) > 0)
  );
  const leaves = ids.filter((id) => (outDegree.get(id) || 0) === 0);

  const serviceLeaves = new Set<string>();
  const clientLeaves = new Set<string>();

  for (const leaf of leaves) {
    const ps = parents.get(leaf) || [];
    let isService = false;
    for (const p of ps) {
      const kids = children.get(p) || [];
      // a service leaf has a parent that has another child which is not a leaf
      if (
        kids.some(
          (k) => k !== leaf && nonLeaves.has(k)
        )
      ) {
        isService = true;
        break;
      }
    }
    if (isService) {
      serviceLeaves.add(leaf);
    } else {
      clientLeaves.add(leaf);
    }
  }

  return { serviceLeaves, clientLeaves };
};

// distance (longest path length) to any client leaf, ignoring cycles
const computeDistToClient = (
  ids: string[],
  children: Map<string, string[]>,
  clientLeaves: Set<string>
): Map<string, number | null> => {
  const memo = new Map<string, number | null>();

  const dfs = (id: string, visiting: Set<string>): number | null => {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) {
      // cycle edge; ignore this path
      return null;
    }
    if (clientLeaves.has(id)) {
      memo.set(id, 0);
      return 0;
    }

    visiting.add(id);
    let best: number | null = null;

    for (const child of children.get(id) || []) {
      const d = dfs(child, visiting);
      if (d == null) continue;
      const cand = d + 1;
      if (best == null || cand > best) {
        best = cand;
      }
    }

    visiting.delete(id);
    memo.set(id, best);
    return best;
  };

  for (const id of ids) {
    dfs(id, new Set());
  }

  return memo;
};

// build dynamic "hub cluster":
//  - Start from parents of service leaves -> their children
//  - Expand to nodes that have both a parent and child in that seed set (covers kafka<->config-server)
const findHubCluster = (
  ids: string[],
  children: Map<string, string[]>,
  parents: Map<string, string[]>,
  serviceLeaves: Set<string>
): Set<string> => {
  const hubParents = new Set<string>();
  for (const leaf of serviceLeaves) {
    for (const p of parents.get(leaf) || []) {
      hubParents.add(p);
    }
  }

  const seed = new Set<string>();
  for (const p of hubParents) {
    for (const c of children.get(p) || []) {
      seed.add(c);
    }
  }

  const cluster = new Set<string>(seed);

  for (const id of ids) {
    if (cluster.has(id)) continue;
    const hasChildInCluster = (children.get(id) || []).some((c) =>
      cluster.has(c)
    );
    const hasParentInCluster = (parents.get(id) || []).some((p) =>
      cluster.has(p)
    );
    if (hasChildInCluster && hasParentInCluster) {
      cluster.add(id);
    }
  }

  return cluster;
};

// -------------------------------------------------------------
// COLUMN ASSIGNMENT
// -------------------------------------------------------------
const assignColumns = (devices: DeviceNode[]): Map<string, number> => {
  const ids = devices.map((d) => d.id);
  const { children, parents, outDegree, inDegree } = buildMaps(devices);

  // roots: no incoming
  const roots = ids.filter((id) => (inDegree.get(id) || 0) === 0);

  // classify leaves
  const { serviceLeaves, clientLeaves } = classifyLeaves(
    ids,
    children,
    parents,
    outDegree
  );

  // distance to client leaves
  const distToClient = computeDistToClient(ids, children, clientLeaves);

  // effective distance: if no path to client (null), inherit from parents
  const effectiveDist = new Map<string, number>();
  for (const id of ids) {
    const d = distToClient.get(id);
    if (d != null) {
      effectiveDist.set(id, d);
    } else {
      const ps = parents.get(id) || [];
      let best: number | null = null;
      for (const p of ps) {
        const dp = distToClient.get(p);
        if (dp == null) continue;
        if (best == null || dp > best) best = dp;
      }
      effectiveDist.set(id, best ?? 0);
    }
  }

  const maxDepth = Math.max(...Array.from(effectiveDist.values()));

  // base columns:  maxDepth - dist -> along deepest path from left to right
  const col = new Map<string, number>();
  for (const id of ids) {
    const d = effectiveDist.get(id) || 0;
    col.set(id, maxDepth - d);
  }

  // force all roots into leftmost column 0 (as "sources")
  for (const r of roots) {
    col.set(r, 0);
  }

  // dynamic hub cluster
  const hubCluster = findHubCluster(
    ids,
    children,
    parents,
    serviceLeaves
  );

  // relays: parents of client leaves
  const relays = new Set<string>();
  for (const leaf of clientLeaves) {
    for (const p of parents.get(leaf) || []) {
      relays.add(p);
    }
  }

  // last column index = maxDepth
  const leafCol = maxDepth;
  const relayCol = maxDepth - 1;
  const hubCol = maxDepth - 2;

  // place client leaves
  for (const leaf of clientLeaves) {
    col.set(leaf, leafCol);
  }

  // place relays (message-relay, cribl in your data)
  for (const r of relays) {
    col.set(r, relayCol);
  }

  // place hubs (kafka, influx, config-server in your data)
  for (const h of hubCluster) {
    col.set(h, hubCol);
  }

  return col;
};

const buildColumns = (devices: DeviceNode[]) => {
  const colMap = assignColumns(devices);
  const cols: Record<number, DeviceNode[]> = {};

  for (const d of devices) {
    const c = colMap.get(d.id) ?? 0;
    if (!cols[c]) cols[c] = [];
    cols[c].push(d);
  }

  return Object.keys(cols)
    .map((k) => ({ col: Number(k), items: cols[Number(k)] }))
    .sort((a, b) => a.col - b.col);
};

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
const AutoLayout: React.FC<Props> = ({ devices }) => {
  const columns = buildColumns(devices);

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

// -------------------------------------------------------------
// LAYOUT STYLES
// -------------------------------------------------------------
const layoutStyles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    gap: "60px",
    padding: "40px",
    background: "#111"
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "flex-start"
  },
  boxWrapper: {
    display: "flex"
  }
};
