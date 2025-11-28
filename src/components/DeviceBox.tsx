// DeviceBox.tsx
import React from "react";
import type { DeviceNode } from "./ColumnAutoLayout";

// -------------------------------------------------------------
// STATUS COLORS
// -------------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#7f8c8d",
};

// -------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------

interface Props {
  device: DeviceNode;
}

const DeviceBox: React.FC<Props> = ({ device }) => {
  const dotColor = STATUS_COLORS[device.status] || STATUS_COLORS["unknown"];

  return (
    <div style={styles.container}>
      <div style={{ ...styles.dot, backgroundColor: dotColor }} />
      <span>{device.id}</span>
    </div>
  );
};

export default DeviceBox;

// -------------------------------------------------------------
// STYLES (can move to CSS or Tailwind)
// -------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  container: {
    border: "2px solid black",
    padding: "12px 18px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "#fff",
    minWidth: "130px",
    boxSizing: "border-box",
    fontFamily: "sans-serif",
    fontSize: "14px",
    fontWeight: 500,
  },
  dot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#aaa",
    flexShrink: 0,
  },
};
