import React, { useRef, useLayoutEffect, useState } from "react";
import { buildColumns } from "./buildColumns";
import { buildGroups } from "./buildGroups";
import { computeLanesForGroup } from "./computeLanesForGroup";
import { diagramConfig2 as diagramConfig } from "../config/diagramConfig2";

const ROW_HEIGHT = 100;
const BOX_HEIGHT = 70;
const STACK_SPACING = 20;

const BOX_GAP = 8;
const LINE_COLOR = "#333";
const LINE_WIDTH = 2;

const DiagramAutoLayout = () => {
  const { devices } = diagramConfig;
  const columnsRightToLeft = buildColumns(devices);
  const groups = buildGroups(devices);
  const visualCols = [...columnsRightToLeft].reverse();

  const [lines, setLines] = useState([]);

  const boxRefs = useRef({});
  boxRefs.current = {};

  useLayoutEffect(() => {
    const newLines = [];

    const getBoxRect = (id) => {
      const el = boxRefs.current[id];
      if (!el) return null;
      return el.getBoundingClientRect();
    }

    devices.forEach((dev) => {
      const parentRect = getBoxRect(dev.id);
      if (!parentRect) return;

      dev.links?.forEach((childId) => {
        const childRect = getBoxRect(childId);
        if (!childRect) return;
        const p = parentRect;
        const c = childRect;
        const pX = p.right + BOX_GAP;
        const pY = p.top + p.height / 2;
        const cX = c.left - BOX_GAP;
        const cY = c.top + c.height / 2;
        const midX = (pX + cX) / 2;
        newLines.push({
          id: `${dev.id}-${childId}`,
          segments: [[pX, pY, midX, pY], [midX, pY, midX, cY], [midX, cY, cX, cY]],
        });
      });
    });

    setLines(newLines);
  }, [devices]);

  return (
    <div style={styles.wrapper}>
      {/* CONNECTOR SVG ABOVE EVERYTHING */}
      <svg style={styles.connectorSvg}>
        {lines.map((line) =>
          line.segments.map((s, i) => (
            <line
              key={line.id + "-" + i}
              x1={s[0]}
              y1={s[1]}
              x2={s[2]}
              y2={s[3]}
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
              strokeLinecap="round"
            />
          ))
        )}
      </svg>

      {groups.map((groupIds, gIdx) => {
        const laneMap = computeLanesForGroup(
          groupIds,
          devices,
          columnsRightToLeft
        );

        const maxLane = Math.max(...laneMap.values());
        const groupHeight = (maxLane + 2) * ROW_HEIGHT;

        return (
          <div key={gIdx} style={styles.groupBox}>
            <div style={styles.groupTitle}>Group {gIdx + 1}</div>

            <div style={styles.groupColumns}>
              {visualCols.map((column, cIdx) => {
                const colGroupIds = column.filter((id) =>
                  groupIds.includes(id)
                );

                const stacks = {};

                return (
                  <div
                    key={cIdx}
                    style={{
                      ...(colGroupIds.length
                        ? styles.column
                        : styles.emptyColumn),
                      height: groupHeight,
                    }}
                  >
                    {colGroupIds.map((id) => {
                      const dev = devices.find((d) => d.id === id);
                      const lane = laneMap.get(id);
                      if (!stacks[lane]) stacks[lane] = [];

                      const stackIndex = stacks[lane].length;
                      stacks[lane].push(id);

                      const top =
                        lane * ROW_HEIGHT +
                        stackIndex * (BOX_HEIGHT + STACK_SPACING);

                      return (
                        <div
                          key={id}
                          ref={(el) => (boxRefs.current[id] = el)}
                          style={{
                            ...styles.box,
                            top,
                          }}
                        >
                          <strong>{dev.id}</strong>
                          <div style={styles.status}>Status: {dev.status}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    padding: "30px",
  },

  connectorSvg: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    pointerEvents: "none", // clicks go through
    zIndex: 5,
  },

  groupBox: {
    position: "relative",
    padding: "20px",
    background: "#f6f8ff",
    borderRadius: "12px",
    marginBottom: "40px",
    zIndex: 2, // above background, below lines
  },

  groupTitle: {
    fontWeight: "bold",
    marginBottom: "12px",
  },

  groupColumns: {
    display: "flex",
    flexDirection: "row",
    gap: "40px",
  },

  emptyColumn: {
    flex: "0 0 220px",
    position: "relative",
    background: "rgba(0,0,0,0.03)",
    borderRight: "1px dashed #ccc",
  },

  column: {
    flex: "0 0 220px",
    position: "relative",
    background: "rgba(0,0,0,0.03)",
    borderRight: "1px dashed #ccc",
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
    zIndex: 3,
    color: 'black',
  },

  status: {
    fontSize: "12px",
    color: "#666",
  },
};



export default DiagramAutoLayout 
