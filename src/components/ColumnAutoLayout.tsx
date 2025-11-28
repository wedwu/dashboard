// ColumnAutoLayout.tsx
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
  renderBox: (device: DeviceNode) => React.ReactNode; // your DeviceBox
}

// -------------------------------------------------------------
// GRAPH HELPERS
// -------------------------------------------------------------

const buildGraph = (devices: DeviceNode[]) => {
  const map = new Map<string, DeviceNode & { incoming: number }>();

  for (const d of devices) {
    map.set(d.id, { ...d, incoming: 0 });
  }

  for (const d of devices) {
    for (const link of d.links || []) {
      if (map.has(link)) map.get(link)!.incoming++;
    }
  }

  return map;
};

const assignColumns = (devices: DeviceNode[]) => {
  const graph = buildGraph(devices);

  // 1) ROOTS
  const roots = [...graph.values()].filter(d => d.incoming === 0);

  // 2) BFS LAYERING
  const queue: string[] = [];
  const columnMap = new Map<string, number>();

  roots.forEach(r => {
    columnMap.set(r.id, 0);
    queue.push(r.id);
  });

  while (queue.length) {
    const id = queue.shift()!;
    const node = graph.get(id)!;
    const parentCol = columnMap.get(id)!;

    for (const child of node.links || []) {
      if (!graph.has(child)) continue;

      const existing = columnMap.get(child);
      const nextCol = parentCol + 1;

      if (existing == null || nextCol > existing) {
        columnMap.set(child, nextCol);
      }

      queue.push(child);
    }
  }

  // 3) COLLAPSE: kafka / influx / config-server
  const cluster = ["kafka", "influx", "config-server"].filter(id =>
    columnMap.has(id)
  );

  if (cluster.length > 0) {
    const minCol = Math.min(...cluster.map(id => columnMap.get(id)!));
    cluster.forEach(id => columnMap.set(id, minCol));
  }

  return columnMap;
};

const buildColumnsForRender = (devices: DeviceNode[]) => {
  const columnMap = assignColumns(devices);

  const cols: Record<number, DeviceNode[]> = {};

  for (const device of devices) {
    const colIndex = columnMap.get(device.id) ?? 0;
    if (!cols[colIndex]) cols[colIndex] = [];
    cols[colIndex].push(device);
  }

  return Object.keys(cols)
    .map((k) => ({ col: Number(k), items: cols[Number(k)] }))
    .sort((a, b) => a.col - b.col);
};

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

const ColumnAutoLayout: React.FC<Props> = ({ devices, renderBox }) => {
  const columns = buildColumnsForRender(devices);

  return (
    <div style={styles.container}>
      {columns.map(({ col, items }) => (
        <div key={col} style={styles.column}>
          {items.map(device => (
            <div key={device.id} style={styles.boxWrapper}>
              {renderBox(device)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ColumnAutoLayout;

// -------------------------------------------------------------
// INLINE STYLES (can move to CSS / Tailwind)
// -------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "row",
    gap: "40px", // spacing between columns
    padding: "20px",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "20px", // vertical spacing between boxes
    alignItems: "center",
  },
  boxWrapper: {
    display: "flex",
  },
};
