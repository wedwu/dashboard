// AutoLayout.tsx
import React, {
  useMemo,
  useState,
  useLayoutEffect,
} from "react";

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------

export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

interface AutoLayoutProps {
  devices: DeviceNode[];
}

type NodeType = "root" | "hub" | "leaf" | "normal";

interface NodeDebugInfo {
  baseCol: number;   // before component shifting
  finalCol: number;  // after shifting + hub adjustment
  sccIndex: number;
  type: NodeType;
}

export interface FlowValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

interface RectBounds {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

type GraphMaps = {
  adj: Map<string, string[]>;
  revAdj: Map<string, string[]>;
  outDegree: Map<string, number>;
  inDegree: Map<string, number>;
};

// -------------------------------------------------------------
// COLORS & CONSTANTS
// -------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#7f8c8d",
  missing: "#e53935",
};

const TYPE_OUTLINE_COLORS: Record<NodeType, string> = {
  root: "#2196F3",
  hub: "#9C27B0",
  leaf: "#4CAF50",
  normal: "#9E9E9E",
};

const SCC_COLORS = [
  "#e57373", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8",
  "#4db6ac", "#9575cd", "#4fc3f7", "#aed581", "#ff8a65",
  "#f06292", "#7986cb", "#4db6ac", "#ce93d8", "#90caf9",
  "#a1887f", "#00acc1"
];

// -------------------------------------------------------------
// HELPER: ADD SYNTHETIC "MISSING" NODES
// -------------------------------------------------------------

function addMissingNodes(devices: DeviceNode[]): DeviceNode[] {
  const knownIds = new Set(devices.map((d) => d.id));
  const referenced = new Set<string>();

  for (const d of devices) {
    for (const link of d.links || []) {
      referenced.add(link);
    }
  }

  const missingIds = Array.from(referenced).filter(
    (id) => !knownIds.has(id)
  );

  const missingNodes: DeviceNode[] = missingIds.map((id) => ({
    id,
    status: "missing",
    links: [],
  }));

  return [...devices, ...missingNodes];
}

// -------------------------------------------------------------
// FLOW VALIDATOR
// -------------------------------------------------------------

export function validateFlowGraph(devices: DeviceNode[]): FlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ids = new Set(devices.map((d) => d.id));
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

  // 1. Roots & leaves
  const roots = [...ids].filter((id) => (rev.get(id)!.length === 0));
  const leaves = [...ids].filter((id) => (adj.get(id)!.length === 0));

  if (roots.length === 0) {
    errors.push("No roots detected. The graph has no starting point.");
  }
  if (leaves.length === 0) {
    errors.push("No leaves detected. The graph has no end point.");
  }

  // 2. SCCs (Kosaraju) to detect large cycles
  const visited = new Set<string>();
  const order: string[] = [];

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

  const largeSCCs = sccs.filter((c) => c.length > 3);
  if (largeSCCs.length > 0) {
    warnings.push(
      `Large strongly-connected cycles detected (${largeSCCs.length}). Layout may not be strictly left→right.`
    );
  }

  // 3. Bidirectional edges
  let bidirectionalCount = 0;
  for (const a of ids) {
    for (const b of adj.get(a) || []) {
      if (adj.get(b)?.includes(a)) {
        bidirectionalCount++;
      }
    }
  }
  if (bidirectionalCount >= 3) {
    warnings.push(
      `Graph contains many bidirectional edges (${bidirectionalCount}). This may indicate a mesh.`
    );
  }

  // 4. Hub count (incoming >= 2)
  let hubCount = 0;
  for (const id of ids) {
    if (rev.get(id)!.length >= 2) hubCount++;
  }
  if (hubCount > 6) {
    warnings.push(
      `Graph has ${hubCount} hub-like nodes (incoming ≥ 2). This might not be a simple flow.`
    );
  }

  // 5. Weakly-connected components
  const und = new Map<string, Set<string>>();
  for (const id of ids) und.set(id, new Set());
  for (const id of ids) {
    for (const t of adj.get(id) || []) {
      und.get(id)!.add(t);
      und.get(t)!.add(id);
    }
  }

  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
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

    if (size > 2 && size < devices.length * 0.7) {
      warnings.push(
        `Subcomponent of size ${size} detected. It may not align cleanly with the main flow.`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

// -------------------------------------------------------------
// GRAPH HELPERS (SCC + DAG + hub cluster)
// -------------------------------------------------------------

const buildAdjacency = (devices: DeviceNode[]): GraphMaps => {
  const ids = new Set(devices.map((d) => d.id));
  const adj = new Map<string, string[]>();
  const revAdj = new Map<string, string[]>();
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const d of devices) {
    adj.set(d.id, []);
    revAdj.set(d.id, []);
    outDegree.set(d.id, 0);
    inDegree.set(d.id, 0);
  }

  for (const d of devices) {
    const outs: string[] = [];
    for (const target of d.links || []) {
      if (!ids.has(target)) continue;
      outs.push(target);
      revAdj.get(target)!.push(d.id);
      outDegree.set(d.id, (outDegree.get(d.id) || 0) + 1);
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
    adj.set(d.id, outs);
  }

  return { adj, revAdj, outDegree, inDegree };
};

// Strongly Connected Components (Kosaraju)
const computeSCCs = (
  ids: string[],
  adj: Map<string, string[]>,
  revAdj: Map<string, string[]>
): { sccs: string[][]; nodeToComp: Map<string, number> } => {
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

  const nodeToComp = new Map<string, number>();
  sccs.forEach((comp, idx) => {
    comp.forEach((id) => nodeToComp.set(id, idx));
  });

  return { sccs, nodeToComp };
};

// classify leaves into service leaves vs client leaves
const classifyLeaves = (
  ids: string[],
  children: Map<string, string[]>,
  parents: Map<string, string[]>,
  outDegree: Map<string, number>
): { serviceLeaves: Set<string>; clientLeaves: Set<string> } => {
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
      if (kids.some((k) => k !== leaf && nonLeaves.has(k))) {
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

// dynamic hub cluster (Rule C)
const findHubCluster = (
  ids: string[],
  children: Map<string, string[]>,
  parents: Map<string, string[]>,
  serviceLeaves: Set<string>
): Set<string> => {
  // parents of service leaves
  const hubParents = new Set<string>();
  for (const leaf of serviceLeaves) {
    for (const p of parents.get(leaf) || []) {
      hubParents.add(p);
    }
  }

  // initial seed: children of those parents
  const seed = new Set<string>();
  for (const p of hubParents) {
    for (const c of children.get(p) || []) {
      seed.add(c);
    }
  }

  // expand: any node that has both a parent AND child in cluster
  const cluster = new Set<string>(seed);
  let changed = true;

  while (changed) {
    changed = false;
    for (const id of ids) {
      if (cluster.has(id)) continue;
      const hasChildIn = (children.get(id) || []).some((c) =>
        cluster.has(c)
      );
      const hasParentIn = (parents.get(id) || []).some((p) =>
        cluster.has(p)
      );
      if (hasChildIn && hasParentIn) {
        cluster.add(id);
        changed = true;
      }
    }
  }

  return cluster;
};

const assignLayout = (
  devices: DeviceNode[]
): {
  columns: { col: number; items: DeviceNode[] }[];
  debugInfo: Map<string, NodeDebugInfo>;
  roots: Set<string>;
  hubs: Set<string>;
  leaves: Set<string>;
  sccCount: number;
} => {
  const ids = devices.map((d) => d.id);
  const { adj, revAdj, outDegree, inDegree } = buildAdjacency(devices);

  // ---------------------------------------------------------
  // 1. Compute SCCs
  // ---------------------------------------------------------
  const { sccs, nodeToComp } = computeSCCs(ids, adj, revAdj);
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
      if (cu !== cv) {
        if (!compAdj.get(cu)!.has(cv)) {
          compAdj.get(cu)!.add(cv);
          compIndeg.set(cv, (compIndeg.get(cv) || 0) + 1);
        }
      }
    }
  }

  // ---------------------------------------------------------
  // 2. Longest-path depth per component (topological)
  // ---------------------------------------------------------
  const depth: number[] = new Array(compCount).fill(0);
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
  // 3. Balance weakly-connected component groups
  // ---------------------------------------------------------
  const depthByComp = new Map<number, number>();
  let globalMax = 0;
  for (let i = 0; i < compCount; i++) {
    depthByComp.set(i, depth[i]);
    if (depth[i] > globalMax) globalMax = depth[i];
  }

  // build UND graph between components
  const und = new Map<number, Set<number>>();
  for (let i = 0; i < compCount; i++) und.set(i, new Set());
  for (let u = 0; u < compCount; u++) {
    for (const v of compAdj.get(u) || []) {
      und.get(u)!.add(v);
      und.get(v)!.add(u);
    }
  }

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

  // compute per-group delta
  const compDelta = new Map<number, number>();
  for (const g of compGroups) {
    let maxDepth = 0;
    for (const c of g) {
      maxDepth = Math.max(maxDepth, depthByComp.get(c)!);
    }
    const delta = globalMax - maxDepth;
    for (const c of g) compDelta.set(c, delta);
  }

  // ---------------------------------------------------------
  // 4. Assign base and final columns FROM SCC DAG
  // ---------------------------------------------------------
  const baseColMap = new Map<string, number>();
  const finalColMap = new Map<string, number>();

  for (const id of ids) {
    const c = nodeToComp.get(id)!;
    const base = depthByComp.get(c)!;
    const delta = compDelta.get(c) || 0;
    baseColMap.set(id, base);
    finalColMap.set(id, base + delta);
  }

  // ---------------------------------------------------------
  // 5. FIX: Missing nodes inherit parent column + 1
  // ---------------------------------------------------------
  for (const d of devices) {
    if (d.status !== "missing") continue;

    const parents = revAdj.get(d.id) || [];
    if (parents.length === 0) continue;

    const parentCols = parents.map(
      (p) => finalColMap.get(p) ?? baseColMap.get(p) ?? 0
    );

    const inheritedCol = Math.max(...parentCols) + 1;

    baseColMap.set(d.id, inheritedCol);
    finalColMap.set(d.id, inheritedCol);
  }

  // ---------------------------------------------------------
  // 6. Identify roots, leaves, hubs (unchanged)
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
  // 7. Build columns + debug info
  // ---------------------------------------------------------
  const colsDict: Record<number, DeviceNode[]> = {};
  const debugInfo = new Map<string, NodeDebugInfo>();

  for (const d of devices) {
    const id = d.id;
    const baseCol = baseColMap.get(id) ?? 0;
    const finalCol = finalColMap.get(id) ?? baseCol;
    const scc = nodeToComp.get(id) ?? 0;

    let type: NodeType = "normal";
    if (roots.has(id)) type = "root";
    else if (hubs.has(id)) type = "hub";
    else if (leaves.has(id)) type = "leaf";

    debugInfo.set(id, {
      baseCol,
      finalCol,
      sccIndex: scc,
      type,
    });

    if (!colsDict[finalCol]) colsDict[finalCol] = [];
    colsDict[finalCol].push(d);
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

// -------------------------------------------------------------
// DEVICE BOX COMPONENT (uses debug info if debugMode = true)
// -------------------------------------------------------------

interface DeviceBoxProps {
  device: DeviceNode;
  debugMode: boolean;
  debugInfo?: NodeDebugInfo;
}

const DeviceBox: React.FC<DeviceBoxProps> = ({ device, debugMode, debugInfo }) => {
  const isMissing = device.status === "missing";

  const dotColor = isMissing
    ? STATUS_COLORS.missing
    : STATUS_COLORS[device.status] || STATUS_COLORS.unknown;

  const outlineColor =
    isMissing
      ? STATUS_COLORS.missing
      : (debugMode && debugInfo ? TYPE_OUTLINE_COLORS[debugInfo.type] : "#111");

  const label = isMissing ? `${device.id} (missing)` : device.id;

  return (
    <div
      id={`node-${device.id}`}
      style={{
        ...boxStyles.container,
        border: `2px solid ${outlineColor}`,
        position: "relative",
      }}
    >
      <div style={{ ...boxStyles.dot, backgroundColor: dotColor }} />
      <span style={boxStyles.label}>{label}</span>

      {debugMode && debugInfo && (
        <div
          style={{
            position: "absolute",
            bottom: -18,
            right: 0,
            fontSize: "10px",
            background: "rgba(0,0,0,0.75)",
            padding: "2px 4px",
            borderRadius: 4,
            color: "#fff",
          }}
        >
          col {debugInfo.finalCol} | scc {debugInfo.sccIndex}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

const AutoLayout: React.FC<AutoLayoutProps> = ({ devices }) => {
  const [debugMode, setDebugMode] = useState(false);

  // Add synthetic "missing" nodes before layout & validation
  const devicesWithMissing = useMemo(
    () => addMissingNodes(devices),
    [devices]
  );

  const {
    columns,
    debugInfo,
    roots,
    hubs,
    leaves,
    sccCount,
  } = useMemo(() => assignLayout(devicesWithMissing), [devicesWithMissing]);

  const validation = useMemo(
    () => validateFlowGraph(devicesWithMissing),
    [devicesWithMissing]
  );

  // ------- SCC overlays (synchronized via useLayoutEffect) -------
  const [sccBounds, setSccBounds] = useState<Map<number, RectBounds>>(new Map());

  useLayoutEffect(() => {
    if (!debugMode) {
      setSccBounds(new Map());
      return;
    }

    const measure = () => {
      const bounds = new Map<number, RectBounds>();

      for (const d of devicesWithMissing) {
        const info = debugInfo.get(d.id);
        if (!info) continue;

        const el = document.getElementById(`node-${d.id}`);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const scc = info.sccIndex;

        if (!bounds.has(scc)) {
          bounds.set(scc, {
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right,
          });
        } else {
          const b = bounds.get(scc)!;
          b.top = Math.min(b.top, rect.top);
          b.left = Math.min(b.left, rect.left);
          b.bottom = Math.max(b.bottom, rect.bottom);
          b.right = Math.max(b.right, rect.right);
        }
      }

      setSccBounds(bounds);
    };

    measure();

    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [debugMode, devicesWithMissing, debugInfo]);

  return (
    <>
      {/* Debug toggle button */}
      <button
        onClick={() => setDebugMode((prev) => !prev)}
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 9999,
          padding: "8px 14px",
          background: debugMode ? "#ff4081" : "#444",
          color: "#fff",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        Debug: {debugMode ? "ON" : "OFF"}
      </button>

      {/* Debug overlay panel */}
      {debugMode && (
        <div
          style={{
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: 9998,
            padding: "12px",
            background: "rgba(0,0,0,0.85)",
            borderRadius: 8,
            color: "#fff",
            maxWidth: 360,
            fontSize: 12,
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          <b>Graph Debug</b>
          <br />
          <div style={{ marginTop: 6 }}>
            <b>Roots:</b> {Array.from(roots).join(", ") || "(none)"}
            <br />
            <b>Hubs:</b> {Array.from(hubs).join(", ") || "(none)"}
            <br />
            <b>Leaves:</b> {Array.from(leaves).join(", ") || "(none)"}
            <br />
            <b>SCC Count:</b> {sccCount}
          </div>

          {(!validation.ok || validation.warnings.length > 0) && (
            <div style={{ marginTop: 10 }}>
              <b>Validation:</b>
              <br />
              {!validation.ok &&
                validation.errors.map((e, idx) => (
                  <div key={`err-${idx}`} style={{ color: "#ff8080" }}>
                    • {e}
                  </div>
                ))}
              {validation.warnings.map((w, idx) => (
                <div key={`warn-${idx}`} style={{ color: "#ffd27f" }}>
                  • {w}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <b>Columns:</b>
            {columns.map((c) => (
              <div key={c.col}>
                col {c.col}: {c.items.map((d) => d.id).join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCC overlay rectangles */}
      {debugMode &&
        [...sccBounds.entries()].map(([sccIndex, b]) => {
          const color = SCC_COLORS[sccIndex % SCC_COLORS.length];

          return (
            <div
              key={`scc-overlay-${sccIndex}`}
              style={{
                position: "fixed",
                top: b.top - 12,
                left: b.left - 12,
                width: b.right - b.left + 24,
                height: b.bottom - b.top + 24,
                border: `2px dashed ${color}`,
                borderRadius: "12px",
                pointerEvents: "none",
                zIndex: 9997,
                background: "rgba(0,0,0,0.0)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  left: 0,
                  padding: "2px 6px",
                  background: color,
                  color: "#000",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  pointerEvents: "none",
                }}
              >
                SCC #{sccIndex}
              </div>
            </div>
          );
        })}

      {/* Layout */}
      <div style={layoutStyles.container}>
        {columns.map(({ col, items }) => (
          <div key={col} style={layoutStyles.column}>
            {items.map((d) => (
              <div key={d.id} style={layoutStyles.boxWrapper}>
                <DeviceBox
                  device={d}
                  debugMode={debugMode}
                  debugInfo={debugInfo.get(d.id)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default AutoLayout;

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------

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
