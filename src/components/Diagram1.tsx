import React, { useMemo } from "react";
import meshToColumns from "./meshToColumns";     // ← your stand-alone engine
import DeviceBox from "./DeviceBox";

interface DiagramProps {
  devices: {
    id: string;
    status?: string;
    links: string[];
  }[];
}

const Diagram: React.FC<DiagramProps> = ({ devices }) => {
  // run the mesh → column auto-layout
  const layout = useMemo(() => meshToColumns(devices), [devices]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.columnsWrapper}>
        {layout.columns.map((col) => (
          <div key={col.col} style={styles.column}>
            <div style={styles.columnHeader}>Column {col.col}</div>

            {col.items.map((dev) => (
              <DeviceBox key={dev.id} device={dev} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Diagram;


// ============================================================================
// Styles
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "row",
    padding: "20px",
    overflowX: "auto",
    background: "#f3f3f3",
    width: "100%",
    height: "100%",
    boxSizing: "border-box"
  },

  columnsWrapper: {
    display: "flex",
    flexDirection: "row",
    gap: "40px",
  },

  column: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#ffffff",
    padding: "12px",
    borderRadius: "8px",
    minWidth: "200px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  },

  columnHeader: {
    fontWeight: "bold",
    marginBottom: "10px",
    textAlign: "center",
    color: "#333",
  },
};
