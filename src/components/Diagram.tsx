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
