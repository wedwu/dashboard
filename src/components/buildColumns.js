const buildColumns = (devices) => {
  const deviceMap = new Map();
  devices.forEach(d => deviceMap.set(d.id, d));

  const memo = new Map();
  const visiting = new Set();

  const computeColumn = (id) => {
    if (memo.has(id)) return memo.get(id);

    if (visiting.has(id)) {
      memo.set(id, 0);
      return 0;
    }

    visiting.add(id);

    const dev = deviceMap.get(id);

    if (!dev || !dev.links || dev.links.length === 0) {
      memo.set(id, 0);
      visiting.delete(id);
      return 0;
    }

    let maxChildCol = 0;
    for (const childId of dev.links) {
      const col = computeColumn(childId);
      if (col > maxChildCol) maxChildCol = col;
    }

    const myCol = maxChildCol + 1;

    memo.set(id, myCol);
    visiting.delete(id);
    return myCol;
  }

  devices.forEach(d => computeColumn(d.id));

  const maxCol = Math.max(...memo.values());
  const columns = Array.from({ length: maxCol + 1 }, () => []);

  for (const [id, col] of memo.entries()) {
    columns[col].push(id);
  }

  columns.forEach(col => col.sort((a, b) => a.localeCompare(b)));

  return columns;
}

export default buildColumns
