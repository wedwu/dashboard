// DeviceBox.tsx
import React from "react";

export interface DeviceNode {
  id: string;
  status?: string;
  [key: string]: any;
}

interface Props {
  device: DeviceNode;
  x: number;
  y: number;
}

const DeviceBox: React.FC<Props> = ({ device, x, y }) => {
  return (
    <div
      id={`node-${device.id}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 150,
        height: 60,
        background: device.status === "missing" ? "#ffcccc" : "#ffffff",
        border: "2px solid #333",
        borderRadius: 6,
        color: "#000",
        padding: 8,
        fontSize: 14,
        fontFamily: "sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
      }}
    >
      {device.id}
    </div>
  );
};

export default DeviceBox;
