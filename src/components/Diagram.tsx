// src/components/Diagram.tsx
import React, { useMemo } from "react";
import { diagramConfig6 } from "../config/diagramConfig6";
import { assignLayout } from "../layout/assignLayout";
import DeviceBox from "./DeviceBox";
import SvgConnections from "./SvgConnections";

const Diagram: React.FC = () => {
  const { devices, connections, width, height } = useMemo(
    () => assignLayout(diagramConfig6.devices),
    []
  );



import { computeLayers } from "../layout/graphLayers";
import { diagramConfig5 } from "../data/diagramConfig5";

const layerMap = computeLayers(diagramConfig5.devices);

console.log("=== COLUMN GROUPS ===");
const groups = new Map<number, string[]>();

layerMap.forEach((col, id) => {
  if (!groups.has(col)) groups.set(col, []);
  groups.get(col)!.push(id);
});

Array.from(groups.keys())
  .sort((a, b) => a - b)
  .forEach((col) => {
    console.log(`Column ${col}:`, groups.get(col));
  });




  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        margin: "24px auto",
        background: "#111",
        borderRadius: 12,
        border: "1px solid #333",
        overflow: "hidden",
      }}
    >
      {/* Optional column grid debug */}
      {/* You can add vertical column guides here if you want */}

      <SvgConnections
        devices={devices}
        connections={connections}
        width={width}
        height={height}
      />

      {devices.map((d) => (
        <DeviceBox key={d.id} device={d} />
      ))}
    </div>
  );
};

export default Diagram;
