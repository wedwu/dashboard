// Computes columns using dependency depth, independent of JSON order.
export function buildColumns(devices) {
  const deviceMap = new Map();
  devices.forEach(d => deviceMap.set(d.id, d));

  // track assigned column for each device (id ==> number)
  const col = new Map();

  // recursive function: column = 1 + max(column(child))
  function computeColumn(id) {
    if (col.has(id)) return col.get(id);

    const dev = deviceMap.get(id);

    // devices with no outbound links
    if (!dev.links || dev.links.length === 0) {
      col.set(id, 0);
      return 0;
    }

    const downstreamCols = dev.links.map(childId => computeColumn(childId));
    const maxDownstream = Math.max(...downstreamCols);

    col.set(id, maxDownstream + 1);
    return maxDownstream + 1;
  }

  // column for all devices
  devices.forEach(d => computeColumn(d.id));

  // build column list
  const maxCol = Math.max(...col.values());
  const columns = Array.from({ length: maxCol + 1 }, () => []);

  devices.forEach(d => {
    const c = col.get(d.id);
    columns[c].push(d.id);
  });

  return columns; // right ==> left
}
