import React from "react";

const statusColor = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#7f8c8d",
  missing: "#f39c12"
};

const DeviceBox = ({ device }) => {
  const color = statusColor[device.status ?? "unknown"] ?? "#7f8c8d";

  return (
    <div style={styles.box}>
      <div style={{ ...styles.dot, background: color }} />
      <div style={styles.id}>{device.id}</div>
    </div>
  );
};

export default DeviceBox;


const styles: Record<string, React.CSSProperties> = {
  box: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    background: "#fafafa",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
  },

  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },

  id: {
    fontSize: "14px",
    color: "#222",
  },
};
