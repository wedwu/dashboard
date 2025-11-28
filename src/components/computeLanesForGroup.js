export const computeLanesForGroup = (groupIds, devices, columnsRightToLeft) => {
  const groupSet = new Set(groupIds);
  const deviceMap = new Map();
  devices.forEach((d) => deviceMap.set(d.id, d));

  const laneMap = new Map();

  const rightmost = columnsRightToLeft[0] || [];
  const rightGroupIds = rightmost.filter((id) => groupSet.has(id));
  rightGroupIds.sort((a, b) => a.localeCompare(b));

  let nextLane = 0;
  for (const id of rightGroupIds) {
    laneMap.set(id, nextLane++);
  }

  for (let c = 1; c < columnsRightToLeft.length; c++) {
    const col = columnsRightToLeft[c];
    const colGroupIds = col.filter((id) => groupSet.has(id));
    if (!colGroupIds.length) continue;

    const used = new Set();

    colGroupIds.sort((a, b) => a.localeCompare(b));

    for (const id of colGroupIds) {
      if (laneMap.has(id)) continue;

      const dev = deviceMap.get(id);
      const childIds = (dev.links || []).filter((ch) => groupSet.has(ch));
      const childLanes = childIds.map((ch) => laneMap.get(ch)).filter((v) => v !== undefined);

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

