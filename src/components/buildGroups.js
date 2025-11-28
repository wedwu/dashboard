// Build groups
// NOTE: does NOT override column order
export const buildGroups = (devices) => {
  const map = new Map();
  devices.forEach(d => map.set(d.id, d));

  const reverseLinks = new Map();
  devices.forEach(d => {
    d.links.forEach(l => {
      if (!reverseLinks.has(l)) reverseLinks.set(l, []);
      reverseLinks.get(l).push(d.id);
    });
  });

  const visited = new Set();
  const groups = [];

  const bfs = (startId) => {
    const queue = [startId];
    const group = new Set([startId]);

    while (queue.length) {
      const id = queue.shift();

      // down
      map.get(id).links.forEach(n => {
        if (!group.has(n)) {
          group.add(n);
          queue.push(n);
        }
      });

      // up
      const ups = reverseLinks.get(id) || [];
      ups.forEach(n => {
        if (!group.has(n)) {
          group.add(n);
          queue.push(n);
        }
      });
    }

    return [...group];
  }

  // hubs = devices with links
  const hubs = devices.filter(d => d.links.length > 0);

  for (const hub of hubs) {
    if (visited.has(hub.id)) continue;

    const group = bfs(hub.id);
    group.forEach(id => visited.add(id));
    groups.push(group);
  }

  // make sure isolated nodes also become groups
  devices.forEach(d => {
    if (!visited.has(d.id)) groups.push([d.id]);
  });

  return groups;
}
