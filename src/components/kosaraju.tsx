/**
 * Build adjacency lists from your devices[]
 */
export function buildAdjacency(devices) {
  const adj = new Map();     // forward edges
  const rev = new Map();     // reversed edges

  for (const d of devices) {
    if (!adj.has(d.id)) adj.set(d.id, []);
    if (!rev.has(d.id)) rev.set(d.id, []);
  }

  for (const d of devices) {
    const from = d.id;

    for (const to of d.links || []) {
      if (!adj.has(to)) adj.set(to, []);
      if (!rev.has(to)) rev.set(to, []);

      adj.get(from).push(to);
      rev.get(to).push(from);
    }
  }

  return { adj, rev };
}

/**
 * Kosaraju’s Algorithm — returns SCCs and node→component map
 */
export function computeSCCs(devices) {
  const ids = [...new Set(devices.map(d => d.id))]; // dedupe ID duplicates (timedoor appears twice)
  const { adj, rev } = buildAdjacency(devices);

  const visited = new Set();
  const order = [];

  /** ---- PASS 1: DFS to build postorder list ---- */
  function dfs1(node) {
    if (visited.has(node)) return;
    visited.add(node);
    for (const nxt of adj.get(node) || []) dfs1(nxt);
    order.push(node);
  }

  for (const id of ids) dfs1(id);

  /** ---- PASS 2: Reverse-graph DFS ---- */
  const visited2 = new Set();
  const sccs = [];
  const nodeToComp = new Map();

  function dfs2(node, compList) {
    visited2.add(node);
    compList.push(node);
    for (const nxt of rev.get(node) || []) {
      if (!visited2.has(nxt)) dfs2(nxt, compList);
    }
  }

  // process in reverse finishing-time order
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (!visited2.has(id)) {
      const comp = [];
      dfs2(id, comp);
      sccs.push(comp);
    }
  }

  // map nodes → scc index
  sccs.forEach((group, index) => {
    for (const node of group) nodeToComp.set(node, index);
  });

  return {
    sccs,
    sccCount: sccs.length,
    nodeToComp
  };
}
