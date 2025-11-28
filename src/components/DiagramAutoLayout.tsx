import React from "react";
import { buildColumns } from "./buildColumns";
import { buildGroups } from "./buildGroups";
import { computeLanesForGroup } from "./computeLanesForGroup";

import { diagramConfig2 as diagramConfig } from "../config/diagramConfig2";

const ROW_HEIGHT = 100;
const BOX_HEIGHT = 70;
const STACK_SPACING = 20;

const DiagramAutoLayout = () => {
  const { devices } = diagramConfig;

  // build columns RIGHT ==> LEFT
  const columnsRightToLeft = buildColumns(devices);
  // build groups
  const groups = buildGroups(devices);
  // visual columns LEFT ==> RIGHT
  const visualCols = [...columnsRightToLeft].reverse();

  return (
    <div style={styles.wrapper}>
      {groups.map((groupIds, gIdx) => {

        // compute final lanes for this group
        const laneMap = computeLanesForGroup(groupIds, devices, columnsRightToLeft);

        // determine overall height for the group container
        const maxLane = Math.max(...[...laneMap.values()]);
        const groupHeight = (maxLane + 2) * ROW_HEIGHT;

        return (<div key={gIdx} style={styles.groupBox}>
          <div style={styles.groupTitle}>Group {gIdx + 1}</div>
          <div style={styles.groupColumns}>
            {visualCols.map((column, cIdx) => {
              const colGroupIds = column.filter(id => groupIds.includes(id));
              // stacking tracking
              const stacks = {};

              return (<div key={cIdx}
                style={{...(colGroupIds.length ? styles.column : styles.emptyColumn), height: groupHeight, minHeight: groupHeight}}>
                {colGroupIds.map(id => {
                  const dev = devices.find(d => d.id === id);
                  const lane = laneMap.get(id) ?? 0;
                  // stack inside this column if needed
                  if (!stacks[lane]) stacks[lane] = [];
                  const stackIndex = stacks[lane].length;
                  stacks[lane].push(id);
                  const top = lane * ROW_HEIGHT + stackIndex * (BOX_HEIGHT + STACK_SPACING);

                  return (<div key={id} style={{...styles.box, top}}>
                      <strong>{dev.id}</strong>
                      <div style={styles.status}>Status: {dev.status}</div>
                    </div>);
                })}
              </div>);
            })}
          </div>
        </div>);
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "40px",
    padding: "30px"
  },

  groupBox: {
    padding: "20px",
    background: "#f6f8ff",
    borderRadius: "12px",
    boxShadow: "0 0 8px rgba(0,0,0,0.1)"
  },

  groupTitle: {
    fontWeight: "bold",
    fontSize: "14px",
    marginBottom: "12px",
    color: "#333"
  },

  groupColumns: {
    display: "flex",
    flexDirection: "row",
    gap: "40px"
  },

  emptyColumn: {
    flex: "0 0 220px",
    position: "relative",
    background: "rgba(0,0,0,0.03)",
    borderRight: "1px dashed #ccc"
  },

  column: {
    flex: "0 0 220px",
    position: "relative",
    background: "rgba(0,0,0,0.03)",
    borderRight: "1px dashed #ccc"
  },

  box: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: "10px 16px",
    border: "1px solid #000",
    background: "#fff",
    minWidth: "220px",
    boxSizing: "border-box",
    color: "black"
  },

  status: {
    fontSize: "12px",
    color: "#666"
  }
};

export default DiagramAutoLayout 
