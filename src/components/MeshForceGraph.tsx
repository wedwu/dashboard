import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

// ============================================================================
// TYPES
// ============================================================================
export interface DeviceNode {
  id: string;
  status?: string;
  links?: string[];
}

interface MeshForceGraphProps {
  devices: DeviceNode[];
  width?: number;
  height?: number;
}

interface LayoutNode {
  id: string;
  status?: string;
  x: number;
  y: number;
}

interface Edge {
  source: string;
  target: string;
}

// ============================================================================
// FORCE-DIRECTED INITIAL LAYOUT
// ============================================================================
function runForceLayout(
  nodes: LayoutNode[],
  edges: Edge[],
  width: number,
  height: number,
  iterations = 300
): LayoutNode[] {
  if (nodes.length === 0) return nodes;

  const area = width * height;
  const k = Math.sqrt(area / nodes.length); // ideal distance
  let t = width / 10;
  const cooling = t / iterations;

  // random start
  for (const n of nodes) {
    n.x = width * (0.3 + Math.random() * 0.4);
    n.y = height * (0.3 + Math.random() * 0.4);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const disp: Record<string, { dx: number; dy: number }> = {};
    for (const n of nodes) disp[n.id] = { dx: 0, dy: 0 };

    // REPULSION
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];

        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const force = (k * k) / dist;

        dx = (dx / dist) * force;
        dy = (dy / dist) * force;

        disp[n1.id].dx += dx;
        disp[n1.id].dy += dy;
        disp[n2.id].dx -= dx;
        disp[n2.id].dy -= dy;
      }
    }

    // ATTRACTION
    for (const e of edges) {
      const n1 = nodes.find((n) => n.id === e.source);
      const n2 = nodes.find((n) => n.id === e.target);
      if (!n1 || !n2) continue;

      let dx = n1.x - n2.x;
      let dy = n1.y - n2.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

      const force = (dist * dist) / k;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;

      disp[n1.id].dx -= dx;
      disp[n1.id].dy -= dy;
      disp[n2.id].dx += dx;
      disp[n2.id].dy += dy;
    }

    // UPDATE positions
    for (const n of nodes) {
      const d = disp[n.id];
      const dist = Math.sqrt(d.dx * d.dx + d.dy * d.dy) || 0.001;

      const limitedDX = (d.dx / dist) * Math.min(dist, t);
      const limitedDY = (d.dy / dist) * Math.min(dist, t);

      n.x += limitedDX;
      n.y += limitedDY;

      // clamp inside
      n.x = Math.min(width - 30, Math.max(30, n.x));
      n.y = Math.min(height - 30, Math.max(30, n.y));
    }

    t -= cooling;
  }

  return nodes;
}

// ============================================================================
// BUILD UNDIRECTED GRAPH FROM DEVICES
// ============================================================================
function buildGraphFromDevices(devices: DeviceNode[]): {
  nodes: LayoutNode[];
  edges: Edge[];
} {
  const map = new Map<string, LayoutNode>();

  for (const d of devices) {
    if (!map.has(d.id)) {
      map.set(d.id, { id: d.id, status: d.status, x: 0, y: 0 });
    }
  }

  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const d of devices) {
    const from = d.id;
    for (const to of d.links || []) {
      if (!map.has(to)) continue;

      const a = from < to ? from : to;
      const b = from < to ? to : from;
      const key = `${a}--${b}`;
      if (seen.has(key)) continue;

      seen.add(key);
      edges.push({ source: from, target: to });
    }
  }

  return { nodes: Array.from(map.values()), edges };
}

// ============================================================================
// ELBOW EDGE PATH (2 bends)
// ============================================================================
function makeElbowPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;

  let mx1, my1, mx2, my2;

  if (Math.abs(dx) > Math.abs(dy)) {
    // horizontal → vertical elbow
    mx1 = x1 + dx / 2;
    my1 = y1;

    mx2 = mx1;
    my2 = y2;
  } else {
    // vertical → horizontal elbow
    mx1 = x1;
    my1 = y1 + dy / 2;

    mx2 = x2;
    my2 = my1;
  }

  return `M ${x1},${y1} L ${mx1},${my1} L ${mx2},${my2} L ${x2},${y2}`;
}

// ============================================================================
// COLOR
// ============================================================================
function colorForStatus(status?: string): string {
  switch (status) {
    case "up": return "#2ecc71";
    case "down": return "#e74c3c";
    case "missing": return "#f1c40f";
    default: return "#95a5a6";
  }
}

// ============================================================================
// MAIN COMPONENT WITH DRAG-AND-DROP + BENT EDGES
// ============================================================================
const MeshForceGraph: React.FC<MeshForceGraphProps> = ({
  devices,
  width = 900,
  height = 700,
}) => {

  const { nodes: startNodes, edges } = useMemo(
    () => buildGraphFromDevices(devices),
    [devices]
  );

  const [nodes, setNodes] = useState<LayoutNode[]>(() =>
    runForceLayout(
      startNodes.map(n => ({ ...n })),
      edges,
      width,
      height
    )
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    setDragging(id);

    const rect = svgRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const n = nodes.find(n => n.id === id)!;

    dragOffset.current = {
      dx: n.x - mouseX,
      dy: n.y - mouseY,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;

      const rect = svgRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setNodes(prev =>
        prev.map(n =>
          n.id === dragging
            ? {
                ...n,
                x: Math.max(20, Math.min(width - 20, mouseX + dragOffset.current.dx)),
                y: Math.max(20, Math.min(height - 20, mouseY + dragOffset.current.dy)),
              }
            : n
        )
      );
    },
    [dragging, width, height]
  );

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ background: "#111", border: "1px solid #333" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >

      {/* BENT EDGES */}
      <g stroke="#666" strokeWidth={1.5} fill="none">
        {edges.map(e => {
          const n1 = nodes.find(n => n.id === e.source);
          const n2 = nodes.find(n => n.id === e.target);
          if (!n1 || !n2) return null;

          return (
            <path
              key={`${e.source}-${e.target}`}
              d={makeElbowPath(n1.x, n1.y, n2.x, n2.y)}
            />
          );
        })}
      </g>

      {/* NODES */}
      <g>
        {nodes.map(n => (
          <g
            key={n.id}
            transform={`translate(${n.x}, ${n.y})`}
            style={{ cursor: "grab" }}
            onMouseDown={(e) => handleMouseDown(n.id, e)}
          >
            <circle
              r={14}
              fill={colorForStatus(n.status)}
              stroke="#000"
              strokeWidth={1.5}
            />
            <text
              x={0}
              y={26}
              textAnchor="middle"
              fill="#fff"
              fontSize={10}
              fontFamily="system-ui, sans-serif"
            >
              {n.id}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

export default MeshForceGraph;
