// Compute lanes column-by-column, RIGHT ==> LEFT
// Using the correct lane logic:
//
// 1 child ==> align to child
// 2+ kids ==> center between child lanes
// 0 kids  ==> nearest free lane
//
// Never modify global lanes after assignment.
// Only stack when two nodes in SAME column want the SAME lane.

export const computeLanesForGroup = (groupIds, devices, columnsRightToLeft) => {
  const groupSet = new Set(groupIds);
  const deviceMap = new Map();
  devices.forEach(d => deviceMap.set(d.id, d));

  // Lanes stored per device ID
  const laneMap = new Map();

  // Rightmost column
  const rightmost = columnsRightToLeft[0] || [];
  const rightGroupIds = rightmost.filter(id => groupSet.has(id));

  // deterministic ordering
  rightGroupIds.sort((a, b) => a.localeCompare(b));

  let nextLane = 0;
  for (const id of rightGroupIds) {
    laneMap.set(id, nextLane++);
  }

  // move left column by column
  for (let c = 1; c < columnsRightToLeft.length; c++) {
    const col = columnsRightToLeft[c];
    const colGroupIds = col.filter(id => groupSet.has(id));
    if (!colGroupIds.length) continue;

    // Track used lanes in THIS column only
    const used = new Set(colGroupIds.map(id => laneMap.get(id)).filter(v => v !== undefined));

    colGroupIds.sort((a, b) => a.localeCompare(b));

    for (const id of colGroupIds) {
      if (laneMap.has(id)) continue; // already lane from later column

      const dev = deviceMap.get(id);
      const childIds = (dev.links || []).filter(ch => groupSet.has(ch));
      const childLanes = childIds.map(ch => laneMap.get(ch)).filter(v => v !== undefined);

      let desiredLane;

      if (childLanes.length === 1) {
        desiredLane = childLanes[0];

      } else if (childLanes.length >= 2) {
        const minLane = Math.min(...childLanes);
        const maxLane = Math.max(...childLanes);
        desiredLane = Math.round((minLane + maxLane) / 2);

      } else {
        desiredLane = 0;
        while (used.has(desiredLane)) desiredLane++;
      }

      // If lane is already taken in THIS column / shift to nearest free lane
      let lane = desiredLane;
      if (used.has(lane)) {
        let offset = 1;
        while (true) {
          const down = desiredLane - offset;
          const up = desiredLane + offset;
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

