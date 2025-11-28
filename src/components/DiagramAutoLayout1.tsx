import React, { useRef, useLayoutEffect, useState } from "react";

import buildColumns  from "./buildColumns";
import { buildGroups } from "./buildGroups";
// import { computeLanesForGroup } from "./computeLanesForGroup";

import { diagramConfig2 as diagramConfig } from "../config/diagramConfig2";

const ROW_HEIGHT = 100;
const BOX_HEIGHT = 70;
const STACK_SPACING = 20;

const BOX_GAP = 8; // connectors gap
const LINE_COLOR = "#333";
const LINE_WIDTH = 2;

// ========================================================================
// Lane logic: RIGHT → LEFT column propagation
//
// 1 child  → align exactly
// 2+ kids  → center
// 0 kids   → nearest open lane
//
// No global averaging. No recursion loops.
// ========================================================================
function computeLanesForGroup(groupIds, devices, columnsRightToLeft) {
  const groupSet = new Set(groupIds);
  const deviceMap = new Map();
  devices.forEach(d => deviceMap.set(d.id, d));

  const laneMap = new Map();

  // ---- RIGHTMOST COLUMN ----
  const rightmost = columnsRightToLeft[0] || [];
  const rightGroup = rightmost.filter(id => groupSet.has(id));
  rightGroup.sort();
  let nextLane = 0;
  rightGroup.forEach(id => laneMap.set(id, nextLane++));

  // ---- MOVE LEFT ----
  for (let c = 1; c < columnsRightToLeft.length; c++) {
    const col = columnsRightToLeft[c];
    const colGroup = col.filter(id => groupSet.has(id));
    if (!colGroup.length) continue;

    const used = new Set();
    colGroup.sort();

    for (const id of colGroup) {
      if (laneMap.has(id)) continue;

      const dev = deviceMap.get(id);
      const childIds = (dev.links || []).filter(ch => groupSet.has(ch));
      const childLanes = childIds
        .map(ch => laneMap.get(ch))
        .filter(v => v !== undefined);

      let desiredLane;

      if (childLanes.length === 1) {
        // single-child alignment
        desiredLane = childLanes[0];

      } else if (childLanes.length >= 2) {
        // multi-child center
        const minLane = Math.min(...childLanes);
        const maxLane = Math.max(...childLanes);
        desiredLane = Math.round((minLane + maxLane) / 2);

      } else {
        // no children: assign sequentially (but skip used)
        desiredLane = 0;
        while (used.has(desiredLane)) desiredLane++;
      }

      // collision resolution
      let lane = desiredLane;
      if (used.has(lane)) {
        let offset = 1;
        while (true) {
          const down = lane - offset;
          const up = lane + offset;

          if (down >= 0 && !used.has(down)) {
            lane = down;
            break;
          }
          if (!used.has(up)) {
            lane = up;
            break;
          }
          offset++;
        }
      }

      used.add(lane);
      laneMap.set(id, lane);
    }
  }

  return laneMap;
}



// ==========================================================================
// MAIN COMPONENT
// ==========================================================================
export default function DiagramAutoLayout() {
  const { devices } = diagramConfig;

  const columnsRightToLeft = buildColumns(devices); // fixed version
  const groups = buildGroups(devices);

  const visualCols = [...columnsRightToLeft].reverse();

  const [lines, setLines] = useState([]);

  const boxRefs = useRef({});
  boxRefs.current = {};

  // ======================================================================
  // CONNECTORS (straight L-shapes)
  // ======================================================================
  useLayoutEffect(() => {
    const newLines = [];

    function rect(id) {
      const el = boxRefs.current[id];
      return el ? el.getBoundingClientRect() : null;
    }

    devices.forEach(dev => {
      const pRect = rect(dev.id);
      if (!pRect) return;

      dev.links?.forEach(childId => {
        const cRect = rect(childId);
        if (!cRect) return;

        const pX = pRect.right + BOX_GAP;
        const pY = pRect.top + pRect.height / 2;

        const cX = cRect.left - BOX_GAP;
        const cY = cRect.top + cRect.height / 2;

        // Clean L shape: horizontal → vertical → horizontal
        const midX = (pX + cX) / 2;

        newLines.push({
          id: `${dev.id}→${childId}`,
          segments: [
            [pX, pY, midX, pY], // horizontal out
            [midX, pY, midX, cY], // vertical
            [midX, cY, cX, cY] // horizontal in
          ]
        });
      });
    });

    setLines(newLines);
  }, [devices]);



  return (
    <div style={styles.wrapper}>
      {/* ======================== CONNECTORS ======================== */}
      <svg style={styles.connectorSvg}>
        {lines.map(line =>
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

      {/* ======================== GROUPS ======================== */}
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

              {/* Filter OUT empty columns BEFORE rendering */}
              {visualCols
                .map((column, cIdx) => {
                  const colGroupIds = column.filter(id =>
                    groupIds.includes(id)
                  );
                  return { colGroupIds, cIdx };
                })
                .filter(c => c.colGroupIds.length > 0) // <── remove empty columns
                .map(({ colGroupIds, cIdx }) => {
                  const stacks = {};

                  return (
                    <div
                      key={cIdx}
                      style={{
                        ...styles.column,
                        height: groupHeight
                      }}
                    >
                      {colGroupIds.map(id => {
                        const dev = devices.find(d => d.id === id);
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
                            ref={el => (boxRefs.current[id] = el)}
                            style={{
                              ...styles.box,
                              top
                            }}
                          >
                            <strong>{dev.id}</strong>
                            <div style={styles.status}>
                              Status: {dev.status}
                            </div>
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




// ==========================================================================
// STYLES
// ==========================================================================
const styles = {
  wrapper: {
    position: "relative",
    padding: "30px"
  },

  connectorSvg: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: 1
  },

  groupBox: {
    position: "relative",
    padding: "20px",
    background: "#f6f8ff",
    borderRadius: "12px",
    marginBottom: "40px",
    zIndex: 2
  },

  groupTitle: {
    fontWeight: "bold",
    marginBottom: "12px",
    color: "#333"
  },

  groupColumns: {
    display: "flex",
    flexDirection: "row",
    gap: "40px"
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
    zIndex: 3
  },

  status: {
    fontSize: "12px",
    color: "#666"
  }
};
