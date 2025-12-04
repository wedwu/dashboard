// src/components/DeviceBox.tsx
import React from "react";
import type { PositionedDevice } from "../types/types";
import { BOX_WIDTH, BOX_HEIGHT } from "../layout/assignLayout";

const STATUS_COLORS: Record<string, string> = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#7f8c8d",
};

interface DeviceBoxProps {
  device: PositionedDevice;
}

const boxStyleBase: React.CSSProperties = {
  position: "absolute",
  boxSizing: "border-box",
  borderRadius: 8,
  border: "1px solid #555",
  background: "#222",
  color: "#f1f1f1",
  display: "flex",
  alignItems: "center",
  padding: "4px 8px",
  gap: 8,
  fontFamily: "system-ui, sans-serif",
  fontSize: 12,
  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
};

const dotStyleBase: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
};

const DeviceBox: React.FC<DeviceBoxProps> = ({ device }) => {
  const color = STATUS_COLORS[device.status] || STATUS_COLORS.unknown;

  const style: React.CSSProperties = {
    ...boxStyleBase,
    left: device.x,
    top: device.y,
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  };

  return (
    <div id={`node-${device.id}`} style={style}>
      <span style={{ ...dotStyleBase, background: color }} />
      <span>{device.id}</span>
    </div>
  );
};

export default DeviceBox;
